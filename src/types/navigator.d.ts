/**
 * NavigatorUAData type extension
 *
 * Adds typing for the Navigator.userAgentData API which is not yet
 * included in TypeScript's lib.dom.d.ts.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/NavigatorUAData
 */

interface NavigatorUAData {
  platform: string;
  mobile: boolean;
  brands: Array<{ brand: string; version: string }>;
}

interface Navigator {
  userAgentData?: NavigatorUAData;
}
