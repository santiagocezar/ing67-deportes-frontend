import type {
    CompetitionDetailResponse,
    MatchResponse,
    MatchRosterScanResponse,
} from "~/utils/openapi";

// El escaneo, su partido y la competencia se consultan juntos porque las
// pantallas de revisión siempre necesitan ese contexto.
export async function useScanDetail() {
    const route = useRoute();
    const { $api } = useNuxtApp();

    const { data, pending, error, refresh } = await useAsyncData(
        () => scanDetailKey(route.params.id),
        async () => {
            const scan = await $api<MatchRosterScanResponse>(
                `/roster-scans/${route.params.id}`,
            );

            const match = await $api<MatchResponse>(
                `/matches/${scan.match_id}`,
            );
            const competition = await $api<CompetitionDetailResponse>(
                `/competitions/${match.competition.id}`,
            );
            return { scan, match, competition };
        },
    );

    const scan = computed(() => data.value?.scan ?? null);
    const match = computed(() => data.value?.match ?? null);
    const competition = computed(() => data.value?.competition ?? null);

    const team = computed(() => {
        if (!scan.value || !match.value) return null;

        return (
            [match.value.team_1, match.value.team_2].find(
                (team) => team.id === scan.value?.team_id,
            ) ?? null
        );
    });

    return { data, pending, error, refresh, scan, match, competition, team };
}
