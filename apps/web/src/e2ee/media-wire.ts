import { fromBase64Url, toBase64Url } from "../crypto/binary.js";

export type E2eeMediaEnvelope = {
  alg: "aes-256-gcm";
  keyB64: string;
  ivB64: string;
  mime: string;
  size: number;
};

export async function encryptAttachmentFile(file: File): Promise<{
  encryptedFile: File;
  envelope: E2eeMediaEnvelope;
}> {
  const plainBytes = new Uint8Array(await file.arrayBuffer());
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const cipherBuffer = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plainBytes);
  const rawKey = new Uint8Array(await crypto.subtle.exportKey("raw", key));
  const encryptedBytes = new Uint8Array(cipherBuffer);
  const encryptedFile = new File([encryptedBytes], `${file.name}.m2e2`, {
    type: "application/octet-stream"
  });
  return {
    encryptedFile,
    envelope: {
      alg: "aes-256-gcm",
      keyB64: toBase64Url(rawKey),
      ivB64: toBase64Url(iv),
      mime: file.type || "application/octet-stream",
      size: file.size
    }
  };
}

export async function decryptAttachmentBlob(
  encryptedBlob: Blob,
  envelope: E2eeMediaEnvelope
): Promise<Blob> {
  if (envelope.alg !== "aes-256-gcm") {
    throw new Error("unsupported_media_e2ee_alg");
  }
  const key = await crypto.subtle.importKey("raw", fromBase64Url(envelope.keyB64), { name: "AES-GCM" }, false, [
    "decrypt"
  ]);
  const cipherBytes = new Uint8Array(await encryptedBlob.arrayBuffer());
  const plainBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64Url(envelope.ivB64) },
    key,
    cipherBytes
  );
  return new Blob([plainBuffer], { type: envelope.mime || "application/octet-stream" });
}
