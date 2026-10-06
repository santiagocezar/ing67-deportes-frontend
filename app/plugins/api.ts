export default defineNuxtPlugin((nuxtApp) => {
    const auth = useAuth();

    let refreshing: Promise<void> | null = null;

    const api = $fetch.create({
        baseURL: useRuntimeConfig().public.apiBase,
        retry: 1,
        retryStatusCodes: [401],
        onRequest({ request, options, error }) {
            if (auth.token) {
                const { token_type, access_token } = auth.token;

                options.headers.set(
                    "Authorization",
                    `${token_type} ${access_token}`,
                );
            }
        },
        async onResponseError({ response }) {
            if (response.status === 401) {
                await nuxtApp.runWithContext(async () => {
                    if (!refreshing) {
                        refreshing = auth.refresh().finally(() => {
                            refreshing = null;
                        });
                    }
                    await refreshing;
                });
            }
        },
    });
    // Expose to useNuxtApp().$customFetch
    return {
        provide: {
            api: api,
        },
    };
});
