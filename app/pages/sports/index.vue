<script setup lang="ts">
import type { SportListResponse } from "~/utils/openapi";

import Edit from "~icons/fluent/chevron-right-48-filled";
import Add from "~icons/fluent/add-circle-48-filled";

const { data } = await useAPI<SportListResponse>("/sports");
</script>

<template>
    <div class="container p-4">
        <div class="d-flex align-items-center mb-3">
            <h1 class="h4 mb-0">Deportes</h1>
            <a
                class="btn-solid btn-styled theme-accent ms-auto"
                href="/sports/new"
                aria-label="Agregar nuevo"
            >
                <Add />
                Nuevo
            </a>
        </div>
        <div
            class="card mb-4 d-flex flex-row gap-4 p-2 align-items-center"
            v-for="sport in data.sports"
            :key="sport.id"
        >
            <strong class="ps-4 flex-grow-1 text-lg">
                {{ sport.name }}
            </strong>
            <div class="fg-2 text-sm">
                <div>
                    Plantel · <strong>{{ sport.max_players }}</strong>
                </div>
                <div>
                    Cancha · <strong>{{ sport.max_players_in_game }}</strong>
                </div>
            </div>

            <a
                class="btn-solid btn-icon stretched-link"
                :href="`/sports/${sport.id}`"
            >
                <Edit />
            </a>
        </div>
    </div>
</template>
