import test from "node:test";
import assert from "node:assert/strict";
import { restoreSession } from "./restoreSession";
import { SESSION_STORAGE_KEY } from "./types";

const memory = new Map<string, string>();

const localStorageStub = {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => {
    memory.set(key, value);
  },
  removeItem: (key: string) => {
    memory.delete(key);
  }
};

const originalFetch = globalThis.fetch;

function installLocalStorage() {
  Object.defineProperty(globalThis, "localStorage", {
    value: localStorageStub,
    configurable: true
  });
}

function seedSession(accessToken = "access-old", refreshToken = "refresh-old") {
  memory.set(
    SESSION_STORAGE_KEY,
    JSON.stringify({
      user: { id: "u1", displayName: "Ada", username: "ada" },
      accessToken,
      refreshToken
    })
  );
}

test("restoreSession returns none when storage is empty", async () => {
  memory.clear();
  installLocalStorage();
  const result = await restoreSession();
  assert.equal(result.status, "none");
});

test("restoreSession keeps cached session on network errors", async () => {
  memory.clear();
  installLocalStorage();
  seedSession();
  globalThis.fetch = async () => {
    throw new TypeError("Failed to fetch");
  };
  const result = await restoreSession();
  assert.equal(result.status, "restored");
  if (result.status === "restored") {
    assert.equal(result.fromCache, true);
    assert.equal(result.session.user.username, "ada");
    assert.equal(memory.has(SESSION_STORAGE_KEY), true);
  }
  globalThis.fetch = originalFetch;
});

test("restoreSession refreshes tokens when access token is unauthorized", async () => {
  memory.clear();
  installLocalStorage();
  seedSession("access-expired", "refresh-valid");
  let meCalls = 0;
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith("/auth/me")) {
      meCalls += 1;
      const headers = init?.headers as Record<string, string> | undefined;
      const token = String(headers?.Authorization ?? "");
      if (token.includes("access-expired")) {
        return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
      }
      return new Response(
        JSON.stringify({ id: "u1", displayName: "Ada", username: "ada", avatarUrl: null }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    if (url.endsWith("/auth/refresh")) {
      return new Response(
        JSON.stringify({ accessToken: "access-new", refreshToken: "refresh-new" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response("not found", { status: 404 });
  };

  const result = await restoreSession();
  assert.equal(result.status, "restored");
  if (result.status === "restored") {
    assert.equal(result.session.accessToken, "access-new");
    assert.equal(result.session.refreshToken, "refresh-new");
    assert.equal(meCalls, 2);
  }
  globalThis.fetch = originalFetch;
});

test("restoreSession clears storage when refresh is rejected", async () => {
  memory.clear();
  installLocalStorage();
  seedSession("access-expired", "refresh-revoked");
  globalThis.fetch = async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/auth/me")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
    }
    if (url.endsWith("/auth/refresh")) {
      return new Response(JSON.stringify({ error: "invalid refresh token" }), { status: 401 });
    }
    return new Response("not found", { status: 404 });
  };

  const result = await restoreSession();
  assert.equal(result.status, "cleared");
  assert.equal(memory.has(SESSION_STORAGE_KEY), false);
  globalThis.fetch = originalFetch;
});
