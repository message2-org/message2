import test from "node:test";
import assert from "node:assert/strict";
import { createGatewayApp } from "./app.js";

test("corporate profile does not expose /lawful proxy", async (t) => {
  process.env.DEPLOYMENT_PROFILE = "corporate";
  process.env.LAWFUL_ACCESS_ENABLED = "false";
  const app = createGatewayApp();
  const server = app.listen(0);
  t.after(() => server.close());

  const port = (server.address() as { port: number }).port;
  const response = await fetch(`http://127.0.0.1:${port}/lawful/v1/operations`, { method: "POST" });
  assert.equal(response.status, 404);
});

test("public profile health reports lawful route exposed", async (t) => {
  process.env.DEPLOYMENT_PROFILE = "public";
  process.env.LAWFUL_ACCESS_ENABLED = "true";
  const app = createGatewayApp();
  const server = app.listen(0);
  t.after(() => server.close());

  const port = (server.address() as { port: number }).port;
  const response = await fetch(`http://127.0.0.1:${port}/health`);
  assert.equal(response.status, 200);
  const body = (await response.json()) as { lawfulRouteExposed: boolean };
  assert.equal(body.lawfulRouteExposed, true);
});
