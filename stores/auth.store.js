import {defineStore} from "pinia";
// import {getObjectFromLocalStorage} from "~/utils/helpers.js";
import {endpoints} from "~/utils/endpoints.js";
import {useApiService} from "~/services/apiService.js";
import {useToastStore} from "~/stores/toast.store.js";


export const useAuthStore = defineStore("authStore", () => {
    const {post, get, patch} = useApiService();
    const authToken = ref(null);
    const user = ref({
        merchantId: "", id: null, email: null, fullName: null, address: null, createdAt: null, role: {
            name: undefined, slug: undefined,
        }, currentMode: "test"
    });
    const businessProfile = ref({
        businessName: "",
        user: {
            merchantId: "",
            tenantId: "",
            id: null,
            email: null,
            fullName: null,
            address: null,
            createdAt: null,
            lastActiveTenantId: "",
            role: {
                name: undefined, slug: undefined,
            },
            currentMode: "test"
        }
    });
    const currentMode = ref(null);
    const returnUrl = ref(null);
    const toastStore = useToastStore();
    const forgotPasswordTokenSent = ref(false);
    const emailVerificationTokenSent = ref(false);
    const emailToVerify = ref(null);
    const forgotPasswordToken = ref(null);
    const forgotPasswordTokenEmail = ref(null);

    const verifyingEmail = ref(false)
    const init = async () => {
        await fetchUserProfile()
    };

    const setAuthToken = (newToken) => {
        authToken.value = newToken;
    };
    const getAuthToken = () => {
        return authToken.value
    };

    const clearAuthToken = () => {
        authToken.value = null;
        useCookie('auth_token').value = null;
    };

    const setAuthUser = (newUser) => {
        user.value = newUser;
        currentMode.value = newUser.currentMode;
    };

    const clearAuthUser = () => {
        user.value = null;
    };

    const setInvitationRedirect = (storeName, url) => {
        if (!storeName || !url) return;
        const key = `ss_inv_redir_${storeName.toLowerCase().replace(/\s+/g, '_')}`;
        const data = {
            url,
            expiry: Date.now() + 3600000 // 1 hour
        };
        localStorage.setItem(key, JSON.stringify(data));
        localStorage.setItem('ss_last_inv_redir', key);
    };

    const getInvitationRedirect = () => {
        if (import.meta.server) return null;
        const lastKey = localStorage.getItem('ss_last_inv_redir');
        if (!lastKey) return null;
        
        const rawData = localStorage.getItem(lastKey);
        if (!rawData) return null;
        
        try {
            const data = JSON.parse(rawData);
            if (Date.now() > data.expiry) {
                localStorage.removeItem(lastKey);
                localStorage.removeItem('ss_last_inv_redir');
                return null;
            }
            return data.url;
        } catch (e) {
            return null;
        }
    };

    const clearInvitationRedirect = () => {
        if (import.meta.server) return null;
        const lastKey = localStorage.getItem('ss_last_inv_redir');
        if (lastKey) {
            localStorage.removeItem(lastKey);
        }
        localStorage.removeItem('ss_last_inv_redir');
    };


    async function login(email, password, returnUrl) {
        const response = await post(endpoints.login, {email, password}, {forceMode: 'live'});
        if (response) {
            useCookie('auth_token').value = response.token;
            setAuthToken(response.token);
            await fetchUserProfile()
            
            const persistedRedirect = getInvitationRedirect();
            const finalRedirect = returnUrl || persistedRedirect;
            
            if (finalRedirect) {
                clearInvitationRedirect();
                navigateTo(finalRedirect);
            } else {
                navigateTo('/dashboard');
            }
            toastStore.success('Logged in successfully!', '')
        }
    }

    async function register(email, password, storeName, token) {
        const response = await post(endpoints.merchantSignUp, {
            email, password, storeName, token
        }, {forceMode: 'live'});
        if (response) {
            emailVerificationTokenSent.value = true;
            emailToVerify.value = email;
            await navigateTo('/verify-email');
            toastStore.success('Registration successful!', '')
        }
    }

    async function requestPasswordReset(email) {
        const response = await post(endpoints.requestPasswordReset, {email}, {forceMode: 'live'});
        if (response) {
            forgotPasswordTokenEmail.value = email;
            forgotPasswordTokenSent.value = true;
            await navigateTo('/verify/reset-password-token');
            // toastStore.success('!', '')
        }
    }

    async function resetPassword(token, newPassword, confirmPassword) {
        const response = await post(endpoints.resetPassword, {
            token, newPassword, confirmPassword
        }, {forceMode: 'live'});
        if (response) {
            await navigateTo('/login');
            toastStore.success('Password reset successful!', 'success')
        }
    }


    async function changePassword(currentPassword, newPassword, confirmPassword) {
        const response = await patch(endpoints.changePassword, {
            currentPassword, newPassword, confirmPassword
        }, {forceMode: 'live'});
        if (response) {
            toastStore.success('Password reset successful!', 'success')
        }
    }

    async function verifyEmail(email, token) {
        const response = await post(endpoints.verifyMerchantEmail, {email, token}, {forceMode: 'live'});
        if (response) {
            useCookie('auth_token').value = response.data.token;
            setAuthToken(response.data.token);
            emailToVerify.value = null;
            emailVerificationTokenSent.value = false;
            await fetchUserProfile()
            
            const persistedRedirect = getInvitationRedirect();
            if (persistedRedirect) {
                clearInvitationRedirect();
                navigateTo(persistedRedirect);
            }
            return response;
        }
    }

    async function verifyPasswordResetToken(email, token) {
        forgotPasswordToken.value = token;
        const response = await post(endpoints.verifyPasswordResetToken, {email, token}, {forceMode: 'live'});
        if (response) {
            await navigateTo('/reset-password');
        }
    }

    async function fetchUserProfile() {

        const response = await get(endpoints.userProfile, {}, {forceMode: 'live'})
        setAuthUser(response?.data);
        return response?.data;
    }

    async function fetchUserBusinessProfile() {
        businessProfile.value = {};
    }


    async function loginWithGoogle(token, refreshToken, expiresIn) {
        useCookie('auth_token').value = token;
        setAuthToken(token);
        await fetchUserProfile();
        toastStore.success('Logged in with Google successfully!', '')
        await navigateTo('/dashboard');
    }

    function initiateGoogleLogin(redirectUrl) {
        const config = useRuntimeConfig();
    
        let baseURL = config.public.liveBaseUrl ;
        // Ensure baseURL doesn't have a trailing slash if endpoints.googleMerchantLoginInitiate has a leading one
        if (baseURL.endsWith('/')) {
            baseURL = baseURL.slice(0, -1);
        }
        
        const url = `${baseURL}${endpoints.googleMerchantLoginInitiate}`;
        if   (redirectUrl) {
            window.location.href = url + "?redirectUrl=" + redirectUrl;
        } else {
            window.location.href = url;
        }
    }

    async function logout() {
        clearAuthToken();
        clearAuthUser();
        await navigateTo('/login');
        toastStore.success('Logged out successfully!', '')
    }

    function resetAll() {
        clearAuthToken();
        clearAuthUser();
        currentMode.value = null;
        emailVerificationTokenSent.value = false;
        emailToVerify.value = null;
        forgotPasswordToken.value = null;
        forgotPasswordTokenEmail.value = null;
        forgotPasswordTokenSent.value = false;
    }

    return {
        login,
        loginWithGoogle,
        initiateGoogleLogin,
        logout,
        register,
        authToken,
        clearAuthToken,
        clearAuthUser,
        user,
        fetchUserProfile,
        setAuthToken,
        setAuthUser,
        getAuthToken,
        init,
        currentMode,
        verifyingEmail,
        emailVerificationTokenSent,
        emailToVerify,
        verifyEmail,
        verifyPasswordResetToken,
        requestPasswordReset,
        resetPassword,
        changePassword,
        forgotPasswordTokenEmail,
        forgotPasswordToken,
        resetAll,
        fetchUserBusinessProfile,
        businessProfile,
        setInvitationRedirect,
        getInvitationRedirect,
        clearInvitationRedirect
    }
});
