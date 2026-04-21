const memberTokenStorageKey = "publishearts_member_token_v1";

const loginForm = document.getElementById("login-form");
const emailInput = document.getElementById("login-email");
const passwordInput = document.getElementById("login-password");
const submitBtn = document.getElementById("login-submit-btn");
const messageEl = document.getElementById("login-message");

function setMessage(message = "", isError = false) {
  if (!messageEl) {
    return;
  }
  messageEl.textContent = message || "";
  messageEl.classList.toggle("error", Boolean(isError));
}

function setBusy(isBusy) {
  if (submitBtn) {
    submitBtn.disabled = Boolean(isBusy);
  }
  if (emailInput) {
    emailInput.disabled = Boolean(isBusy);
  }
  if (passwordInput) {
    passwordInput.disabled = Boolean(isBusy);
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

function getRedirectPath(defaultPath = "/membership.html") {
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
    // Stay on login page.
  }
}

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage("");
  const email = String(emailInput?.value || "").trim();
  const password = String(passwordInput?.value || "");

  if (!email || !password) {
    setMessage("Enter email and password.", true);
    return;
  }

  try {
    setBusy(true);
    setMessage("Signing in...");
    const result = await apiRequest("/api/members/login", { email, password });
    setToken(result?.token || "");
    window.location.assign(getRedirectPath("/membership.html"));
  } catch (error) {
    setMessage(error.message || "Could not sign in.", true);
  } finally {
    setBusy(false);
  }
});

maybeRedirectIfAlreadyLoggedIn().catch(() => {});
