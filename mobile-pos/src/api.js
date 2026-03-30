import { requireConfiguredBaseUrl } from "./config";

function buildUrl(path, apiBaseUrlOverride = "") {
  return `${requireConfiguredBaseUrl(apiBaseUrlOverride)}${path.startsWith("/") ? path : `/${path}`}`;
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  const text = await response.text();
  return { error: text || "Request failed." };
}

export async function requestJson(path, options = {}, apiBaseUrlOverride = "") {
  const response = await fetch(buildUrl(path, apiBaseUrlOverride), options);
  const payload = await parseResponse(response);
  if (!response.ok) {
    throw new Error(payload.error || "Request failed.");
  }
  return payload;
}

export async function loginAdmin(password, apiBaseUrlOverride = "") {
  return requestJson("/api/admin/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ password })
  }, apiBaseUrlOverride);
}

export async function getAdminHealth(adminPassword, apiBaseUrlOverride = "") {
  return requestJson("/api/admin/health", {
    headers: {
      "x-admin-password": adminPassword
    }
  }, apiBaseUrlOverride);
}

export async function getProducts(adminPassword, apiBaseUrlOverride = "") {
  return requestJson("/api/admin/products", {
    headers: {
      "x-admin-password": adminPassword
    }
  }, apiBaseUrlOverride);
}

export async function createCashSale(adminPassword, payload, apiBaseUrlOverride = "") {
  return requestJson("/api/admin/pos/create-cash-sale", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-password": adminPassword
    },
    body: JSON.stringify(payload)
  }, apiBaseUrlOverride);
}

export async function createCardCheckout(adminPassword, payload, apiBaseUrlOverride = "") {
  return requestJson("/api/admin/pos/create-checkout-session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-password": adminPassword
    },
    body: JSON.stringify(payload)
  }, apiBaseUrlOverride);
}

export async function createTerminalConnectionToken(adminPassword, payload = {}, apiBaseUrlOverride = "") {
  return requestJson("/api/admin/terminal/connection-token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-password": adminPassword
    },
    body: JSON.stringify(payload)
  }, apiBaseUrlOverride);
}

export async function createTerminalPaymentIntent(adminPassword, payload, apiBaseUrlOverride = "") {
  return requestJson("/api/admin/terminal/create-payment-intent", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-password": adminPassword
    },
    body: JSON.stringify(payload)
  }, apiBaseUrlOverride);
}

export async function cancelTerminalPaymentIntent(adminPassword, paymentIntentId, apiBaseUrlOverride = "") {
  return requestJson("/api/admin/terminal/cancel-payment-intent", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-password": adminPassword
    },
    body: JSON.stringify({ paymentIntentId })
  }, apiBaseUrlOverride);
}

export async function finalizeTerminalPaymentIntent(adminPassword, paymentIntentId, apiBaseUrlOverride = "") {
  return requestJson("/api/admin/terminal/finalize-payment-intent", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-password": adminPassword
    },
    body: JSON.stringify({ paymentIntentId })
  }, apiBaseUrlOverride);
}
