// Carga el usuario autenticado una sola vez por sesión y lo deja disponible
// para todas las páginas a través de useState (ver useCurrentUser).
export default defineNuxtPlugin({
    name: "current-user",
    dependsOn: ["api"],
    async setup() {
        const { loaded } = useCurrentUser();
        if (!loaded.value) await refreshCurrentUser();
    },
});
