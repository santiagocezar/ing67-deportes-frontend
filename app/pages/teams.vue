<script setup lang="ts">
const { $api } = useNuxtApp();
const { data, refresh } = await useAPI<api.ListTeams>("/teams");
const { data: sportsData } = await useAPI<api.ListSports>("/sports");

const value = reactive<api.Team>({
    name: "",
    gender_category: "",
    is_enabled: true,
    sport: undefined,
});

async function addTeam(ev: SubmitEvent) {
    ev.preventDefault();

    await $api("/teams", {
        method: "POST",
        body: {
            name: value.name,
            gender_category: value.gender_category,
            sport_id: value.sport?.id,
        },
    });
    refresh();
}
</script>

<template>
    <form action="#" @submit="addTeam">
        <label class="field">
            <span class="label">Nombre</span>
            <input class="input" v-model="value.name" type="text" required />
        </label>
        <br />
        <label class="field">
            <span class="label">Categoría de género</span>
            <select class="input" v-model="value.gender_category" required>
                <option value="" disabled>Seleccioná una categoría</option>
                <option value="male">Masculino</option>
                <option value="female">Femenino</option>
            </select>
        </label>
        <br />
        <label class="field">
            <span class="label">Deporte</span>
            <select class="input" v-model="value.sport" required>
                <option :value="undefined" disabled>
                    Seleccioná un deporte
                </option>
                <option
                    v-for="sport in sportsData?.sports"
                    :key="sport.id"
                    :value="sport"
                >
                    {{ sport.name }}
                </option>
            </select>
        </label>
        <br />
        <button class="button is-primary">Agregar equipo</button>
    </form>
    <table class="table" v-if="data">
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
                <td>{{ team.name }}</td>
                <td>
                    {{
                        team.gender_category === "male"
                            ? "Masculino"
                            : "Femenino"
                    }}
                </td>
                <td>{{ team.sport?.name }}</td>
                <td>{{ team.is_enabled ? "Habilitado" : "Deshabilitado" }}</td>
            </tr>
        </tbody>
    </table>
    <p v-else>Hubo un problema para cargar los datos</p>
</template>
