<script setup lang="ts">
import type { SportListResponse } from "~/utils/openapi";

import ArrowRight from "~icons/fluent/chevron-right-48-filled";
import Add from "~icons/fluent/add-48-filled";
import Header from "~/components/Header.vue";

const { data } = await useAPI<SportListResponse>("/sports");
</script>

<template>
    <Header title="Deportes"> </Header>
    <div class="container p-4">
        <div
            class="card mb-4 d-flex flex-row gap-4 p-2 align-items-center"
            v-for="sport in data?.sports"
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
                :href="`/home/${sport.id}`"
            >
                <ArrowRight />
            </a>
        </div>
        <div class="text-end">
            <a
                class="btn-solid btn-lg rounded-pill align-self-end"
                href="/sports/new"
                aria-label="Agregar nuevo"
            >
                <Add />
                Nuevo
            </a>
        </div>
    </div>
</template>
