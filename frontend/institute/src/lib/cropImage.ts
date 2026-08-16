export type PixelCrop = { x: number; y: number; width: number; height: number };

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", reject);
    img.src = url;
  });
}

/** Crops `imageSrc` to `pixelCrop` (as reported by react-easy-crop) and
 * returns the result as a File, same basename as the original, always
 * re-encoded as JPEG — matches what every upload endpoint here already
 * expects (a single flat image), regardless of the source format. */
export async function cropImageToFile(imageSrc: string, pixelCrop: PixelCrop, fileName: string): Promise<File> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
    0, 0, pixelCrop.width, pixelCrop.height
  );
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error("Crop failed"))), "image/jpeg", 0.92);
  });
  const jpegName = fileName.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], jpegName, { type: "image/jpeg" });
}
