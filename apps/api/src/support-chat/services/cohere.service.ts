import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Cohere } from 'cohere-ai';
import { CohereClientV2 } from 'cohere-ai';

@Injectable()
export class CohereService {
  private readonly logger = new Logger(CohereService.name);
  private readonly co: CohereClientV2;
  private readonly model: string;

  constructor(@Inject(ConfigService) private readonly config: ConfigService) {
    this.co = new CohereClientV2({ token: this.config.getOrThrow<string>('COHERE_API_KEY') });
    this.model = this.config.get<string>('COHERE_MODEL') ?? 'command-a-03-2025';
  }

  async chat(params: {
    messages: Cohere.ChatMessageV2[];
    tools: Cohere.ToolV2[];
    signal?: AbortSignal;
  }): Promise<Cohere.V2ChatResponse> {
    const startedAt = Date.now();
    try {
      const response = await this.co.chat(
        { model: this.model, messages: params.messages, tools: params.tools },
        { abortSignal: params.signal },
      );
      this.logger.log(
        `[cohere] model=${this.model} messages=${params.messages.length} tools=${params.tools.length} duration=${Date.now() - startedAt}ms`,
      );
      return response;
    } catch (error) {
      this.logger.warn(
        `[cohere] request failed after ${Date.now() - startedAt}ms: ${(error as Error).message}`,
      );
      throw error;
    }
  }
}
