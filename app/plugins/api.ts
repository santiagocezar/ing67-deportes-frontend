export default defineNuxtPlugin((nuxtApp) => {
    const auth = useAuth();

    const api = $fetch.create({
        baseURL: useRuntimeConfig().public.apiBase,
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
                await nuxtApp.runWithContext(() => auth.logout());
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
