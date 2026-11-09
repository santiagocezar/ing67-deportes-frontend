<script setup lang="ts">
import type {
    MatchRosterScanFaceResponse,
    MatchRosterScanResponse,
} from "~/utils/openapi";

import CameraIcon from "~icons/fluent/camera-24-filled";
import ImageAdd from "~icons/fluent/image-add-24-filled";
import ArrowClockwise from "~icons/fluent/arrow-clockwise-24-filled";

const props = defineProps<{
    matchId: number;
    teamId: number;
    teamName: string;
}>();

const { $api } = useNuxtApp();

const CROP_SIZE = 256;
const CROP_MARGIN = 0.15;

const capturing = ref(false);
const uploading = ref(false);
const message = ref("");
const scan = ref<MatchRosterScanResponse | null>(null);
const photoUrl = ref<string | null>(null);
const crops = ref<Record<number, string>>({});

let photoObjectUrl: string | null = null;

const summary = computed(() => {
    if (!scan.value) return "";
    return `${scan.value.detected_faces} caras detectadas · ${scan.value.unique_recognized_players} de ${scan.value.expected_players} jugadores reconocidos`;
});

const countWarning = computed(() => {
    if (!scan.value?.count_warning) return "";
    return scan.value.count_warning === "recognized_player_count_below_expected"
        ? "Se reconocieron menos jugadores de los esperados."
        : "Se reconocieron más jugadores de los esperados.";
});

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

function loadImage(src: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("No se pudo leer la foto."));
        image.src = src;
    });
}

function cropFace(image: HTMLImageElement, face: MatchRosterScanFaceResponse) {
    const sourceWidth = image.naturalWidth;
    const sourceHeight = image.naturalHeight;
    if (!sourceWidth || !sourceHeight) return null;

    const boxWidth = Math.max(1, face.right - face.left);
    const boxHeight = Math.max(1, face.bottom - face.top);
    const margin = Math.round(Math.max(boxWidth, boxHeight) * CROP_MARGIN);

    const left = Math.max(0, Math.min(face.left - margin, sourceWidth - 1));
    const top = Math.max(0, Math.min(face.top - margin, sourceHeight - 1));
    const right = Math.max(
        left + 1,
        Math.min(face.right + margin, sourceWidth),
    );
    const bottom = Math.max(
        top + 1,
        Math.min(face.bottom + margin, sourceHeight),
    );

    const width = right - left;
    const height = bottom - top;
    const scale = Math.min(1, CROP_SIZE / Math.max(width, height));

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));

    const context = canvas.getContext("2d");
    if (!context) return null;

    context.drawImage(
        image,
        left,
        top,
        width,
        height,
        0,
        0,
        canvas.width,
        canvas.height,
    );

    return canvas.toDataURL("image/jpeg", 0.85);
}

async function buildCrops(url: string, faces: MatchRosterScanFaceResponse[]) {
    try {
        const image = await loadImage(url);
        const next: Record<number, string> = {};

        for (const face of faces) {
            const crop = cropFace(image, face);
            if (crop) next[face.face_index] = crop;
        }

        crops.value = next;
    } catch (error) {
        console.error(error);
    }
}

async function processPhoto(file: File) {
    capturing.value = false;
    uploading.value = true;
    message.value = "";
    scan.value = null;
    crops.value = {};

    setPhotoUrl(file);

    const body = new FormData();
    body.set("photo", file);

    try {
        const response = await $api<MatchRosterScanResponse>(
            `/matches/${props.matchId}/teams/${props.teamId}/roster-scans`,
            {
                method: "POST",
                body,
            },
        );

        scan.value = response;

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
                        <p class="fw-semibold mb-0">Resultado del escaneo</p>
                        <p class="fg-2 small mb-0">{{ summary }}</p>
                    </div>
                    <button
                        class="btn-outline theme-secondary ms-auto"
                        type="button"
                        @click="reset"
                    >
                        <ArrowClockwise />
                        <span>Escanear de nuevo</span>
                    </button>
                </div>

                <div
                    v-if="countWarning"
                    class="alert theme-warning mb-3"
                    role="alert"
                >
                    {{ countWarning }}
                </div>

                <div class="vstack gap-2">
                    <article
                        v-for="face in scan.faces"
                        :key="face.face_index"
                        class="card"
                    >
                        <div class="card-body d-flex gap-3">
                            <img
                                v-if="crops[face.face_index]"
                                class="roster-scan__crop"
                                :src="crops[face.face_index]"
                                :alt="
                                    face.player_name ??
                                    'Jugador no identificado'
                                "
                            />
                            <div v-else class="roster-scan__crop"></div>

                            <div class="flex-grow-1">
                                <div
                                    class="d-flex flex-wrap align-items-center gap-2"
                                >
                                    <p class="fw-semibold mb-0">
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
                                    {{ face.match_percentage }}% de coincidencia
                                </p>

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
                        </div>
                    </article>
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

                <div class="d-flex flex-wrap gap-2">
                    <button
                        class="btn-solid theme-accent"
                        type="button"
                        @click="capturing = true"
                    >
                        <CameraIcon />
                        <span>Tomar foto</span>
                    </button>

                    <label class="btn-outline theme-secondary">
                        <ImageAdd />
                        <span>Subir foto</span>
                        <input
                            class="d-none"
                            type="file"
                            accept="image/png,image/jpeg"
                            @change="onFileUpload"
                        />
                    </label>
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
