import heic2any from "heic2any";

const MAX_DIMENSION = 1200;
const JPEG_QUALITY = 0.82;

/**
 * Resizes an image to fit within MAX_DIMENSION x MAX_DIMENSION,
 * converting it to JPEG. Returns a base64 data URL.
 */
export function resizeImageToDataUrl(
  source: string | Blob,
  maxDim = MAX_DIMENSION,
  quality = JPEG_QUALITY,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { naturalWidth: w, naturalHeight: h } = img;
      if (w > maxDim || h > maxDim) {
        const ratio = Math.min(maxDim / w, maxDim / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas context unavailable")); return; }
      ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      if (typeof source === "string") {
        // nothing to revoke
      } else {
        URL.revokeObjectURL(img.src);
      }
      resolve(dataUrl);
    };
    img.onerror = () => reject(new Error("Image load failed"));
    if (source instanceof Blob) {
      img.src = URL.createObjectURL(source);
    } else {
      img.src = source;
    }
  });
}

/**
 * Tries to render the image via an <img> + canvas.
 * Works on Safari/iOS which natively support HEIC.
 */
function canvasConvert(file: File, quality = 0.85): Promise<Blob | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(null); return; }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(
          (blob) => { URL.revokeObjectURL(url); resolve(blob); },
          "image/jpeg",
          quality,
        );
      } catch {
        URL.revokeObjectURL(url);
        resolve(null);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

/**
 * Converts a File to a browser-compatible image File.
 * If the file is HEIC/HEIF, it first tries native canvas rendering (Safari/iOS),
 * then falls back to heic2any for other browsers.
 */
export async function ensureCompatibleImage(file: File): Promise<File> {
  const isHeic =
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    /\.heic$/i.test(file.name) ||
    /\.heif$/i.test(file.name);

  if (!isHeic) return file;

  const name = file.name.replace(/\.heic$/i, ".jpg").replace(/\.heif$/i, ".jpg");

  // Strategy 1: Canvas (works on Safari/iOS with native HEIC support)
  const canvasBlob = await canvasConvert(file);
  if (canvasBlob && canvasBlob.size > 0) {
    console.log("HEIC converted via canvas");
    return new File([canvasBlob], name, { type: "image/jpeg" });
  }

  // Strategy 2: heic2any library (works on Chrome/Firefox/etc.)
  console.log("Canvas failed, trying heic2any…");
  const converted = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.85,
  });
  const blob = Array.isArray(converted) ? converted[0] : converted;
  return new File([blob], name, { type: "image/jpeg" });
}
