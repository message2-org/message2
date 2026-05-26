export type DeviceKeyMaterialV1 = {
  deviceId: string;
  identityKeyPublic: string;
  identityKeyPrivate: string;
  signingKeyPublic: string;
  signingKeyPrivate: string;
  signedPrekeyId: number;
  signedPrekeyPublic: string;
  signedPrekeyPrivate: string;
  signedPrekeySignature: string;
  oneTimePrekeys: Array<{ id: number; publicKey: string; privateKey: string }>;
};
export type PublishDevicePrekeyBundleInputV1 = {
  identityKeyPublic: string;
  signingKeyPublic: string;
  signedPrekeyId: number;
  signedPrekeyPublic: string;
  signedPrekeySignature: string;
  oneTimePrekeys?: Array<{ id: number; publicKey: string }>;
};
export type DevicePrekeyBundlePublishedV1 = {
  userId: string;
  deviceId: string;
  identityKeyPublic: string;
  signingKeyPublic: string;
  signedPrekeyId: number;
  signedPrekeyPublic: string;
  signedPrekeySignature: string;
  oneTimePrekey: { id: number; publicKey: string } | null;
};
export type DevicePrekeyBundleSummaryV1 = {
  deviceId: string;
  signedPrekeyId: number;
  oneTimePrekeyCount: number;
  updatedAt: string;
};
