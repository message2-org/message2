import test from "node:test";
import assert from "node:assert/strict";
import { summarizeReactions } from "./message-envelope.js";

test("summarizeReactions groups by emoji and marks viewer", () => {
  const rows = [
    { emoji: "👍", userId: "u1" },
    { emoji: "👍", userId: "u2" },
    { emoji: "❤️", userId: "u1" }
  ];
  const summary = summarizeReactions(rows, "u1");
  assert.equal(summary.length, 2);
  const thumbs = summary.find((r) => r.emoji === "👍");
  assert.ok(thumbs);
  assert.equal(thumbs.count, 2);
  assert.equal(thumbs.reactedByMe, true);
});

test("summarizeReactions preserves reactor order within emoji", () => {
  const rows = [
    { emoji: "👍", userId: "u1" },
    { emoji: "👍", userId: "u2" },
    { emoji: "👍", userId: "u3" }
  ];
  const summary = summarizeReactions(rows);
  assert.deepEqual(summary[0]?.userIds, ["u1", "u2", "u3"]);
});
