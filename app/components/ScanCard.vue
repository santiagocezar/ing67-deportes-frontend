<script setup lang="ts">
import type { MatchRosterScanManualReviewListItemResponse } from "~/utils/openapi";

const { review } = defineProps<{
    review: MatchRosterScanManualReviewListItemResponse;
}>();

function statusLabel(
    status: MatchRosterScanManualReviewListItemResponse["status"],
) {
    return {
        pending: "Pendiente",
        resolved: "Resuelta",
        expired: "Vencida",
    }[status];
}

function statusTheme(
    status: MatchRosterScanManualReviewListItemResponse["status"],
) {
    return {
        pending: "theme-warning",
        resolved: "theme-success",
        expired: "theme-secondary",
    }[status];
}
</script>

<template>
    <NuxtLink
        class="card text-decoration-none"
        :to="{ name: 'scans-id', params: { id: review.scan.id } }"
    >
        <div class="card-body">
            <div class="d-flex flex-wrap align-items-start gap-2">
                <div class="flex-grow-1">
                    <h2 class="h5 mb-1">Revisión de {{ review.team.name }}</h2>
                    <p class="fg-2 small mb-0">
                        Partido #{{ review.match.id }}
                        de
                        {{ review.competition.name }}
                    </p>
                </div>
                <span
                    class="badge badge-subtle"
                    :class="statusTheme(review.status)"
                >
                    {{ statusLabel(review.status) }}
                </span>
            </div>
        </div>

        <div class="card-footer d-flex flex-wrap justify-content-between gap-2">
            <small class="fg-2">
                <strong>{{ review.unknown_face_count }}</strong>
                {{
                    review.unknown_face_count === 1
                        ? "cara sin identificar"
                        : "caras sin identificar"
                }}
                · Escaneo del
                {{ formatDateTime(review.scan.created_at) }}
            </small>
            <small class="fg-2">
                <template v-if="review.status === 'expired'">
                    Venció el {{ formatDateTime(review.expires_at) }}
                </template>
                <template v-else-if="review.status === 'pending'">
                    Vence el {{ formatDateTime(review.expires_at) }}
                </template>
                <template v-else> Resuelta </template>
            </small>
        </div>
    </NuxtLink>
</template>
