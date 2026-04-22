export const useAuth = () => {
    const token = useCookie('auth_token'); // Persists token in cookies

    const setToken = (newToken) => {
        token.value = newToken;
    };

    const clearToken = () => {
        token.value = null;
    };

    return { token, setToken, clearToken };
};
