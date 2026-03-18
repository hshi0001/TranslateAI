/** Types for the translation webapp */

export interface TranslateUser {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export interface GlobalSettings {
  preferredWords: string[];
  preferredEmojis: string[];
}

export interface TranslateRole {
  id: string;
  name: string;
  traits: string[];
  createdAt: string;
}

export interface LearningExample {
  original: string;
  translated: string;
  action: "copy" | "refine";
  refined?: string;
  at: string;
}

export type ChatMessageRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  content: string;
  createdAt: string;
  parentId?: string;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export type RoleHistoryMode = "translate" | "refine";

export interface RoleHistoryRecord {
  id: string;
  original: string;
  result: string;
  mode: RoleHistoryMode;
  createdAt: string;
  threadId?: string;
}

export interface TranslateStore {
  users: TranslateUser[];
  userSettings: Record<string, GlobalSettings>;
  userRoles: Record<string, TranslateRole[]>;
  userRoleLearning: Record<string, Record<string, LearningExample[]>>;
  userMessages: Record<string, ChatMessage[]>;
  userConversations: Record<string, Conversation[]>;
  userRoleHistory: Record<string, Record<string, RoleHistoryRecord[]>>;
  userDailyUsage?: Record<string, { date: string; chars: number }>;
}

export const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  preferredWords: [],
  preferredEmojis: []
};

export const MAX_CHARS_PER_MESSAGE = 200;
export const MAX_CHARS_PER_DAY = 2000;
