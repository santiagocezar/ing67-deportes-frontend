import type {
    PlayerSanctionListResponse,
    PlayerSanctionResponse,
} from "~/utils/openapi";

interface ActiveSanctionEntry {
    sanctions: PlayerSanctionResponse[];
    remainingMatches: number;
}

// La API expone las sanciones por jugador, así que se cachean por id para no
// repetir consultas cada vez que se abre el plantel de un equipo.
export function useActiveSanctions() {
    const { $api } = useNuxtApp();

    const cache = useState<Record<number, ActiveSanctionEntry>>(
        "active-player-sanctions",
        () => ({}),
    );

    const inFlight = new Map<number, Promise<void>>();

    async function loadPlayer(playerId: number, force = false) {
        if (!force && cache.value[playerId]) return;
        if (!force && inFlight.has(playerId)) return inFlight.get(playerId);

        const request = $api<PlayerSanctionListResponse>(
            `/players/${playerId}/sanctions`,
            { query: { status: "active", page: 1 } },
        )
            .then((response) => {
                cache.value = {
                    ...cache.value,
                    [playerId]: {
                        sanctions: response.sanctions,
                        remainingMatches: response.sanctions.reduce(
                            (total, sanction) =>
                                total + sanction.remaining_matches,
                            0,
                        ),
                    },
                };
            })
            .catch(() => {
                // Sin datos no se bloquea la selección: la API sigue validando.
            })
            .finally(() => {
                inFlight.delete(playerId);
            });

        inFlight.set(playerId, request);
        return request;
    }

    async function load(playerIds: number[], force = false) {
        const uniqueIds = [...new Set(playerIds)];
        await Promise.allSettled(
            uniqueIds.map((playerId) => loadPlayer(playerId, force)),
        );
    }

    function activeSanctions(playerId: number) {
        return cache.value[playerId]?.sanctions ?? [];
    }

    function isSanctioned(playerId: number) {
        return activeSanctions(playerId).length > 0;
    }

    function remainingMatches(playerId: number) {
        return cache.value[playerId]?.remainingMatches ?? 0;
    }

    function forget(playerId: number) {
        const next = { ...cache.value };
        delete next[playerId];
        cache.value = next;
    }

    return {
        cache,
        load,
        loadPlayer,
        activeSanctions,
        isSanctioned,
        remainingMatches,
        forget,
    };
}
