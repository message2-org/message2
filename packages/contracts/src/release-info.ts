export type ReleaseInfo = {
  version: string;
  commit: string;
  repositoryUrl: string;
  defaultBranch: string;
  manifestUrl: string;
};

const DEFAULT_REPOSITORY_URL = "https://github.com/message2-org/message2";
const DEFAULT_BRANCH = "develop";

export const buildManifestUrl = (
  repositoryUrl: string = DEFAULT_REPOSITORY_URL,
  branch: string = DEFAULT_BRANCH
): string => {
  const trimmed = repositoryUrl.replace(/\/$/, "");
  if (trimmed.includes("github.com")) {
    const slug = trimmed.replace(/^https?:\/\/github\.com\//, "");
    return `https://raw.githubusercontent.com/${slug}/${branch}/distribution/manifest.json`;
  }
  return `${trimmed}/distribution/manifest.json`;
};

export const readReleaseInfoFromEnv = (env: NodeJS.ProcessEnv = process.env): ReleaseInfo => {
  const repositoryUrl = env.MESSAGE2_REPOSITORY_URL ?? DEFAULT_REPOSITORY_URL;
  const defaultBranch = env.MESSAGE2_DEFAULT_BRANCH ?? DEFAULT_BRANCH;
  return {
    version: env.MESSAGE2_VERSION ?? "0.1.0",
    commit: env.MESSAGE2_COMMIT ?? "dev",
    repositoryUrl,
    defaultBranch,
    manifestUrl: buildManifestUrl(repositoryUrl, defaultBranch)
  };
};
