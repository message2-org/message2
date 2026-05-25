import { readInstanceProfileFromEnv } from "@message2/contracts";

export const instanceConfig = {
  get deploymentProfile() {
    return readInstanceProfileFromEnv().deploymentProfile;
  },
  get lawfulAccessEnabled() {
    return readInstanceProfileFromEnv().lawfulAccessEnabled;
  },
  get userTransparencyEnabled() {
    return readInstanceProfileFromEnv().userTransparencyEnabled;
  },
  get corporateConnectivity() {
    return readInstanceProfileFromEnv().corporateConnectivity;
  }
};
