import { GeminiBotResponse, Message } from '../types';
import { apiFetch } from '../services/apiClient';
import { API_BASE_URL } from '../services/apiConfig';
import { errorDev } from '../services/logger';

type AssistantApiResponse = {
  intentType: 'INFO' | 'ISSUE';
  detectedIssue: string | null;
  aiResponse: string;
  mode?: string;
  title?: string;
  summary?: string;
  reason?: string | null;
  suggestion?: string | null;
  warning?: string | null;
  riskLevel?: 'low' | 'medium' | 'high';
  tags?: string[];
};

type AssistantHistoryEntry = {
  id: number;
  prompt: string;
  intentType: 'INFO' | 'ISSUE';
  detectedIssue: string | null;
  aiResponse: string;
  createdAt: string;
};

export async function callAssistantAPI(userInput: string): Promise<GeminiBotResponse> {
  try {
    const response = await apiFetch<AssistantApiResponse>(`${API_BASE_URL}/assistant/chat`, {
      method: 'POST',
      body: { message: userInput },
    });

    return {
      intent_type: response.intentType,
      detected_issue: response.detectedIssue,
      ai_response: response.aiResponse,
      structured: response.summary
        ? {
            mode: response.mode ?? 'GENERAL_CHAT',
            title: response.title ?? "Shelly'nin Yorumu",
            summary: response.summary,
            reason: response.reason ?? null,
            suggestion: response.suggestion ?? null,
            warning: response.warning ?? null,
            riskLevel: response.riskLevel ?? 'low',
            tags: response.tags ?? [],
          }
        : null,
    };
  } catch (error) {
    errorDev('Assistant API Error:', error);
    return {
      intent_type: 'INFO',
      detected_issue: null,
      ai_response: 'Şu anda bağlantı kurulamıyor. Lütfen tekrar deneyin.',
      structured: null,
    };
  }
}

/** Son sohbet geçmişini mesaj listesine dönüştürerek getirir (eskiden yeniye). */
export async function fetchAssistantHistory(): Promise<Message[]> {
  try {
    const entries = await apiFetch<AssistantHistoryEntry[]>(`${API_BASE_URL}/assistant/history`);

    return entries.flatMap<Message>(entry => [
      { id: `${entry.id}-user`, from: 'user', text: entry.prompt },
      { id: `${entry.id}-ai`, from: 'ai', text: entry.aiResponse },
    ]);
  } catch (error) {
    errorDev('Assistant history error:', error);
    return [];
  }
}

/** Yeni sohbet başlatırken hem ekrandaki hem de backend hafızasındaki geçmişi temizler. */
export async function clearAssistantHistory(): Promise<void> {
  try {
    await apiFetch<void>(`${API_BASE_URL}/assistant/history`, {
      method: 'DELETE',
    });
  } catch (error) {
    errorDev('Assistant history clear error:', error);
    throw error;
  }
}
