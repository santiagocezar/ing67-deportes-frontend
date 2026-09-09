export const useAPI = createUseFetch((opts) => ({
    ...opts,
    $fetch: useNuxtApp().$api,
}));
