import {
  E2EE_PROTOCOL_VERSION,
  formatE2eeDmCipherText,
  isE2eeRatchetMsg,
  parseE2eeDmCipherText,
  type E2eeRatchetMsgV1
} from "@message2/contracts";
import { fromBase64Url, toBase64Url, utf8Decode, utf8Encode } from "./binary.js";
import { kdfChainKey, kdfInitialRoot, kdfMessageKeyMaterial, kdfRootKey } from "./kdf.js";
import { aesGcmDecrypt, aesGcmEncrypt, deriveX25519SharedSecret, generateX25519KeyPair, importX25519Private } from "./subtle.js";
import { dmAssociatedData } from "./x3dh.js";

export type DmRatchetRole = "initiator" | "responder";

export type FromSharedKeyOptions = {
  senderDeviceId: string;
  chatId: string;
  sharedKey: Uint8Array;
  role: DmRatchetRole;
  peerSignedPrekeyPublic?: string;
  signedPrekeyPrivate?: string;
};

export class DmRatchet {
  readonly #senderDeviceId: string;
  readonly #chatId: string;
  #rootKey: Uint8Array;
  #sendChainKey: Uint8Array | null = null;
  #recvChainKey: Uint8Array | null = null;
  #sendRatchetPublic: Uint8Array | null = null;
  #recvRatchetPublicB64: string | null = null;
  #sendRatchetPrivatePkcs8: string | null = null;
  #recvDhPrivatePkcs8: string | null = null;
  #ns = 0;
  #nr = 0;
  #pn = 0;
  #skippedKeys = new Map<string, Uint8Array>();

  private constructor(senderDeviceId: string, chatId: string, rootKey: Uint8Array) {
    this.#senderDeviceId = senderDeviceId;
    this.#chatId = chatId;
    this.#rootKey = rootKey;
  }

  static async fromSharedKey(options: FromSharedKeyOptions): Promise<DmRatchet> {
    const rootKey = await kdfInitialRoot(options.sharedKey);
    const session = new DmRatchet(options.senderDeviceId, options.chatId, rootKey);
    if (options.role === "initiator") {
      if (!options.peerSignedPrekeyPublic) throw new Error("peer_signed_prekey_required");
      await session.#ratchetSendStep(options.peerSignedPrekeyPublic);
    } else {
      if (!options.signedPrekeyPrivate) throw new Error("signed_prekey_private_required");
      session.#recvDhPrivatePkcs8 = options.signedPrekeyPrivate;
    }
    return session;
  }

  async encrypt(plaintext: string): Promise<string> {
    if (!this.#sendChainKey) {
      if (!this.#recvRatchetPublicB64) throw new Error("ratchet_send_not_ready");
      await this.#ratchetSendStep(this.#recvRatchetPublicB64);
    }
    const step = await kdfChainKey(this.#sendChainKey!);
    this.#sendChainKey = step.chainKey;
    const aesKey = await kdfMessageKeyMaterial(step.messageKey);
    const header = {
      dhPublic: this.#sendRatchetPublic ? toBase64Url(this.#sendRatchetPublic) : "",
      n: this.#ns,
      pn: this.#pn
    };
    this.#ns += 1;
    const aad = dmAssociatedData(this.#chatId, this.#senderDeviceId);
    const { ciphertext, nonce } = await aesGcmEncrypt(aesKey, utf8Encode(plaintext), aad);
    const payload: E2eeRatchetMsgV1 = {
      t: "msg",
      v: E2EE_PROTOCOL_VERSION,
      senderDeviceId: this.#senderDeviceId,
      header,
      ciphertext: toBase64Url(ciphertext),
      nonce: toBase64Url(nonce)
    };
    return formatE2eeDmCipherText(payload);
  }

  async decrypt(cipherText: string): Promise<string> {
    const payload = parseE2eeDmCipherText(cipherText);
    if (!payload || !isE2eeRatchetMsg(payload)) throw new Error("invalid_e2ee_cipher");
    return this.decryptPayload(payload);
  }

  async decryptPayload(payload: E2eeRatchetMsgV1): Promise<string> {
    const incomingDh = payload.header.dhPublic || null;
    if (incomingDh && incomingDh !== this.#recvRatchetPublicB64) {
      await this.#skipMessageKeys(payload.header.pn);
      await this.#ratchetRecvStep(incomingDh);
    }
    const chainTag = incomingDh || "bootstrap";
    const skipId = `${chainTag}:${payload.header.n}`;
    let messageKey = this.#skippedKeys.get(skipId);
    if (!messageKey) {
      if (!this.#recvChainKey) throw new Error("ratchet_recv_not_ready");
      while (this.#nr < payload.header.n) {
        const step = await kdfChainKey(this.#recvChainKey);
        this.#recvChainKey = step.chainKey;
        this.#skippedKeys.set(`${chainTag}:${this.#nr}`, step.messageKey);
        this.#nr += 1;
      }
      const step = await kdfChainKey(this.#recvChainKey);
      messageKey = step.messageKey;
      this.#recvChainKey = step.chainKey;
      this.#nr += 1;
    } else {
      this.#skippedKeys.delete(skipId);
    }
    const aesKey = await kdfMessageKeyMaterial(messageKey);
    const aad = dmAssociatedData(this.#chatId, payload.senderDeviceId);
    const plaintext = await aesGcmDecrypt(
      aesKey,
      fromBase64Url(payload.nonce),
      fromBase64Url(payload.ciphertext),
      aad
    );
    return utf8Decode(plaintext);
  }

  async #ratchetSendStep(peerDhPublicB64: string) {
    const pair = await generateX25519KeyPair();
    this.#sendRatchetPrivatePkcs8 = await importSideExportPrivate(pair.privateKey);
    this.#sendRatchetPublic = fromBase64Url(await exportSidePublic(pair.publicKey));
    const dhOut = await dhShared(this.#sendRatchetPrivatePkcs8, peerDhPublicB64);
    const mixed = await kdfRootKey(this.#rootKey, dhOut);
    this.#rootKey = mixed.rootKey;
    this.#pn = this.#ns;
    this.#ns = 0;
    this.#sendChainKey = mixed.chainKey;
  }

  async #ratchetRecvStep(peerDhPublicB64: string) {
    const localPriv = this.#recvDhPrivatePkcs8 ?? this.#sendRatchetPrivatePkcs8;
    if (!localPriv) throw new Error("ratchet_recv_missing_private");
    const dhOut = await dhShared(localPriv, peerDhPublicB64);
    const mixed = await kdfRootKey(this.#rootKey, dhOut);
    this.#rootKey = mixed.rootKey;
    this.#recvRatchetPublicB64 = peerDhPublicB64;
    this.#recvDhPrivatePkcs8 = null;
    this.#pn = this.#nr;
    this.#nr = 0;
    this.#recvChainKey = mixed.chainKey;
    const pair = await generateX25519KeyPair();
    this.#sendRatchetPrivatePkcs8 = await importSideExportPrivate(pair.privateKey);
    this.#sendRatchetPublic = fromBase64Url(await exportSidePublic(pair.publicKey));
    const sendDh = await dhShared(this.#sendRatchetPrivatePkcs8, peerDhPublicB64);
    const sendMixed = await kdfRootKey(this.#rootKey, sendDh);
    this.#rootKey = sendMixed.rootKey;
    this.#sendChainKey = sendMixed.chainKey;
    this.#ns = 0;
  }

  async #skipMessageKeys(until: number) {
    if (!this.#recvChainKey) return;
    const chainTag = this.#recvRatchetPublicB64 ?? "bootstrap";
    while (this.#nr < until) {
      const step = await kdfChainKey(this.#recvChainKey);
      this.#recvChainKey = step.chainKey;
      this.#skippedKeys.set(`${chainTag}:${this.#nr}`, step.messageKey);
      this.#nr += 1;
    }
  }
}

async function exportSidePublic(key: CryptoKey): Promise<string> {
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", key));
  return toBase64Url(raw);
}

async function importSideExportPrivate(key: CryptoKey): Promise<string> {
  const pkcs8 = new Uint8Array(await crypto.subtle.exportKey("pkcs8", key));
  return toBase64Url(pkcs8);
}

async function dhShared(privatePkcs8B64: string, publicRawB64: string): Promise<Uint8Array> {
  const priv = await importX25519Private(privatePkcs8B64);
  const pub = await crypto.subtle.importKey("raw", fromBase64Url(publicRawB64), { name: "X25519" }, true, []);
  return deriveX25519SharedSecret(priv, pub);
}
