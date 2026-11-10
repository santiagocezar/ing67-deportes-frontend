import type { Ref } from "vue";
import type { MatchRosterScanResponse } from "~/utils/openapi";

// La imagen grupal solo se puede descargar mientras la revisión está pendiente
// y siempre mediante una petición autenticada. A partir de ella se recortan las
// caras que se muestran junto a cada decisión.
export function useScanGroupImage(scan: Ref<MatchRosterScanResponse | null>) {
    const { $api } = useNuxtApp();

    const groupImageUrl = ref<string | null>(null);
    const groupImagePending = ref(
        scan.value?.manual_review?.status === "pending",
    );
    const groupImageError = ref(false);
    const crops = ref<Record<number, string>>({});

    function revokeGroupImage() {
        if (!groupImageUrl.value) return;
        URL.revokeObjectURL(groupImageUrl.value);
        groupImageUrl.value = null;
        crops.value = {};
    }

    async function buildCrops(url: string) {
        try {
            const image = await loadImage(url);
            const next: Record<number, string> = {};

            for (const face of scan.value?.faces ?? []) {
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

    async function loadGroupImage() {
        if (!scan.value || scan.value.manual_review?.status !== "pending") {
            return;
        }

        groupImagePending.value = true;
        groupImageError.value = false;

        try {
            const response = await $api.raw<Blob>(
                `/roster-scans/${scan.value.id}/group-image`,
                { responseType: "blob" },
            );

            if (!response._data) throw new Error("Imagen vacía");

            revokeGroupImage();
            groupImageUrl.value = URL.createObjectURL(response._data);
            await buildCrops(groupImageUrl.value);
        } catch {
            groupImageError.value = true;
        } finally {
            groupImagePending.value = false;
        }
    }

    onMounted(loadGroupImage);
    onBeforeUnmount(revokeGroupImage);

    return {
        groupImageUrl,
        groupImagePending,
        groupImageError,
        crops,
        loadGroupImage,
        revokeGroupImage,
    };
}
