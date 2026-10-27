<script setup lang="ts">
import type { SportListResponse, TeamListResponse } from "~/utils/openapi";

import Filter from "~icons/fluent/filter-32-filled";
import Search from "~icons/fluent/search-48-filled";
import Add from "~icons/fluent/add-48-filled";

type Gender = "male" | "female";
type TeamStatus = "enabled" | "disabled" | "all";
type TeamSort = "name_asc" | "created_at_desc";

const filters = reactive({
    search: "",
    sport_id: "" as number | "",
    gender_category: "" as Gender | "",
    status: "enabled" as TeamStatus,
    sort: "name_asc" as TeamSort,
    page: 1,
});

const teamsQuery = computed(() => {
    const query: Record<string, string | number> = {
        status: filters.status,
        sort: filters.sort,
        page: filters.page,
    };

    if (filters.search.trim()) query.search = filters.search.trim();
    if (filters.sport_id) query.sport_id = filters.sport_id;
    if (filters.gender_category)
        query.gender_category = filters.gender_category;

    return query;
});

const { data } = await useAPI<TeamListResponse>("/teams", {
    query: teamsQuery,
});

const { data: sportsData } = await useAPI<SportListResponse>("/sports");

function genderLabel(gender: Gender) {
    return gender === "male" ? "Masculino" : "Femenino";
}

// Cambiar un filtro vuelve a la primera página del listado.
watch(
    () => [
        filters.search,
        filters.sport_id,
        filters.gender_category,
        filters.status,
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
            <h1 class="h4 mb-0">Equipos</h1>
            <a
                class="btn-solid btn-styled theme-accent ms-auto"
                href="/teams/new"
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
                            v-model="filters.gender_category"
                        >
                            <option value="">Todos</option>
                            <option value="male">Masculino</option>
                            <option value="female">Femenino</option>
                        </select>
                    </div>
                    <div class="form-field">
                        <label for="filters-status" class="form-label">
                            Estado
                        </label>
                        <select
                            class="form-control"
                            id="filters-status"
                            v-model="filters.status"
                        >
                            <option value="enabled">Habilitados</option>
                            <option value="disabled">Deshabilitados</option>
                            <option value="all">Todos</option>
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
                                    value="name_asc"
                                    v-model="filters.sort"
                                />
                                Nombre (A-Z)
                            </label>
                            <label class="btn-check btn-outline theme-primary">
                                <input
                                    type="radio"
                                    autocomplete="off"
                                    value="created_at_desc"
                                    v-model="filters.sort"
                                />
                                Más reciente
                            </label>
                        </div>
                    </div>
                </div>
            </dialog>
        </form>

        <div class="table-responsive" v-if="data">
            <table class="table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Nombre</th>
                        <th>Categoría</th>
                        <th>Deporte</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="team in data.teams" :key="team.id">
                        <td>{{ team.id }}</td>
                        <td>
                            <a :href="`/teams/${team.id}`">
                                {{ team.name }}
                            </a>
                        </td>
                        <td>{{ genderLabel(team.gender_category) }}</td>
                        <td>{{ team.sport?.name }}</td>
                        <td>
                            {{
                                team.is_enabled ? "Habilitado" : "Deshabilitado"
                            }}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
        <p v-else>Hubo un problema para cargar los datos</p>

        <nav
            class="d-flex flex-wrap align-items-center gap-2"
            v-if="data && data.pagination.total_pages > 1"
            aria-label="Paginación de equipos"
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
                equipos)
            </p>
        </nav>
    </div>
</template>

<style>
.search {
    display: flex;
    gap: 1rem;
}
</style>
