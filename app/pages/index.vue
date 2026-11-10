<script setup lang="ts">
import type { SportListResponse } from "~/utils/openapi";

import { IconChevronRight } from "~/assets/icons";
import Header from "~/components/Header.vue";

const { data } = await useAPI<SportListResponse>("/sports");
</script>

<template>
    <Header title="Deportes"> </Header>
    <div class="container p-4">
        <h2 class="h2 fw-light m-0">Equipos</h2>
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
            <NuxtLink
                class="btn-solid btn-icon stretched-link"
                :to="`/home/${sport.id}`"
            >
                <IconChevronRight />
            </NuxtLink>
        </div>
    </div>
</template>
