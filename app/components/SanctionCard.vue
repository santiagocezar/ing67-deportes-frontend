<script setup lang="ts">
import type { PlayerSanctionResponse } from "~/utils/openapi";

import { IconEdit, IconSubtract } from "~/assets/icons";

const props = defineProps<{
    sanction: PlayerSanctionResponse;
    canEdit?: boolean;
    canAnnull?: boolean;
}>();

const emit = defineEmits<{
    edit: [];
    annul: [];
}>();

const route = useRoute();

const wasUpdated = computed(
    () => props.sanction.updated_at !== props.sanction.created_at,
);

const annulledAtLabel = computed(() =>
    props.sanction.annulled_at
        ? formatDateTime(props.sanction.annulled_at)
        : "",
);
</script>

<template>
    <article class="card">
        <div class="card-body vstack gap-3">
            <div class="d-flex flex-wrap align-items-start gap-2">
                <h3 class="h6 mb-0">{{ sanction.title }}</h3>
                <span
                    class="badge badge-subtle"
                    :class="sanctionStatusTheme(sanction.status)"
                >
                    {{ sanctionStatusLabel(sanction.status) }}
                </span>
            </div>

            <p class="mb-0">{{ sanction.reason }}</p>

            <div class="d-flex flex-wrap gap-4 fg-2 small">
                <span v-if="sanction.status === 'active'">
                    <strong>{{ sanction.remaining_matches }}</strong>
                    de {{ sanction.suspension_matches }}
                    {{ sanction.suspension_matches === 1 ? "fecha" : "fechas" }}
                    pendientes
                </span>
                <span v-else-if="sanction.status === 'served'">
                    Sanción cumplida
                </span>
                <span v-else>Anulada: no descuenta fechas</span>
                <span>
                    Fechas asignadas:
                    <strong>{{ sanction.suspension_matches }}</strong>
                </span>
                <span>
                    Fechas cumplidas:
                    <strong>
                        {{
                            sanction.suspension_matches -
                            sanction.remaining_matches
                        }}
                    </strong>
                </span>
                <span
                    >Vigente desde
                    {{ formatDateTime(sanction.effective_at) }}</span
                >
            </div>

            <div class="d-flex flex-wrap align-items-center gap-2">
                <span class="badge badge-subtle theme-secondary">
                    {{ sanction.source_competition.name }}
                </span>
                <span class="fg-2 small">
                    Partido del
                    {{ formatDateTime(sanction.source_match.starts_at) }}
                </span>
                <NuxtLink
                    class="fg-2 small"
                    :to="{
                        name: 'home-sport-competitions-id-matches-matchId',
                        params: {
                            sport: route.params.sport,
                            id: sanction.source_competition.id,
                            matchId: sanction.source_match.id,
                        },
                    }"
                >
                    Ver partido de origen
                </NuxtLink>
            </div>

            <p v-if="sanction.frozen_teams.length" class="fg-2 small mb-0">
                Equipos al momento de la sanción:
                {{ sanction.frozen_teams.map((team) => team.name).join(", ") }}
            </p>

            <p class="fg-2 small mb-0">
                Creada por {{ sanction.creator.name }} el
                {{ formatDateTime(sanction.created_at) }}.
                <template v-if="wasUpdated">
                    Modificada por {{ sanction.updater.name }} el
                    {{ formatDateTime(sanction.updated_at) }}.
                </template>
                <template v-if="sanction.served_at">
                    Cumplida el {{ formatDateTime(sanction.served_at) }}.
                </template>
                <template
                    v-if="sanction.status === 'annulled' && sanction.annuller"
                >
                    Anulada por {{ sanction.annuller.name }} el
                    {{ annulledAtLabel }}.
                </template>
            </p>

            <div
                v-if="canEdit || canAnnull"
                class="d-flex flex-wrap justify-content-end gap-2"
            >
                <button
                    v-if="canEdit"
                    class="btn-outline btn-sm theme-primary"
                    type="button"
                    data-bs-toggle="dialog"
                    data-bs-target="#sanction-edit-dialog"
                    @click="emit('edit')"
                >
                    <IconEdit />
                    <span>Editar</span>
                </button>
                <button
                    v-if="canAnnull"
                    class="btn-outline btn-sm theme-danger"
                    type="button"
                    data-bs-toggle="dialog"
                    data-bs-target="#sanction-annul-dialog"
                    @click="emit('annul')"
                >
                    <IconSubtract />
                    <span>Anular</span>
                </button>
            </div>
        </div>
    </article>
</template>
