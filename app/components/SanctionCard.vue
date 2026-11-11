<script setup lang="ts">
import type { PlayerSanctionResponse } from "~/utils/openapi";

import { IconChevronRight } from "~/assets/icons";

const props = withDefaults(
    defineProps<{
        sanction: PlayerSanctionResponse;
        showLink?: boolean;
    }>(),
    {
        showLink: true,
    },
);

const route = useRoute();
</script>

<template>
    <article class="card">
        <div class="card-body vstack gap-3">
            <div class="hstack flex-wrap align-items-center">
                <h3 class="h4 mb-0 flex-grow-1">{{ sanction.title }}</h3>
                <span
                    class="badge badge-subtle"
                    :class="sanctionStatusTheme(sanction.status)"
                >
                    {{ sanctionStatusLabel(sanction.status) }}
                </span>
            </div>

            <p class="mb-0 small">{{ formatDateTime(sanction.created_at) }}</p>
            <p class="mb-0 small">{{ sanction.reason }}</p>

            <div class="d-flex justify-content-end">
                <NuxtLink
                    class="btn-outline btn-sm theme-primary stretched-link"
                    :to="{
                        name: 'home-sport-sanctions-sanctionId',
                        params: {
                            sport: route.params.sport,
                            sanctionId: sanction.id,
                        },
                    }"
                >
                    <span>Detalles</span>
                    <IconChevronRight />
                </NuxtLink>
            </div>
        </div>
    </article>
</template>
