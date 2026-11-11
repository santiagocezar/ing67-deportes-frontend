import type { AuthMeResponse, PlayerSanctionResponse } from "~/utils/openapi";

// Reglas de edición y anulación que también aplica el backend. Se replican acá
// para no ofrecer acciones que van a ser rechazadas.
export async function useSanctionPermissions() {
    const { data: me } = await useAPI<AuthMeResponse>("/auth/me", {
        onResponseError: () => {}, // evitar redirigir
    });

    const isAdministrator = computed(
        () => me.value?.user.role === "administrator",
    );

    // El estado del partido se deriva de sus horarios, igual que en la API. Si
    // el partido está en curso, la ventana de edición del árbitro sigue abierta.
    function isSourceMatchInProgress(sanction: PlayerSanctionResponse) {
        const now = Date.now();
        return (
            new Date(sanction.source_match.starts_at).getTime() <= now &&
            now < new Date(sanction.source_match.ends_at).getTime()
        );
    }

    function canEdit(sanction: PlayerSanctionResponse) {
        if (sanction.status !== "active") return false;
        if (isAdministrator.value) return true;

        return (
            me.value?.user.role === "referee" &&
            me.value.user.id === sanction.creator.id &&
            isSourceMatchInProgress(sanction)
        );
    }

    function canAnnull(sanction: PlayerSanctionResponse) {
        return isAdministrator.value && sanction.status === "active";
    }

    // La duración queda fija desde que se descuenta el primer partido.
    function isDurationLocked(sanction: PlayerSanctionResponse) {
        return sanction.remaining_matches < sanction.suspension_matches;
    }

    return { me, isAdministrator, canEdit, canAnnull, isDurationLocked };
}
