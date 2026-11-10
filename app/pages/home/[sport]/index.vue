<script setup lang="ts">
import { type CompetitionListResponse } from "~/utils/openapi";

import { IconAdd, IconFilter } from "~/assets/icons";

type Competition = CompetitionListResponse["competitions"][number];
type CompetitionStatus = NonNullable<Competition["status"]>;
type LifecycleStatus = CompetitionStatus | "";
type Availability = "enabled" | "disabled" | "all";
type CompetitionSort = "starts_at_asc" | "starts_at_desc";
type Gender = Competition["gender"];

const route = useRoute();

const filters = reactive({
    search: "",
    gender: "" as Gender | "",
    lifecycle_status: "" as LifecycleStatus,
    availability: "enabled" as Availability,
    sort: "starts_at_desc" as CompetitionSort,
    page: 1,
});

const competitionsQuery = computed(() => {
    const query: Record<string, string | number> = {
        availability: filters.availability,
        sort: filters.sort,
        page: filters.page,
        sport_id: route.params.sport,
    };

    if (filters.search.trim()) query.search = filters.search.trim();
    if (filters.gender) query.gender = filters.gender;
    if (filters.lifecycle_status)
        query.lifecycle_status = filters.lifecycle_status;

    return query;
});

const { data } = await useAPI<CompetitionListResponse>("/competitions", {
    query: competitionsQuery,
});

function genderLabel(gender: Gender) {
    return gender === "male" ? "Masculino" : "Femenino";
}

function statusLabel(status: CompetitionStatus) {
    return {
        scheduled: "Programada",
        in_progress: "En curso",
        finished: "Finalizada",
        discarded: "Descartada",
    }[status];
}

// Cambiar un filtro vuelve a la primera página del listado.
watch(
    () => [
        filters.search,
        filters.gender,
        filters.lifecycle_status,
        filters.availability,
        filters.sort,
    ],
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
        <div class="d-flex align-items-center mb-4">
            <h2 class="h2 fw-light m-0">Competencias</h2>
            <NuxtLink
                class="btn-solid rounded-pill ms-auto"
                :to="{
                    name: 'home-sport-competitions-new',
                    params: { sport: route.params.sport },
                }"
                aria-label="Agregar nuevo"
            >
                <IconAdd />
                Nuevo
            </NuxtLink>
        </div>

        <form class="mb-3 search" action="#" @submit.prevent>
            <div class="hstack gap-2" role="search">
                <button
                    class="btn-solid btn-styled btn-icon theme-primary"
                    type="button"
                    data-bs-toggle="dialog"
                    data-bs-target="#more-filters"
                    aria-label="Expandir filtros"
                >
                    <IconFilter />
                </button>
                <input
                    class="form-control"
                    type="search"
                    v-model="filters.search"
                    placeholder="Buscar por nombre"
                    aria-label="Buscar por nombre"
                />
            </div>

            <dialog id="more-filters" class="dialog">
                <div class="dialog-header">
                    <h1 class="dialog-title">
                        <IconFilter class="me-2" />
                        Filtros
                    </h1>
                    <button
                        type="button"
                        class="btn-close"
                        data-bs-dismiss="dialog"
                        aria-label="Close"
                    ></button>
                </div>
                <div class="dialog-body d-flex flex-column gap-3">
                    <div class="form-field">
                        <label for="filters-gender" class="form-label">
                            Género
                        </label>
                        <select
                            class="form-control"
                            id="filters-gender"
                            v-model="filters.gender"
                        >
                            <option value="">Todos</option>
                            <option value="male">Masculino</option>
                            <option value="female">Femenino</option>
                        </select>
                    </div>
                    <div class="form-field">
                        <label
                            for="filters-lifecycle_status"
                            class="form-label"
                        >
                            Estado del ciclo
                        </label>
                        <select
                            class="form-control"
                            id="filters-lifecycle_status"
                            v-model="filters.lifecycle_status"
                        >
                            <option value="">Todos</option>
                            <option value="scheduled">Programada</option>
                            <option value="in_progress">En curso</option>
                            <option value="finished">Finalizada</option>
                            <option value="discarded">Descartada</option>
                        </select>
                    </div>
                    <div class="form-field">
                        <label for="filters-availability" class="form-label">
                            Disponibilidad
                        </label>
                        <select
                            class="form-control"
                            id="filters-availability"
                            v-model="filters.availability"
                        >
                            <option value="enabled">Habilitadas</option>
                            <option value="disabled">Deshabilitadas</option>
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
                                    value="starts_at_desc"
                                    v-model="filters.sort"
                                />
                                Más recientes
                            </label>
                            <label class="btn-check btn-outline theme-primary">
                                <input
                                    type="radio"
                                    autocomplete="off"
                                    value="starts_at_asc"
                                    v-model="filters.sort"
                                />
                                Más antiguas
                            </label>
                        </div>
                    </div>
                </div>
            </dialog>
        </form>

        <p v-if="!data">Hubo un problema para cargar los datos</p>
        <div class="competition-grid" v-else-if="data.competitions.length">
            <NuxtLink
                class="cell competition card text-decoration-none"
                v-for="competition in data.competitions"
                :to="{
                    name: 'home-sport-competitions-id',
                    params: { sport: route.params.sport, id: competition.id },
                }"
                :key="competition.id"
            >
                <div class="card-body">
                    <div class="d-flex align-items-center gap-2">
                        <h4 class="card-title mb-0">
                            {{ competition.name }}

                            <span
                                :aria-label="genderLabel(competition.gender)"
                                class="fg-2 fw-light"
                            >
                                {{ genderLabel(competition.gender)[0] }}
                            </span>
                        </h4>
                        <span
                            class="badge badge-subtle theme-secondary ms-auto"
                        >
                            {{
                                competition.is_enabled
                                    ? statusLabel(competition.status)
                                    : "Deshabilitada"
                            }}
                        </span>
                    </div>

                    <p>
                        <strong>
                            <NuxtTime :datetime="competition.starts_at" />
                        </strong>
                        hasta
                        <strong>
                            <NuxtTime :datetime="competition.ends_at" />
                        </strong>
                    </p>
                </div>
            </NuxtLink>
        </div>
        <div class="alert" v-else>
            No hay ninguna competencia programada o en curso
        </div>

        <nav
            class="d-flex flex-wrap align-items-center gap-2"
            v-if="data && data.pagination.total_pages > 1"
            aria-label="Paginación de competencias"
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
                            data.pagination.page >= data.pagination.total_pages,
                    }"
                >
                    <button
                        class="page-link"
                        type="button"
                        :disabled="
                            data.pagination.page >= data.pagination.total_pages
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
                competencias)
            </p>
        </nav>
    </div>
</template>

<style>
.search {
    display: flex;
    gap: 1rem;
}

.competition {
    height: 100%;
}

.competition-grid {
    display: grid;
    gap: 0.5rem;
    grid-template-columns: repeat(auto-fill, minmax(24rem, 1fr));
}
</style>
