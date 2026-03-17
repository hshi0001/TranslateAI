import { promises as fs } from "fs";
import path from "path";
import type {
  TranslateStore,
  TranslateUser,
  GlobalSettings,
  TranslateRole,
  LearningExample,
  ChatMessage,
  Conversation,
  RoleHistoryRecord,
  RoleHistoryMode
} from "./translate-types";
import { DEFAULT_GLOBAL_SETTINGS } from "./translate-types";

// On Vercel the project filesystem is read-only; use /tmp so registration and store writes work (data is ephemeral).
const DATA_DIR = process.env.VERCEL
  ? path.join("/tmp", "translate-app-data")
  : path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "translate-store.json");

async function ensureDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    // ignore
  }
}

async function readStore(): Promise<TranslateStore> {
  await ensureDir();
  try {
    const raw = await fs.readFile(STORE_FILE, "utf-8");
    const store = JSON.parse(raw) as TranslateStore;
    if (!store.userMessages) store.userMessages = {};
    if (!store.userConversations) store.userConversations = {};
    if (!store.userRoleHistory) store.userRoleHistory = {};
    return store;
  } catch {
    return {
      users: [],
      userSettings: {},
      userRoles: {},
      userRoleLearning: {},
      userMessages: {},
      userConversations: {},
      userRoleHistory: {}
    };
  }
}

async function writeStore(store: TranslateStore): Promise<void> {
  await ensureDir();
  await fs.writeFile(STORE_FILE, JSON.stringify(store, null, 2), "utf-8");
}

export async function findUserByEmail(email: string): Promise<TranslateUser | null> {
  const store = await readStore();
  const normalized = email.trim().toLowerCase();
  return store.users.find((u) => u.email === normalized) ?? null;
}

export async function findUserById(id: string): Promise<TranslateUser | null> {
  const store = await readStore();
  return store.users.find((u) => u.id === id) ?? null;
}

export async function createUser(
  email: string,
  passwordHash: string
): Promise<TranslateUser> {
  const store = await readStore();
  const normalized = email.trim().toLowerCase();
  if (store.users.some((u) => u.email === normalized)) {
    throw new Error("EMAIL_IN_USE");
  }
  const user: TranslateUser = {
    id: crypto.randomUUID(),
    email: normalized,
    passwordHash,
    createdAt: new Date().toISOString()
  };
  store.users.push(user);
  store.userSettings[user.id] = { ...DEFAULT_GLOBAL_SETTINGS };
  store.userRoles[user.id] = [];
  store.userRoleLearning[user.id] = {};
  store.userMessages[user.id] = [];
  store.userConversations[user.id] = [];
  store.userRoleHistory[user.id] = {};
  await writeStore(store);
  return user;
}

export async function getGlobalSettings(userId: string): Promise<GlobalSettings> {
  const store = await readStore();
  return (
    store.userSettings[userId] ?? {
      ...DEFAULT_GLOBAL_SETTINGS
    }
  );
}

export async function setGlobalSettings(
  userId: string,
  settings: Partial<GlobalSettings>
): Promise<GlobalSettings> {
  const store = await readStore();
  const current = store.userSettings[userId] ?? { ...DEFAULT_GLOBAL_SETTINGS };
  const next: GlobalSettings = {
    preferredWords: settings.preferredWords ?? current.preferredWords,
    preferredEmojis: settings.preferredEmojis ?? current.preferredEmojis
  };
  store.userSettings[userId] = next;
  await writeStore(store);
  return next;
}

export async function getRoles(userId: string): Promise<TranslateRole[]> {
  const store = await readStore();
  return store.userRoles[userId] ?? [];
}

export async function createRole(
  userId: string,
  name: string,
  traits: string[]
): Promise<TranslateRole> {
  const store = await readStore();
  const roles = store.userRoles[userId] ?? [];
  const role: TranslateRole = {
    id: crypto.randomUUID(),
    name: name.trim(),
    traits: traits.map((t) => t.trim()).filter(Boolean),
    createdAt: new Date().toISOString()
  };
  roles.push(role);
  store.userRoles[userId] = roles;
  await writeStore(store);
  return role;
}

export async function updateRole(
  userId: string,
  roleId: string,
  updates: { name?: string; traits?: string[] }
): Promise<TranslateRole | null> {
  const store = await readStore();
  const roles = store.userRoles[userId] ?? [];
  const idx = roles.findIndex((r) => r.id === roleId);
  if (idx === -1) return null;
  if (updates.name !== undefined) roles[idx].name = updates.name.trim();
  if (updates.traits !== undefined)
    roles[idx].traits = updates.traits.map((t) => t.trim()).filter(Boolean);
  await writeStore(store);
  return roles[idx];
}

export async function deleteRole(
  userId: string,
  roleId: string
): Promise<boolean> {
  const store = await readStore();
  const roles = (store.userRoles[userId] ?? []).filter((r) => r.id !== roleId);
  store.userRoles[userId] = roles;
  const learning = store.userRoleLearning[userId];
  if (learning) delete learning[roleId];
  await writeStore(store);
  return true;
}

export async function addLearningExample(
  userId: string,
  roleId: string,
  example: Omit<LearningExample, "at">
): Promise<void> {
  const store = await readStore();
  const byRole = store.userRoleLearning[userId] ?? {};
  const list = byRole[roleId] ?? [];
  list.push({ ...example, at: new Date().toISOString() });
  if (list.length > 50) list.splice(0, list.length - 50);
  byRole[roleId] = list;
  store.userRoleLearning[userId] = byRole;
  await writeStore(store);
}

export async function getLearningExamples(
  userId: string,
  roleId: string
): Promise<LearningExample[]> {
  const store = await readStore();
  const byRole = store.userRoleLearning[userId] ?? {};
  return byRole[roleId] ?? [];
}

const MAX_MESSAGES_PER_CONV = 500;

function conversationTitleFromFirstMessage(content: string): string {
  const t = content.replace(/\s+/g, " ").trim();
  return t.length > 36 ? t.slice(0, 36) + "…" : t || "New chat";
}

export async function listConversations(userId: string): Promise<Pick<Conversation, "id" | "title" | "updatedAt">[]> {
  const store = await readStore();
  const list = store.userConversations[userId] ?? [];
  return list
    .slice()
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .map((c) => ({ id: c.id, title: c.title, updatedAt: c.updatedAt }));
}

export async function getConversation(userId: string, conversationId: string): Promise<Conversation | null> {
  const store = await readStore();
  const list = store.userConversations[userId] ?? [];
  return list.find((c) => c.id === conversationId) ?? null;
}

export async function createConversation(userId: string, title = "New chat"): Promise<Conversation> {
  const store = await readStore();
  const list = store.userConversations[userId] ?? [];
  const now = new Date().toISOString();
  const conv: Conversation = {
    id: crypto.randomUUID(),
    userId,
    title,
    createdAt: now,
    updatedAt: now,
    messages: []
  };
  list.push(conv);
  store.userConversations[userId] = list;
  await writeStore(store);
  return conv;
}

export async function appendToConversation(
  userId: string,
  conversationId: string,
  messages: Omit<ChatMessage, "id" | "createdAt">[],
  options?: { updateTitleFromFirstUserMessage?: boolean }
): Promise<{ messages: ChatMessage[]; conversation: Conversation } | null> {
  const store = await readStore();
  const list = store.userConversations[userId] ?? [];
  const idx = list.findIndex((c) => c.id === conversationId);
  if (idx === -1) return null;
  const conv = list[idx];
  const now = new Date().toISOString();
  const newOnes: ChatMessage[] = messages.map((m) => ({
    id: crypto.randomUUID(),
    role: m.role,
    content: m.content,
    createdAt: now
  }));
  conv.messages.push(...newOnes);
  if (conv.messages.length > MAX_MESSAGES_PER_CONV) {
    conv.messages = conv.messages.slice(-MAX_MESSAGES_PER_CONV);
  }
  conv.updatedAt = now;
  if (options?.updateTitleFromFirstUserMessage && conv.title === "New chat" && messages[0]?.role === "user") {
    conv.title = conversationTitleFromFirstMessage(messages[0].content);
  }
  await writeStore(store);
  return { messages: newOnes, conversation: conv };
}

export async function updateConversationTitle(
  userId: string,
  conversationId: string,
  title: string
): Promise<Conversation | null> {
  const store = await readStore();
  const list = store.userConversations[userId] ?? [];
  const conv = list.find((c) => c.id === conversationId);
  if (!conv) return null;
  conv.title = title.trim() || "New chat";
  conv.updatedAt = new Date().toISOString();
  await writeStore(store);
  return conv;
}

export async function deleteConversation(userId: string, conversationId: string): Promise<boolean> {
  const store = await readStore();
  const list = (store.userConversations[userId] ?? []).filter((c) => c.id !== conversationId);
  store.userConversations[userId] = list;
  await writeStore(store);
  return true;
}

export async function getMessages(userId: string): Promise<ChatMessage[]> {
  const store = await readStore();
  return store.userMessages[userId] ?? [];
}

export async function appendMessages(
  userId: string,
  messages: Omit<ChatMessage, "id" | "createdAt">[]
): Promise<ChatMessage[]> {
  const store = await readStore();
  const list = store.userMessages[userId] ?? [];
  const now = new Date().toISOString();
  const newOnes: ChatMessage[] = messages.map((m) => ({
    id: crypto.randomUUID(),
    role: m.role,
    content: m.content,
    createdAt: now
  }));
  list.push(...newOnes);
  if (list.length > MAX_MESSAGES_PER_CONV) {
    store.userMessages[userId] = list.slice(-MAX_MESSAGES_PER_CONV);
  } else {
    store.userMessages[userId] = list;
  }
  await writeStore(store);
  return newOnes;
}

const MAX_ROLE_HISTORY = 300;

export async function getRoleHistory(
  userId: string,
  roleId: string
): Promise<RoleHistoryRecord[]> {
  const store = await readStore();
  const byRole = store.userRoleHistory[userId] ?? {};
  const list = byRole[roleId] ?? [];
  return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function appendToRoleHistory(
  userId: string,
  roleId: string,
  record: { original: string; result: string; mode: RoleHistoryMode; threadId?: string }
): Promise<RoleHistoryRecord> {
  const store = await readStore();
  const byRole = store.userRoleHistory[userId] ?? {};
  let list = byRole[roleId] ?? [];
  const now = new Date().toISOString();
  const entry: RoleHistoryRecord = {
    id: crypto.randomUUID(),
    original: record.original,
    result: record.result,
    mode: record.mode,
    createdAt: now,
    threadId: record.threadId
  };
  list.push(entry);
  if (list.length > MAX_ROLE_HISTORY) list = list.slice(-MAX_ROLE_HISTORY);
  byRole[roleId] = list;
  store.userRoleHistory[userId] = byRole;
  await writeStore(store);
  return entry;
}
