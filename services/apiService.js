// import {useAuthStore} from "~/stores/auth.store.js";
import {useSwitchModeStore} from "~/stores/mode.store.js";
import {logger} from "~/utils/helpers";

export const useApiService = () => {
    const config = useRuntimeConfig();
    // const authStore = useAuthStore();
    const switchModeStore = useSwitchModeStore();

    const request = async (method, route, data = null, params = {}, headers = {}, options = {}) => {
        try {
            const finalHeaders = { 
                ...headers, 
                ...options.headers,
                'X-Auth-Mode': 'jwt'
            };
            
            // Auto-set Content-Type if not provided and not FormData
            if (!finalHeaders['Content-Type'] && !(data instanceof FormData)) {
                finalHeaders['Content-Type'] = 'application/json';
            }
            
            // Let the browser set the boundary for FormData
            if (data instanceof FormData) {
                delete finalHeaders['Content-Type'];
            }else if (!finalHeaders['Content-Type'] && method !== 'GET') {
                finalHeaders['Content-Type'] = 'application/json';
            }

            // headers['X-Auth-Mode'] = 'jwt';

            const mode = options?.forceMode || switchModeStore.currentMode; // 'test' | 'live'
            let baseURL = mode === 'live' ? config.public.liveBaseUrl : config.public.testBaseUrl;

            logger.log('baseURL', baseURL);
            logger.log('mode', mode);
            logger.log('options', options);
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
                ...options
            });
        } catch (error) {
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
