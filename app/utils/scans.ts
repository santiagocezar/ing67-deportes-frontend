// Claves de los datos que cachean las pantallas de revisiones. Se comparten
// para poder descartarlos después de resolver una revisión manual y que las
// pantallas muestren el estado actualizado sin recargar la página entera.
export const MANUAL_REVIEWS_KEY_PREFIX = "manual-reviews-";
export const MATCH_REVIEW_STATUS_KEY_PREFIX = "match-review-status-";

export function scanDetailKey(id: unknown) {
    return `scan-${id}`;
}

export function sportManualReviewsKey(
    sportId: unknown,
    filters: { status: string; sort: string; page: number },
) {
    return `${MANUAL_REVIEWS_KEY_PREFIX}sport-${sportId}-${filters.status}-${filters.sort}-${filters.page}`;
}

export function matchManualReviewsKey(matchId: unknown) {
    return `${MANUAL_REVIEWS_KEY_PREFIX}match-${matchId}`;
}

export function matchReviewStatusKey(matchId: unknown) {
    return `${MATCH_REVIEW_STATUS_KEY_PREFIX}${matchId}`;
}

// Descarta la revisión ya resuelta y los listados que la incluían (el del
// deporte, el del partido y su contador de pendientes).
export function invalidateReviewData(scanId: unknown) {
    clearNuxtData(
        (key) =>
            key === scanDetailKey(scanId) ||
            key.startsWith(MANUAL_REVIEWS_KEY_PREFIX) ||
            key.startsWith(MATCH_REVIEW_STATUS_KEY_PREFIX),
    );
}
