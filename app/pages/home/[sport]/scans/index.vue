<script setup lang="ts">
import type {
    MatchRosterScanManualReviewListItemResponse,
    MatchRosterScanManualReviewListResponse,
} from "~/utils/openapi";

import { IconFilter } from "~/assets/icons";
import ScanCard from "~/components/ScanCard.vue";

type ManualReview = MatchRosterScanManualReviewListItemResponse;
type ReviewStatus = ManualReview["status"] | "all";
type ReviewSort = "scan_created_at_desc" | "scan_created_at_asc";

const route = useRoute();

const filters = reactive({
    status: "pending" as ReviewStatus,
    sort: "scan_created_at_desc" as ReviewSort,
    page: 1,
});

const reviewsQuery = computed(() => ({
    sport_id: route.params.sport,
    status: filters.status,
    sort: filters.sort,
    page: filters.page,
}));

const { data, pending, error } =
    await useAPI<MatchRosterScanManualReviewListResponse>("/manual-reviews", {
        key: computed(() => sportManualReviewsKey(route.params.sport, filters)),
        query: reviewsQuery,
    });

// Cambiar un filtro vuelve a la primera página del listado.
watch(
    () => [filters.status, filters.sort],
    () => {
        filters.page = 1;
    },
);

function goToPage(page: number) {
    filters.page = page;
}
</script>

<template>
    <div>
        <div class="d-flex align-items-center gap-2 mb-4">
            <h2 class="h2 fw-light m-0">Revisiones manuales</h2>
            <button
                class="btn-solid btn-styled btn-icon theme-primary ms-auto"
                type="button"
                data-bs-toggle="dialog"
                data-bs-target="#more-filters"
                aria-label="Expandir filtros"
            >
                <IconFilter />
            </button>
        </div>

        <dialog id="more-filters" class="dialog">
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
                    <label class="form-label" for="filters-status">
                        Estado
                    </label>
                    <select
                        class="form-control"
                        id="filters-status"
                        v-model="filters.status"
                    >
                        <option value="pending">Pendientes</option>
                        <option value="resolved">Resueltas</option>
                        <option value="expired">Vencidas</option>
                        <option value="all">Todas</option>
                    </select>
                </div>
                <div class="form-field">
                    <label id="filters-sort-label" class="form-label">
                        Ordenar por
                    </label>
                    <div
                        class="btn-group"
                        role="group"
                        aria-labelledby="filters-sort-label"
                    >
                        <label class="btn-check btn-outline theme-primary">
                            <input
                                type="radio"
                                autocomplete="off"
                                value="scan_created_at_desc"
                                v-model="filters.sort"
                            />
                            Más recientes
                        </label>
                        <label class="btn-check btn-outline theme-primary">
                            <input
                                type="radio"
                                autocomplete="off"
                                value="scan_created_at_asc"
                                v-model="filters.sort"
                            />
                            Más antiguas
                        </label>
                    </div>
                </div>
            </div>
        </dialog>

        <div class="d-flex align-items-center gap-2 fg-2" v-if="pending">
            <span
                class="spinner-border spinner-border-sm"
                aria-hidden="true"
            ></span>
            Cargando revisiones…
        </div>

        <div class="alert theme-danger" role="alert" v-else-if="error">
            Hubo un problema para cargar las revisiones.
        </div>

        <template v-else-if="data">
            <div
                class="card card-body text-center fg-2"
                v-if="!data.manual_reviews.length"
            >
                No hay revisiones para el estado seleccionado.
            </div>

            <div class="vstack gap-2" v-else>
                <ScanCard
                    v-for="review in data.manual_reviews"
                    :key="review.scan.id"
                    :review
                />
            </div>

            <nav
                class="d-flex flex-wrap align-items-center gap-2 mt-3"
                v-if="data.pagination.total_pages > 1"
                aria-label="Paginación de revisiones manuales"
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
                    revisiones)
                </p>
            </nav>
        </template>
    </div>
</template>
