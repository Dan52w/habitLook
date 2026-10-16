import { getDb } from '../client';
import { v4 as uuidv4 } from 'uuid';

export type AiChat = {
  id: string;
  title: string;
  updated_at: string;
};

export type AiStoredMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  plan_json: string | null;
  plan_state: string | null;
  plan_summary: string | null;
  created_at: string;
};

function nowIso(): string {
  return new Date().toISOString();
}

export async function createAiChat(title: string): Promise<string> {
  const db = await getDb();
  const id = uuidv4();
  const now = nowIso();
  const clean = title.trim().slice(0, 60) || 'Conversación';
  await db.execute(
    'INSERT INTO ai_chats (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)',
    [id, clean, now, now],
  );
  return id;
}

export async function listAiChats(): Promise<AiChat[]> {
  const db = await getDb();
  const result = await db.execute(
    'SELECT id, title, updated_at FROM ai_chats ORDER BY updated_at DESC LIMIT 50',
  );
  return (result.rows ?? []) as AiChat[];
}

export async function deleteAiChat(id: string): Promise<void> {
  const db = await getDb();
  await db.execute('DELETE FROM ai_chats WHERE id = ?', [id]);
}

export async function touchAiChat(id: string): Promise<void> {
  const db = await getDb();
  await db.execute('UPDATE ai_chats SET updated_at = ? WHERE id = ?', [
    nowIso(),
    id,
  ]);
}

export async function addAiMessage(
  chatId: string,
  msg: {
    role: 'user' | 'assistant';
    text: string;
    planJson?: string | null;
    planState?: string | null;
    planSummary?: string | null;
  },
): Promise<string> {
  const db = await getDb();
  const id = uuidv4();
  await db.execute(
    `INSERT INTO ai_messages
       (id, chat_id, role, text, plan_json, plan_state, plan_summary, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      chatId,
      msg.role,
      msg.text,
      msg.planJson ?? null,
      msg.planState ?? null,
      msg.planSummary ?? null,
      nowIso(),
    ],
  );
  return id;
}

export async function listAiMessages(chatId: string): Promise<AiStoredMessage[]> {
  const db = await getDb();
  const result = await db.execute(
    `SELECT id, role, text, plan_json, plan_state, plan_summary, created_at
     FROM ai_messages WHERE chat_id = ? ORDER BY created_at ASC, rowid ASC LIMIT 500`,
    [chatId],
  );
  return (result.rows ?? []) as AiStoredMessage[];
}

export async function updateAiMessagePlan(
  messageId: string,
  planState: string,
  planSummary?: string | null,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    'UPDATE ai_messages SET plan_state = ?, plan_summary = ? WHERE id = ?',
    [planState, planSummary ?? null, messageId],
  );
}
