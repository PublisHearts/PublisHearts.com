const loginCard = document.getElementById("login-card");
const adminPanel = document.getElementById("admin-panel");
const loginForm = document.getElementById("login-form");
const passwordInput = document.getElementById("admin-password");
const loginMessageEl = document.getElementById("login-message");
const logoutBtn = document.getElementById("logout-btn");
const publishBtn = document.getElementById("publish-btn");
const publishMessageEl = document.getElementById("publish-message");

const siteSettingsForm = document.getElementById("site-settings-form");
const designMessageEl = document.getElementById("design-message");
const saveSiteSettingsBtn = document.getElementById("save-site-settings-btn");
const resetSiteSettingsBtn = document.getElementById("reset-site-settings-btn");
const siteLogoFileInput = document.getElementById("site-logo-file");
const siteLogoUrlInput = document.getElementById("site-logo-url");
const siteRemoveLogoInput = document.getElementById("site-remove-logo");
const siteBannerFileInput = document.getElementById("site-banner-file");
const siteBannerUrlInput = document.getElementById("site-banner-url");
const siteRemoveBannerInput = document.getElementById("site-remove-banner");
const siteMembershipStandardFileInput = document.getElementById("site-membership-standard-file");
const siteMembershipStandardUrlInput = document.getElementById("site-membership-standard-url");
const siteRemoveMembershipStandardInput = document.getElementById("site-remove-membership-standard");
const siteMembershipPlusFileInput = document.getElementById("site-membership-plus-file");
const siteMembershipPlusUrlInput = document.getElementById("site-membership-plus-url");
const siteRemoveMembershipPlusInput = document.getElementById("site-remove-membership-plus");
const siteMembershipPremiumFileInput = document.getElementById("site-membership-premium-file");
const siteMembershipPremiumUrlInput = document.getElementById("site-membership-premium-url");
const siteRemoveMembershipPremiumInput = document.getElementById("site-remove-membership-premium");
const siteInputs = {
  brandName: document.getElementById("site-brand-name"),
  brandMark: document.getElementById("site-brand-mark"),
  pageTitle: document.getElementById("site-page-title"),
  pageDescription: document.getElementById("site-page-description"),
  heroEyebrow: document.getElementById("site-hero-eyebrow"),
  heroTitle: document.getElementById("site-hero-title"),
  heroCopy: document.getElementById("site-hero-copy"),
  heroCtaLabel: document.getElementById("site-hero-cta-label"),
  featuredTitle: document.getElementById("site-featured-title"),
  featuredCopy: document.getElementById("site-featured-copy"),
  promise1Title: document.getElementById("site-promise-1-title"),
  promise1Copy: document.getElementById("site-promise-1-copy"),
  promise2Title: document.getElementById("site-promise-2-title"),
  promise2Copy: document.getElementById("site-promise-2-copy"),
  promise3Title: document.getElementById("site-promise-3-title"),
  promise3Copy: document.getElementById("site-promise-3-copy"),
  footerLeft: document.getElementById("site-footer-left"),
  footerRight: document.getElementById("site-footer-right"),
  themeAccent: document.getElementById("site-theme-accent"),
  themeAccentStrong: document.getElementById("site-theme-accent-strong"),
  themeBackground: document.getElementById("site-theme-background"),
  themeInk: document.getElementById("site-theme-ink"),
  globalCustomCss: document.getElementById("site-global-custom-css"),
  homeCustomCss: document.getElementById("site-home-custom-css"),
  shopCustomCss: document.getElementById("site-shop-custom-css"),
  loginCustomCss: document.getElementById("site-login-custom-css"),
  signupCustomCss: document.getElementById("site-signup-custom-css"),
  accountCustomCss: document.getElementById("site-account-custom-css"),
  aboutCustomCss: document.getElementById("site-about-custom-css"),
  deliveryCustomCss: document.getElementById("site-delivery-custom-css"),
  customStoryCustomCss: document.getElementById("site-custom-story-custom-css"),
  successCustomCss: document.getElementById("site-success-custom-css"),
  cancelCustomCss: document.getElementById("site-cancel-custom-css"),
  adminCustomCss: document.getElementById("site-admin-custom-css"),
  adminPagesCustomCss: document.getElementById("site-admin-pages-custom-css"),
  posCustomCss: document.getElementById("site-pos-custom-css"),
  fulfillmentCustomCss: document.getElementById("site-fulfillment-custom-css"),
  completedOrdersCustomCss: document.getElementById("site-completed-orders-custom-css")
};

const state = {
  adminPassword: "",
  siteSettings: null,
  designBusy: false,
  publishBusy: false
};

function setMessage(targetEl, message, isError = false) {
  if (!targetEl) {
    return;
  }
  targetEl.textContent = message || "";
  targetEl.classList.toggle("error", Boolean(isError));
}

function setLoginMessage(message, isError = false) {
  setMessage(loginMessageEl, message, isError);
}

function setDesignMessage(message, isError = false) {
  setMessage(designMessageEl, message, isError);
}

function setPublishMessage(message, isError = false) {
  setMessage(publishMessageEl, message, isError);
}

function setDesignBusy(isBusy) {
  state.designBusy = isBusy;
  if (saveSiteSettingsBtn) {
    saveSiteSettingsBtn.disabled = isBusy;
  }
  if (resetSiteSettingsBtn) {
    resetSiteSettingsBtn.disabled = isBusy;
  }
}

function setPublishBusy(isBusy) {
  state.publishBusy = isBusy;
  if (publishBtn) {
    publishBtn.disabled = isBusy;
  }
}

function requireAuthHeader() {
  return {
    "x-admin-password": state.adminPassword
  };
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  const text = await response.text();
  return { error: text || "Request failed." };
}

async function adminRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...requireAuthHeader()
    }
  });

  const payload = await parseResponse(response);
  if (!response.ok) {
    const error = new Error(payload.error || "Request failed.");
    error.status = response.status;
    throw error;
  }
  return payload;
}

function resetSiteSettingsDraftFields() {
  if (siteLogoFileInput) {
    siteLogoFileInput.value = "";
  }
  if (siteLogoUrlInput) {
    siteLogoUrlInput.value = "";
  }
  if (siteRemoveLogoInput) {
    siteRemoveLogoInput.checked = false;
  }
  if (siteBannerFileInput) {
    siteBannerFileInput.value = "";
  }
  if (siteBannerUrlInput) {
    siteBannerUrlInput.value = "";
  }
  if (siteRemoveBannerInput) {
    siteRemoveBannerInput.checked = false;
  }
  if (siteMembershipStandardFileInput) {
    siteMembershipStandardFileInput.value = "";
  }
  if (siteMembershipStandardUrlInput) {
    siteMembershipStandardUrlInput.value = "";
  }
  if (siteRemoveMembershipStandardInput) {
    siteRemoveMembershipStandardInput.checked = false;
  }
  if (siteMembershipPlusFileInput) {
    siteMembershipPlusFileInput.value = "";
  }
  if (siteMembershipPlusUrlInput) {
    siteMembershipPlusUrlInput.value = "";
  }
  if (siteRemoveMembershipPlusInput) {
    siteRemoveMembershipPlusInput.checked = false;
  }
  if (siteMembershipPremiumFileInput) {
    siteMembershipPremiumFileInput.value = "";
  }
  if (siteMembershipPremiumUrlInput) {
    siteMembershipPremiumUrlInput.value = "";
  }
  if (siteRemoveMembershipPremiumInput) {
    siteRemoveMembershipPremiumInput.checked = false;
  }
}

function fillSiteSettingsForm(settings) {
  if (!settings || typeof settings !== "object") {
    return;
  }

  Object.entries(siteInputs).forEach(([key, input]) => {
    if (!input) {
      return;
    }
    input.value = String(settings[key] || "");
  });

  if (siteLogoUrlInput) {
    siteLogoUrlInput.placeholder = settings.logoImageUrl || "https://example.com/logo.png";
  }
  if (siteBannerUrlInput) {
    siteBannerUrlInput.placeholder = settings.heroBannerImageUrl || "https://example.com/banner.jpg";
  }
  if (siteMembershipStandardUrlInput) {
    siteMembershipStandardUrlInput.placeholder =
      settings.membershipStandardImageUrl || "https://example.com/standard-plan.png";
  }
  if (siteMembershipPlusUrlInput) {
    siteMembershipPlusUrlInput.placeholder = settings.membershipPlusImageUrl || "https://example.com/plus-plan.png";
  }
  if (siteMembershipPremiumUrlInput) {
    siteMembershipPremiumUrlInput.placeholder =
      settings.membershipPremiumImageUrl || "https://example.com/premium-plan.png";
  }

  state.siteSettings = settings;
  resetSiteSettingsDraftFields();
}

function showLogin() {
  loginCard?.classList.remove("hidden");
  adminPanel?.classList.add("hidden");
}

function showPanel() {
  loginCard?.classList.add("hidden");
  adminPanel?.classList.remove("hidden");
}

async function login(password) {
  const response = await fetch("/api/admin/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ password })
  });
  const payload = await parseResponse(response);
  if (!response.ok) {
    const error = new Error(payload.error || "Login failed.");
    error.status = response.status;
    throw error;
  }
}

async function loadSiteSettings() {
  const settings = await adminRequest("/api/admin/site-settings");
  fillSiteSettingsForm(settings);
}

async function ensureAuthenticated() {
  if (!state.adminPassword) {
    showLogin();
    return;
  }

  try {
    await login(state.adminPassword);
    showPanel();
    await loadSiteSettings();
  } catch {
    state.adminPassword = "";
    showLogin();
  }
}

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = String(passwordInput?.value || "");
  if (!password) {
    return;
  }

  try {
    setLoginMessage("Signing in...");
    await login(password);
    state.adminPassword = password;
    if (passwordInput) {
      passwordInput.value = "";
    }
    showPanel();
    await loadSiteSettings();
    setLoginMessage("");
    setDesignMessage("");
    setPublishMessage("");
  } catch (error) {
    setLoginMessage(error.message || "Could not sign in.", true);
  }
});

logoutBtn?.addEventListener("click", () => {
  state.adminPassword = "";
  resetSiteSettingsDraftFields();
  showLogin();
  setLoginMessage("");
  setDesignMessage("");
  setPublishMessage("");
});

resetSiteSettingsBtn?.addEventListener("click", () => {
  fillSiteSettingsForm(state.siteSettings);
  setDesignMessage("Unsaved design changes were cleared.");
});

siteSettingsForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (state.designBusy) {
    return;
  }

  setDesignBusy(true);
  setDesignMessage("Saving all page design...");

  const formData = new FormData();
  Object.entries(siteInputs).forEach(([key, input]) => {
    if (!input) {
      return;
    }
    formData.append(key, input.value);
  });

  const logoFile = siteLogoFileInput?.files?.[0];
  if (logoFile) {
    formData.append("logoImage", logoFile);
  }

  const bannerFile = siteBannerFileInput?.files?.[0];
  if (bannerFile) {
    formData.append("heroBannerImage", bannerFile);
  }
  const membershipStandardFile = siteMembershipStandardFileInput?.files?.[0];
  if (membershipStandardFile) {
    formData.append("membershipStandardImage", membershipStandardFile);
  }
  const membershipPlusFile = siteMembershipPlusFileInput?.files?.[0];
  if (membershipPlusFile) {
    formData.append("membershipPlusImage", membershipPlusFile);
  }
  const membershipPremiumFile = siteMembershipPremiumFileInput?.files?.[0];
  if (membershipPremiumFile) {
    formData.append("membershipPremiumImage", membershipPremiumFile);
  }

  const logoImageUrl = String(siteLogoUrlInput?.value || "").trim();
  if (logoImageUrl) {
    formData.append("logoImageUrl", logoImageUrl);
  }
  const heroBannerImageUrl = String(siteBannerUrlInput?.value || "").trim();
  if (heroBannerImageUrl) {
    formData.append("heroBannerImageUrl", heroBannerImageUrl);
  }
  const membershipStandardImageUrl = String(siteMembershipStandardUrlInput?.value || "").trim();
  if (membershipStandardImageUrl) {
    formData.append("membershipStandardImageUrl", membershipStandardImageUrl);
  }
  const membershipPlusImageUrl = String(siteMembershipPlusUrlInput?.value || "").trim();
  if (membershipPlusImageUrl) {
    formData.append("membershipPlusImageUrl", membershipPlusImageUrl);
  }
  const membershipPremiumImageUrl = String(siteMembershipPremiumUrlInput?.value || "").trim();
  if (membershipPremiumImageUrl) {
    formData.append("membershipPremiumImageUrl", membershipPremiumImageUrl);
  }
  if (siteRemoveLogoInput?.checked) {
    formData.append("removeLogo", "true");
  }
  if (siteRemoveBannerInput?.checked) {
    formData.append("removeBanner", "true");
  }
  if (siteRemoveMembershipStandardInput?.checked) {
    formData.append("removeMembershipStandardImage", "true");
  }
  if (siteRemoveMembershipPlusInput?.checked) {
    formData.append("removeMembershipPlusImage", "true");
  }
  if (siteRemoveMembershipPremiumInput?.checked) {
    formData.append("removeMembershipPremiumImage", "true");
  }

  try {
    const updated = await adminRequest("/api/admin/site-settings", {
      method: "PUT",
      body: formData
    });
    fillSiteSettingsForm(updated);
    setDesignMessage("All page design updated.");
  } catch (error) {
    if (error.status === 401) {
      logoutBtn?.click();
      return;
    }
    setDesignMessage(error.message || "Could not save page design.", true);
  } finally {
    setDesignBusy(false);
  }
});

publishBtn?.addEventListener("click", async () => {
  if (state.publishBusy || state.designBusy) {
    return;
  }

  const message = window.prompt("Optional commit message for GitHub publish:", "");
  if (message === null) {
    return;
  }

  setPublishBusy(true);
  setPublishMessage("Publishing live admin changes to GitHub...");
  try {
    const result = await adminRequest("/api/admin/publish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message
      })
    });

    if (!result.published) {
      setPublishMessage(result.message || "No new changes to publish.");
      return;
    }

    const shortCommit = result.commit ? ` (${result.commit})` : "";
    setPublishMessage(`Published to ${result.branch || "main"}${shortCommit}.`);
  } catch (error) {
    if (error.status === 401) {
      logoutBtn?.click();
      return;
    }
    setPublishMessage(error.message || "Could not publish changes.", true);
  } finally {
    setPublishBusy(false);
  }
});

ensureAuthenticated().catch(() => {
  showLogin();
});
