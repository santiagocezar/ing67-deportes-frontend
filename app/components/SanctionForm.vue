<script setup lang="ts">
import type { PlayerSanctionCreateRequest } from "~/utils/openapi";

import { IconSave } from "~/assets/icons";

const TITLE_MAX_LENGTH = 30;
const REASON_MAX_LENGTH = 250;
const MIN_SUSPENSION_MATCHES = 1;
const MAX_SUSPENSION_MATCHES = 10;

const props = withDefaults(
    defineProps<{
        initial?: Partial<PlayerSanctionCreateRequest> | null;
        submitLabel?: string;
        blocked?: string;
        saving?: boolean;
        durationLocked?: boolean;
    }>(),
    {
        initial: null,
        submitLabel: "Guardar",
        saving: false,
        durationLocked: false,
    },
);

const emit = defineEmits<{
    submit: [body: PlayerSanctionCreateRequest];
}>();

const form = reactive<{
    title: string;
    reason: string;
    suspension_matches: number | string;
}>({
    title: "",
    reason: "",
    suspension_matches: MIN_SUSPENSION_MATCHES,
});

const errors = reactive({
    title: "",
    reason: "",
    suspension_matches: "",
});

function reset() {
    form.title = props.initial?.title ?? "";
    form.reason = props.initial?.reason ?? "";
    form.suspension_matches =
        props.initial?.suspension_matches ?? MIN_SUSPENSION_MATCHES;
    errors.title = "";
    errors.reason = "";
    errors.suspension_matches = "";
}

watch(
    () => props.initial,
    () => reset(),
    { immediate: true, deep: true },
);

function validate() {
    const title = form.title.trim();
    const reason = form.reason.trim();
    const matches = Number(form.suspension_matches);

    errors.title = "";
    errors.reason = "";
    errors.suspension_matches = "";

    if (!title) {
        errors.title = "El título es obligatorio.";
    } else if (title.length > TITLE_MAX_LENGTH) {
        errors.title = `El título no puede superar los ${TITLE_MAX_LENGTH} caracteres.`;
    }

    if (!reason) {
        errors.reason = "El motivo es obligatorio.";
    } else if (reason.length > REASON_MAX_LENGTH) {
        errors.reason = `El motivo no puede superar los ${REASON_MAX_LENGTH} caracteres.`;
    }

    if (form.suspension_matches === "" || Number.isNaN(matches)) {
        errors.suspension_matches = "Ingresá la cantidad de fechas.";
    } else if (
        !Number.isInteger(matches) ||
        matches < MIN_SUSPENSION_MATCHES ||
        matches > MAX_SUSPENSION_MATCHES
    ) {
        errors.suspension_matches = `La cantidad de fechas debe ser un número entero entre ${MIN_SUSPENSION_MATCHES} y ${MAX_SUSPENSION_MATCHES}.`;
    }

    return !errors.title && !errors.reason && !errors.suspension_matches;
}

function onSubmit() {
    if (!validate()) return;

    emit("submit", {
        title: form.title.trim(),
        reason: form.reason.trim(),
        suspension_matches: Number(form.suspension_matches),
    });
}
</script>

<template>
    <form class="vstack gap-3" action="#" novalidate @submit.prevent="onSubmit">
        <div class="form-field">
            <label class="form-label" for="sanction-title">Título</label>
            <input
                id="sanction-title"
                :class="{
                    'is-invalid': errors.title,
                    'form-control': !blocked,
                    'form-control-plaintext': !!blocked,
                }"
                :readonly="!!blocked"
                type="text"
                v-model="form.title"
                autocomplete="off"
                @input="errors.title = ''"
            />
            <template v-if="!blocked">
                <div class="invalid-feedback">{{ errors.title }}</div>
                <div class="form-text">
                    {{ form.title.trim().length }}/{{ TITLE_MAX_LENGTH }}
                    caracteres
                </div>
            </template>
        </div>

        <div class="form-field">
            <label class="form-label" for="sanction-reason">Motivo</label>
            <textarea
                id="sanction-reason"
                :class="{
                    'is-invalid': errors.reason,
                    'form-control': !blocked,
                    'form-control-plaintext': !!blocked,
                }"
                :readonly="!!blocked"
                rows="3"
                v-model="form.reason"
                @input="errors.reason = ''"
            ></textarea>
            <template v-if="!blocked">
                <div class="invalid-feedback">{{ errors.reason }}</div>
                <div class="form-text">
                    {{ form.reason.trim().length }}/{{ REASON_MAX_LENGTH }}
                    caracteres
                </div>
            </template>
        </div>

        <div class="form-field">
            <label class="form-label" for="sanction-suspension-matches">
                Cantidad de fechas
            </label>
            <input
                id="sanction-suspension-matches"
                :class="{
                    'is-invalid': errors.suspension_matches,
                    'form-control': !blocked,
                    'form-control-plaintext': !!blocked,
                }"
                :readonly="!!blocked"
                type="number"
                min="1"
                max="10"
                step="1"
                v-model.number="form.suspension_matches"
                :disabled="durationLocked"
                @input="errors.suspension_matches = ''"
            />
            <template v-if="!blocked">
                <div class="invalid-feedback">
                    {{ errors.suspension_matches }}
                </div>
                <div v-if="durationLocked" class="form-text">
                    La duración ya no puede modificarse porque se descontó al
                    menos un partido.
                </div>
                <div v-else class="form-text">
                    Entre {{ MIN_SUSPENSION_MATCHES }} y
                    {{ MAX_SUSPENSION_MATCHES }} fechas.
                </div>
            </template>
        </div>

        <div v-if="!blocked" class="d-flex justify-content-end">
            <button
                class="btn-solid theme-primary"
                type="submit"
                :disabled="saving"
            >
                <IconSave />
                <span>{{ saving ? "Guardando…" : submitLabel }}</span>
            </button>
        </div>
        <div v-if="blocked" class="alert theme-secondary mt-4" role="status">
            {{ blocked }}
        </div>
    </form>
</template>
