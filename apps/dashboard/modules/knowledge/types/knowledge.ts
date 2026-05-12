export type KnowledgeItem = {
  id: number;
  slug: string;
  title: string;
  content: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateKnowledgeBody = {
  slug: string;
  title: string;
  content: string;
  isActive?: boolean;
};

export type UpdateKnowledgeBody = {
  slug?: string;
  title?: string;
  content?: string;
  isActive?: boolean;
};
