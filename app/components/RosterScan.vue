<script setup lang="ts">
import type {
    MatchRosterScanFaceResponse,
    MatchRosterScanResponse,
} from "~/utils/openapi";

import { IconArrowClockwise, IconCamera, IconImageAdd } from "~/assets/icons";

const props = defineProps<{
    matchId: number;
    teamId: number;
    teamName: string;
}>();

const emit = defineEmits<{
    scanned: [MatchRosterScanResponse];
}>();

const { $api } = useNuxtApp();

const retainInputId = useId();
const retainForManualReview = ref(false);
const capturing = ref(false);
const uploading = ref(false);
const message = ref("");
const scan = ref<MatchRosterScanResponse | null>(null);
const photoUrl = ref<string | null>(null);
const crops = ref<Record<number, string>>({});

let photoObjectUrl: string | null = null;

const countWarning = computed(() => {
    if (!scan.value?.count_warning) return "";
    return scan.value.count_warning === "recognized_player_count_below_expected"
        ? "Se reconocieron menos jugadores de los esperados."
        : "Se reconocieron más jugadores de los esperados.";
});

const unknownFaceCount = computed(
    () =>
        scan.value?.faces.filter((face) => face.status === "unknown").length ??
        0,
);

function statusLabel(status: MatchRosterScanFaceResponse["status"]) {
    return {
        declared_eligible: "Habilitado",
        declared_sanctioned: "Sancionado",
        team_member_undeclared: "No declarado",
        team_member_undeclared_sanctioned: "No declarado y sancionado",
        unknown: "Sin coincidencia",
    }[status];
}

function statusTheme(status: MatchRosterScanFaceResponse["status"]) {
    return {
        declared_eligible: "theme-success",
        declared_sanctioned: "theme-danger",
        team_member_undeclared: "theme-warning",
        team_member_undeclared_sanctioned: "theme-danger",
        unknown: "theme-secondary",
    }[status];
}

function reportError(error: unknown) {
    const body = (error as { data?: { error?: { message?: string } } }).data;
    message.value = body?.error?.message ?? "Ocurrió un error inesperado.";
}

function revokePhotoUrl() {
    if (!photoObjectUrl) return;
    URL.revokeObjectURL(photoObjectUrl);
    photoObjectUrl = null;
}

function setPhotoUrl(file: File) {
    revokePhotoUrl();
    photoObjectUrl = URL.createObjectURL(file);
    photoUrl.value = photoObjectUrl;
}

async function buildCrops(url: string, faces: MatchRosterScanFaceResponse[]) {
    try {
        const image = await loadImage(url);
        const next: Record<number, string> = {};

        for (const face of faces) {
            const crop = cropImage(
                image,
                face.top,
                face.left,
                face.right,
                face.bottom,
            );
            if (crop) next[face.face_index] = crop;
        }

        crops.value = next;
    } catch (error) {
        console.error(error);
    }
}

async function processPhoto(file: File) {
    if (!retainForManualReview.value) {
        message.value = "Confirmá la retención de la foto para poder escanear.";
        return;
    }

    capturing.value = false;
    uploading.value = true;
    message.value = "";
    scan.value = null;
    crops.value = {};

    setPhotoUrl(file);

    const body = new FormData();
    body.set("photo", file);
    body.set("retain_for_manual_review", "true");

    try {
        const response = await $api<MatchRosterScanResponse>(
            `/matches/${props.matchId}/teams/${props.teamId}/roster-scans`,
            {
                method: "POST",
                body,
            },
        );

        scan.value = response;
        emit("scanned", response);

        if (photoUrl.value) {
            await buildCrops(photoUrl.value, response.faces);
        }
    } catch (error) {
        reportError(error);
    } finally {
        uploading.value = false;
    }
}

function onCameraUpload(blob: Blob | null) {
    capturing.value = false;
    if (!blob) return;

    processPhoto(
        new File([blob], "equipo.jpg", {
            type: "image/jpeg",
        }),
    );
}

function onFileUpload(event: Event) {
    if (!(event.target instanceof HTMLInputElement)) return;

    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) processPhoto(file);
}

function reset() {
    scan.value = null;
    message.value = "";
    crops.value = {};
    revokePhotoUrl();
    photoUrl.value = null;
}

onBeforeUnmount(revokePhotoUrl);
</script>

<template>
    <div class="roster-scan">
        <div v-if="message" class="alert theme-danger" role="alert">
            {{ message }}
        </div>

        <Camera v-if="capturing" :size="1600" @upload="onCameraUpload" />

        <template v-else>
            <div v-if="uploading" class="roster-scan__preview">
                <img
                    v-if="photoUrl"
                    class="roster-scan__photo"
                    :src="photoUrl"
                    alt="Foto del equipo"
                />
                <div class="roster-scan__loading">
                    <span class="spinner-border" aria-hidden="true"></span>
                    <span>Procesando imagen...</span>
                </div>
            </div>

            <template v-else-if="scan">
                <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
                    <div>
                        <p class="h4 fw-regular mb-0">Resultados</p>
                    </div>
                    <button
                        class="btn-outline theme-secondary ms-auto"
                        type="button"
                        @click="reset"
                    >
                        <IconArrowClockwise />
                        <span>Reintentar</span>
                    </button>
                </div>

                <div
                    class="alert mb-3 vstack"
                    :class="{
                        'theme-warning': countWarning,
                        'theme-primary': !countWarning,
                    }"
                    role="alert"
                >
                    <div v-if="countWarning">
                        {{ countWarning }}
                    </div>
                    <div v-else>La cantidad de jugadores es correcta</div>

                    <div class="small mb-0">
                        Se esperaban {{ scan.expected_players }} jugadores,
                        {{ scan.unique_recognized_players }} reconocidos.
                        {{ scan.detected_faces }} caras en total.
                    </div>
                </div>

                <div class="vstack gap-2">
                    <article
                        v-for="face in scan.faces"
                        :key="face.face_index"
                        class="card"
                    >
                        <div class="card-body gap-3">
                            <div class="hstack">
                                <img
                                    v-if="crops[face.face_index]"
                                    class="avatar me-4 avatar-xl"
                                    style="border: none"
                                    :src="crops[face.face_index]"
                                    :alt="
                                        face.player_name ??
                                        'Jugador no identificado'
                                    "
                                />
                                <div v-else class="avatar me-4">
                                    {{ avatarLetters(face.player_name ?? "?") }}
                                </div>
                                <div class="flex-grow-1">
                                    <div
                                        class="d-flex flex-wrap align-items-center gap-2 row-gap-0"
                                    >
                                        <p class="fw-semibold mb-0 flex-grow-1">
                                            {{
                                                face.player_name ??
                                                "Jugador no identificado"
                                            }}
                                        </p>
                                        <span
                                            class="badge badge-subtle"
                                            :class="statusTheme(face.status)"
                                        >
                                            {{ statusLabel(face.status) }}
                                        </span>
                                    </div>

                                    <p
                                        v-if="face.match_percentage !== null"
                                        class="fg-2 small mb-1"
                                    >
                                        {{ face.match_percentage }}% de
                                        coincidencia
                                    </p>
                                </div>
                            </div>
                            <ul
                                v-if="face.sanctions.length"
                                class="roster-scan__sanctions small mb-0"
                            >
                                <li
                                    v-for="sanction in face.sanctions"
                                    :key="sanction.sanction_id"
                                >
                                    <strong>{{ sanction.title }}</strong>
                                    — {{ sanction.reason }} ({{
                                        sanction.remaining_matches
                                    }}
                                    {{
                                        sanction.remaining_matches === 1
                                            ? "partido"
                                            : "partidos"
                                    }})
                                </li>
                            </ul>
                        </div>
                    </article>
                </div>
                <div
                    v-if="scan.manual_review"
                    class="alert theme-info mt-3"
                    role="alert"
                >
                    La foto quedó retenida para revisión manual hasta el
                    {{ formatDateTime(scan.manual_review.expires_at) }}.
                    <strong>
                        {{ unknownFaceCount }}
                        {{
                            unknownFaceCount === 1
                                ? "cara requiere"
                                : "caras requieren"
                        }}
                        revisión.
                    </strong>
                </div>
            </template>

            <div v-else class="roster-scan__intro">
                <p class="mb-1">
                    Tomá una foto grupal de
                    <strong>{{ teamName }}</strong> para comparar sus caras con
                    el plantel del equipo.
                </p>
                <p class="fg-2 small">
                    La imagen debe tener entre 320 y 4096 píxeles por lado y
                    pesar como máximo 10 MiB.
                </p>

                <div class="form-field row-gap-0 mb-2">
                    <input
                        :id="retainInputId"
                        v-model="retainForManualReview"
                        class="check"
                        type="checkbox"
                    />
                    <label :for="retainInputId">
                        Acepto la potencial retención de la foto
                    </label>
                    <div class="form-text">
                        La foto se guarda solo si el escaneo detecta alguna cara
                        desconocida.
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label
                        class="btn-outline btn-lg theme-secondary"
                        :class="{ disabled: !retainForManualReview }"
                    >
                        <IconImageAdd />
                        <span>Subir foto</span>
                        <input
                            class="d-none"
                            type="file"
                            accept="image/png,image/jpeg"
                            :disabled="!retainForManualReview"
                            @change="onFileUpload"
                        />
                    </label>
                    <button
                        class="btn-solid btn-lg theme-accent"
                        type="button"
                        :disabled="!retainForManualReview"
                        @click="capturing = true"
                    >
                        <IconCamera />
                        <span>Tomar foto</span>
                    </button>
                </div>
            </div>
        </template>
    </div>
</template>

<style scoped>
.roster-scan__intro {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.roster-scan__preview {
    position: relative;
    overflow: hidden;
    border-radius: 0.5rem;
    max-height: 24rem;
}

.roster-scan__photo {
    width: 100%;
    height: 100%;
    max-height: 24rem;
    object-fit: cover;
}

.roster-scan__loading {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    background: rgb(0 0 0 / 0.55);
    color: #fff;
}

.roster-scan__crop {
    flex-shrink: 0;
    width: 4.5rem;
    height: 5.5rem;
    border-radius: 0.375rem;
    background: var(--bs-bg-2, #dee2e6);
    object-fit: cover;
}

.roster-scan__sanctions {
    padding-left: 1rem;
}
</style>
