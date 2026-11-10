import type { Ref } from "vue";
import type {
    AuthMeResponse,
    MatchResponse,
    MatchRosterScanResponse,
} from "~/utils/openapi";

// Una revisión pendiente solo la puede resolver el árbitro asignado al partido
// y únicamente con el partido en curso o finalizado.
export async function useManualReviewAccess(
    scan: Ref<MatchRosterScanResponse | null>,
    match: Ref<MatchResponse | null>,
) {
    const { data: me } = await useAPI<AuthMeResponse>("/auth/me", {
        onResponseError: () => {}, // evitar redirigir
    });

    const review = computed(() => scan.value?.manual_review ?? null);

    const isAssignedReferee = computed(
        () =>
            me.value?.user.role === "referee" &&
            me.value.user.id === match.value?.referee.id,
    );

    const matchOpen = computed(
        () =>
            match.value?.status === "in_progress" ||
            match.value?.status === "finished",
    );

    const canResolve = computed(
        () =>
            review.value?.status === "pending" &&
            isAssignedReferee.value &&
            matchOpen.value,
    );

    // Motivo por el que una revisión pendiente todavía no se puede resolver.
    const blockedReason = computed(() => {
        if (!review.value || review.value.status !== "pending") return "";
        if (canResolve.value) return "";

        if (isAssignedReferee.value) {
            return "La revisión se podrá resolver cuando el partido esté en curso o finalizado.";
        }

        return "Solo el árbitro asignado al partido puede resolver esta revisión.";
    });

    return {
        review,
        isAssignedReferee,
        matchOpen,
        canResolve,
        blockedReason,
    };
}
