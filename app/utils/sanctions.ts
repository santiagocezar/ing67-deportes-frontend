import type { PlayerSanctionResponse } from "~/utils/openapi";

export function sanctionStatusLabel(status: PlayerSanctionResponse["status"]) {
    return {
        active: "Activa",
        served: "Cumplida",
        annulled: "Anulada",
    }[status];
}

export function sanctionStatusTheme(status: PlayerSanctionResponse["status"]) {
    return {
        active: "theme-danger",
        served: "theme-success",
        annulled: "theme-secondary",
    }[status];
}
