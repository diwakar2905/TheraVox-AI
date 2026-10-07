/**
 * Typed client for the TheraVox AI backend.
 *
 * The access token is held in memory only (set by AuthContext). Every request
 * goes through apiFetch, which attaches the bearer token and broadcasts an
 * `auth:token-expired` event on 401 so the auth layer can react.
 */

import type { CrisisData } from '../components/shared/CrisisAlertBanner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EmotionAnalysisResponse {
  emotion: string;
  confidence: number;
  emoji: string;
  description: string;
  scores?: Record<string, number>;
  /** Present only when the crisis scanner flagged the input */
  crisis?: CrisisData | null;
}

export interface VisionAnalysisResponse {
  faces: Array<EmotionAnalysisResponse & { box?: number[] }>;
  error?: string;
}

export interface UpdateProfilePayload {
  full_name?: string;
  email?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
}

export interface AccountStats {
  wellness_entries_count: number;
  member_since: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatContext {
  recent_mood?: string | null;
  streak?: number | null;
  breathing_minutes?: number | null;
}

export interface ChatResponse {
  reply: string;
  model: string;
  session_id: string;
  crisis?: CrisisData | null;
}

export interface ChatSession {
  id: string;
  title: string;
  message_count: number;
  created_at: string;
  updated_at: string;
  preview?: string | null;
}

export interface ChatMessageRecord {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface SessionSummary {
  id: string;
  session_id: string;
  summary: string;
  key_themes: string[];
  action_items: string[];
  mood_arc?: string | null;
  model_used: string;
  created_at: string;
}

export interface ChatSessionDetail {
  id: string;
  title: string;
  created_at: string;
  messages: ChatMessageRecord[];
  summary?: SessionSummary | null;
}

export interface JournalPrompt {
  prompt: string;
}

export interface JournalInsights {
  emotion: string;
  confidence: number;
  emoji: string;
  description: string;
  reflection: string;
}

export interface PostcardData {
  emotion: string;
  emoji: string;
  confidence: number;
  quote_text: string;
  quote_author: string;
  gradient: string[];
  accent: string;
  text_color: string;
  glow: string;
  pattern: string;
}

// ---------------------------------------------------------------------------
// Token handling + base fetch
// ---------------------------------------------------------------------------

let accessToken: string | null = null;

export function setToken(token: string | null): void {
  accessToken = token;
}

export function getToken(): string | null {
  return accessToken;
}

export async function apiFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { ...init, headers });
  if (res.status === 401) window.dispatchEvent(new Event('auth:token-expired'));
  return res;
}

async function errorDetail(res: Response, fallback: string): Promise<never> {
  const body = await res.json().catch(() => ({}));
  throw new Error(body.detail ?? fallback);
}

function jsonInit(method: string, body: unknown): RequestInit {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

// ---------------------------------------------------------------------------
// Emotion analysis
// ---------------------------------------------------------------------------

export async function analyzeFrame(image: string): Promise<VisionAnalysisResponse> {
  const res = await apiFetch('/api/analyze_frame', jsonInit('POST', { image }));
  if (!res.ok) throw new Error(`Vision analysis failed: ${res.statusText}`);
  return res.json();
}

export async function analyzeText(text: string): Promise<EmotionAnalysisResponse> {
  const res = await apiFetch('/api/analyze_text', jsonInit('POST', { text }));
  if (!res.ok) throw new Error(`Text analysis failed: ${res.statusText}`);
  return res.json();
}

export async function analyzeAudio(file: Blob): Promise<EmotionAnalysisResponse> {
  const form = new FormData();
  form.append('file', file);
  const res = await apiFetch('/api/analyze_audio', { method: 'POST', body: form });
  if (!res.ok) throw new Error(`Audio analysis failed: ${res.statusText}`);
  return res.json();
}

export async function saveScreenshot(image: string): Promise<{ success?: boolean; filename?: string }> {
  const res = await apiFetch('/api/save_screenshot', jsonInit('POST', { image }));
  if (!res.ok) throw new Error(`Save screenshot failed: ${res.statusText}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Account
// ---------------------------------------------------------------------------

export async function updateProfile(payload: UpdateProfilePayload): Promise<UserProfile> {
  const res = await apiFetch('/api/auth/me', jsonInit('PATCH', payload));
  if (!res.ok) return errorDetail(res, `Failed to update profile (${res.status})`);
  return res.json();
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const res = await apiFetch(
    '/api/auth/me/password',
    jsonInit('POST', { current_password: currentPassword, new_password: newPassword }),
  );
  if (!res.ok) return errorDetail(res, `Failed to change password (${res.status})`);
}

export async function getAccountStats(): Promise<AccountStats> {
  const res = await apiFetch('/api/auth/me/stats');
  if (!res.ok) throw new Error(`Failed to fetch account stats (${res.status})`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

export async function sendChatMessage(
  messages: ChatMessage[],
  context?: ChatContext,
  sessionId?: string | null,
): Promise<ChatResponse> {
  const res = await apiFetch('/api/chat', jsonInit('POST', { messages, context, session_id: sessionId ?? null }));
  if (!res.ok) return errorDetail(res, `Chat request failed (${res.status})`);
  return res.json();
}

export async function getChatSessions(): Promise<ChatSession[]> {
  const res = await apiFetch('/api/chat/sessions');
  if (!res.ok) return errorDetail(res, `Failed to fetch sessions (${res.status})`);
  return res.json();
}

export async function getChatSession(sessionId: string): Promise<ChatSessionDetail> {
  const res = await apiFetch(`/api/chat/sessions/${sessionId}`);
  if (!res.ok) return errorDetail(res, `Failed to load session (${res.status})`);
  return res.json();
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  const res = await apiFetch(`/api/chat/sessions/${sessionId}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 204) return errorDetail(res, `Failed to delete session (${res.status})`);
}

export async function generateSessionSummary(sessionId: string): Promise<SessionSummary> {
  const res = await apiFetch(`/api/chat/sessions/${sessionId}/summary`, { method: 'POST' });
  if (!res.ok) return errorDetail(res, `Failed to generate summary (${res.status})`);
  return res.json();
}

export async function getSessionSummary(sessionId: string): Promise<SessionSummary | null> {
  const res = await apiFetch(`/api/chat/sessions/${sessionId}/summary`);
  if (!res.ok) {
    if (res.status === 404) return null;
    return errorDetail(res, `Failed to fetch summary (${res.status})`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Journal + postcard
// ---------------------------------------------------------------------------

export async function getJournalPrompt(recentMood?: string, moodHistory?: string[]): Promise<JournalPrompt> {
  const res = await apiFetch('/api/journal/prompt', jsonInit('POST', { recent_mood: recentMood, mood_history: moodHistory }));
  if (!res.ok) return errorDetail(res, `Failed to get journal prompt (${res.status})`);
  return res.json();
}

export async function submitJournalEntry(text: string, prompt?: string | null): Promise<JournalInsights> {
  const res = await apiFetch('/api/journal/submit', jsonInit('POST', { text, prompt }));
  if (!res.ok) return errorDetail(res, `Failed to submit journal entry (${res.status})`);
  return res.json();
}

export async function generatePostcard(emotion: string, emoji: string, confidence: number): Promise<PostcardData> {
  const res = await apiFetch('/api/postcard', jsonInit('POST', { emotion, emoji, confidence }));
  if (!res.ok) return errorDetail(res, `Failed to generate postcard (${res.status})`);
  return res.json();
}
