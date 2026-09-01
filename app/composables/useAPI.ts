export const useAPI = createUseFetch((opts) => {
    const auth = useAuth();
    const { $api } = useNuxtApp();

    return {
        $fetch: $api,
    };
});
