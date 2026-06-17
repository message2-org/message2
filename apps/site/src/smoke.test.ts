import assert from "node:assert/strict";
import { test } from "node:test";
import { en, getMessages, ru } from "./i18n/index.js";
import { isOfficialSite } from "./instance.js";
import { resolveProductUrl } from "./releases.js";

test("i18n catalogs expose brand strings", () => {
  assert.equal(getMessages("ru").brandName, ru.brandName);
  assert.equal(getMessages("en").brandName, en.brandName);
});

test("official host detection includes message2.ru and punycode", () => {
  assert.equal(isOfficialSite("message2.ru"), true);
  assert.equal(isOfficialSite("xn--80aaf6a3a.xn--p1ai"), true);
  assert.equal(isOfficialSite("203.0.113.10"), false);
});

test("resolveProductUrl keeps relative web path", () => {
  const url = resolveProductUrl(
    { id: "web", status: "available", url: "/app/", platforms: ["web"] },
    "https://message2.ru",
    true
  );
  assert.equal(url, "/app/");
});
