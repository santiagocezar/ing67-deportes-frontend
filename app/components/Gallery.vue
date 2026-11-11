<script setup lang="ts">
import { IconCamera, IconDelete, IconImageAdd } from "~/assets/icons";

const emit = defineEmits<{
    (e: "delete", id: string): void;
    (e: "add", file: File): void;
}>();

let { max, photoError, currentPhotos, pendingPhotos, readonly } = defineProps<{
    max: number;
    photoError: string;
    currentPhotos: string[];
    pendingPhotos: string[];
    readonly?: boolean;
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
    <header class="mb-4 gap-2 d-flex align-items-center">
        <div class="">
            <h2 class="h4 mb-1">Fotos (máx. {{ max }})</h2>
            <div class="form-text">Las fotos se guardan automáticamente</div>
        </div>
        <div class="flex-grow-1"></div>
        <label v-if="!readonly" class="gallery__upload">
            <div :disabled="disabled || null" class="btn-solid">
                <IconImageAdd />
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
            v-if="!readonly"
            class="btn-solid theme-accent"
            type="button"
            :disabled
            @click="capturing = true"
        >
            <span>Tomar</span>
            <IconCamera />
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
            <NuxtLink :to="src">
                <img class="gallery__photo img-thumbnail" :src alt="" />
            </NuxtLink>
            <button
                v-if="pending"
                disabled
                class="btn-solid btn-icon btn-sm rounded-circle theme-accent gallery__delete"
                type="button"
            >
                <span class="spinner-border" aria-hidden="true"></span>
            </button>
            <button
                v-else-if="!readonly"
                class="btn-solid btn-icon btn-sm rounded-circle theme-danger gallery__delete"
                type="button"
                @click="emit('delete', src)"
            >
                <IconDelete />
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
