<script setup lang="ts">
import { type CompetitionDetailResponse } from "~/utils/openapi";

import ArrowLeft from "~icons/fluent/arrow-left-24-filled";
import CompetitionTeams from "~/components/CompetitionTeams.vue";
import CompetitionMatches from "~/components/CompetitionMatches.vue";

type Competition = CompetitionDetailResponse;
type CompetitionStatus = Competition["status"];
type Gender = Competition["gender"];

const route = useRoute();

const { data: data, refresh } = await useAPI<Competition>(
    () => `/competitions/${route.params.id}`,
);

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

function statusTheme(status: CompetitionStatus) {
    return {
        scheduled: "theme-secondary",
        in_progress: "theme-info",
        finished: "theme-success",
        discarded: "theme-danger",
    }[status];
}
</script>

<template>
    <div v-if="data">
<NuxtLink
            class="d-flex align-items-center gap-1 text-decoration-none mb-3"
            :to="{
                name: 'home-sport',
            }"
        >
            <ArrowLeft />
            <span>
                Volver al listado
                   </span>
        </NuxtLink>
        <h1 class="h2 fw-light m-0">{{ data.name }}</h1>
        <p class="d-flex my-2 gap-2">
		<span class="fg-2 align-items-center">

            {{ data.sport.name }} {{ genderLabel(data.gender) }}
		</span>

			<div class="flex-grow-1"></div>
			<span
                class="badge badge-subtle"
                :class="statusTheme(data.status)"
            >
                {{ statusLabel(data.status) }} </span
            >
			<span
                class="badge badge-subtle"
                :class="data.is_enabled ? 'theme-success' : 'theme-danger'"
            >
                {{ data.is_enabled ? "Habilitada" : "Deshabilitada" }}
            </span>
        </p>
        <ul class="nav nav-pills mb-4" id="pills-tab" role="tablist">
            <li class="nav-item" role="presentation">
                <button
                    class="nav-link active"
                    id="matches-tab"
                    aria-selected="true"
                    aria-controls="matches-view"
                    data-bs-target="#matches-view"
                    data-bs-toggle="tab"
                    role="tab"
                    type="button"
                >
                    Partidos
                </button>
            </li>
            <li class="nav-item" role="presentation">
                <button
                    class="nav-link"
                    id="teams-tab"
                    aria-selected="false"
                    aria-controls="teams-view"
                    data-bs-target="#teams-view"
                    data-bs-toggle="tab"
                    role="tab"
                    type="button"
                >
                    Participantes
                </button>
            </li>
            <li class="nav-item" role="presentation">
                <button
                    class="nav-link"
                    id="details-tab"
                    aria-selected="false"
                    aria-controls="details-view"
                    data-bs-target="#details-view"
                    data-bs-toggle="tab"
                    role="tab"
                    type="button"
                >
                    Detalles
                </button>
            </li>
        </ul>
        <div class="tab-content" id="nav-tabContent2">
            <div
                class="tab-pane show active"
                id="matches-view"
                role="tabpanel"
                aria-labelledby="matches-tab"
                tabindex="0"
            >
                <CompetitionMatches :editing="data" />
            </div>
            <div
                class="tab-pane"
                id="teams-view"
                role="tabpanel"
                aria-labelledby="teams-tab"
                tabindex="0"
            >
                <CompetitionTeams :editing="data" @refresh="refresh()" />
            </div>
            <div
                class="tab-pane"
                id="details-view"
                role="tabpanel"
                aria-labelledby="details-tab"
                tabindex="0"
            >
                <CompetitionDetails :editing="data" @refresh="refresh()" />
            </div>
        </div>
    </div>
</template>
