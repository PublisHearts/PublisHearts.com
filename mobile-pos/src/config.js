import appConfig from "../app.json";

const extra = appConfig?.expo?.extra || {};

export function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

export const config = {
  apiBaseUrl: normalizeBaseUrl(extra.apiBaseUrl),
  stripePublishableKey: String(extra.stripePublishableKey || "")
};

export function resolveConfig(apiBaseUrlOverride = "") {
  return {
    ...config,
    apiBaseUrl: normalizeBaseUrl(apiBaseUrlOverride) || config.apiBaseUrl
  };
}

export function requireConfiguredBaseUrl(apiBaseUrlOverride = "") {
  const resolved = resolveConfig(apiBaseUrlOverride);
  if (!resolved.apiBaseUrl) {
    throw new Error("Set expo.extra.apiBaseUrl in mobile-pos/app.json before running the mobile POS.");
  }
  return resolved.apiBaseUrl;
}
