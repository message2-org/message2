import { uploadMediaFile } from "./media";

const AVATAR_SIZE_PX = 256;
const AVATAR_JPEG_QUALITY = 0.85;
const AVATAR_MEDIA_PREFIX = "media:";

export function toAvatarMediaRef(mediaId: string): string {
  return `${AVATAR_MEDIA_PREFIX}${mediaId}`;
}

export function parseAvatarMediaId(avatarUrl: string | null | undefined): string | null {
  if (!avatarUrl?.startsWith(AVATAR_MEDIA_PREFIX)) return null;
  const mediaId = avatarUrl.slice(AVATAR_MEDIA_PREFIX.length);
  return /^[0-9a-f-]{36}$/i.test(mediaId) ? mediaId : null;
}

export function isInlineAvatarUrl(avatarUrl: string): boolean {
  return avatarUrl.startsWith("data:image/") || /^https?:\/\//i.test(avatarUrl);
}

/** Process, upload to media storage, return `media:<uuid>` reference for profile. */
export async function uploadAvatarMediaRef(accessToken: string, file: File): Promise<string> {
  const dataUrl = await processAvatarImageFile(file);
  const blob = await fetch(dataUrl).then((response) => response.blob());
  const ext = blob.type.includes("webp") ? "webp" : "jpg";
  const avatarFile = new File([blob], `avatar.${ext}`, { type: blob.type || "image/webp" });
  const uploaded = await uploadMediaFile(accessToken, avatarFile);
  return toAvatarMediaRef(uploaded.mediaId);
}

export function buildUserInitials(displayName: string, username: string): string {
  const value = (displayName.trim() || username.trim() || "U").trim();
  const words = value.split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase() ?? "").join("") || "U";
}

export function buildAvatarGradient(seed: string): string {
  let hash = 0;
  const normalized = seed.trim() || "user";
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash * 31 + normalized.charCodeAt(i)) | 0;
  }
  const hue = Math.abs(hash) % 360;
  return `linear-gradient(145deg, hsl(${hue} 68% 58%), hsl(${hue} 68% 40%))`;
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("invalid image"));
    };
    image.src = url;
  });
}

function canvasToDataUrl(canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("failed to encode image"));
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") resolve(reader.result);
          else reject(new Error("failed to encode image"));
        };
        reader.onerror = () => reject(new Error("failed to encode image"));
        reader.readAsDataURL(blob);
      },
      mimeType,
      quality
    );
  });
}

/** Square-crop and downscale avatar uploads for storage-efficient data URLs. */
export async function processAvatarImageFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("unsupported image type");
  }
  const image = await loadImageFromFile(file);
  const side = Math.min(image.naturalWidth, image.naturalHeight);
  const sx = Math.floor((image.naturalWidth - side) / 2);
  const sy = Math.floor((image.naturalHeight - side) / 2);

  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE_PX;
  canvas.height = AVATAR_SIZE_PX;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  ctx.drawImage(image, sx, sy, side, side, 0, 0, AVATAR_SIZE_PX, AVATAR_SIZE_PX);

  try {
    return await canvasToDataUrl(canvas, "image/webp", AVATAR_JPEG_QUALITY);
  } catch {
    return canvasToDataUrl(canvas, "image/jpeg", AVATAR_JPEG_QUALITY);
  }
}
