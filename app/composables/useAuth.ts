export interface Token {
    access_expires_in: number;
    access_token: string;
    refresh_token: string;
    token_type: "Bearer";
}

export function useAuth() {
    const tokenCookie = useCookie("login_response", { sameSite: "lax" });
    const token = useState<Token>("token");
    const runtimeConfig = useRuntimeConfig();

    if (tokenCookie.value) {
        token.value = JSON.parse(tokenCookie.value);
    }

    return {
        get token() {
            return token.value;
        },
        async login(email: string, password: string) {
            const res: Token = await $fetch("/auth/login", {
                method: "POST",
                baseURL: runtimeConfig.public.apiBase,
                body: { email, password },
            });
            token.value = res;
            tokenCookie.value = JSON.stringify(res);
        },
        async logout() {
            tokenCookie.value = undefined;
            await navigateTo("/login");
        },
        async refresh() {
            const { token_type, refresh_token } = token.value;
            const res: Token = await $fetch("/auth/refresh", {
                method: "POST",
                baseURL: runtimeConfig.public.apiBase,
                headers: {
                    Authorization: `${token_type} ${refresh_token}`,
                },
                onResponseError: async ({ response, error }) => {
                    if (response.status === 401) {
                        await this.logout();
                    } else {
                        throw error;
                    }
                },
            });
            token.value = res;
            tokenCookie.value = JSON.stringify(res);
        },
    };
}
