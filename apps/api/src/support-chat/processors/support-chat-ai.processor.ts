import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import type { Cohere } from 'cohere-ai';
import type { Server } from 'socket.io';
import type {
  ChatSenderType,
  SupportChatAiMode,
  SupportChatStatus,
} from '../../../generated/prisma/client';
import { buildAnswerPrompt } from '../prompts/answer-prompt';
import { buildToolRoutingPrompt } from '../prompts/tool-routing-prompt';
import { SupportChatRepository } from '../repositories/support-chat.repository';
import {
  GetPolicyContextArgsSchema,
  RequestHumanHandoffArgsSchema,
  SearchProductsArgsSchema,
} from '../schemas/tool-args.schema';
import {
  CatalogAiSearchService,
  type ProductAiResult,
} from '../services/catalog-ai-search.service';
import { CohereService } from '../services/cohere.service';
import { PolicyAiSearchService } from '../services/policy-ai-search.service';
import { SUPPORT_CHAT_AI_QUEUE } from '../support-chat.constants';
import { ALL_TOOLS, TOOL_NAMES } from '../tools/tool-registry';

const HISTORY_LIMIT = 5;
const ROOM_PREFIX = 'chat:';
const TOOL_RESULT_CHAR_LIMIT = 1800;
const AI_MODE_AUTO: SupportChatAiMode = 'AUTO';
const AI_MODE_OFF: SupportChatAiMode = 'OFF';
const CHAT_STATUS_WAITING_HUMAN: SupportChatStatus = 'WAITING_HUMAN';
const SENDER_TYPE_CUSTOMER: ChatSenderType = 'CUSTOMER';
const SENDER_TYPE_GUEST: ChatSenderType = 'GUEST';
const SENDER_TYPE_AI: ChatSenderType = 'AI';
const FINAL_ANSWER_FALLBACK =
  'Xin lỗi, tôi cần thêm thông tin để trả lời chính xác. Bạn có thể mô tả rõ hơn không?';

type ExecutedToolResult = {
  name: string;
  args: string;
  result: string;
  structuredResult?: string;
};

type ToolExecutionResult = {
  text: string;
  structuredResult?: string;
  handoff?: boolean;
};

export interface AiRespondJobData {
  chatId: number;
}

@Processor(SUPPORT_CHAT_AI_QUEUE)
export class SupportChatAiProcessor extends WorkerHost {
  private readonly logger = new Logger(SupportChatAiProcessor.name);
  private server: Server | null = null;
  private readonly respondingChats = new Set<number>();
  private readonly abortControllers = new Map<number, AbortController>();

  constructor(
    @InjectQueue(SUPPORT_CHAT_AI_QUEUE) private readonly queue: Queue,
    private readonly repo: SupportChatRepository,
    private readonly cohere: CohereService,
    private readonly catalog: CatalogAiSearchService,
    private readonly policy: PolicyAiSearchService,
  ) {
    super();
  }

  /** Gateway injects the Socket.IO server instance for emitting events. */
  setServer(server: Server): void {
    this.server = server;
  }

  isChatResponding(chatId: number): boolean {
    return this.respondingChats.has(chatId);
  }

  markChatResponding(chatId: number): void {
    this.respondingChats.add(chatId);
  }

  async cancelChatResponse(chatId: number): Promise<boolean> {
    const jobId = this.buildJobId(chatId);
    let cancelled = false;
    const controller = this.abortControllers.get(chatId);
    if (controller && !controller.signal.aborted) {
      controller.abort();
      cancelled = true;
    }
    const job = await this.queue.getJob(jobId);
    if (job) {
      const state = await job.getState();
      if (
        state === 'waiting' ||
        state === 'active' ||
        state === 'delayed' ||
        state === 'prioritized' ||
        state === 'waiting-children'
      ) {
        await this.queue.remove(jobId).catch(() => null);
        cancelled = true;
      }
    }
    this.respondingChats.delete(chatId);
    return cancelled;
  }

  async process(job: Job<AiRespondJobData>): Promise<void> {
    const { chatId } = job.data;
    const jobStartedAt = Date.now();
    this.respondingChats.add(chatId);
    this.logger.log(`Processing AI job for chat #${chatId}`);

    const contextStartedAt = Date.now();
    const ctx = await this.repo.findChatAiContext(chatId);
    this.logger.log(
      `[chat ${chatId}] Loaded AI context in ${Date.now() - contextStartedAt}ms: aiMode=${ctx?.aiMode}, status=${ctx?.status}`,
    );
    if (!ctx || ctx.aiMode !== AI_MODE_AUTO || ctx.status === CHAT_STATUS_WAITING_HUMAN) {
      this.logger.log(
        `Skipping AI for chat #${chatId}: aiMode=${ctx?.aiMode}, status=${ctx?.status}`,
      );
      this.respondingChats.delete(chatId);
      return;
    }

    const controller = new AbortController();
    this.abortControllers.set(chatId, controller);
    this.emit(chatId, 'ai:thinking', { chatId, isThinking: true });

    try {
      const pipelineStartedAt = Date.now();
      const aiMessage = await this.runCoherePipeline(chatId, controller.signal);
      this.logger.log(
        `[chat ${chatId}] Cohere pipeline finished in ${Date.now() - pipelineStartedAt}ms, messageLength=${aiMessage?.length ?? 0}`,
      );
      if (!aiMessage || controller.signal.aborted) return;
      const normalizedAiMessage = this.normalizeAiMessage(aiMessage);
      if (!normalizedAiMessage) return;

      const saveStartedAt = Date.now();
      const savedMsg = await this.repo.createMessage({
        chatId,
        senderType: SENDER_TYPE_AI,
        content: normalizedAiMessage,
      });
      this.logger.log(
        `[chat ${chatId}] Saved AI message #${savedMsg.id} in ${Date.now() - saveStartedAt}ms`,
      );

      this.emit(chatId, 'newMessage', savedMsg);
    } catch (err) {
      if (this.isAbortError(err)) {
        this.logger.log(`AI response canceled for chat #${chatId}`);
        return;
      }
      this.logger.error(
        `AI failed for chat #${chatId}: ${(err as Error).message}`,
        (err as Error).stack,
      );
      this.emit(chatId, 'ai:error', { chatId, error: 'AI tạm thời không phản hồi được' });
    } finally {
      this.abortControllers.delete(chatId);
      this.respondingChats.delete(chatId);
      this.emit(chatId, 'ai:thinking', { chatId, isThinking: false });
      this.logger.log(`[chat ${chatId}] AI job done in ${Date.now() - jobStartedAt}ms`);
    }
  }

  // ─── Two-pass Cohere Pipeline (routing -> final answer) ────────────

  private async runCoherePipeline(chatId: number, signal: AbortSignal): Promise<string | null> {
    const historyStartedAt = Date.now();
    const history = await this.repo.findRecentMessagesForAi(chatId, HISTORY_LIMIT);
    this.logger.log(
      `[chat ${chatId}] Loaded ${history.length} history messages in ${Date.now() - historyStartedAt}ms`,
    );

    const routingMessages: Cohere.ChatMessageV2[] = [
      { role: 'system', content: buildToolRoutingPrompt() },
      ...history.map((m) => this.toCohereMessage(m)),
    ];
    const routingStartedAt = Date.now();
    const routingResponse = await this.cohere.chat({
      messages: routingMessages,
      tools: ALL_TOOLS,
      signal,
    });
    const routingDuration = Date.now() - routingStartedAt;
    const toolCalls = routingResponse.message.toolCalls ?? [];
    const directAnswer = this.extractText(routingResponse);
    this.logger.log(
      `[chat ${chatId}] Routing pass finished in ${routingDuration}ms, toolCalls=${toolCalls.length}`,
    );

    if (toolCalls.length === 0 && directAnswer?.trim()) {
      this.logger.log(`[chat ${chatId}] Returning direct answer from routing pass`);
      return directAnswer.trim();
    }

    const executedToolResults: ExecutedToolResult[] = [];
    for (const toolCall of toolCalls) {
      const fnName = toolCall.function?.name;
      const fnArgs = toolCall.function?.arguments ?? '{}';
      if (!fnName) continue;

      const execution = await this.executeTool(chatId, fnName, fnArgs);
      if (execution.handoff) {
        await this.repo.updateAiState(chatId, {
          aiMode: AI_MODE_OFF,
          status: CHAT_STATUS_WAITING_HUMAN,
        });
        this.emit(chatId, 'chat:status_changed', { chatId, status: 'WAITING_HUMAN' });
        return 'Tôi đã chuyển cuộc hội thoại của bạn đến nhân viên hỗ trợ. Vui lòng chờ trong giây lát!';
      }
      const result = execution.text;
      const normalizedResult = this.normalizeToolResult(result);
      if (normalizedResult.length !== result.length) {
        this.logger.log(
          `[chat ${chatId}] Tool ${fnName} result truncated ${result.length} -> ${normalizedResult.length} chars`,
        );
      }
      executedToolResults.push({
        name: fnName,
        args: fnArgs,
        result: normalizedResult,
        structuredResult: execution.structuredResult,
      });
    }

    const answerMessages: Cohere.ChatMessageV2[] = [
      { role: 'system', content: buildAnswerPrompt() },
      ...history.map((m) => this.toCohereMessage(m)),
      { role: 'assistant', content: this.buildToolContextContent(executedToolResults) },
      {
        role: 'user',
        content:
          'Dựa trên TOOL_RESULTS ở trên, hãy trả lời tin nhắn gần nhất của khách hàng bằng tiếng Việt tự nhiên.',
      },
    ];
    const answerStartedAt = Date.now();
    const answerResponse = await this.cohere.chat({
      messages: answerMessages,
      tools: [],
      signal,
    });
    this.logger.log(
      `[chat ${chatId}] Final answer pass finished in ${Date.now() - answerStartedAt}ms`,
    );
    return this.extractText(answerResponse) ?? FINAL_ANSWER_FALLBACK;
  }

  private normalizeAiMessage(message: string): string | null {
    const normalized = message.trim();
    if (!normalized) {
      return null;
    }
    return normalized;
  }

  // ─── Tool Execution ──────────────────────────────────────────────────

  private async executeTool(
    chatId: number,
    name: string,
    argsRaw: string,
  ): Promise<ToolExecutionResult> {
    const startedAt = Date.now();
    this.logger.log(`[chat ${chatId}] Tool start: ${name}`);

    let args: unknown;
    try {
      args = JSON.parse(argsRaw) as unknown;
    } catch {
      this.logger.warn(`[chat ${chatId}] Tool ${name} args parse failed`);
      return { text: 'Lỗi parse tham số tool' };
    }

    if (name === TOOL_NAMES.SEARCH_PRODUCTS) {
      const parsed = SearchProductsArgsSchema.safeParse(args);
      if (!parsed.success) return { text: 'Tham số tìm kiếm không hợp lệ' };
      const products = await this.catalog.search(parsed.data);
      this.logger.log(
        `[chat ${chatId}] Tool done: ${name} in ${Date.now() - startedAt}ms, products=${products.length}`,
      );
      if (products.length === 0) return { text: 'Không tìm thấy sản phẩm phù hợp.' };
      return this.buildSearchProductsToolExecution(parsed.data.query, products);
    }

    if (name === TOOL_NAMES.GET_POLICY_CONTEXT) {
      const parsed = GetPolicyContextArgsSchema.safeParse(args);
      if (!parsed.success) return { text: 'Key chính sách không hợp lệ' };
      const doc = await this.policy.getByKey(parsed.data.key);
      this.logger.log(
        `[chat ${chatId}] Tool done: ${name} in ${Date.now() - startedAt}ms, found=${doc ? 1 : 0}`,
      );
      if (!doc) return { text: `Chưa có thông tin về "${parsed.data.key}".` };
      return { text: `**${doc.title}**\n\n${doc.content}` };
    }

    if (name === TOOL_NAMES.REQUEST_HUMAN_HANDOFF) {
      const parsed = RequestHumanHandoffArgsSchema.safeParse(args);
      const reason = parsed.success ? parsed.data.reason : 'Không rõ lý do';
      this.logger.log(`[chat ${chatId}] Human handoff: ${reason}`);
      return { text: '__HANDOFF__', handoff: true };
    }

    this.logger.warn(`[chat ${chatId}] Tool not supported: ${name}`);
    return { text: `Tool "${name}" không được hỗ trợ` };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────

  private toCohereMessage(m: {
    senderType: ChatSenderType;
    content: string;
  }): Cohere.ChatMessageV2 {
    if (m.senderType === SENDER_TYPE_CUSTOMER || m.senderType === SENDER_TYPE_GUEST) {
      return { role: 'user', content: m.content };
    }
    return { role: 'assistant', content: m.content };
  }

  private extractText(response: Cohere.V2ChatResponse): string | null {
    const content = response.message.content;
    if (!content || content.length === 0) return null;
    const textBlock = content.find((b) => b.type === 'text');
    return textBlock?.type === 'text' ? textBlock.text : null;
  }

  private emit(chatId: number, event: string, data: unknown): void {
    if (!this.server) return;
    this.server.to(`${ROOM_PREFIX}${chatId}`).emit(event, data);
  }

  private buildJobId(chatId: number): string {
    return `ai-respond-${chatId}`;
  }

  private isAbortError(err: unknown): boolean {
    const maybeError = err as { name?: string; message?: string };
    return (
      maybeError.name === 'AbortError' ||
      maybeError.message?.toLowerCase().includes('abort') === true
    );
  }

  private normalizeToolResult(result: string): string {
    if (result.length <= TOOL_RESULT_CHAR_LIMIT) return result;
    return `${result.slice(0, TOOL_RESULT_CHAR_LIMIT)}\n...(đã rút gọn để tối ưu tốc độ phản hồi)`;
  }

  private buildToolContextContent(toolResults: ExecutedToolResult[]): string {
    if (toolResults.length === 0) {
      return 'TOOL_RESULTS:\n- Không có tool nào được gọi.';
    }
    const blocks = toolResults.map((item, index) => {
      const resultBlock = item.structuredResult ?? item.result;
      return [`TOOL_${index + 1}: ${item.name}`, `ARGS: ${item.args}`, 'RESULT:', resultBlock].join(
        '\n',
      );
    });
    return `TOOL_RESULTS:\n\n${blocks.join('\n\n')}`;
  }

  private buildSearchProductsToolExecution(
    query: string,
    products: ProductAiResult[],
  ): ToolExecutionResult {
    const uniqueProducts = Array.from(
      new Map(products.map((product) => [product.slug || product.link, product] as const)).values(),
    );
    const structuredPayload = {
      type: 'product_search_results',
      query,
      totalUniqueProducts: uniqueProducts.length,
      products: uniqueProducts.map((product) => ({
        name: product.name,
        slug: product.slug,
        price: product.minPrice,
        colors: product.colors,
        sizes: product.sizes,
        link: product.link,
      })),
    };
    return {
      text: JSON.stringify(structuredPayload),
      structuredResult: JSON.stringify(structuredPayload, null, 2),
    };
  }
}
