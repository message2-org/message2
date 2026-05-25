import test from "node:test";
import assert from "node:assert/strict";
import {
  isUserTransparencyEnabled,
  parseCorporateConnectivityMode,
  parseDeploymentProfile,
  readInstanceProfileFromEnv,
  resolveLawfulAccessEnabled
} from "./deployment-profile.js";

test("corporate profile forces lawful access off", () => {
  assert.equal(
    resolveLawfulAccessEnabled("corporate", { lawfulAccessEnabled: "true", deploymentProfile: "corporate" }),
    false
  );
  assert.equal(isUserTransparencyEnabled("corporate"), false);
  assert.equal(isUserTransparencyEnabled("public"), true);
});

test("readInstanceProfileFromEnv", () => {
  const profile = readInstanceProfileFromEnv({
    DEPLOYMENT_PROFILE: "corporate",
    LAWFUL_ACCESS_ENABLED: "true",
    CORPORATE_CONNECTIVITY_MODE: "federation"
  } as NodeJS.ProcessEnv);
  assert.equal(profile.deploymentProfile, "corporate");
  assert.equal(profile.lawfulAccessEnabled, false);
  assert.equal(profile.userTransparencyEnabled, false);
  assert.equal(profile.corporateConnectivity, "federation");
});

test("parseDeploymentProfile and connectivity defaults", () => {
  assert.equal(parseDeploymentProfile(undefined), "public");
  assert.equal(parseCorporateConnectivityMode(undefined), "isolated");
});
