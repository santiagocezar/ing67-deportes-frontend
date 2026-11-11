<script setup lang="ts">
import type { TeamListResponse } from "~/utils/openapi";

import { IconAdd, IconFilter } from "~/assets/icons";

type Gender = "male" | "female";
type TeamStatus = "enabled" | "disabled" | "all";
type TeamSort = "name_asc" | "created_at_desc";

const route = useRoute();

const { isAdministrator } = useCurrentUser();

const filters = reactive({
    search: "",
    gender_category: "" as Gender | "",
    status: "enabled" as TeamStatus,
    sort: "name_asc" as TeamSort,
    page: 1,
});

const teamsQuery = computed(() => {
    const query: Record<string, string | number> = {
        sport_id: route.params.sport,
        status: filters.status,
        sort: filters.sort,
        page: filters.page,
    };

    if (filters.search.trim()) query.search = filters.search.trim();
    if (filters.gender_category)
        query.gender_category = filters.gender_category;

    return query;
});

const { data } = await useAPI<TeamListResponse>("/teams", {
    query: teamsQuery,
});

function genderLabel(gender: Gender) {
    return gender === "male" ? "Masculino" : "Femenino";
}

// Cambiar un filtro vuelve a la primera página del listado.
watch(
    () => [
        filters.search,
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
    <div>
        <div class="d-flex align-items-center mb-4">
            <h2 class="h2 fw-light m-0">Equipos</h2>
            <NuxtLink
                v-if="isAdministrator"
                class="btn-solid rounded-pill ms-auto"
                :to="{
                    name: 'home-sport-teams-new',
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

        <div class="team-grid" v-if="data">
            <NuxtLink
                class="cell player card text-decoration-none"
                v-for="team in data.teams"
                :key="team.id"
                :to="{
                    name: 'home-sport-teams-id',
                    params: { sport: route.params.sport, id: team.id },
                }"
            >
                <div class="card-body">
                    <h4 class="card-title">
                        <span>
                            {{ team.name }}
                        </span>
                    </h4>
                </div>

                <div class="card-footer d-flex fg-2">
                    <small> Plantel {{ genderLabel(team.gender) }} </small
                    ><small class="ms-auto">
                        {{ team.is_enabled ? "Habilitado" : "Deshabilitado" }}
                    </small>
                </div>
            </NuxtLink>
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

.team-grid {
    display: grid;
    gap: 0.5rem;
    grid-template-columns: repeat(auto-fill, minmax(24rem, 1fr));
}
</style>
