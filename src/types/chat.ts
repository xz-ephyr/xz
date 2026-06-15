export interface ChatSession {
  id: string;
  title: string;
  lastMessage?: string;
  projectId?: string;
  archived: boolean;
  createdAt: number;
}
