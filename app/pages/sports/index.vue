<script setup lang="ts">
import type { SportListResponse } from "~/utils/openapi";

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

        <div class="table-responsive" v-if="data">
            <table class="table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Nombre</th>
                        <th>Máx. de jugadores</th>
                        <th>Jugadores en cancha</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="sport in data.sports" :key="sport.id">
                        <td>{{ sport.id }}</td>
                        <td>
                            <a :href="`/sports/${sport.id}`">
                                {{ sport.name }}
                            </a>
                        </td>
                        <td>{{ sport.max_players }}</td>
                        <td>{{ sport.max_players_in_game }}</td>
                    </tr>
                </tbody>
            </table>
        </div>
        <p v-else>Hubo un problema para cargar los datos</p>
    </div>
</template>
