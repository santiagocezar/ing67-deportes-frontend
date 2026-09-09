export default defineNuxtPlugin((nuxtApp) => {
    const auth = useAuth();
    const route = useRoute();

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
                await nuxtApp.runWithContext(async () => {
                    console.log("hoaosfdo");
                    let target: string | undefined;
                    if (typeof location !== "undefined") {
                        target = location.toString();
                    } else {
                        target = route.fullPath;
                    }

                    console.log("Target:", target);
                    return await auth.logout(target);
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
