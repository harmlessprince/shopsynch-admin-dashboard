import {useErrorStore} from "~/stores/error.store";
import {useAuthStore} from "~/stores/auth.store";
import {useToastStore} from "~/stores/toast.store";
import {logger} from "~/utils/helpers";


export default defineNuxtPlugin((_nuxtApp) => {
    logger.log('✅ fetch-interceptor plugin loaded');
    const authStore = useAuthStore();
    const errorStore = useErrorStore();
    const toastStore = useToastStore();
    const config = useRuntimeConfig();
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
            let message = data?.message ?? 'Error, please try again later';

            // If silent, suppress toasts and specific redirects (except 401)
            if (isSilent && status >= 400 && status !== 401) {
                logger.error(`[Silent API Error] ${status} ${options.method} ${response.url}:`, data);
                return data;
            }

            switch (status) {
                case 200:
                case 201:
                    break;
                case 400:
                    errorStore.setErrorMessage(data.message)
                    toastStore.error(data?.message ?? 'Bad request, please try again later', error)
                    break;
                case 401:
                    authStore.clearAuthToken()
                    authStore.clearAuthUser()
                    toastStore.error(message, "Unauthenticated")
                    navigateTo("/login")
                    break;
                case 403:
                    toastStore.error(message, "Unauthorized")
                    navigateTo("/unauthorized");
                    break;
                case 404:
                    errorStore.setErrorMessage(message)
                    toastStore.error(message, "Not Found")
                    break;
                case 422:
                    message = data?.message ?? "Validation failed."
                    errorStore.setErrorMessage(message)
                    errorStore.setValidationErrors(data?.errors)
                    toastStore.error(message, "invalid data")
                    break;
                case 500:
                    errorStore.setErrorMessage(data.message)
                    errorStore.setServerError(true)
                    toastStore.error('Seems like it is an issue from our end', 'There was a problem.')
                    break;
                default:
                    if (status >= 400) {
                        toastStore.error('Seems like it is an issue from our end', 'There was a problem.')
                    }
            }
            return data;
        },

        onRequestError(error) {
            logger.error("Request error", error);
            toastStore.error("Check your internet connection or try again later", "Request failed");
            errorStore.setErrorMessage("Network error");
            return Promise.reject(error);
        }
    });
});
