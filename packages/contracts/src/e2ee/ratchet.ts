import type { E2EE_PROTOCOL_VERSION } from "./constants.js";
export type E2eeRatchetHeaderV1 = { n: number; pn: number; dhPublic: string };
export type E2eeRatchetMsgV1 = {
  t: "msg";
  v: typeof E2EE_PROTOCOL_VERSION;
  senderDeviceId: string;
  header: E2eeRatchetHeaderV1;
  ciphertext: string;
  nonce: string;
};
export const isE2eeRatchetMsg = (value: unknown): value is E2eeRatchetMsgV1 =>
  typeof value === "object" && value !== null && (value as E2eeRatchetMsgV1).t === "msg" && (value as E2eeRatchetMsgV1).v === 1;
