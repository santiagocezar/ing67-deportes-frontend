<script setup lang="ts">
import type {
    PlayerSanctionListResponse,
    PlayerSanctionResponse,
} from "~/utils/openapi";

import { IconFilter } from "~/assets/icons";
import SanctionCard from "~/components/SanctionCard.vue";

const props = defineProps<{ playerId: number }>();

type SanctionStatusFilter = PlayerSanctionResponse["status"] | "";

const filters = reactive({
    status: "" as SanctionStatusFilter,
    created_from: "",
    created_to: "",
    page: 1,
});

const dateRangeInvalid = computed(
    () =>
        Boolean(filters.created_from) &&
        Boolean(filters.created_to) &&
        filters.created_from > filters.created_to,
);

const hasAppliedFilters = computed(() =>
    Boolean(filters.status || filters.created_from || filters.created_to),
);

const sanctionsQuery = computed(() => {
    const query: Record<string, string | number> = { page: filters.page };

    if (filters.status) query.status = filters.status;
    // La API espera fechas con zona horaria; se envían los extremos del día.
    if (!dateRangeInvalid.value) {
        if (filters.created_from) {
            query.created_from = toISOString(
                `${filters.created_from}T00:00:00`,
            );
        }
        if (filters.created_to) {
            query.created_to = toISOString(
                `${filters.created_to}T23:59:59.999`,
            );
        }
    }

    return query;
});

const { data, pending, error } = await useAPI<PlayerSanctionListResponse>(
    () => `/players/${props.playerId}/sanctions`,
    { query: sanctionsQuery },
);

// Cambiar un filtro vuelve a la primera página del historial.
watch(
    () => [filters.status, filters.created_from, filters.created_to],
    () => {
        filters.page = 1;
    },
);

function clearFilters() {
    filters.status = "";
    filters.created_from = "";
    filters.created_to = "";
}

function goToPage(nextPage: number) {
    filters.page = nextPage;
}
</script>

<template>
    <section class="mt-4">
        <div class="d-flex align-items-center gap-2 mb-3">
            <h2 class="h5 mb-0 flex-grow-1">Sanciones</h2>
            <button
                class="btn-solid btn-styled btn-icon theme-primary ms-auto"
                type="button"
                data-bs-toggle="dialog"
                data-bs-target="#sanction-filters"
                aria-label="Expandir filtros"
            >
                <IconFilter />
            </button>
        </div>

        <dialog id="sanction-filters" class="dialog">
            <div class="dialog-header">
                <h2 class="dialog-title">
                    <IconFilter class="me-2" />
                    Filtros
                </h2>
                <button
                    type="button"
                    class="btn-close"
                    data-bs-dismiss="dialog"
                    aria-label="Cerrar"
                ></button>
            </div>
            <div class="dialog-body d-flex flex-column gap-3">
                <div class="form-field">
                    <label for="sanction-filter-status" class="form-label">
                        Estado
                    </label>
                    <select
                        id="sanction-filter-status"
                        class="form-control"
                        v-model="filters.status"
                    >
                        <option value="">Todas</option>
                        <option value="active">Activas</option>
                        <option value="served">Cumplidas</option>
                        <option value="annulled">Anuladas</option>
                    </select>
                </div>
                <div class="form-field">
                    <label
                        for="sanction-filter-created-from"
                        class="form-label"
                    >
                        Creadas desde
                    </label>
                    <input
                        id="sanction-filter-created-from"
                        class="form-control"
                        type="date"
                        v-model="filters.created_from"
                        :max="filters.created_to || undefined"
                    />
                </div>
                <div class="form-field">
                    <label for="sanction-filter-created-to" class="form-label">
                        Creadas hasta
                    </label>
                    <input
                        id="sanction-filter-created-to"
                        class="form-control"
                        type="date"
                        v-model="filters.created_to"
                        :min="filters.created_from || undefined"
                    />
                </div>
                <p
                    v-if="dateRangeInvalid"
                    class="alert theme-warning mb-0"
                    role="alert"
                >
                    La fecha final debe ser posterior o igual a la fecha
                    inicial.
                </p>
                <button
                    v-if="hasAppliedFilters"
                    class="btn-outline theme-secondary"
                    type="button"
                    @click="clearFilters"
                >
                    Limpiar filtros
                </button>
            </div>
        </dialog>

        <div v-if="dateRangeInvalid" class="alert theme-warning" role="alert">
            La fecha final debe ser posterior o igual a la fecha inicial.
        </div>

        <div class="d-flex align-items-center gap-2 fg-2" v-if="pending">
            <span
                class="spinner-border spinner-border-sm"
                aria-hidden="true"
            ></span>
            Cargando sanciones…
        </div>

        <div class="alert theme-danger" role="alert" v-else-if="error">
            No se pudo cargar el historial disciplinario.
        </div>

        <template v-else-if="data">
            <div
                class="card card-body text-center fg-2"
                v-if="!data.sanctions.length"
            >
                {{
                    hasAppliedFilters
                        ? "No hay sanciones para los filtros seleccionados."
                        : "Sin registros disciplinarios."
                }}
            </div>

            <div class="vstack gap-2" v-else>
                <SanctionCard
                    v-for="sanction in data.sanctions"
                    :key="sanction.id"
                    :sanction
                />
            </div>

            <nav
                class="d-flex flex-wrap align-items-center gap-2 mt-3"
                v-if="data.pagination.total_pages > 1"
                aria-label="Paginación de sanciones"
            >
                <ul class="pagination mb-0">
                    <li
                        class="page-item"
                        :class="{ disabled: data.pagination.page <= 1 }"
                    >
                        <button
                            class="page-link"
                            type="button"
                            :disabled="data.pagination.page <= 1"
                            @click="goToPage(data.pagination.page - 1)"
                        >
                            Anterior
                        </button>
                    </li>
                    <li
                        class="page-item"
                        :class="{
                            disabled:
                                data.pagination.page >=
                                data.pagination.total_pages,
                        }"
                    >
                        <button
                            class="page-link"
                            type="button"
                            :disabled="
                                data.pagination.page >=
                                data.pagination.total_pages
                            "
                            @click="goToPage(data.pagination.page + 1)"
                        >
                            Siguiente
                        </button>
                    </li>
                </ul>
                <p class="mb-0 fg-2">
                    Página {{ data.pagination.page }} de
                    {{ data.pagination.total_pages }} ({{
                        data.pagination.total_items
                    }}
                    sanciones)
                </p>
            </nav>
        </template>
    </section>
</template>
