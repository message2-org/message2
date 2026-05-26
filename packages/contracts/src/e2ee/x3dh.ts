import type { E2EE_PROTOCOL_VERSION } from "./constants.js";
export type E2eeX3dhInitV1 = {
  t: "x3dh_init";
  v: typeof E2EE_PROTOCOL_VERSION;
  senderDeviceId: string;
  recipientDeviceId: string;
  identityKeyPublic: string;
  ephemeralKeyPublic: string;
  usedSignedPrekeyId: number;
  usedOneTimePrekeyId: number | null;
};
export type E2eeX3dhResponseV1 = {
  t: "x3dh_response";
  v: typeof E2EE_PROTOCOL_VERSION;
  senderDeviceId: string;
  recipientDeviceId: string;
  identityKeyPublic: string;
  ephemeralKeyPublic: string;
};
export type E2eeHandshakePayloadV1 = E2eeX3dhInitV1 | E2eeX3dhResponseV1;
export const isE2eeX3dhInit = (value: unknown): value is E2eeX3dhInitV1 =>
  typeof value === "object" && value !== null && (value as E2eeX3dhInitV1).t === "x3dh_init" && (value as E2eeX3dhInitV1).v === 1;
export const isE2eeX3dhResponse = (value: unknown): value is E2eeX3dhResponseV1 =>
  typeof value === "object" && value !== null && (value as E2eeX3dhResponseV1).t === "x3dh_response" && (value as E2eeX3dhResponseV1).v === 1;
