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

const visualPageSelect = document.getElementById("visual-page-key");
const visualBackgroundStyleSelect = document.getElementById("visual-background-style");
const visualContainerWidthInput = document.getElementById("visual-container-width");
const visualSectionGapInput = document.getElementById("visual-section-gap");
const visualCardRadiusInput = document.getElementById("visual-card-radius");
const visualButtonRadiusInput = document.getElementById("visual-button-radius");
const visualShadowStrengthInput = document.getElementById("visual-shadow-strength");
const visualHeadingScaleInput = document.getElementById("visual-heading-scale");
const visualContainerWidthValue = document.getElementById("visual-container-width-value");
const visualSectionGapValue = document.getElementById("visual-section-gap-value");
const visualCardRadiusValue = document.getElementById("visual-card-radius-value");
const visualButtonRadiusValue = document.getElementById("visual-button-radius-value");
const visualShadowStrengthValue = document.getElementById("visual-shadow-strength-value");
const visualHeadingScaleValue = document.getElementById("visual-heading-scale-value");
const visualPreviewShell = document.getElementById("visual-preview-shell");
const visualPreviewFrame = document.getElementById("visual-preview-frame");
const visualGeneratedCssEl = document.getElementById("visual-generated-css");
const visualCurrentCssEl = document.getElementById("visual-current-css");
const visualSectionOrderList = document.getElementById("visual-section-order-list");
const visualSectionOrderMessageEl = document.getElementById("visual-section-order-message");
const applyVisualSelectedBtn = document.getElementById("apply-visual-selected-btn");
const applyVisualGlobalBtn = document.getElementById("apply-visual-global-btn");
const clearVisualSelectedBtn = document.getElementById("clear-visual-selected-btn");
const visualRefreshPreviewBtn = document.getElementById("visual-refresh-preview-btn");
const visualPresetButtons = Array.from(document.querySelectorAll(".visual-preset-btn"));
const visualDeviceButtons = Array.from(document.querySelectorAll(".visual-device-btn"));

const pageCssInputByKey = Object.freeze({
  home: siteInputs.homeCustomCss,
  shop: siteInputs.shopCustomCss,
  login: siteInputs.loginCustomCss,
  signup: siteInputs.signupCustomCss,
  account: siteInputs.accountCustomCss,
  about: siteInputs.aboutCustomCss,
  delivery: siteInputs.deliveryCustomCss,
  customStory: siteInputs.customStoryCustomCss,
  success: siteInputs.successCustomCss,
  cancel: siteInputs.cancelCustomCss,
  admin: siteInputs.adminCustomCss,
  adminPages: siteInputs.adminPagesCustomCss,
  pos: siteInputs.posCustomCss,
  fulfillment: siteInputs.fulfillmentCustomCss,
  completedOrders: siteInputs.completedOrdersCustomCss
});

const pageLabelByKey = Object.freeze({
  home: "Home",
  shop: "Shop",
  login: "Login",
  signup: "Signup",
  account: "Account",
  about: "About",
  delivery: "Delivery",
  customStory: "Custom Story",
  success: "Success",
  cancel: "Cancel",
  admin: "Admin",
  adminPages: "Admin Page Editor",
  pos: "POS",
  fulfillment: "Fulfillment",
  completedOrders: "Completed Orders"
});

const previewPathByPageKey = Object.freeze({
  home: "/index.html",
  shop: "/shop.html",
  login: "/login.html",
  signup: "/signup.html",
  account: "/membership.html",
  about: "/about.html",
  delivery: "/delivery.html",
  customStory: "/custom-story.html",
  success: "/success.html",
  cancel: "/cancel.html",
  admin: "/admin.html",
  adminPages: "/admin-pages.html",
  pos: "/pos.html",
  fulfillment: "/fulfillment.html",
  completedOrders: "/completed-orders.html"
});

const visualPresets = Object.freeze({
  professional: {
    backgroundStyle: "soft",
    containerWidth: 1120,
    sectionGap: 28,
    cardRadius: 22,
    buttonRadius: 80,
    shadowStrength: 35,
    headingScale: 104,
    themeAccent: "#ad4f2d",
    themeAccentStrong: "#8d391c",
    themeBackground: "#f5efe5",
    themeInk: "#221d18"
  },
  playful: {
    backgroundStyle: "warm",
    containerWidth: 1180,
    sectionGap: 34,
    cardRadius: 30,
    buttonRadius: 20,
    shadowStrength: 46,
    headingScale: 112,
    themeAccent: "#df6d2e",
    themeAccentStrong: "#b8471e",
    themeBackground: "#f8efe2",
    themeInk: "#2a2219"
  },
  luxe: {
    backgroundStyle: "clean",
    containerWidth: 1080,
    sectionGap: 24,
    cardRadius: 16,
    buttonRadius: 12,
    shadowStrength: 24,
    headingScale: 108,
    themeAccent: "#8e5f2f",
    themeAccentStrong: "#6d4320",
    themeBackground: "#f4ede4",
    themeInk: "#1d1712"
  },
  bold: {
    backgroundStyle: "bold",
    containerWidth: 1180,
    sectionGap: 28,
    cardRadius: 18,
    buttonRadius: 12,
    shadowStrength: 58,
    headingScale: 114,
    themeAccent: "#f29b3d",
    themeAccentStrong: "#d96f1f",
    themeBackground: "#16120f",
    themeInk: "#f7efe5"
  }
});

const visualControlInputs = [
  visualBackgroundStyleSelect,
  visualContainerWidthInput,
  visualSectionGapInput,
  visualCardRadiusInput,
  visualButtonRadiusInput,
  visualShadowStrengthInput,
  visualHeadingScaleInput,
  siteInputs.themeAccent,
  siteInputs.themeAccentStrong,
  siteInputs.themeBackground,
  siteInputs.themeInk
];

const state = {
  adminPassword: "",
  siteSettings: null,
  designBusy: false,
  publishBusy: false,
  visualPreviewDevice: "desktop",
  sectionOrderByPage: {},
  availableSectionsByPage: {},
  draggingSectionId: "",
  dragOverSectionId: ""
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

function setSectionOrderMessage(message, isError = false) {
  setMessage(visualSectionOrderMessageEl, message, isError);
}

function setDesignBusy(isBusy) {
  state.designBusy = isBusy;
  if (saveSiteSettingsBtn) {
    saveSiteSettingsBtn.disabled = isBusy;
  }
  if (resetSiteSettingsBtn) {
    resetSiteSettingsBtn.disabled = isBusy;
  }
  if (applyVisualSelectedBtn) {
    applyVisualSelectedBtn.disabled = isBusy;
  }
  if (applyVisualGlobalBtn) {
    applyVisualGlobalBtn.disabled = isBusy;
  }
  if (clearVisualSelectedBtn) {
    clearVisualSelectedBtn.disabled = isBusy;
  }
  if (visualRefreshPreviewBtn) {
    visualRefreshPreviewBtn.disabled = isBusy;
  }
  renderVisualSectionOrderList();
}

function setPublishBusy(isBusy) {
  state.publishBusy = isBusy;
  if (publishBtn) {
    publishBtn.disabled = isBusy;
  }
}

function clampNumber(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, numeric));
}

function hexToRgb(hex) {
  const normalized = String(hex || "")
    .trim()
    .toLowerCase();
  if (!/^#[0-9a-f]{6}$/.test(normalized)) {
    return null;
  }
  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16)
  };
}

function rgbToHex(r, g, b) {
  const toHex = (value) => clampNumber(Math.round(value), 0, 255, 0).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function shiftHex(hex, delta) {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return "#000000";
  }
  return rgbToHex(rgb.r + delta, rgb.g + delta, rgb.b + delta);
}

function withAlpha(hex, alpha = 1) {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return `rgba(0, 0, 0, ${alpha})`;
  }
  const safeAlpha = clampNumber(alpha, 0, 1, 1);
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${safeAlpha.toFixed(3)})`;
}

function getSelectedVisualPageKey() {
  const selected = String(visualPageSelect?.value || "").trim();
  if (selected && pageCssInputByKey[selected]) {
    return selected;
  }
  return "home";
}

function getVisualPageLabel(pageKey) {
  const key = String(pageKey || "").trim();
  return pageLabelByKey[key] || key || "page";
}

function readVisualControlValues() {
  return {
    backgroundStyle: String(visualBackgroundStyleSelect?.value || "soft"),
    containerWidth: clampNumber(visualContainerWidthInput?.value, 860, 1360, 1120),
    sectionGap: clampNumber(visualSectionGapInput?.value, 14, 64, 28),
    cardRadius: clampNumber(visualCardRadiusInput?.value, 8, 36, 22),
    buttonRadius: clampNumber(visualButtonRadiusInput?.value, 6, 80, 80),
    shadowStrength: clampNumber(visualShadowStrengthInput?.value, 0, 100, 35),
    headingScale: clampNumber(visualHeadingScaleInput?.value, 88, 130, 104),
    themeAccent: String(siteInputs.themeAccent?.value || "#ad4f2d"),
    themeAccentStrong: String(siteInputs.themeAccentStrong?.value || "#8d391c"),
    themeBackground: String(siteInputs.themeBackground?.value || "#f5efe5"),
    themeInk: String(siteInputs.themeInk?.value || "#221d18")
  };
}

function setVisualControlValues(values = {}) {
  if (visualBackgroundStyleSelect && values.backgroundStyle) {
    visualBackgroundStyleSelect.value = String(values.backgroundStyle);
  }
  if (visualContainerWidthInput && values.containerWidth !== undefined) {
    visualContainerWidthInput.value = String(clampNumber(values.containerWidth, 860, 1360, 1120));
  }
  if (visualSectionGapInput && values.sectionGap !== undefined) {
    visualSectionGapInput.value = String(clampNumber(values.sectionGap, 14, 64, 28));
  }
  if (visualCardRadiusInput && values.cardRadius !== undefined) {
    visualCardRadiusInput.value = String(clampNumber(values.cardRadius, 8, 36, 22));
  }
  if (visualButtonRadiusInput && values.buttonRadius !== undefined) {
    visualButtonRadiusInput.value = String(clampNumber(values.buttonRadius, 6, 80, 80));
  }
  if (visualShadowStrengthInput && values.shadowStrength !== undefined) {
    visualShadowStrengthInput.value = String(clampNumber(values.shadowStrength, 0, 100, 35));
  }
  if (visualHeadingScaleInput && values.headingScale !== undefined) {
    visualHeadingScaleInput.value = String(clampNumber(values.headingScale, 88, 130, 104));
  }
  if (siteInputs.themeAccent && values.themeAccent) {
    siteInputs.themeAccent.value = String(values.themeAccent);
  }
  if (siteInputs.themeAccentStrong && values.themeAccentStrong) {
    siteInputs.themeAccentStrong.value = String(values.themeAccentStrong);
  }
  if (siteInputs.themeBackground && values.themeBackground) {
    siteInputs.themeBackground.value = String(values.themeBackground);
  }
  if (siteInputs.themeInk && values.themeInk) {
    siteInputs.themeInk.value = String(values.themeInk);
  }
}

function normalizeSectionOrder(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = new Set();
  return value
    .map((entry) => String(entry || "").trim())
    .filter((entry) => entry && !seen.has(entry) && seen.add(entry));
}

function getPageCssInput(pageKey) {
  const key = String(pageKey || "").trim();
  return pageCssInputByKey[key] || null;
}

function getSectionOrderForPage(pageKey) {
  return normalizeSectionOrder(state.sectionOrderByPage[pageKey]);
}

function setSectionOrderForPage(pageKey, orderList) {
  const key = String(pageKey || "").trim();
  state.sectionOrderByPage[key] = normalizeSectionOrder(orderList);
}

function buildVisualMetadata(controlValues, sectionOrder = []) {
  const normalizedOrder = normalizeSectionOrder(sectionOrder);
  const metadata = {
    backgroundStyle: controlValues.backgroundStyle,
    containerWidth: controlValues.containerWidth,
    sectionGap: controlValues.sectionGap,
    cardRadius: controlValues.cardRadius,
    buttonRadius: controlValues.buttonRadius,
    shadowStrength: controlValues.shadowStrength,
    headingScale: controlValues.headingScale,
    themeAccent: controlValues.themeAccent,
    themeAccentStrong: controlValues.themeAccentStrong,
    themeBackground: controlValues.themeBackground,
    themeInk: controlValues.themeInk
  };
  if (normalizedOrder.length > 0) {
    metadata.sectionOrder = normalizedOrder;
  }
  return `/* visual-editor:${JSON.stringify(metadata)} */`;
}

function readVisualMetadata(cssText) {
  const text = String(cssText || "");
  const match = text.match(/\/\*\s*visual-editor:(\{[\s\S]*?\})\s*\*\//i);
  if (!match) {
    return null;
  }
  try {
    const parsed = JSON.parse(match[1]);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    if (parsed.sectionOrder !== undefined) {
      parsed.sectionOrder = normalizeSectionOrder(parsed.sectionOrder);
    }
    return parsed;
  } catch {
    return null;
  }
}

function removeVisualMetadataComment(cssText) {
  return String(cssText || "")
    .replace(/\/\*\s*visual-editor:(\{[\s\S]*?\})\s*\*\/\s*/i, "")
    .trimStart();
}

function upsertPageVisualMetadata(pageKey, updates = {}) {
  const input = getPageCssInput(pageKey);
  if (!input) {
    return;
  }
  const existingCss = String(input.value || "");
  const existingMetadata = readVisualMetadata(existingCss) || {};
  const merged = {
    ...existingMetadata,
    ...updates
  };

  if (updates.sectionOrder !== undefined) {
    merged.sectionOrder = normalizeSectionOrder(updates.sectionOrder);
  } else if (existingMetadata.sectionOrder !== undefined) {
    merged.sectionOrder = normalizeSectionOrder(existingMetadata.sectionOrder);
  }
  if (!Array.isArray(merged.sectionOrder) || merged.sectionOrder.length === 0) {
    delete merged.sectionOrder;
  }

  const rebuiltMetadata = `/* visual-editor:${JSON.stringify(merged)} */`;
  const cssWithoutMetadata = removeVisualMetadataComment(existingCss);
  input.value = cssWithoutMetadata ? `${rebuiltMetadata}\n${cssWithoutMetadata}` : rebuiltMetadata;
}

function buildVisualBackground(controlValues, scopeSelector) {
  const base = controlValues.themeBackground;
  const accent = controlValues.themeAccent;
  const ink = controlValues.themeInk;

  const warmTop = shiftHex(base, 14);
  const warmBottom = shiftHex(base, -10);
  const cleanTop = shiftHex(base, 6);
  const cleanBottom = shiftHex(base, -3);
  const darkTop = shiftHex(base, -26);
  const darkBottom = shiftHex(base, -46);

  if (controlValues.backgroundStyle === "clean") {
    return `${scopeSelector} {\n  background: linear-gradient(180deg, ${cleanTop} 0%, ${cleanBottom} 100%) !important;\n}`;
  }
  if (controlValues.backgroundStyle === "bold") {
    return `${scopeSelector} {\n  background:\n    radial-gradient(circle at 12% 10%, ${withAlpha(accent, 0.26)} 0%, transparent 30%),\n    radial-gradient(circle at 88% 20%, ${withAlpha(ink, 0.2)} 0%, transparent 32%),\n    linear-gradient(180deg, ${darkTop} 0%, ${darkBottom} 100%) !important;\n}`;
  }
  if (controlValues.backgroundStyle === "warm") {
    return `${scopeSelector} {\n  background:\n    radial-gradient(circle at 12% 8%, ${withAlpha(accent, 0.22)} 0%, transparent 34%),\n    radial-gradient(circle at 88% 18%, ${withAlpha(accent, 0.12)} 0%, transparent 34%),\n    linear-gradient(180deg, ${warmTop} 0%, ${warmBottom} 100%) !important;\n}`;
  }
  return `${scopeSelector} {\n  background:\n    radial-gradient(circle at 12% 8%, ${withAlpha(accent, 0.18)} 0%, transparent 34%),\n    radial-gradient(circle at 88% 18%, ${withAlpha(ink, 0.12)} 0%, transparent 34%),\n    linear-gradient(180deg, ${warmTop} 0%, ${warmBottom} 100%) !important;\n}`;
}

function buildVisualCss(pageKey = getSelectedVisualPageKey(), sectionOrderOverride = undefined) {
  const controlValues = readVisualControlValues();
  const scope = pageKey ? `body[data-page-key="${pageKey}"]` : "body";
  const headingScaleFactor = clampNumber(controlValues.headingScale / 100, 0.88, 1.3, 1.04);
  const buttonRadiusValue = Math.round(controlValues.buttonRadius) >= 78 ? "999px" : `${Math.round(controlValues.buttonRadius)}px`;
  const inputRadius = `${Math.max(8, Math.round(controlValues.cardRadius * 0.5))}px`;
  const shadowAlpha = clampNumber(0.05 + controlValues.shadowStrength / 280, 0.05, 0.42, 0.18);
  const shadowBlur = Math.round(12 + controlValues.shadowStrength * 0.38);
  const shadowDrop = `${Math.round(shadowBlur * 0.42)}px`;
  const sectionGap = Math.round(controlValues.sectionGap);
  const containerWidth = Math.round(controlValues.containerWidth);
  const generatedAt = new Date().toISOString();

  const backgroundBlock = buildVisualBackground(controlValues, scope);
  const sectionOrder =
    sectionOrderOverride === undefined ? getSectionOrderForPage(pageKey) : normalizeSectionOrder(sectionOrderOverride);
  const metadata = buildVisualMetadata(controlValues, sectionOrder);

  return [
    metadata,
    `/* generated:${generatedAt} */`,
    `${scope} {`,
    `  --accent: ${controlValues.themeAccent} !important;`,
    `  --accent-strong: ${controlValues.themeAccentStrong} !important;`,
    `  --bg: ${controlValues.themeBackground} !important;`,
    `  --ink: ${controlValues.themeInk} !important;`,
    `  --radius-lg: ${Math.round(controlValues.cardRadius)}px !important;`,
    `  --radius-md: ${Math.max(8, Math.round(controlValues.cardRadius * 0.64))}px !important;`,
    `}`,
    backgroundBlock,
    `${scope} .container {`,
    `  width: min(${containerWidth}px, calc(100vw - 2.4rem)) !important;`,
    `}`,
    `${scope} .hero,`,
    `${scope} .membership-shell,`,
    `${scope} .delivery-wrap,`,
    `${scope} .custom-story-page,`,
    `${scope} .admin-shell,`,
    `${scope} .pos-shell {`,
    `  padding-top: ${Math.round(sectionGap * 1.08)}px !important;`,
    `  padding-bottom: ${Math.round(sectionGap * 2.05)}px !important;`,
    `}`,
    `${scope} .admin-section,`,
    `${scope} .membership-card,`,
    `${scope} .membership-hero,`,
    `${scope} .product-card,`,
    `${scope} .coming-soon-card,`,
    `${scope} .delivery-card,`,
    `${scope} .status-card,`,
    `${scope} .custom-story-promo-card,`,
    `${scope} .custom-story-info,`,
    `${scope} .custom-story-form-card,`,
    `${scope} .admin-login-card,`,
    `${scope} .admin-panel,`,
    `${scope} .pos-page-head,`,
    `${scope} .pos-catalog-panel,`,
    `${scope} .pos-transaction-card,`,
    `${scope} .pos-receipt-panel {`,
    `  border-radius: ${Math.round(controlValues.cardRadius)}px !important;`,
    `  box-shadow: 0 ${shadowDrop} ${shadowBlur}px ${withAlpha(controlValues.themeInk, shadowAlpha)} !important;`,
    `}`,
    `${scope} .primary-btn,`,
    `${scope} .ghost-btn,`,
    `${scope} .danger-btn,`,
    `${scope} .icon-btn,`,
    `${scope} .footer-link-btn {`,
    `  border-radius: ${buttonRadiusValue} !important;`,
    `}`,
    `${scope} .admin-form input,`,
    `${scope} .admin-form textarea,`,
    `${scope} .admin-form select,`,
    `${scope} .membership-form input,`,
    `${scope} .membership-form textarea,`,
    `${scope} .membership-form select {`,
    `  border-radius: ${inputRadius} !important;`,
    `}`,
    `${scope} h1 {`,
    `  font-size: clamp(${(1.8 * headingScaleFactor).toFixed(3)}rem, ${(4.8 * headingScaleFactor).toFixed(3)}vw, ${(4 * headingScaleFactor).toFixed(3)}rem) !important;`,
    `}`,
    `${scope} h2 {`,
    `  font-size: clamp(${(1.25 * headingScaleFactor).toFixed(3)}rem, ${(3.1 * headingScaleFactor).toFixed(3)}vw, ${(2.7 * headingScaleFactor).toFixed(3)}rem) !important;`,
    `}`,
    ""
  ].join("\n");
}

function setVisualRangeLabel(outputEl, value, suffix = "") {
  if (!outputEl) {
    return;
  }
  outputEl.textContent = `${value}${suffix}`;
}

function refreshVisualRangeLabels() {
  setVisualRangeLabel(visualContainerWidthValue, clampNumber(visualContainerWidthInput?.value, 860, 1360, 1120));
  setVisualRangeLabel(visualSectionGapValue, clampNumber(visualSectionGapInput?.value, 14, 64, 28));
  setVisualRangeLabel(visualCardRadiusValue, clampNumber(visualCardRadiusInput?.value, 8, 36, 22));
  setVisualRangeLabel(visualButtonRadiusValue, clampNumber(visualButtonRadiusInput?.value, 6, 80, 80));
  setVisualRangeLabel(visualShadowStrengthValue, clampNumber(visualShadowStrengthInput?.value, 0, 100, 35));
  setVisualRangeLabel(visualHeadingScaleValue, clampNumber(visualHeadingScaleInput?.value, 88, 130, 104));
}

function getPreviewSectionDescriptors() {
  const doc = getVisualPreviewDocument();
  const root = doc?.querySelector?.("[data-page-sections-root]");
  if (!root) {
    return [];
  }

  const sections = Array.from(root.children)
    .filter((node) => node && node.hasAttribute && node.hasAttribute("data-page-section-id"))
    .map((node, index) => {
      const id = String(node.getAttribute("data-page-section-id") || "").trim();
      if (!id) {
        return null;
      }
      const label =
        String(node.getAttribute("data-page-section-label") || "").trim() ||
        String(node.querySelector("h1, h2, h3, .eyebrow")?.textContent || "").trim() ||
        `Section ${index + 1}`;
      return { id, label };
    })
    .filter(Boolean);
  return sections;
}

function getAvailableSectionsForPage(pageKey) {
  return Array.isArray(state.availableSectionsByPage[pageKey]) ? state.availableSectionsByPage[pageKey] : [];
}

function normalizeSectionOrderForPage(pageKey, orderList = []) {
  const available = getAvailableSectionsForPage(pageKey);
  const availableIds = available.map((entry) => entry.id);
  if (availableIds.length === 0) {
    return [];
  }
  const requested = normalizeSectionOrder(orderList);
  const normalized = [];
  requested.forEach((id) => {
    if (availableIds.includes(id) && !normalized.includes(id)) {
      normalized.push(id);
    }
  });
  availableIds.forEach((id) => {
    if (!normalized.includes(id)) {
      normalized.push(id);
    }
  });
  return normalized;
}

function ensureSectionOrderForPage(pageKey) {
  const normalized = normalizeSectionOrderForPage(pageKey, getSectionOrderForPage(pageKey));
  setSectionOrderForPage(pageKey, normalized);
  return normalized;
}

function reorderSectionBefore(pageKey, draggedId, targetId) {
  const currentOrder = ensureSectionOrderForPage(pageKey);
  const fromIndex = currentOrder.indexOf(draggedId);
  const targetIndex = currentOrder.indexOf(targetId);
  if (fromIndex < 0 || targetIndex < 0 || fromIndex === targetIndex) {
    return;
  }
  const nextOrder = currentOrder.slice();
  nextOrder.splice(fromIndex, 1);
  const destination = nextOrder.indexOf(targetId);
  nextOrder.splice(destination, 0, draggedId);
  setSectionOrderForPage(pageKey, nextOrder);
  upsertPageVisualMetadata(pageKey, { sectionOrder: nextOrder });
  renderVisualSectionOrderList();
  applySectionOrderToPreview(pageKey);
  updateVisualCurrentCssSnapshot();
  setSectionOrderMessage(`${getVisualPageLabel(pageKey)} section order updated in draft.`);
}

function moveSectionByOffset(pageKey, sectionId, offset) {
  const currentOrder = ensureSectionOrderForPage(pageKey);
  const index = currentOrder.indexOf(sectionId);
  if (index < 0) {
    return;
  }
  const nextIndex = clampNumber(index + offset, 0, currentOrder.length - 1, index);
  if (nextIndex === index) {
    return;
  }
  const nextOrder = currentOrder.slice();
  nextOrder.splice(index, 1);
  nextOrder.splice(nextIndex, 0, sectionId);
  setSectionOrderForPage(pageKey, nextOrder);
  upsertPageVisualMetadata(pageKey, { sectionOrder: nextOrder });
  renderVisualSectionOrderList();
  applySectionOrderToPreview(pageKey);
  updateVisualCurrentCssSnapshot();
  setSectionOrderMessage(`${getVisualPageLabel(pageKey)} section order updated in draft.`);
}

function clearSectionDropTargets() {
  visualSectionOrderList?.querySelectorAll(".visual-section-item").forEach((entry) => {
    entry.classList.remove("drop-target");
  });
}

function applySectionOrderToPreview(pageKey = getSelectedVisualPageKey()) {
  const doc = getVisualPreviewDocument();
  const root = doc?.querySelector?.("[data-page-sections-root]");
  if (!root) {
    return;
  }
  const order = ensureSectionOrderForPage(pageKey);
  if (order.length === 0) {
    return;
  }

  const nodes = Array.from(root.children).filter((node) => node && node.hasAttribute && node.hasAttribute("data-page-section-id"));
  const sectionById = new Map();
  nodes.forEach((node) => {
    const id = String(node.getAttribute("data-page-section-id") || "").trim();
    if (id && !sectionById.has(id)) {
      sectionById.set(id, node);
    }
  });

  const finalOrder = [];
  order.forEach((id) => {
    if (sectionById.has(id) && !finalOrder.includes(id)) {
      finalOrder.push(id);
    }
  });
  nodes.forEach((node) => {
    const id = String(node.getAttribute("data-page-section-id") || "").trim();
    if (id && !finalOrder.includes(id)) {
      finalOrder.push(id);
    }
  });

  finalOrder.forEach((id) => {
    const node = sectionById.get(id);
    if (node) {
      root.appendChild(node);
    }
  });
}

function renderVisualSectionOrderList() {
  if (!visualSectionOrderList) {
    return;
  }
  const pageKey = getSelectedVisualPageKey();
  const availableSections = getAvailableSectionsForPage(pageKey);
  const orderedSectionIds = ensureSectionOrderForPage(pageKey);

  if (availableSections.length === 0 || orderedSectionIds.length === 0) {
    visualSectionOrderList.innerHTML = `<li class="cart-item-sub">No movable sections found on this page yet. Click Refresh Preview.</li>`;
    return;
  }

  const labelById = new Map(availableSections.map((entry) => [entry.id, entry.label]));
  visualSectionOrderList.innerHTML = "";

  orderedSectionIds.forEach((sectionId, index) => {
    const item = document.createElement("li");
    item.className = "visual-section-item";
    item.draggable = true;
    item.dataset.sectionId = sectionId;

    const dragHandle = document.createElement("button");
    dragHandle.type = "button";
    dragHandle.className = "visual-section-drag";
    dragHandle.textContent = "Drag";
    dragHandle.title = "Drag to reorder";

    const label = document.createElement("span");
    label.className = "visual-section-label";
    label.textContent = labelById.get(sectionId) || sectionId;

    const actions = document.createElement("div");
    actions.className = "visual-section-actions";
    const moveUpBtn = document.createElement("button");
    moveUpBtn.type = "button";
    moveUpBtn.textContent = "Up";
    moveUpBtn.title = "Move up";
    moveUpBtn.disabled = index === 0 || state.designBusy;
    moveUpBtn.addEventListener("click", () => {
      moveSectionByOffset(pageKey, sectionId, -1);
    });
    const moveDownBtn = document.createElement("button");
    moveDownBtn.type = "button";
    moveDownBtn.textContent = "Down";
    moveDownBtn.title = "Move down";
    moveDownBtn.disabled = index === orderedSectionIds.length - 1 || state.designBusy;
    moveDownBtn.addEventListener("click", () => {
      moveSectionByOffset(pageKey, sectionId, 1);
    });
    actions.append(moveUpBtn, moveDownBtn);

    item.append(dragHandle, label, actions);

    item.addEventListener("dragstart", (event) => {
      state.draggingSectionId = sectionId;
      item.classList.add("dragging");
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", sectionId);
      }
    });
    item.addEventListener("dragend", () => {
      state.draggingSectionId = "";
      state.dragOverSectionId = "";
      item.classList.remove("dragging");
      clearSectionDropTargets();
    });
    item.addEventListener("dragover", (event) => {
      event.preventDefault();
      if (!state.draggingSectionId || state.draggingSectionId === sectionId) {
        return;
      }
      state.dragOverSectionId = sectionId;
      clearSectionDropTargets();
      item.classList.add("drop-target");
    });
    item.addEventListener("dragleave", () => {
      item.classList.remove("drop-target");
    });
    item.addEventListener("drop", (event) => {
      event.preventDefault();
      const draggedId = state.draggingSectionId || event.dataTransfer?.getData("text/plain");
      clearSectionDropTargets();
      if (!draggedId || draggedId === sectionId) {
        return;
      }
      reorderSectionBefore(pageKey, draggedId, sectionId);
    });

    visualSectionOrderList.appendChild(item);
  });
}

function updateVisualCurrentCssSnapshot() {
  if (!visualCurrentCssEl) {
    return;
  }
  const pageKey = getSelectedVisualPageKey();
  const pageLabel = getVisualPageLabel(pageKey);
  const globalCss = String(siteInputs.globalCustomCss?.value || "");
  const pageCss = String(pageCssInputByKey[pageKey]?.value || "");
  const lines = [
    `Global CSS (${globalCss.trim() ? "saved" : "empty"}):`,
    globalCss.trim() || "(empty)",
    "",
    `${pageLabel} CSS (${pageCss.trim() ? "saved" : "empty"}):`,
    pageCss.trim() || "(empty)"
  ];
  visualCurrentCssEl.value = lines.join("\n");
}

function updateVisualGeneratedCssPreview() {
  if (!visualGeneratedCssEl) {
    return;
  }
  visualGeneratedCssEl.value = buildVisualCss(getSelectedVisualPageKey());
}

function setVisualDevice(device) {
  const normalized = ["desktop", "tablet", "mobile"].includes(device) ? device : "desktop";
  state.visualPreviewDevice = normalized;
  if (visualPreviewShell) {
    visualPreviewShell.dataset.previewDevice = normalized;
  }
  visualDeviceButtons.forEach((button) => {
    const isActive = button.dataset.previewDevice === normalized;
    button.classList.toggle("is-active", isActive);
  });
}

function getVisualPreviewDocument() {
  return visualPreviewFrame?.contentDocument || visualPreviewFrame?.contentWindow?.document || null;
}

function applyVisualCssToPreview() {
  const doc = getVisualPreviewDocument();
  if (!doc || !doc.head) {
    return;
  }
  const styleId = "visual-editor-preview-style";
  let styleEl = doc.getElementById(styleId);
  if (!styleEl) {
    styleEl = doc.createElement("style");
    styleEl.id = styleId;
    doc.head.appendChild(styleEl);
  }
  const pageKey = getSelectedVisualPageKey();
  styleEl.textContent = buildVisualCss(pageKey, ensureSectionOrderForPage(pageKey));
  applySectionOrderToPreview(pageKey);
}

function refreshVisualPreviewFrame() {
  if (!visualPreviewFrame) {
    return;
  }
  const pageKey = getSelectedVisualPageKey();
  const path = previewPathByPageKey[pageKey] || "/index.html";
  const delimiter = path.includes("?") ? "&" : "?";
  visualPreviewFrame.src = `${path}${delimiter}designPreview=${Date.now()}`;
}

function applyVisualPreset(presetKey) {
  const preset = visualPresets[presetKey];
  if (!preset) {
    return;
  }
  setVisualControlValues(preset);
  visualPresetButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.visualPreset === presetKey);
  });
  refreshVisualRangeLabels();
  updateVisualGeneratedCssPreview();
  applyVisualCssToPreview();
}

function applyVisualMetadataIfPresent() {
  const pageKey = getSelectedVisualPageKey();
  const selectedCss = String(pageCssInputByKey[pageKey]?.value || "");
  const globalCss = String(siteInputs.globalCustomCss?.value || "");
  const metadata = readVisualMetadata(selectedCss) || readVisualMetadata(globalCss);
  if (metadata) {
    setVisualControlValues(metadata);
    if (Array.isArray(metadata.sectionOrder)) {
      setSectionOrderForPage(pageKey, metadata.sectionOrder);
    }
  }
}

function syncSectionDataFromPreview(pageKey = getSelectedVisualPageKey()) {
  const descriptors = getPreviewSectionDescriptors();
  state.availableSectionsByPage[pageKey] = descriptors;
  const metadataOrder = normalizeSectionOrder(readVisualMetadata(getPageCssInput(pageKey)?.value || "")?.sectionOrder);
  const existingOrder = getSectionOrderForPage(pageKey);
  const preferredOrder = metadataOrder.length > 0 ? metadataOrder : existingOrder;
  const normalizedOrder = normalizeSectionOrderForPage(pageKey, preferredOrder);
  setSectionOrderForPage(pageKey, normalizedOrder);
  renderVisualSectionOrderList();
  applySectionOrderToPreview(pageKey);
}

function applyVisualStyleToSelectedPage() {
  const pageKey = getSelectedVisualPageKey();
  const targetInput = pageCssInputByKey[pageKey];
  if (!targetInput) {
    setDesignMessage("Pick a page first.", true);
    return;
  }
  const sectionOrder = ensureSectionOrderForPage(pageKey);
  targetInput.value = buildVisualCss(pageKey, sectionOrder);
  updateVisualCurrentCssSnapshot();
  updateVisualGeneratedCssPreview();
  applyVisualCssToPreview();
  setDesignMessage(`${getVisualPageLabel(pageKey)} style updated in draft. Click Save All Page Design to publish.`);
}

function applyVisualStyleGlobally() {
  if (!siteInputs.globalCustomCss) {
    return;
  }
  siteInputs.globalCustomCss.value = buildVisualCss("");
  updateVisualCurrentCssSnapshot();
  setDesignMessage("Global visual style updated in draft. Click Save All Page Design to publish.");
}

function clearSelectedVisualStyle() {
  const pageKey = getSelectedVisualPageKey();
  const targetInput = pageCssInputByKey[pageKey];
  if (!targetInput) {
    return;
  }
  targetInput.value = "";
  const defaultOrder = normalizeSectionOrderForPage(pageKey, getAvailableSectionsForPage(pageKey).map((entry) => entry.id));
  setSectionOrderForPage(pageKey, defaultOrder);
  renderVisualSectionOrderList();
  updateVisualCurrentCssSnapshot();
  updateVisualGeneratedCssPreview();
  applyVisualCssToPreview();
  setDesignMessage(`${getVisualPageLabel(pageKey)} page CSS cleared. Click Save All Page Design to publish.`);
}

function refreshVisualEditorFromCurrentState() {
  applyVisualMetadataIfPresent();
  refreshVisualRangeLabels();
  updateVisualCurrentCssSnapshot();
  updateVisualGeneratedCssPreview();
  renderVisualSectionOrderList();
  applyVisualCssToPreview();
}

function initializeVisualEditor() {
  setVisualDevice("desktop");
  visualControlInputs.forEach((input) => {
    input?.addEventListener("input", () => {
      refreshVisualRangeLabels();
      updateVisualGeneratedCssPreview();
      applyVisualCssToPreview();
    });
    input?.addEventListener("change", () => {
      refreshVisualRangeLabels();
      updateVisualGeneratedCssPreview();
      applyVisualCssToPreview();
    });
  });

  Object.values(pageCssInputByKey).forEach((input) => {
    input?.addEventListener("input", updateVisualCurrentCssSnapshot);
  });
  siteInputs.globalCustomCss?.addEventListener("input", updateVisualCurrentCssSnapshot);

  visualPageSelect?.addEventListener("change", () => {
    setSectionOrderMessage("");
    refreshVisualEditorFromCurrentState();
    refreshVisualPreviewFrame();
  });

  visualPresetButtons.forEach((button) => {
    button.addEventListener("click", () => {
      applyVisualPreset(button.dataset.visualPreset);
    });
  });

  visualDeviceButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setVisualDevice(button.dataset.previewDevice);
      applyVisualCssToPreview();
    });
  });

  applyVisualSelectedBtn?.addEventListener("click", applyVisualStyleToSelectedPage);
  applyVisualGlobalBtn?.addEventListener("click", applyVisualStyleGlobally);
  clearVisualSelectedBtn?.addEventListener("click", clearSelectedVisualStyle);
  visualRefreshPreviewBtn?.addEventListener("click", refreshVisualPreviewFrame);
  visualPreviewFrame?.addEventListener("load", () => {
    syncSectionDataFromPreview();
    applyVisualCssToPreview();
  });

  refreshVisualRangeLabels();
  updateVisualGeneratedCssPreview();
  updateVisualCurrentCssSnapshot();
  renderVisualSectionOrderList();
  refreshVisualPreviewFrame();
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
  setSectionOrderMessage("");
  refreshVisualEditorFromCurrentState();
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

initializeVisualEditor();

ensureAuthenticated().catch(() => {
  showLogin();
});
