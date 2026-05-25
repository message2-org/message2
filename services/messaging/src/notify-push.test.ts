import test from "node:test";
import assert from "node:assert/strict";
import { previewTextFromCipher } from "./notify-push.js";

test("previewTextFromCipher handles plain text and attachments", () => {
  assert.equal(previewTextFromCipher("Hello world"), "Hello world");
  const attachment = JSON.stringify({
    kind: "attachment",
    text: "See this",
    fileName: "photo.png",
    previewType: "image"
  });
  assert.equal(previewTextFromCipher(attachment), "See this");
});
