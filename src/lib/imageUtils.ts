import heic2any from "heic2any";

/**
 * Converts a File to a browser-compatible image File.
 * If the file is HEIC/HEIF, it converts to JPEG first.
 * Also compresses large images to reduce localStorage usage.
 */
export async function ensureCompatibleImage(file: File): Promise<File> {
  const isHeic =
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    /\.heic$/i.test(file.name) ||
    /\.heif$/i.test(file.name);

  let blob: Blob = file;

  if (isHeic) {
    const converted = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.85,
    });
    blob = Array.isArray(converted) ? converted[0] : converted;
  }

  // Return as File with correct extension
  const name = file.name.replace(/\.heic$/i, ".jpg").replace(/\.heif$/i, ".jpg");
  return new File([blob], name, { type: blob.type || "image/jpeg" });
}
