import test from "node:test";
import assert from "node:assert/strict";
import { buildManifestUrl, readReleaseInfoFromEnv } from "./release-info.js";

test("buildManifestUrl for GitHub", () => {
  assert.equal(
    buildManifestUrl("https://github.com/message2-org/message2", "develop"),
    "https://raw.githubusercontent.com/message2-org/message2/develop/distribution/manifest.json"
  );
});

test("readReleaseInfoFromEnv defaults", () => {
  const info = readReleaseInfoFromEnv({});
  assert.equal(info.version, "0.1.0");
  assert.equal(info.repositoryUrl, "https://github.com/message2-org/message2");
  assert.equal(info.defaultBranch, "develop");
  assert.match(info.manifestUrl, /message2-org\/message2\/develop\/distribution\/manifest\.json$/);
});
