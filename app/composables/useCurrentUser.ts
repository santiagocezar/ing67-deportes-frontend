import type { AuthMeResponse } from "~/utils/openapi";

import { ADMIN_ROLE } from "~/utils/roles";

// El usuario autenticado se guarda en un estado compartido (useState) para que
// todas las páginas y componentes lo lean sin repetir la petición a /auth/me.
// La carga inicial la resuelve plugins/current-user.ts.
export function useCurrentUser() {
    const me = useState<AuthMeResponse | null>("current-user", () => null);
    const loaded = useState<boolean>("current-user-loaded", () => false);

    const isAdministrator = computed(() => me.value?.user.role === ADMIN_ROLE);

    return { me, loaded, isAdministrator };
}

// Vuelve a consultar /auth/me y actualiza el estado compartido. Se usa al
// iniciar o cerrar sesión y como respaldo si el estado quedó sin cargar.
export async function refreshCurrentUser() {
    const { me, loaded } = useCurrentUser();
    const { $api } = useNuxtApp();

    try {
        me.value = await $api<AuthMeResponse>("/auth/me", {
            onResponseError: () => {}, // sin sesión no se redirige
        });
    } catch {
        // Sin sesión (o con un token vencido) se sigue como visitante.
        me.value = null;
    } finally {
        loaded.value = true;
    }
}
