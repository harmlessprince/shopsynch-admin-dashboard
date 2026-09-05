import {useErrorStore} from "~/stores/error.store";
import {useAuthStore} from "~/stores/auth.store";
import {useToastStore} from "~/stores/toast.store";
import {logger} from "~/utils/helpers";

const LONG_ERROR_MESSAGE_LIMIT = 140;

export default defineNuxtPlugin((_nuxtApp) => {
    logger.log('✅ fetch-interceptor plugin loaded');
    const authStore = useAuthStore();
    const errorStore = useErrorStore();
    const toastStore = useToastStore();
    const config = useRuntimeConfig();

    function showErrorFeedback(message: string, title: string, options: { resolution?: string; forcePersistent?: boolean } = {}) {
        const shouldPersist = options.forcePersistent || message.length > LONG_ERROR_MESSAGE_LIMIT || Boolean(options.resolution);

        if (shouldPersist) {
            errorStore.setPersistentError({
                title,
                message,
                resolution: options.resolution,
            });
            return;
        }

        toastStore.error(message, title);
        errorStore.clearPersistentError();
    }
    // Extend the $fetch options globally



    globalThis.$fetch = $fetch.create({
        onRequest({options}) {
            errorStore.resetErrors()
            if (!config.public.debugMode) {
                logger.log('[fetch] request:', options.method, options.baseURL);
            }
            const token = authStore.getAuthToken();
            if (token) {
                options.headers.set("Authorization", `Bearer ${token}`);
            }
            if (authStore.currentMode) {
                options.headers.set("X-Mode", authStore.currentMode)
            }
            if (authStore.user?.merchantId?.length > 1) {
                logger.log(authStore.user)
                options.headers.set("X-MerchantId", authStore.user.merchantId)
            }
        },

        onResponse({response, options}) {
            // Optionally handle global success logging
            const status = response?.status;
            const type = response?.type;
            const data = response._data;
            if (data?.id === 'dev' && type === 'basic') {
                return
            }

            const isSilent = (options as any).silent;

            const error = data?.error ?? 'error';
            let message = data?.message ?? data?.detail ?? 'Error, please try again later';
            const errorCodeValue: string | undefined = data?.errorCode ?? data?.code;
            const resolutionValue: string | undefined = data?.resolution;

            // If silent, suppress toasts and specific redirects (except 401)
            if (isSilent && status >= 400 && status !== 401) {
                logger.error(`[Silent API Error] ${status} ${options.method} ${response.url}:`, data);
                return data;
            }

            switch (status) {
                case 200:
                case 201:
                    errorStore.clearPersistentError();
                    break;
                case 400:
                    errorStore.setErrorMessage(message)
                    showErrorFeedback(message, error, { resolution: resolutionValue })
                    break;
                case 401:
                    if (!(options as any).skipAuthRefresh && !(options as any).authRetry && authStore.getRefreshToken()) {
                        break;
                    }
                    authStore.clearAuthToken()
                    authStore.clearRefreshToken()
                    authStore.clearAuthUser()
                    showErrorFeedback(message, "Unauthenticated", { resolution: resolutionValue })
                    navigateTo("/login")
                    break;
                case 403:
                    showErrorFeedback(message, "Unauthorized", { resolution: resolutionValue })
                    navigateTo("/unauthorized");
                    break;
                case 404:
                    errorStore.setErrorMessage(message)
                    showErrorFeedback(message, "Not Found", { resolution: resolutionValue })
                    break;
                case 409:
                    errorStore.setErrorMessage(message)
                    showErrorFeedback(message, "Update conflict", {
                        resolution: resolutionValue,
                        forcePersistent: true,
                    })
                    break;
                case 422:
                    message = data?.message ?? "Validation failed."
                    errorStore.setErrorMessage(message)
                    errorStore.setValidationErrors(data?.errors)
                    showErrorFeedback(message, "Invalid data", { resolution: resolutionValue })
                    break;
                case 429:
                    errorStore.setErrorMessage(message)
                    showErrorFeedback(message, "Daily limit reached", { resolution: resolutionValue })
                    break;
                case 410:
                    errorStore.setErrorMessage(message)
                    showErrorFeedback(message, "Endpoint deprecated", {
                        resolution: resolutionValue,
                        forcePersistent: true,
                    })
                    break;
                case 503:
                    errorStore.setErrorMessage(message)
                    showErrorFeedback(message, "Service unavailable", { resolution: resolutionValue })
                    break;
                case 500:
                    errorStore.setErrorMessage(message)
                    errorStore.setServerError(true)
                    showErrorFeedback('Seems like it is an issue from our end', 'There was a problem.', { resolution: resolutionValue })
                    break;
                default:
                    if (status >= 400) {
                        showErrorFeedback(message, errorCodeValue || 'There was a problem.', { resolution: resolutionValue })
                    }
            }
            return data;
        },

        onRequestError(error) {
            logger.error("Request error", error);
            errorStore.clearPersistentError();
            toastStore.error("Check your internet connection or try again later", "Request failed");
            errorStore.setErrorMessage("Network error");
            return Promise.reject(error);
        }
    });
});
