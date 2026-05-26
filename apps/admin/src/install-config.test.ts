import test from "node:test";
import assert from "node:assert/strict";
import {
  buildEnvSnippets,
  compareInstallToServer,
  normalizeInstallConfig
} from "./install-config.js";

test("normalizeInstallConfig forces lawful off on corporate", () => {
  const config = normalizeInstallConfig({
    deploymentProfile: "corporate",
    connectivity: "federation",
    lawfulAccessEnabled: true
  });
  assert.equal(config.lawfulAccessEnabled, false);
  assert.equal(config.connectivity, "federation");
});

test("normalizeInstallConfig defaults public lawful on", () => {
  const config = normalizeInstallConfig({ deploymentProfile: "public" });
  assert.equal(config.lawfulAccessEnabled, true);
  assert.equal(config.connectivity, "isolated");
});

test("buildEnvSnippets includes connectivity for corporate", () => {
  const snippets = buildEnvSnippets(
    normalizeInstallConfig({
      deploymentProfile: "corporate",
      connectivity: "public_bridge",
      lawfulAccessEnabled: false
    })
  );
  assert.match(snippets.dotenv, /DEPLOYMENT_PROFILE=corporate/);
  assert.match(snippets.dotenv, /CORPORATE_CONNECTIVITY_MODE=public_bridge/);
  assert.match(snippets.compose, /MESSAGE2_CORPORATE_CONNECTIVITY_MODE=public_bridge/);
});

test("compareInstallToServer reports profile and lawful drift", () => {
  const local = normalizeInstallConfig({
    deploymentProfile: "corporate",
    connectivity: "federation",
    lawfulAccessEnabled: false
  });
  const drifts = compareInstallToServer(local, {
    deploymentProfile: "public",
    lawfulAccessEnabled: true,
    corporateConnectivity: "isolated"
  });
  const fields = drifts.map((d) => d.field);
  assert.ok(fields.includes("deploymentProfile"));
  assert.ok(fields.includes("lawfulAccessEnabled"));
  assert.ok(fields.includes("corporateConnectivity"));
});

test("compareInstallToServer ignores connectivity when wizard is public", () => {
  const local = normalizeInstallConfig({ deploymentProfile: "public", connectivity: "federation" });
  const drifts = compareInstallToServer(local, {
    deploymentProfile: "public",
    lawfulAccessEnabled: true,
    corporateConnectivity: "isolated"
  });
  assert.equal(drifts.length, 0);
});
