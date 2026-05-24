import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getMediaMeta, getMediaStream, initMediaStorage, putMediaObject } from "./storage.js";

const testRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "../.test-media-data");

test("filesystem media storage roundtrip", async () => {
  process.env.MEDIA_STORAGE = "filesystem";
  process.env.MEDIA_FILE_ROOT = testRoot;
  await rm(testRoot, { recursive: true, force: true });
  await mkdir(testRoot, { recursive: true });
  await initMediaStorage();

  const mediaId = "11111111-1111-4111-8111-111111111111";
  const body = Buffer.from("hello-media");
  const stored = await putMediaObject(mediaId, body, "text/plain", "hello.txt");
  assert.equal(stored.size, body.length);

  const meta = await getMediaMeta(mediaId);
  assert.equal(meta?.name, "hello.txt");
  assert.equal(meta?.mime, "text/plain");

  const streamPayload = await getMediaStream(mediaId);
  assert.ok(streamPayload);
  const chunks: Buffer[] = [];
  for await (const chunk of streamPayload!.stream) {
    chunks.push(Buffer.from(chunk));
  }
  assert.equal(Buffer.concat(chunks).toString("utf8"), "hello-media");

  await rm(testRoot, { recursive: true, force: true });
});
