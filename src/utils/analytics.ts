import { apiRequest } from '../api';

export type CookieConsentChoice = 'accepted' | 'rejected' | null;

export type AnalyticsEventType =
  | 'page_view'
  | 'resource_search'
  | 'resource_view'
  | 'resource_download'
  | 'resource_request'
  | 'exchange_completed';

const CONSENT_STORAGE_KEY = 'crx_cookie_consent_v1';

export function getCookieConsent(): CookieConsentChoice {
  try {
    const val = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (val === 'accepted' || val === 'rejected') {
      return val;
    }
    return null;
  } catch {
    return null;
  }
}

export function setCookieConsent(choice: 'accepted' | 'rejected'): void {
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, choice);
    window.dispatchEvent(new CustomEvent('crx-consent-updated', { detail: choice }));
  } catch {
    // ignore storage errors
  }
}

export function clearCookieConsent(): void {
  try {
    localStorage.removeItem(CONSENT_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('crx-consent-updated', { detail: null }));
  } catch {
    // ignore
  }
}

/**
 * Privacy-conscious analytics dispatcher (Sections 56 & 57).
 * Never runs before explicit user consent ('accepted').
 * Never collects personal identifiers (email, full name, studentId, IP).
 */
export async function trackAnalyticsEvent(
  eventType: AnalyticsEventType,
  metadata?: Record<string, string | number | boolean>
): Promise<void> {
  if (getCookieConsent() !== 'accepted') {
    return;
  }

  try {
    await apiRequest('/api/analytics/event', {
      method: 'POST',
      body: JSON.stringify({
        eventType,
        metadata: metadata || {},
      }),
    });
  } catch {
    // Silent failure for non-essential analytics
  }
}
