const CROP_SIZE = 256;
const CROP_MARGIN = 0.15;

export function loadImage(src: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("No se pudo leer la foto."));
        image.src = src;
    });
}

// Recorta la región indicada de una imagen, con un margen proporcional al
// tamaño de la caja, y la escala para que entre en CROP_SIZE.
export function cropImage(
    image: HTMLImageElement,
    top: number,
    left: number,
    right: number,
    bottom: number,
): string | null {
    const sourceWidth = image.naturalWidth;
    const sourceHeight = image.naturalHeight;
    if (!sourceWidth || !sourceHeight) return null;

    const boxWidth = Math.max(1, right - left);
    const boxHeight = Math.max(1, bottom - top);
    const margin = Math.round(Math.max(boxWidth, boxHeight) * CROP_MARGIN);

    const cropLeft = Math.max(0, Math.min(left - margin, sourceWidth - 1));
    const cropTop = Math.max(0, Math.min(top - margin, sourceHeight - 1));
    const cropRight = Math.max(
        cropLeft + 1,
        Math.min(right + margin, sourceWidth),
    );
    const cropBottom = Math.max(
        cropTop + 1,
        Math.min(bottom + margin, sourceHeight),
    );

    const width = cropRight - cropLeft;
    const height = cropBottom - cropTop;
    const scale = Math.min(1, CROP_SIZE / Math.max(width, height));

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));

    const context = canvas.getContext("2d");
    if (!context) return null;

    context.drawImage(
        image,
        cropLeft,
        cropTop,
        width,
        height,
        0,
        0,
        canvas.width,
        canvas.height,
    );

    return canvas.toDataURL("image/jpeg", 0.85);
}
