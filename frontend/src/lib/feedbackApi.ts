import { apiFetch } from './api';

export type FeedbackCategory = 'bug' | 'suggestion' | 'general' | 'compliment';

export interface FeedbackPayload {
  category: FeedbackCategory;
  subject: string;
  message: string;
  rating?: number | null;
}

export interface FeedbackResponse {
  id: string;
  user_id: string | null;
  category: FeedbackCategory;
  subject: string;
  message: string;
  rating: number | null;
  created_at: string;
}

export async function submitFeedback(payload: FeedbackPayload): Promise<FeedbackResponse> {
  const res = await apiFetch('/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? 'Failed to submit feedback');
  }
  return res.json();
}
