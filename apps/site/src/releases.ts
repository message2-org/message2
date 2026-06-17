export type ReleaseStatus = "available" | "coming_soon";

export type ReleaseProduct = {
  id: string;
  status: ReleaseStatus;
  url?: string;
  officialUrl?: string;
  platforms: string[];
};

export type ReleasesManifest = {
  officialBaseUrl: string;
  products: ReleaseProduct[];
};

export async function fetchReleases(): Promise<ReleasesManifest> {
  const response = await fetch("/releases.json");
  if (!response.ok) {
    throw new Error("releases_not_found");
  }
  return (await response.json()) as ReleasesManifest;
}

export function resolveProductUrl(product: ReleaseProduct, officialBaseUrl: string, isOfficial: boolean): string | null {
  if (product.status !== "available") {
    return null;
  }

  if (product.url) {
    if (product.url.startsWith("http")) {
      return product.url;
    }
    return product.url;
  }

  if (!isOfficial && product.officialUrl) {
    return product.officialUrl;
  }

  if (!isOfficial && officialBaseUrl) {
    return `${officialBaseUrl.replace(/\/$/, "")}/downloads/`;
  }

  return null;
}
