import heic2any from "heic2any";

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
