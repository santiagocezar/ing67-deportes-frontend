<script setup lang="ts">
import CameraIcon from "~icons/fluent/camera-24-filled";
import ImageAdd from "~icons/fluent/image-add-48-filled";
import Delete from "~icons/fluent/delete-24-regular";
//     import { Add, Camera, Delete, ImageAdd } from "$lib/components/icons";

const emit = defineEmits<{
    (e: "delete", id: string): void;
    (e: "add", file: File): void;
}>();

let { max, photoError, currentPhotos, pendingPhotos } = defineProps<{
    max: number;
    photoError: string;
    currentPhotos: string[];
    pendingPhotos: string[];
}>();

const disabled = computed(() => currentPhotos.length >= max);

const photos = computed(() => [
    ...currentPhotos.map((src) => ({ pending: false, src })),
    ...pendingPhotos.map((src) => ({ pending: true, src })),
]);

const accept = ["image/png", "image/jpeg", "image/avif", "image/webp"];

let capturing = ref(false);

function onImageUpload(e: Event) {
    if (!(e.target instanceof HTMLInputElement)) return;

    for (const file of e.target.files ?? []) {
        if (accept.indexOf(file.type) >= 0) {
            emit("add", file);
        }
    }
}

function onCameraUpload(blob: Blob | null) {
    capturing.value = false;
    if (blob) {
        const file = new File([blob], "snap.jpg", {
            type: "image/jpeg",
        });
        emit("add", file);
    }
}
</script>

<template>
    <header class="my-4 gap-2 d-flex align-items-center">
        <div class="">
            <h1 class="h4 mb-1">Fotos (máx. {{ max }})</h1>
            <div class="form-text">Las fotos se guardan automáticamente</div>
        </div>
        <div class="flex-grow-1"></div>
        <label class="gallery__upload">
            <div :disabled="disabled || null" class="btn-solid">
                <span class="icon">
                    <ImageAdd />
                </span>
                <span>Subir</span>
            </div>
            <input
                class="gallery__file"
                type="file"
                multiple
                :disabled
                :accept="accept.join(',')"
                @change="onImageUpload"
            />
        </label>
        <button
            class="btn-solid theme-accent"
            type="button"
            :disabled
            @click="capturing = true"
        >
            <span>Tomar</span>
            <span class="icon">
                <CameraIcon />
            </span>
        </button>
    </header>

    <div v-if="photoError" class="mb-2 alert theme-danger">
        {{ photoError }}
    </div>

    <div class="gallery">
        <div
            v-for="{ pending, src } in photos"
            :key="src"
            class="gallery__item"
        >
            <a :href="src">
                <img class="gallery__photo img-thumbnail" :src alt="" />
            </a>
            <button
                v-if="pending"
                disabled
                class="btn-solid btn-icon btn-sm rounded-circle theme-accent gallery__delete"
                type="button"
            >
                <span class="spinner-border" aria-hidden="true"></span>
            </button>
            <button
                v-else
                class="btn-solid btn-icon btn-sm rounded-circle theme-danger gallery__delete"
                type="button"
                @click="emit('delete', src)"
            >
                <Delete />
            </button>
        </div>
    </div>

    <Camera v-if="capturing" @upload="onCameraUpload" />
</template>

<style scoped>
.gallery {
    display: flex;
    gap: 0.5rem;
    overflow-x: auto;
}

.gallery__item {
    position: relative;
    flex-shrink: 0;
    overflow: hidden;
    aspect-ratio: 1 / 1;
    width: 7.5rem;
}

.gallery__photo {
    position: absolute;
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.gallery__delete {
    position: absolute;
    right: 0.5rem;
    bottom: 0.5rem;
}

.gallery__upload {
    display: flex;
    align-items: center;
    justify-content: center;
}

.gallery__upload-text {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.gallery__file {
    display: none;
}

.gallery__capture {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    cursor: pointer;
}
</style>
