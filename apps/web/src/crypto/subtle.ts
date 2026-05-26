import { fromBase64Url } from "./binary.js";

const X25519 = { name: "X25519" } as const;
const ED25519 = { name: "Ed25519" } as const;

export async function generateX25519KeyPair(): Promise<{ publicKey: CryptoKey; privateKey: CryptoKey }> {
  const pair = await crypto.subtle.generateKey(X25519, true, ["deriveBits"]);
  return { publicKey: pair.publicKey, privateKey: pair.privateKey };
}

export async function generateEd25519KeyPair(): Promise<{ publicKey: CryptoKey; privateKey: CryptoKey }> {
  const pair = await crypto.subtle.generateKey(ED25519, true, ["sign", "verify"]);
  return { publicKey: pair.publicKey, privateKey: pair.privateKey };
}

export async function importX25519Public(publicKeyB64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", fromBase64Url(publicKeyB64), X25519, true, []);
}

export async function importX25519Private(privateKeyB64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("pkcs8", fromBase64Url(privateKeyB64), X25519, true, ["deriveBits"]);
}

export async function importEd25519Public(publicKeyB64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", fromBase64Url(publicKeyB64), ED25519, true, ["verify"]);
}

export async function importEd25519Private(privateKeyB64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("pkcs8", fromBase64Url(privateKeyB64), ED25519, true, ["sign"]);
}

export async function deriveX25519SharedSecret(privateKey: CryptoKey, publicKey: CryptoKey): Promise<Uint8Array> {
  const bits = await crypto.subtle.deriveBits({ name: "X25519", public: publicKey }, privateKey, 256);
  return new Uint8Array(bits);
}

export async function ed25519Sign(privateKey: CryptoKey, data: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.sign(ED25519, privateKey, data));
}

export async function ed25519Verify(publicKey: CryptoKey, data: Uint8Array, signature: Uint8Array): Promise<boolean> {
  return crypto.subtle.verify(ED25519, publicKey, signature, data);
}

export async function hkdfSha256(ikm: Uint8Array, salt: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, key, length * 8);
  return new Uint8Array(bits);
}

export async function aesGcmEncrypt(keyBytes: Uint8Array, plaintext: Uint8Array, associatedData: Uint8Array) {
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["encrypt"]);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce, additionalData: associatedData }, key, plaintext);
  return { ciphertext: new Uint8Array(ciphertext), nonce };
}

export async function aesGcmDecrypt(keyBytes: Uint8Array, nonce: Uint8Array, ciphertext: Uint8Array, associatedData: Uint8Array) {
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["decrypt"]);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: nonce, additionalData: associatedData }, key, ciphertext);
  return new Uint8Array(plaintext);
}
