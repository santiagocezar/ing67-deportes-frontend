<script setup lang="ts">
import CameraIcon from "~icons/fluent/camera-24-filled";
import ImageAdd from "~icons/fluent/image-add-48-filled";
//     import { Add, Camera, Delete, ImageAdd } from "$lib/components/icons";

const emit = defineEmits<{
    (e: "delete", id: string): void;
    (e: "add", file: File): void;
}>();

let { currentPhotos, pendingPhotos, editing } = defineProps<{
    editing?: boolean;
    currentPhotos: string[];
    pendingPhotos: string[];
}>();

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
    <header class="is-flex is-align-items-center">
        <p class="title m-0 is-5">Fotos</p>
        <div class="is-flex-grow-1"></div>
        <div v-if="editing" class="gallery__dropzone">
            <label class="gallery__upload">
                <div class="button is-primary">
                    <span class="icon">
                        <ImageAdd />
                    </span>
                    <span>Subir</span>
                </div>
                <input
                    class="gallery__file"
                    type="file"
                    multiple
                    :accept="accept.join(',')"
                    @change="onImageUpload"
                />
            </label>
            <button
                class="button is-primary"
                type="button"
                @click="capturing = true"
            >
                <span>Tomar</span>
                <span class="icon">
                    <CameraIcon />
                </span>
            </button>
        </div>
    </header>

    <div class="gallery">
        <div
            v-for="{ pending, src } in photos"
            :key="src"
            class="gallery__item"
        >
            <img class="gallery__photo" :src alt="" />
            <span v-if="pending">Pending</span>
            <button
                v-if="editing"
                class="gallery__delete"
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

.gallery__item,
.gallery__dropzone {
    border-radius: 0.5rem;
}

.gallery__dropzone {
    display: grid;
    padding: 0.5rem;
    gap: 0.5rem;
    grid-template-columns: 1fr 1fr;
    border: 2px dashed var(--bulma-border, #dbdbdb);
    cursor: pointer;

    & .button {
        width: 100%;
    }
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
    padding: 0.5rem;
    border: 0;
    border-radius: 0.5rem;
    background: #2a2a2a;
    color: inherit;
    cursor: pointer;
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
