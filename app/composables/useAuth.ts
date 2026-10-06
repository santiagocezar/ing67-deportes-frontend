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
    const route = useRoute();

    if (tokenCookie.value) {
        token.value = JSON.parse(tokenCookie.value);
    }
    console.log({ ...token.value });

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
        async logout(target?: string) {
            tokenCookie.value = undefined;
            const params = new URLSearchParams();
            if (target) {
                params.set("target", target);
            }
            console.log("URL:", params.toString());
            return await navigateTo("/login?" + params.toString());
        },
        async refresh() {
            console.log("refreshing!!!!!!");

            let target: string | undefined;
            if (typeof location !== "undefined") {
                target = location.toString();
            } else {
                target = route.fullPath;
            }

            if (!token.value) {
                console.log("not refreshing!!!!!!");
                console.log("Target:", target);
                await this.logout(target);
                throw new Error("No token to refresh");
            }

            const { token_type, refresh_token } = token.value;
            const res: Token = await $fetch("/auth/refresh", {
                method: "POST",
                baseURL: runtimeConfig.public.apiBase,
                headers: {
                    Authorization: `${token_type} ${refresh_token}`,
                },
                onResponseError: async ({ response, error }) => {
                    if (response.status === 401) {
                        console.log("Target:", target);
                        await this.logout(target);
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
