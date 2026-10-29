import test from 'node:test'
import assert from 'node:assert/strict'
import { validateTelegramWebhookUrl, getTelegramModeWarning } from '../../utils/telegram.js'

test('validates URL protocol is https', () => {
  assert.strictEqual(validateTelegramWebhookUrl(''), 'Webhook URL is required.')
  assert.strictEqual(validateTelegramWebhookUrl('http://gateway.com/v1/webhooks/telegram?apikey=pk_test_123'), 'The URL must start with https://')
})

test('validates URL path contains /v1/webhooks/telegram', () => {
  assert.strictEqual(validateTelegramWebhookUrl('https://gateway.com/other/path?apikey=pk_test_123'), 'The URL must contain /v1/webhooks/telegram')
})

test('validates apikey param', () => {
  assert.strictEqual(validateTelegramWebhookUrl('https://gateway.com/v1/webhooks/telegram'), 'The URL must contain an apikey query parameter starting with pk_test_ or pk_live_ (e.g. ?apikey=pk_test_xxx).')
  assert.strictEqual(validateTelegramWebhookUrl('https://gateway.com/v1/webhooks/telegram?apikey=invalid'), 'The URL must contain an apikey query parameter starting with pk_test_ or pk_live_ (e.g. ?apikey=pk_test_xxx).')
})

test('accepts valid URLs', () => {
  assert.strictEqual(validateTelegramWebhookUrl('https://gateway.com/v1/webhooks/telegram?apikey=pk_test_123'), null)
  assert.strictEqual(validateTelegramWebhookUrl('https://gateway.com/v1/webhooks/telegram?apikey=pk_live_456'), null)
  assert.strictEqual(validateTelegramWebhookUrl('https://gateway.com/v1/webhooks/telegram?other=param&apikey=pk_test_123'), null)
})

test('checks mode warning (warns, does not block)', () => {
  assert.strictEqual(getTelegramModeWarning('https://gateway.com/v1/webhooks/telegram?apikey=pk_live_123', 'test'), 'The URL uses a live API key (pk_live_...), but the dashboard is currently in test mode.')
  assert.strictEqual(getTelegramModeWarning('https://gateway.com/v1/webhooks/telegram?apikey=pk_test_123', 'live'), 'The URL uses a test API key (pk_test_...), but the dashboard is currently in live mode.')
  assert.strictEqual(getTelegramModeWarning('https://gateway.com/v1/webhooks/telegram?apikey=pk_test_123', 'test'), null)
  assert.strictEqual(getTelegramModeWarning('https://gateway.com/v1/webhooks/telegram?apikey=pk_live_123', 'live'), null)
})
