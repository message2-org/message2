const MEDIA_API_BASE_URLS = ["/media", "http://localhost:4000/media", "http://localhost:4002"] as const;

export type MediaUploadResult = {
  mediaId: string;
  name: string;
  mime: string;
  size: number;
};

export async function uploadMediaFile(accessToken: string, file: File): Promise<MediaUploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  let lastError: Error | null = null;

  for (const baseUrl of MEDIA_API_BASE_URLS) {
    try {
      const response = await fetch(`${baseUrl}/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData
      });
      const data = (await response.json().catch(() => ({}))) as {
        mediaId?: string;
        name?: string;
        mime?: string;
        size?: number;
        error?: string;
      };
      if (response.status === 401) {
        throw new Error("UNAUTHORIZED");
      }
      if (!response.ok) {
        if (response.status >= 500) {
          lastError = new Error(String(data.error ?? "media upload failed"));
          continue;
        }
        throw new Error(String(data.error ?? "media upload failed"));
      }
      if (!data.mediaId) {
        throw new Error("media upload failed");
      }
      return {
        mediaId: data.mediaId,
        name: data.name ?? file.name,
        mime: data.mime ?? file.type,
        size: data.size ?? file.size
      };
    } catch (error) {
      if (error instanceof Error && error.message === "UNAUTHORIZED") {
        throw error;
      }
      lastError = error instanceof Error ? error : new Error("media upload failed");
    }
  }

  throw lastError ?? new Error("media upload failed");
}

export async function fetchMediaBlobUrl(accessToken: string, mediaId: string): Promise<string> {
  const blob = await fetchMediaBlob(accessToken, mediaId);
  return URL.createObjectURL(blob);
}

export async function fetchMediaBlob(accessToken: string, mediaId: string): Promise<Blob> {
  let lastError: Error | null = null;

  for (const baseUrl of MEDIA_API_BASE_URLS) {
    try {
      const response = await fetch(`${baseUrl}/objects/${encodeURIComponent(mediaId)}/content`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (response.status === 401) {
        throw new Error("UNAUTHORIZED");
      }
      if (!response.ok) {
        if (response.status >= 500) {
          lastError = new Error("failed to load media");
          continue;
        }
        throw new Error("media not found");
      }
      return await response.blob();
    } catch (error) {
      if (error instanceof Error && error.message === "UNAUTHORIZED") {
        throw error;
      }
      lastError = error instanceof Error ? error : new Error("failed to load media");
    }
  }

  throw lastError ?? new Error("failed to load media");
}
