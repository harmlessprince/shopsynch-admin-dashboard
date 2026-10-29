// import {useAuthStore} from "~/stores/auth.store.js";
import {useSwitchModeStore} from "~/stores/mode.store.js";
import {logger} from "~/utils/helpers";

export const useApiService = () => {
    const config = useRuntimeConfig();
    // const authStore = useAuthStore();
    const switchModeStore = useSwitchModeStore();

    const request = async (method, route, data = null, params = {}, headers = {}, options = {}) => {
        try {
            if (!route || typeof route !== "string") {
                throw new Error(`Invalid API endpoint: route must be a non-empty string, got ${typeof route} (${route})`);
            }
            const { headers: optionHeaders = {}, forceMode, ...fetchOptions } = options;
            const mode = forceMode || switchModeStore.currentMode || 'live'; // 'test' | 'live'
            let baseURL = mode === 'test' ? config.public.testBaseUrl : config.public.liveBaseUrl;

            const finalHeaders = { 
                ...headers, 
                ...optionHeaders,
                'X-Auth-Mode': 'jwt',
                'X-ShopSynch-Client': 'admin-dashboard',
                'X-Mode': mode,
            };

            // Auto-set Content-Type if not provided and not FormData
            if (!finalHeaders['Content-Type'] && !(data instanceof FormData)) {
                finalHeaders['Content-Type'] = 'application/json';
            }
            
            // Let the browser set the boundary for FormData
            if (data instanceof FormData) {
                delete finalHeaders['Content-Type'];
            } else if (!finalHeaders['Content-Type'] && method !== 'GET') {
                finalHeaders['Content-Type'] = 'application/json';
            }

            logger.log('baseURL', baseURL);
            logger.log('mode', mode);
            logger.log('options', fetchOptions);
            // if (config.public.appEnv === "development") {
            //     baseURL = config.public.apiBase;
            // }
            logger.log("baseURL", baseURL);
            return await $fetch(route, {
                baseURL: baseURL,
                method,
                headers: finalHeaders,
                body: method !== 'GET' ? data : undefined,
                params: method === 'GET' ? params : undefined,
                ...fetchOptions
            });
        } catch (error) {
            const status = error?.response?.status || error?.statusCode;
            if (status === 401 && !options?.skipAuthRefresh && !options?.authRetry && import.meta.client) {
                const authStore = useAuthStore();
                const refreshed = await authStore.refreshAuthToken();
                if (refreshed) {
                    return request(method, route, data, params, headers, {...options, authRetry: true});
                }
                authStore.clearAuthToken();
                authStore.clearRefreshToken();
                authStore.clearAuthUser();
                await navigateTo('/login');
            }
            logger.error(`API ${method} Error:`, error);
            throw error;
        }
    };

    return {
        get: (route, params, options = {}) => request('GET', route, null, params, {}, options),
        post: (route, data, options = {}) => request('POST', route, data, {}, {}, options),
        put: (route, data, options = {}) => request('PUT', route, data, {}, {}, options),
        patch: (route, data, options = {}) => request('PATCH', route, data, {}, {}, options),
        delete: (route, options = {}) => request('DELETE', route, {}, {}, {}, options),
    };
};
