const memberTokenStorageKey = "publishearts_member_token_v1";

const signupForm = document.getElementById("signup-form");
const displayNameInput = document.getElementById("signup-display-name");
const emailInput = document.getElementById("signup-email");
const passwordInput = document.getElementById("signup-password");
const phoneInput = document.getElementById("signup-phone");
const stateSelect = document.getElementById("signup-state");
const submitBtn = document.getElementById("signup-submit-btn");
const messageEl = document.getElementById("signup-message");

const US_STATE_CODES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
  "DC"
];

const US_STATE_SET = new Set(US_STATE_CODES);

function normalizeStateCode(value) {
  const code = String(value || "")
    .trim()
    .toUpperCase();
  if (!US_STATE_SET.has(code)) {
    return "";
  }
  return code;
}

function populateStateOptions(selectedCode = "") {
  if (!stateSelect) {
    return;
  }
  stateSelect.innerHTML = `
    <option value="">Select your state</option>
    ${US_STATE_CODES.map((code) => `<option value="${code}">${code}</option>`).join("")}
  `;
  const normalizedSelected = normalizeStateCode(selectedCode);
  if (normalizedSelected) {
    stateSelect.value = normalizedSelected;
  }
}

function setMessage(message = "", isError = false) {
  if (!messageEl) {
    return;
  }
  messageEl.textContent = message || "";
  messageEl.classList.toggle("error", Boolean(isError));
}

function setBusy(isBusy) {
  const disabled = Boolean(isBusy);
  if (submitBtn) {
    submitBtn.disabled = disabled;
  }
  if (displayNameInput) {
    displayNameInput.disabled = disabled;
  }
  if (emailInput) {
    emailInput.disabled = disabled;
  }
  if (passwordInput) {
    passwordInput.disabled = disabled;
  }
  if (phoneInput) {
    phoneInput.disabled = disabled;
  }
  if (stateSelect) {
    stateSelect.disabled = disabled;
  }
}

function readToken() {
  return String(window.sessionStorage.getItem(memberTokenStorageKey) || "").trim();
}

function setToken(token) {
  const normalized = String(token || "").trim();
  if (!normalized) {
    window.sessionStorage.removeItem(memberTokenStorageKey);
    window.localStorage.removeItem(memberTokenStorageKey);
    return;
  }
  window.sessionStorage.setItem(memberTokenStorageKey, normalized);
  window.localStorage.removeItem(memberTokenStorageKey);
}

function getRedirectPath(defaultPath = "/membership.html?welcome=1") {
  const params = new URLSearchParams(window.location.search);
  const candidate = String(params.get("next") || "").trim();
  if (candidate.startsWith("/") && !candidate.startsWith("//")) {
    return candidate;
  }
  return defaultPath;
}

async function apiRequest(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload || {})
  });
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  if (!response.ok) {
    throw new Error(String(body?.error || "").trim() || "Request failed.");
  }
  return body;
}

async function maybeRedirectIfAlreadyLoggedIn() {
  const token = readToken();
  if (!token) {
    return;
  }
  try {
    const response = await fetch("/api/members/me", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    const payload = await response.json().catch(() => null);
    if (response.ok && payload?.authenticated === true) {
      window.location.assign(getRedirectPath("/membership.html"));
    }
  } catch {
    // Stay on signup page.
  }
}

signupForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage("");

  const displayName = String(displayNameInput?.value || "").trim();
  const email = String(emailInput?.value || "").trim();
  const password = String(passwordInput?.value || "");
  const phone = String(phoneInput?.value || "").trim();
  const state = normalizeStateCode(stateSelect?.value);

  if (!displayName || !email || !password || !phone || !state) {
    setMessage("Complete all signup fields.", true);
    return;
  }

  try {
    setBusy(true);
    setMessage("Creating account...");
    const result = await apiRequest("/api/members/register", {
      displayName,
      email,
      password,
      phone,
      state
    });
    setToken(result?.token || "");
    window.location.assign(getRedirectPath("/membership.html?welcome=1"));
  } catch (error) {
    setMessage(error.message || "Could not create account.", true);
  } finally {
    setBusy(false);
  }
});

populateStateOptions();
maybeRedirectIfAlreadyLoggedIn().catch(() => {});
