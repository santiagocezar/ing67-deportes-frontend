<script lang="ts" setup>
import { IconCheckmarkCircle, IconSubtract } from "~/assets/icons";
import { type CompetitionDetailResponse } from "~/utils/openapi";

const emit = defineEmits<{ refresh: [] }>();

const { $api } = useNuxtApp();

const { editing } = defineProps<{ editing: CompetitionDetailResponse }>();

const edited = reactive({
    name: "",
    starts_at: "",
    ends_at: "",
});

function toInputValue(date: string | null) {
    if (!date) return "";
    const d = new Date(date);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
        d.getDate(),
    )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

watch(
    () => editing,
    (competition) => {
        if (!competition) return;
        edited.name = competition.name;
        edited.starts_at = toInputValue(competition.starts_at);
        edited.ends_at = toInputValue(competition.ends_at);
    },
    { immediate: true },
);

const message = ref("");

function formatDate(date: string) {
    return new Date(date).toLocaleString();
}

async function saveCompetition(ev: SubmitEvent) {
    ev.preventDefault();
    if (!editing) return;
    message.value = "";

    try {
        await $api(`/competitions/${editing.id}`, {
            method: "PUT",
            body: {
                name: edited.name,
                starts_at: toISOString(edited.starts_at),
                ends_at: toISOString(edited.ends_at),
            },
        });
    } catch (error) {
        reportError(error);
        return;
    }

    emit("refresh");
}

async function setCompetitionEnabled(enabled: boolean) {
    message.value = "";

    try {
        await $api(
            `/competitions/${editing.id}/${enabled ? "enable" : "disable"}`,
            { method: "PATCH" },
        );
    } catch (error) {
        reportError(error);
        return;
    }

    emit("refresh");
}
</script>

<template>
    <form class="vstack gap-3" action="#" @submit="saveCompetition">
        <div class="form-field">
            <label for="name" class="form-label">Nombre</label>
            <input
                class="form-control"
                id="name"
                v-model="edited.name"
                type="text"
                required
            />
        </div>

        <div class="row g-3">
            <div class="md:col-6">
                <div class="form-field">
                    <label for="starts_at" class="form-label"> Inicio </label>
                    <DatePicker v-model="edited.starts_at" id="starts_at" />
                </div>
            </div>
            <div class="md:col-6">
                <div class="form-field">
                    <label for="ends_at" class="form-label">Fin</label>
                    <DatePicker v-model="edited.ends_at" id="ends_at" />
                </div>
            </div>
        </div>
        <div class="alert theme-danger" role="alert" v-if="message">
            {{ message }}
        </div>
        <div class="d-flex flex-wrap align-items-center gap-2">
            <button
                class="btn-outline theme-danger"
                type="button"
                v-if="editing.is_enabled"
                @click="setCompetitionEnabled(false)"
            >
                <IconSubtract />
                <span>Deshabilitar</span>
            </button>

            <button
                class="btn-outline theme-success"
                type="button"
                v-else
                @click="setCompetitionEnabled(true)"
            >
                <IconCheckmarkCircle />
                <span>Habilitar</span>
            </button>

            <NuxtLink
                class="btn-outline theme-secondary ms-auto"
                to="/competitions"
            >
                Cancelar
            </NuxtLink>
            <button class="btn-solid theme-primary">Guardar cambios</button>
        </div>
    </form>
</template>
