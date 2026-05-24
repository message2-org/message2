import { useEffect, useState } from "react";
import { isInlineAvatarUrl, parseAvatarMediaId } from "../lib/avatar";
import { fetchMediaBlobUrl } from "../lib/media";

/** Resolve `media:<id>`, legacy data URLs, and https avatars to a URL suitable for `<img src>`. */
export function useResolvedAvatarUrl(avatarUrl: string | null | undefined, accessToken: string | null | undefined) {
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!avatarUrl) {
      setDisplayUrl(null);
      return;
    }

    if (isInlineAvatarUrl(avatarUrl)) {
      setDisplayUrl(avatarUrl);
      return;
    }

    const mediaId = parseAvatarMediaId(avatarUrl);
    if (!mediaId || !accessToken) {
      setDisplayUrl(null);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    void fetchMediaBlobUrl(accessToken, mediaId)
      .then((url) => {
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        objectUrl = url;
        setDisplayUrl(url);
      })
      .catch(() => {
        if (!cancelled) setDisplayUrl(null);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [avatarUrl, accessToken]);

  return displayUrl;
}
