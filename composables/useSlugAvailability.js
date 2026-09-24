import { ref, unref } from 'vue'
import { useStoreStore } from '~/stores/store.store.js'
import { debounce, logger } from '~/utils/helpers.js'

const DEFAULT_INVALID_SLUG_MESSAGE = 'Store link must contain only lowercase letters, numbers, and hyphens, and cannot start or end with a hyphen.'

function resolveValue(value) {
  return typeof value === 'function' ? value() : unref(value)
}

export function useSlugAvailability(options = {}) {
  const storeStore = useStoreStore()
  const isCheckingSlug = ref(false)
  const slugValidationError = ref('')

  function generateStorefrontUrl(tradingName) {
    if (!tradingName) return ''
    const slug = tradingName
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
    return `https://${slug}.shopsynch.com`
  }

  function extractSlugFromUrl(url) {
    const match = String(url || '').match(/^https?:\/\/([a-z0-9-]+)\.(shopsync|shopsynch)\.com\/?$/)
    return match ? match[1] : null
  }

  function isValidSlug(slug) {
    return /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug)
  }

  function getSlugFromValue(value) {
    const trimmedValue = String(value || '').trim()
    const normalizedValue = trimmedValue.toLowerCase()
    if (!trimmedValue) return { shouldCheck: false, slug: '' }

    if (normalizedValue.startsWith('http://') || normalizedValue.startsWith('https://')) {
      if (!normalizedValue.includes('.shopsynch.com') && !normalizedValue.includes('.shopsync.com')) {
        return { shouldCheck: false, slug: '' }
      }

      const slug = extractSlugFromUrl(normalizedValue)
      return slug ? { shouldCheck: true, slug } : { shouldCheck: false, slug: '', error: options.invalidUrlMessage || 'Invalid storefront URL format' }
    }

    return isValidSlug(trimmedValue)
      ? { shouldCheck: true, slug: trimmedValue }
      : { shouldCheck: false, slug: '', error: options.invalidSlugMessage || DEFAULT_INVALID_SLUG_MESSAGE }
  }

  async function validateSlug(value, validationOptions = {}) {
    const { shouldCheck, slug, error } = getSlugFromValue(value)

    if (error) {
      slugValidationError.value = error
      return false
    }

    if (!shouldCheck) {
      slugValidationError.value = ''
      return true
    }

    const currentSlug = String(resolveValue(validationOptions.currentSlug ?? options.currentSlug) || '').trim().toLowerCase()
    if (currentSlug && slug === currentSlug) {
      slugValidationError.value = ''
      return true
    }

    isCheckingSlug.value = true
    try {
      const result = await storeStore.checkSlugAvailability(slug)
      if (result.isTaken) {
        slugValidationError.value = `The store link "${slug}" is already taken. Please choose a different one.`
        return false
      }

      slugValidationError.value = ''
      return true
    } catch (error) {
      logger.error('Error validating slug:', error)
      slugValidationError.value = 'Unable to check store link availability. Please try again.'
      return false
    } finally {
      isCheckingSlug.value = false
    }
  }

  return {
    isCheckingSlug,
    slugValidationError,
    validateSlug,
    debouncedValidateSlug: debounce(validateSlug, options.delay ?? 500),
    generateStorefrontUrl,
    extractSlugFromUrl,
  }
}
