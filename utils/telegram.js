/**
 * Validates a Telegram webhook URL according to gateway and Telegram requirements:
 * - Must start with https://
 * - Must contain /v1/webhooks/telegram
 * - Must contain an apikey query parameter starting with pk_test_ or pk_live_
 *
 * @param {string} url
 * @returns {string|null} Error message or null if valid
 */
export function validateTelegramWebhookUrl(url) {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return 'Webhook URL is required.';
  }
  const trimmed = url.trim();
  if (!trimmed.startsWith('https://')) {
    return 'The URL must start with https://';
  }
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return 'Please enter a valid URL.';
  }
  if (!parsed.pathname.includes('/v1/webhooks/telegram')) {
    return 'The URL must contain /v1/webhooks/telegram';
  }
  const apikey = parsed.searchParams.get('apikey') || '';
  if (!apikey.startsWith('pk_test_') && !apikey.startsWith('pk_live_')) {
    return 'The URL must contain an apikey query parameter starting with pk_test_ or pk_live_ (e.g. ?apikey=pk_test_xxx).';
  }
  return null;
}

/**
 * Checks whether the API key prefix in the webhook URL matches the dashboard's current mode.
 * Warns (does not block) if there is a mismatch.
 *
 * @param {string} url
 * @param {string} currentMode 'test' | 'live'
 * @returns {string|null} Warning message or null if matching / not applicable
 */
export function getTelegramModeWarning(url, currentMode) {
  if (!url || typeof url !== 'string') return null;
  try {
    const parsed = new URL(url.trim());
    const apikey = parsed.searchParams.get('apikey') || '';
    const isLiveKey = apikey.startsWith('pk_live_');
    const isTestKey = apikey.startsWith('pk_test_');
    const isLiveMode = currentMode === 'live';

    if (isLiveKey && !isLiveMode) {
      return 'The URL uses a live API key (pk_live_...), but the dashboard is currently in test mode.';
    }
    if (isTestKey && isLiveMode) {
      return 'The URL uses a test API key (pk_test_...), but the dashboard is currently in live mode.';
    }
  } catch {
    // Ignore URL parse errors here; validation handles that
  }
  return null;
}
