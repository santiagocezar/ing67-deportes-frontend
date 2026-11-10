<script setup lang="ts">
import { IconDismiss } from "~/assets/icons";

const props = withDefaults(
    defineProps<{
        size?: number;
    }>(),
    { size: 512 },
);

const emit = defineEmits<{
    (e: "upload", blob: Blob | null): void;
}>();

const videoRef = ref<HTMLVideoElement | null>(null);
const noWork = ref(false);
const streaming = ref(false);

let controller: AbortController | null = null;

async function startStream(video: HTMLVideoElement, signal: AbortSignal) {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
            audio: false,
        });

        if (signal.aborted) return;

        video.srcObject = stream;
        await video.play();

        signal.addEventListener("abort", () => {
            video.pause();
            stream.getTracks().forEach((track) => track.stop());
        });
    } catch (err) {
        console.error(err);
        noWork.value = true;
    }
}

function snap() {
    const video = videoRef.value;
    if (!video) return;

    controller?.abort();
    controller = null;

    const size = props.size;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
        emit("upload", null);
        return;
    }

    const scale = Math.max(size / video.videoWidth, size / video.videoHeight);
    const w = video.videoWidth * scale;
    const h = video.videoHeight * scale;

    ctx.drawImage(video, size / 2 - w / 2, size / 2 - h / 2, w, h);

    canvas.toBlob((blob) => emit("upload", blob), "image/jpeg", 0.8);
}

onMounted(() => {
    const video = videoRef.value;
    if (!video) return;

    controller = new AbortController();
    startStream(video, controller.signal);
});

onBeforeUnmount(() => {
    controller?.abort();
    controller = null;
});
</script>

<template>
    <div class="camera z-dialog" popover="manual" id="camera-thing">
        <div v-show="noWork" class="camera__fallback">
            <p>No se pudo conectar con una cámara</p>
            <small>Suba un archivo</small>
        </div>

        <video
            ref="videoRef"
            v-show="!noWork"
            class="camera__viewfinder"
            @canplay="streaming = true"
            @play="streaming = true"
            @pause="streaming = false"
        >
            No se pudo activar la cámara. Intente subir un archivo
        </video>

        <div class="camera__controls">
            <button
                class="btn-solid btn-outline theme-danger"
                aria-label="cancel"
                type="button"
                @click="emit('upload', null)"
            >
                <IconDismiss />
            </button>
            <button
                class="camera__capture"
                aria-label="Capturar"
                :disabled="!streaming"
                type="button"
                @click="snap"
            ></button>
            <div></div>
        </div>
    </div>
</template>

<style scoped>
.camera {
    display: grid;
    padding: 0;
    grid-template-rows: 1fr auto;
    aspect-ratio: 1 / 1;
    width: 100%;
    height: 100%;
    align-items: stretch;
    justify-content: stretch;
    overflow: hidden;
    border: none;
    background: #000;
    color: #fff;
}

.camera__fallback {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: #1b1b1b;
}

.camera__viewfinder {
    width: 100%;
    justify-self: center;
    min-height: 0;
}

.camera__controls {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    width: 100%;
    gap: 0.5rem;
    padding-block: 1rem;
    align-items: center;
    justify-items: center;
    justify-content: space-evenly;
    align-self: end;
}

.camera__capture {
    width: 5rem;
    height: 5rem;
    border-radius: 9999px;
    border: 8px solid #9ca3af;
    background: #fff;
}

.camera__capture:disabled {
    background: #1f2937;
}
</style>
