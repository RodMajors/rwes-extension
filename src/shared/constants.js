import sites from "./sites.cjs";

export const DICT_SERVER_DEFAULT = "https://wowdata.rodmajors.com";
export const DB_NAME = "rwes-dict";
export const DB_VERSION = 1;
export const DB_META_STORE = "meta";
export const DB_FILES_STORE = "files";
export const SETTINGS_DEFAULTS = {
  translateEnabled: true,
  autoRedirectWowheadCN: true,
  autoRedirectWCLCN: true,
  autoRedirectMythicTrapCN: true,
  forceTestToCN: false,
};
export const SUPPORTED_MATCHES = sites.SUPPORTED_MATCHES;
