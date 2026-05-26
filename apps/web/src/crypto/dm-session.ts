import type { DeviceKeyMaterialV1, DevicePrekeyBundlePublishedV1, E2eeX3dhInitV1 } from "@message2/contracts";
import {
  formatE2eeDmCipherText,
  isE2eeX3dhInit,
  isE2eeX3dhResponse,
  parseE2eeDmCipherText
} from "@message2/contracts";
import { DmRatchet } from "./ratchet.js";
import { acceptX3dhInit, createX3dhInit, createX3dhResponse } from "./x3dh.js";

export class DmE2eeSession {
  readonly #ratchet: DmRatchet;

  private constructor(ratchet: DmRatchet) {
    this.#ratchet = ratchet;
  }

  static async startInitiator(options: {
    local: DeviceKeyMaterialV1;
    remote: DevicePrekeyBundlePublishedV1;
    chatId: string;
  }): Promise<{ session: DmE2eeSession; initWire: string; init: E2eeX3dhInitV1 }> {
    const { sharedKey, init } = await createX3dhInit(options.local, options.remote, options.remote.deviceId);
    const ratchet = await DmRatchet.fromSharedKey({
      senderDeviceId: options.local.deviceId,
      chatId: options.chatId,
      sharedKey,
      role: "initiator",
      peerSignedPrekeyPublic: options.remote.signedPrekeyPublic
    });
    return { session: new DmE2eeSession(ratchet), initWire: formatE2eeDmCipherText(init), init };
  }

  static async startResponder(options: {
    local: DeviceKeyMaterialV1;
    chatId: string;
    initWire: string;
  }): Promise<{ session: DmE2eeSession; responseWire: string }> {
    const parsed = parseE2eeDmCipherText(options.initWire);
    if (!parsed || !isE2eeX3dhInit(parsed)) throw new Error("invalid_x3dh_init");
    const sharedKey = await acceptX3dhInit(options.local, parsed);
    const { response } = await createX3dhResponse(options.local, parsed);
    const ratchet = await DmRatchet.fromSharedKey({
      senderDeviceId: options.local.deviceId,
      chatId: options.chatId,
      sharedKey,
      role: "responder",
      signedPrekeyPrivate: options.local.signedPrekeyPrivate
    });
    return { session: new DmE2eeSession(ratchet), responseWire: formatE2eeDmCipherText(response) };
  }

  static async acceptResponse(_responseWire: string): Promise<void> {
    const parsed = parseE2eeDmCipherText(_responseWire);
    if (!parsed || !isE2eeX3dhResponse(parsed)) throw new Error("invalid_x3dh_response");
  }

  encrypt(plaintext: string): Promise<string> {
    return this.#ratchet.encrypt(plaintext);
  }

  decrypt(cipherText: string): Promise<string> {
    return this.#ratchet.decrypt(cipherText);
  }
}
