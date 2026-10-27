<script setup lang="ts">
import {
    type CompetitionListResponse,
    type SportListResponse,
} from "~/utils/openapi";

import Filter from "~icons/fluent/filter-32-filled";
import Search from "~icons/fluent/search-48-filled";
import Add from "~icons/fluent/add-48-filled";

type Competition = CompetitionListResponse["competitions"][number];
type CompetitionStatus = NonNullable<Competition["status"]>;
type LifecycleStatus = CompetitionStatus | "";
type Availability = "enabled" | "disabled" | "all";
type CompetitionSort = "starts_at_asc" | "starts_at_desc";
type Gender = Competition["gender"];

const filters = reactive({
    search: "",
    sport_id: "" as number | "",
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
    };

    if (filters.search.trim()) query.search = filters.search.trim();
    if (filters.sport_id) query.sport_id = filters.sport_id;
    if (filters.gender) query.gender = filters.gender;
    if (filters.lifecycle_status)
        query.lifecycle_status = filters.lifecycle_status;

    return query;
});

const { data } = await useAPI<CompetitionListResponse>("/competitions", {
    query: competitionsQuery,
});

const { data: sportsData } = await useAPI<SportListResponse>("/sports");

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

function formatDate(date: string) {
    return new Date(date).toLocaleDateString();
}

// Cambiar un filtro vuelve a la primera página del listado.
watch(
    () => [
        filters.search,
        filters.sport_id,
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
    <div class="container p-4">
        <div class="d-flex align-items-center mb-3">
            <h1 class="h4 mb-0">Competencias</h1>
            <a
                class="btn-solid btn-styled theme-accent ms-auto"
                href="/competitions/new"
                aria-label="Agregar nuevo"
            >
                <Add />
                Nuevo
            </a>
        </div>

        <form class="mb-3 search d-flex" action="#" @submit.prevent>
            <div class="hstack gap-2" role="search">
                <button
                    class="btn-solid btn-styled btn-icon theme-primary"
                    type="button"
                    data-bs-toggle="dialog"
                    data-bs-target="#more-filters"
                    aria-label="Expandir filtros"
                >
                    <Filter />
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
                        <Filter class="me-2" />
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
                        <label for="filters-sport_id" class="form-label">
                            Deporte
                        </label>
                        <select
                            class="form-control"
                            id="filters-sport_id"
                            v-model="filters.sport_id"
                        >
                            <option value="">Todos</option>
                            <option
                                v-for="sport in sportsData?.sports"
                                :key="sport.id"
                                :value="sport.id"
                            >
                                {{ sport.name }}
                            </option>
                        </select>
                    </div>
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

        <div class="competition-grid" v-if="data">
            <a
                class="cell competition card text-decoration-none"
                v-for="competition in data.competitions"
                :href="`/competitions/${competition.id}`"
                :key="competition.id"
            >
                <div class="card-body">
                    <div class="d-flex align-items-center gap-2">
                        <h4 class="card-title mb-0">
                            {{ competition.name }}
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
                        Desde
                        <strong>
                            {{ formatDate(competition.starts_at) }}
                        </strong>
                        hasta
                        <strong>
                            {{ formatDate(competition.ends_at) }}
                        </strong>
                    </p>
                    <p class="fg-2">
                        {{ competition.sport.name }}
                        {{ genderLabel(competition.gender) }}
                    </p>
                </div>
            </a>
        </div>
        <p v-else>Hubo un problema para cargar los datos</p>

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
