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
const visualPageOptionsTitleEl = document.getElementById("visual-page-options-title");
const visualPageOptionsCopyEl = document.getElementById("visual-page-options-copy");
const visualPageControlsEl = document.getElementById("visual-page-controls");
const visualSectionOrderList = document.getElementById("visual-section-order-list");
const visualSectionOrderMessageEl = document.getElementById("visual-section-order-message");
const visualSectionStyleTargetSelect = document.getElementById("visual-section-style-target");
const visualSectionHiddenInput = document.getElementById("visual-section-hidden");
const visualSectionBgInput = document.getElementById("visual-section-bg");
const visualSectionInkInput = document.getElementById("visual-section-ink");
const visualSectionRadiusInput = document.getElementById("visual-section-radius");
const visualSectionPadTopInput = document.getElementById("visual-section-pad-top");
const visualSectionPadBottomInput = document.getElementById("visual-section-pad-bottom");
const visualSectionAlignSelect = document.getElementById("visual-section-align");
const visualSectionRadiusValueEl = document.getElementById("visual-section-radius-value");
const visualSectionPadTopValueEl = document.getElementById("visual-section-pad-top-value");
const visualSectionPadBottomValueEl = document.getElementById("visual-section-pad-bottom-value");
const visualSectionResetBtn = document.getElementById("visual-section-reset-btn");
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

const commonPageOptionSchema = Object.freeze([
  {
    key: "pageAccent",
    label: "Page Accent Color",
    type: "color",
    defaultValue: "#ad4f2d"
  },
  {
    key: "pageBackground",
    label: "Page Background Color",
    type: "color",
    defaultValue: "#f5efe5"
  },
  {
    key: "pageInk",
    label: "Page Text Color",
    type: "color",
    defaultValue: "#221d18"
  },
  {
    key: "panelTone",
    label: "Panel/Card Color",
    type: "color",
    defaultValue: "#fffefb"
  },
  {
    key: "sectionGapScale",
    label: "Spacing Scale",
    type: "range",
    min: 70,
    max: 150,
    step: 1,
    unit: "%",
    defaultValue: 100
  },
  {
    key: "headerMode",
    label: "Header Layout",
    type: "select",
    defaultValue: "normal",
    options: Object.freeze([
      { value: "normal", label: "Normal" },
      { value: "compact", label: "Compact" },
      { value: "centered", label: "Centered" }
    ])
  }
]);

const pageOptionSchemaByPage = Object.freeze({
  home: Object.freeze([
    {
      key: "heroAlign",
      label: "Hero Alignment",
      type: "select",
      defaultValue: "left",
      options: Object.freeze([
        { value: "left", label: "Left" },
        { value: "center", label: "Center" }
      ])
    },
    {
      key: "entryButtonsLayout",
      label: "Entry Buttons Layout",
      type: "select",
      defaultValue: "row",
      options: Object.freeze([
        { value: "row", label: "Row" },
        { value: "stack", label: "Stacked" }
      ])
    }
  ]),
  shop: Object.freeze([
    {
      key: "heroAlign",
      label: "Hero Alignment",
      type: "select",
      defaultValue: "left",
      options: Object.freeze([
        { value: "left", label: "Left" },
        { value: "center", label: "Center" }
      ])
    },
    {
      key: "catalogColumns",
      label: "Catalog Columns",
      type: "range",
      min: 2,
      max: 5,
      step: 1,
      unit: " cols",
      defaultValue: 4
    },
    {
      key: "showCustomStoryPromo",
      label: "Show Custom Story Promo",
      type: "toggle",
      defaultValue: true
    },
    {
      key: "showPromises",
      label: "Show Promise Cards",
      type: "toggle",
      defaultValue: true
    }
  ]),
  login: Object.freeze([
    {
      key: "showHero",
      label: "Show Hero Section",
      type: "toggle",
      defaultValue: true
    },
    {
      key: "formWidth",
      label: "Form Card Width",
      type: "range",
      min: 360,
      max: 860,
      step: 10,
      unit: " px",
      defaultValue: 620
    }
  ]),
  signup: Object.freeze([
    {
      key: "showHero",
      label: "Show Hero Section",
      type: "toggle",
      defaultValue: true
    },
    {
      key: "formWidth",
      label: "Form Card Width",
      type: "range",
      min: 360,
      max: 860,
      step: 10,
      unit: " px",
      defaultValue: 700
    }
  ]),
  account: Object.freeze([
    {
      key: "planColumns",
      label: "Membership Plan Columns",
      type: "range",
      min: 1,
      max: 4,
      step: 1,
      unit: " cols",
      defaultValue: 3
    },
    {
      key: "contentColumns",
      label: "E-Store/Community Columns",
      type: "range",
      min: 1,
      max: 2,
      step: 1,
      unit: " cols",
      defaultValue: 2
    },
    {
      key: "showCommunity",
      label: "Show Community Card",
      type: "toggle",
      defaultValue: true
    },
    {
      key: "showOrders",
      label: "Show Orders Section",
      type: "toggle",
      defaultValue: true
    }
  ]),
  about: Object.freeze([
    {
      key: "articleWidth",
      label: "Content Width",
      type: "range",
      min: 620,
      max: 1100,
      step: 10,
      unit: " px",
      defaultValue: 900
    },
    {
      key: "bodyTextSize",
      label: "Body Text Size",
      type: "range",
      min: 90,
      max: 125,
      step: 1,
      unit: "%",
      defaultValue: 100
    }
  ]),
  delivery: Object.freeze([
    {
      key: "articleWidth",
      label: "Content Width",
      type: "range",
      min: 620,
      max: 1100,
      step: 10,
      unit: " px",
      defaultValue: 920
    },
    {
      key: "bodyTextSize",
      label: "Body Text Size",
      type: "range",
      min: 90,
      max: 125,
      step: 1,
      unit: "%",
      defaultValue: 100
    }
  ]),
  customStory: Object.freeze([
    {
      key: "storyLayout",
      label: "Story Layout",
      type: "select",
      defaultValue: "split",
      options: Object.freeze([
        { value: "split", label: "Split Columns" },
        { value: "stack", label: "Stacked" }
      ])
    },
    {
      key: "formFirst",
      label: "Show Form First",
      type: "toggle",
      defaultValue: false
    },
    {
      key: "showFooter",
      label: "Show Footer",
      type: "toggle",
      defaultValue: true
    }
  ]),
  success: Object.freeze([
    {
      key: "statusCardWidth",
      label: "Status Card Width",
      type: "range",
      min: 420,
      max: 900,
      step: 10,
      unit: " px",
      defaultValue: 680
    },
    {
      key: "showHeader",
      label: "Show Header",
      type: "toggle",
      defaultValue: true
    }
  ]),
  cancel: Object.freeze([
    {
      key: "statusCardWidth",
      label: "Status Card Width",
      type: "range",
      min: 420,
      max: 900,
      step: 10,
      unit: " px",
      defaultValue: 620
    },
    {
      key: "showHeader",
      label: "Show Header",
      type: "toggle",
      defaultValue: false
    }
  ]),
  admin: Object.freeze([
    {
      key: "toolbarMode",
      label: "Toolbar Layout",
      type: "select",
      defaultValue: "row",
      options: Object.freeze([
        { value: "row", label: "Row" },
        { value: "stack", label: "Stacked" }
      ])
    },
    {
      key: "adminSectionGap",
      label: "Section Gap",
      type: "range",
      min: 12,
      max: 36,
      step: 1,
      unit: " px",
      defaultValue: 16
    }
  ]),
  adminPages: Object.freeze([
    {
      key: "toolbarMode",
      label: "Toolbar Layout",
      type: "select",
      defaultValue: "row",
      options: Object.freeze([
        { value: "row", label: "Row" },
        { value: "stack", label: "Stacked" }
      ])
    },
    {
      key: "adminSectionGap",
      label: "Section Gap",
      type: "range",
      min: 12,
      max: 36,
      step: 1,
      unit: " px",
      defaultValue: 16
    },
    {
      key: "showAdvancedCss",
      label: "Show Advanced CSS Box",
      type: "toggle",
      defaultValue: false
    }
  ]),
  pos: Object.freeze([
    {
      key: "posLayout",
      label: "POS Layout",
      type: "select",
      defaultValue: "split",
      options: Object.freeze([
        { value: "split", label: "Split" },
        { value: "stack", label: "Stacked" }
      ])
    },
    {
      key: "posCatalogColumns",
      label: "Catalog Columns",
      type: "range",
      min: 1,
      max: 4,
      step: 1,
      unit: " cols",
      defaultValue: 2
    },
    {
      key: "showReceiptPanel",
      label: "Show Receipt Panel",
      type: "toggle",
      defaultValue: true
    }
  ]),
  fulfillment: Object.freeze([
    {
      key: "showEditionSidebar",
      label: "Show Edition Sidebar",
      type: "toggle",
      defaultValue: true
    },
    {
      key: "searchWidth",
      label: "Search Box Width",
      type: "range",
      min: 220,
      max: 480,
      step: 10,
      unit: " px",
      defaultValue: 320
    }
  ]),
  completedOrders: Object.freeze([
    {
      key: "showCustomerSummary",
      label: "Show Customer Summary",
      type: "toggle",
      defaultValue: true
    },
    {
      key: "searchWidth",
      label: "Search Box Width",
      type: "range",
      min: 220,
      max: 480,
      step: 10,
      unit: " px",
      defaultValue: 320
    }
  ])
});

const pageOptionCopyByPage = Object.freeze({
  home: "Home controls for hero and entry button layout.",
  shop: "Shop controls for catalog columns, promo visibility, and promise cards.",
  login: "Login controls for hero visibility and form width.",
  signup: "Signup controls for hero visibility and form width.",
  account: "Account controls for membership grids, community visibility, and order section visibility.",
  about: "About controls for content width and reading size.",
  delivery: "Delivery controls for content width and reading size.",
  customStory: "Custom story controls for layout direction, form priority, and footer visibility.",
  success: "Checkout success controls for card width and header visibility.",
  cancel: "Checkout cancel controls for card width and header visibility.",
  admin: "Admin controls for toolbar and section spacing.",
  adminPages: "Page Editor controls for toolbar spacing and advanced box visibility.",
  pos: "POS controls for layout, catalog density, and receipt panel visibility.",
  fulfillment: "Fulfillment controls for edition sidebar visibility and search width.",
  completedOrders: "Completed orders controls for summary visibility and search width."
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
  pageSpecificOptionsByPage: {},
  sectionStylesByPage: {},
  selectedSectionStyleTargetByPage: {},
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
  if (visualSectionResetBtn) {
    visualSectionResetBtn.disabled = isBusy;
  }
  renderVisualPageControls();
  renderVisualSectionOrderList();
  renderVisualSectionDesigner();
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

function normalizeHexColor(value, fallback = "#000000") {
  const candidate = String(value || "")
    .trim()
    .toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(candidate)) {
    return candidate;
  }
  return String(fallback || "#000000").toLowerCase();
}

function parseBoolean(value, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "off", ""].includes(normalized)) {
      return false;
    }
  }
  return fallback;
}

function normalizeOptionalHexColor(value) {
  const candidate = String(value || "")
    .trim()
    .toLowerCase();
  if (!candidate) {
    return "";
  }
  if (/^#[0-9a-f]{6}$/.test(candidate)) {
    return candidate;
  }
  return "";
}

function getDefaultSectionStyle() {
  return {
    hidden: false,
    backgroundColor: "",
    textColor: "",
    radius: 0,
    padTop: 0,
    padBottom: 0,
    align: "default"
  };
}

function normalizeSectionStyleEntry(style = {}) {
  const base = getDefaultSectionStyle();
  const alignValue = String(style.align || base.align).trim().toLowerCase();
  return {
    hidden: parseBoolean(style.hidden, base.hidden),
    backgroundColor: normalizeOptionalHexColor(style.backgroundColor),
    textColor: normalizeOptionalHexColor(style.textColor),
    radius: clampNumber(style.radius, 0, 40, base.radius),
    padTop: clampNumber(style.padTop, 0, 120, base.padTop),
    padBottom: clampNumber(style.padBottom, 0, 140, base.padBottom),
    align: ["default", "left", "center", "right"].includes(alignValue) ? alignValue : base.align
  };
}

function isDefaultSectionStyle(style = {}) {
  const normalized = normalizeSectionStyleEntry(style);
  return (
    !normalized.hidden &&
    !normalized.backgroundColor &&
    !normalized.textColor &&
    normalized.radius === 0 &&
    normalized.padTop === 0 &&
    normalized.padBottom === 0 &&
    normalized.align === "default"
  );
}

function normalizeSectionStyleMap(value) {
  const source = value && typeof value === "object" ? value : {};
  const normalized = {};
  Object.entries(source).forEach(([key, entry]) => {
    const sectionId = String(key || "").trim();
    if (!sectionId) {
      return;
    }
    const style = normalizeSectionStyleEntry(entry || {});
    if (!isDefaultSectionStyle(style)) {
      normalized[sectionId] = style;
    }
  });
  return normalized;
}

function getSectionStylesForPage(pageKey) {
  const key = String(pageKey || "").trim();
  const normalized = normalizeSectionStyleMap(state.sectionStylesByPage[key]);
  state.sectionStylesByPage[key] = normalized;
  return normalized;
}

function setSectionStylesForPage(pageKey, styles = {}) {
  const key = String(pageKey || "").trim();
  state.sectionStylesByPage[key] = normalizeSectionStyleMap(styles);
}

function getSectionStyleForPageSection(pageKey, sectionId) {
  const sectionKey = String(sectionId || "").trim();
  if (!sectionKey) {
    return getDefaultSectionStyle();
  }
  const styles = getSectionStylesForPage(pageKey);
  return normalizeSectionStyleEntry(styles[sectionKey] || {});
}

function upsertSectionStyleForPageSection(pageKey, sectionId, stylePatch = {}) {
  const sectionKey = String(sectionId || "").trim();
  if (!sectionKey) {
    return;
  }
  const styles = { ...getSectionStylesForPage(pageKey) };
  const merged = normalizeSectionStyleEntry({
    ...(styles[sectionKey] || {}),
    ...(stylePatch || {})
  });
  if (isDefaultSectionStyle(merged)) {
    delete styles[sectionKey];
  } else {
    styles[sectionKey] = merged;
  }
  setSectionStylesForPage(pageKey, styles);
}

function getSelectedSectionStyleTarget(pageKey) {
  return String(state.selectedSectionStyleTargetByPage[pageKey] || "").trim();
}

function setSelectedSectionStyleTarget(pageKey, sectionId) {
  const key = String(pageKey || "").trim();
  state.selectedSectionStyleTargetByPage[key] = String(sectionId || "").trim();
}

function getPageOptionSchema(pageKey) {
  const key = String(pageKey || "").trim();
  return [...commonPageOptionSchema, ...(pageOptionSchemaByPage[key] || [])];
}

function getPageOptionDefinition(pageKey, optionKey) {
  const key = String(optionKey || "").trim();
  return getPageOptionSchema(pageKey).find((entry) => entry.key === key) || null;
}

function getPageOptionDefaultValue(definition) {
  if (!definition || typeof definition !== "object") {
    return undefined;
  }
  const controls = readVisualControlValues();
  if (definition.key === "pageAccent") {
    return controls.themeAccent;
  }
  if (definition.key === "pageBackground") {
    return controls.themeBackground;
  }
  if (definition.key === "pageInk") {
    return controls.themeInk;
  }
  if (definition.key === "panelTone") {
    return shiftHex(controls.themeBackground, 10);
  }
  return definition.defaultValue;
}

function normalizePageOptionValue(definition, value, defaultOverride = undefined) {
  if (!definition || typeof definition !== "object") {
    return value;
  }
  const fallback = defaultOverride !== undefined ? defaultOverride : definition.defaultValue;
  if (definition.type === "color") {
    return normalizeHexColor(value, normalizeHexColor(fallback, "#000000"));
  }
  if (definition.type === "range") {
    return clampNumber(value, Number(definition.min), Number(definition.max), Number(fallback));
  }
  if (definition.type === "select") {
    const options = Array.isArray(definition.options) ? definition.options : [];
    const allowedValues = options.map((entry) => String(entry.value));
    const candidate = String(value ?? "");
    if (allowedValues.includes(candidate)) {
      return candidate;
    }
    return String(fallback || allowedValues[0] || "");
  }
  if (definition.type === "toggle") {
    return parseBoolean(value, Boolean(fallback));
  }
  return value === undefined ? fallback : value;
}

function normalizePageOptionsForPage(pageKey, options = {}) {
  const normalized = {};
  getPageOptionSchema(pageKey).forEach((definition) => {
    const defaultValue = getPageOptionDefaultValue(definition);
    const rawValue =
      options && Object.prototype.hasOwnProperty.call(options, definition.key) ? options[definition.key] : defaultValue;
    normalized[definition.key] = normalizePageOptionValue(definition, rawValue, defaultValue);
  });
  return normalized;
}

function getPageOptionsForPage(pageKey) {
  const key = String(pageKey || "").trim();
  const existing = state.pageSpecificOptionsByPage[key];
  const normalized = normalizePageOptionsForPage(key, existing || {});
  state.pageSpecificOptionsByPage[key] = normalized;
  return normalized;
}

function setPageOptionsForPage(pageKey, options = {}) {
  const key = String(pageKey || "").trim();
  state.pageSpecificOptionsByPage[key] = normalizePageOptionsForPage(key, options);
}

function formatPageOptionRangeValue(definition, value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return String(value ?? "");
  }
  return `${numeric}${definition.unit || ""}`;
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

function syncVisualDraftToPageInput(pageKey = getSelectedVisualPageKey()) {
  const targetInput = getPageCssInput(pageKey);
  if (!targetInput) {
    return;
  }
  const sectionOrder = ensureSectionOrderForPage(pageKey);
  targetInput.value = buildVisualCss(pageKey, sectionOrder);
}

function buildVisualMetadata(controlValues, sectionOrder = [], pageOptions = {}, sectionStyles = {}) {
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
  if (pageOptions && typeof pageOptions === "object" && Object.keys(pageOptions).length > 0) {
    metadata.pageOptions = pageOptions;
  }
  const normalizedSectionStyles = normalizeSectionStyleMap(sectionStyles);
  if (Object.keys(normalizedSectionStyles).length > 0) {
    metadata.sectionStyles = normalizedSectionStyles;
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
    if (parsed.sectionStyles !== undefined) {
      parsed.sectionStyles = normalizeSectionStyleMap(parsed.sectionStyles);
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

  if (updates.pageOptions !== undefined) {
    merged.pageOptions = normalizePageOptionsForPage(pageKey, updates.pageOptions || {});
  } else if (existingMetadata.pageOptions !== undefined) {
    merged.pageOptions = normalizePageOptionsForPage(pageKey, existingMetadata.pageOptions || {});
  }
  if (!merged.pageOptions || Object.keys(merged.pageOptions).length === 0) {
    delete merged.pageOptions;
  }

  if (updates.sectionStyles !== undefined) {
    merged.sectionStyles = normalizeSectionStyleMap(updates.sectionStyles || {});
  } else if (existingMetadata.sectionStyles !== undefined) {
    merged.sectionStyles = normalizeSectionStyleMap(existingMetadata.sectionStyles || {});
  }
  if (!merged.sectionStyles || Object.keys(merged.sectionStyles).length === 0) {
    delete merged.sectionStyles;
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

function buildHeaderModeCss(scope, headerMode) {
  if (headerMode === "compact") {
    return [
      `${scope} .site-header .container {`,
      `  padding-top: 0.28rem !important;`,
      `  padding-bottom: 0.28rem !important;`,
      `  min-height: auto !important;`,
      `}`,
      `${scope} .site-header .brand {`,
      `  transform: scale(0.95);`,
      `  transform-origin: left center;`,
      `}`,
      ""
    ].join("\n");
  }
  if (headerMode === "centered") {
    return [
      `${scope} .site-header .container {`,
      `  justify-content: center !important;`,
      `  gap: 0.75rem !important;`,
      `  flex-wrap: wrap !important;`,
      `}`,
      `${scope} .site-header .brand {`,
      `  margin-inline: auto !important;`,
      `}`,
      `${scope} .site-header .header-actions {`,
      `  width: 100%;`,
      `  justify-content: center !important;`,
      `}`,
      ""
    ].join("\n");
  }
  return "";
}

function buildPageSpecificCss(pageKey, pageOptions, scope) {
  const cssBlocks = [];
  const pushToggleDisplay = (selector, isVisible, fallbackDisplay = "block") => {
    cssBlocks.push(
      `${scope} ${selector} {`,
      `  display: ${isVisible ? fallbackDisplay : "none"} !important;`,
      `}`,
      ""
    );
  };

  if (pageKey === "home") {
    if (pageOptions.heroAlign === "center") {
      cssBlocks.push(
        `${scope} .membership-hero {`,
        `  text-align: center !important;`,
        `}`,
        `${scope} .membership-hero .eyebrow {`,
        `  display: inline-block;`,
        `  margin-inline: auto !important;`,
        `}`,
        `${scope} .membership-hero .membership-included-list {`,
        `  display: inline-block;`,
        `  text-align: left !important;`,
        `}`,
        ""
      );
    } else {
      cssBlocks.push(
        `${scope} .membership-hero {`,
        `  text-align: left !important;`,
        `}`,
        ""
      );
    }

    if (pageOptions.entryButtonsLayout === "stack") {
      cssBlocks.push(
        `${scope} [data-page-section-id="entry"] .membership-account-actions {`,
        `  flex-direction: column !important;`,
        `  align-items: stretch !important;`,
        `}`,
        ""
      );
    } else {
      cssBlocks.push(
        `${scope} [data-page-section-id="entry"] .membership-account-actions {`,
        `  flex-direction: row !important;`,
        `  align-items: center !important;`,
        `}`,
        ""
      );
    }
  } else if (pageKey === "shop") {
    if (pageOptions.heroAlign === "center") {
      cssBlocks.push(
        `${scope} [data-page-section-id="hero"] {`,
        `  text-align: center !important;`,
        `}`,
        `${scope} [data-page-section-id="hero"] .primary-btn {`,
        `  margin-inline: auto !important;`,
        `}`,
        ""
      );
    } else {
      cssBlocks.push(
        `${scope} [data-page-section-id="hero"] {`,
        `  text-align: left !important;`,
        `}`,
        `${scope} [data-page-section-id="hero"] .primary-btn {`,
        `  margin-inline: 0 !important;`,
        `}`,
        ""
      );
    }

    const catalogColumns = clampNumber(pageOptions.catalogColumns, 2, 5, 4);
    const tabletColumns = clampNumber(catalogColumns - 1, 1, 3, 2);
    cssBlocks.push(
      `${scope} .products-grid {`,
      `  grid-template-columns: repeat(${catalogColumns}, minmax(0, 1fr)) !important;`,
      `}`,
      `@media (max-width: 980px) {`,
      `  ${scope} .products-grid {`,
      `    grid-template-columns: repeat(${tabletColumns}, minmax(0, 1fr)) !important;`,
      `  }`,
      `}`,
      `@media (max-width: 720px) {`,
      `  ${scope} .products-grid {`,
      `    grid-template-columns: 1fr !important;`,
      `  }`,
      `}`,
      ""
    );

    pushToggleDisplay(`[data-page-section-id="customStoryPromo"]`, pageOptions.showCustomStoryPromo, "block");
    pushToggleDisplay(`[data-page-section-id="promises"]`, pageOptions.showPromises, "grid");
  } else if (pageKey === "login" || pageKey === "signup") {
    pushToggleDisplay(`[data-page-section-id="hero"]`, pageOptions.showHero, "block");
    const formWidth = clampNumber(pageOptions.formWidth, 360, 860, pageKey === "signup" ? 700 : 620);
    cssBlocks.push(
      `${scope} [data-page-section-id="form"] {`,
      `  width: min(${formWidth}px, calc(100vw - 2rem)) !important;`,
      `  margin-inline: auto !important;`,
      `}`,
      ""
    );
  } else if (pageKey === "account") {
    const planColumns = clampNumber(pageOptions.planColumns, 1, 4, 3);
    const contentColumns = clampNumber(pageOptions.contentColumns, 1, 2, 2);
    cssBlocks.push(
      `${scope} #membership-plan-grid {`,
      `  grid-template-columns: repeat(${planColumns}, minmax(0, 1fr)) !important;`,
      `}`,
      `${scope} .membership-content-grid {`,
      `  grid-template-columns: repeat(${contentColumns}, minmax(0, 1fr)) !important;`,
      `}`,
      ""
    );
    if (pageOptions.showCommunity) {
      cssBlocks.push(
        `${scope} .membership-content-grid > .membership-card:has(#membership-community-list),`,
        `${scope} .membership-content-grid > .membership-card:nth-child(2) {`,
        `  display: grid !important;`,
        `}`,
        ""
      );
    } else {
      cssBlocks.push(
        `${scope} .membership-content-grid > .membership-card:has(#membership-community-list),`,
        `${scope} .membership-content-grid > .membership-card:nth-child(2) {`,
        `  display: none !important;`,
        `}`,
        ""
      );
    }
    pushToggleDisplay(`[data-page-section-id="orders"]`, pageOptions.showOrders, "grid");
  } else if (pageKey === "about" || pageKey === "delivery") {
    const articleWidth = clampNumber(pageOptions.articleWidth, 620, 1100, pageKey === "about" ? 900 : 920);
    const bodyTextSize = clampNumber(pageOptions.bodyTextSize, 90, 125, 100);
    cssBlocks.push(
      `${scope} .delivery-card {`,
      `  width: min(${articleWidth}px, calc(100vw - 2rem)) !important;`,
      `  margin-inline: auto !important;`,
      `  font-size: ${bodyTextSize}% !important;`,
      `}`,
      ""
    );
  } else if (pageKey === "customStory") {
    if (pageOptions.storyLayout === "stack") {
      cssBlocks.push(
        `${scope} .custom-story-layout {`,
        `  grid-template-columns: 1fr !important;`,
        `}`,
        ""
      );
    } else {
      cssBlocks.push(
        `${scope} .custom-story-layout {`,
        `  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;`,
        `}`,
        ""
      );
    }
    if (pageOptions.formFirst) {
      cssBlocks.push(
        `${scope} .custom-story-form-card {`,
        `  order: -1 !important;`,
        `}`,
        ""
      );
    } else {
      cssBlocks.push(
        `${scope} .custom-story-form-card {`,
        `  order: 0 !important;`,
        `}`,
        ""
      );
    }
    pushToggleDisplay(`.site-footer`, pageOptions.showFooter, "block");
  } else if (pageKey === "success" || pageKey === "cancel") {
    const statusCardWidth = clampNumber(pageOptions.statusCardWidth, 420, 900, pageKey === "success" ? 680 : 620);
    cssBlocks.push(
      `${scope} .status-card {`,
      `  width: min(${statusCardWidth}px, calc(100vw - 2rem)) !important;`,
      `}`,
      ""
    );
    pushToggleDisplay(`.site-header`, pageOptions.showHeader, "block");
  } else if (pageKey === "admin" || pageKey === "adminPages") {
    if (pageOptions.toolbarMode === "stack") {
      cssBlocks.push(
        `${scope} .admin-toolbar {`,
        `  flex-direction: column !important;`,
        `  align-items: stretch !important;`,
        `}`,
        `${scope} .admin-toolbar-actions {`,
        `  justify-content: flex-start !important;`,
        `}`,
        ""
      );
    } else {
      cssBlocks.push(
        `${scope} .admin-toolbar {`,
        `  flex-direction: row !important;`,
        `  align-items: flex-start !important;`,
        `}`,
        `${scope} .admin-toolbar-actions {`,
        `  justify-content: flex-end !important;`,
        `}`,
        ""
      );
    }
    const adminSectionGap = clampNumber(pageOptions.adminSectionGap, 12, 36, 16);
    cssBlocks.push(
      `${scope} .admin-panel {`,
      `  gap: ${adminSectionGap}px !important;`,
      `}`,
      `${scope} .admin-section,`,
      `${scope} .admin-form,`,
      `${scope} .visual-editor {`,
      `  gap: ${Math.max(8, Math.round(adminSectionGap * 0.55))}px !important;`,
      `}`,
      ""
    );
    if (pageKey === "adminPages") {
      pushToggleDisplay(`#advanced-css-wrap`, pageOptions.showAdvancedCss, "grid");
    }
  } else if (pageKey === "pos") {
    if (pageOptions.posLayout === "stack") {
      cssBlocks.push(
        `${scope} .pos-layout {`,
        `  grid-template-columns: 1fr !important;`,
        `}`,
        `${scope} .pos-transaction-panel {`,
        `  position: static !important;`,
        `}`,
        ""
      );
    } else {
      cssBlocks.push(
        `${scope} .pos-layout {`,
        `  grid-template-columns: minmax(0, 1.25fr) minmax(330px, 430px) !important;`,
        `}`,
        `${scope} .pos-transaction-panel {`,
        `  position: sticky !important;`,
        `}`,
        ""
      );
    }
    const posColumns = clampNumber(pageOptions.posCatalogColumns, 1, 4, 2);
    cssBlocks.push(
      `${scope} .pos-products-grid {`,
      `  grid-template-columns: repeat(${posColumns}, minmax(0, 1fr)) !important;`,
      `}`,
      `@media (max-width: 720px) {`,
      `  ${scope} .pos-products-grid {`,
      `    grid-template-columns: 1fr !important;`,
      `  }`,
      `}`,
      ""
    );
    pushToggleDisplay(`.pos-receipt-panel`, pageOptions.showReceiptPanel, "block");
  } else if (pageKey === "fulfillment") {
    pushToggleDisplay(`.admin-edition-frame`, pageOptions.showEditionSidebar, "grid");
    if (pageOptions.showEditionSidebar) {
      cssBlocks.push(
        `${scope} .admin-panel {`,
        `  grid-template-columns: minmax(260px, 320px) minmax(0, 1fr) !important;`,
        `}`,
        `${scope} .admin-panel > :not(.admin-edition-frame) {`,
        `  grid-column: 2 !important;`,
        `}`,
        ""
      );
    } else {
      cssBlocks.push(
        `${scope} .admin-panel {`,
        `  grid-template-columns: minmax(0, 1fr) !important;`,
        `}`,
        `${scope} .admin-panel > :not(.admin-edition-frame) {`,
        `  grid-column: 1 !important;`,
        `}`,
        ""
      );
    }
    const searchWidth = clampNumber(pageOptions.searchWidth, 220, 480, 320);
    cssBlocks.push(
      `${scope} .admin-orders-search {`,
      `  min-width: ${searchWidth}px !important;`,
      `  width: min(100%, ${searchWidth}px) !important;`,
      `}`,
      ""
    );
  } else if (pageKey === "completedOrders") {
    pushToggleDisplay(`#fulfillment-order-customers`, pageOptions.showCustomerSummary, "block");
    const searchWidth = clampNumber(pageOptions.searchWidth, 220, 480, 320);
    cssBlocks.push(
      `${scope} .admin-orders-search {`,
      `  min-width: ${searchWidth}px !important;`,
      `  width: min(100%, ${searchWidth}px) !important;`,
      `}`,
      ""
    );
  }

  return cssBlocks;
}

function escapeCssAttributeValue(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"');
}

function buildSectionStyleCss(pageKey, scope, sectionStyles = {}) {
  const blocks = [];
  const normalizedStyles = normalizeSectionStyleMap(sectionStyles);
  Object.entries(normalizedStyles).forEach(([sectionId, style]) => {
    const escapedId = escapeCssAttributeValue(sectionId);
    const selector = `${scope} [data-page-section-id="${escapedId}"]`;
    const rules = [];
    if (style.hidden) {
      rules.push(`display: none !important;`);
    } else {
      if (style.backgroundColor) {
        rules.push(`background: ${style.backgroundColor} !important;`);
      }
      if (style.textColor) {
        rules.push(`color: ${style.textColor} !important;`);
      }
      if (style.radius > 0) {
        rules.push(`border-radius: ${Math.round(style.radius)}px !important;`);
      }
      if (style.padTop > 0) {
        rules.push(`padding-top: ${Math.round(style.padTop)}px !important;`);
      }
      if (style.padBottom > 0) {
        rules.push(`padding-bottom: ${Math.round(style.padBottom)}px !important;`);
      }
      if (style.align !== "default") {
        rules.push(`text-align: ${style.align} !important;`);
      }
    }

    if (rules.length > 0) {
      blocks.push(`${selector} {`);
      rules.forEach((rule) => {
        blocks.push(`  ${rule}`);
      });
      blocks.push(`}`);
      blocks.push("");
    }

    if (!style.hidden && style.textColor) {
      blocks.push(
        `${selector} h1,`,
        `${selector} h2,`,
        `${selector} h3,`,
        `${selector} p,`,
        `${selector} li,`,
        `${selector} span,`,
        `${selector} label,`,
        `${selector} strong {`,
        `  color: ${style.textColor} !important;`,
        `}`,
        ""
      );
    }
  });
  return blocks;
}

function buildVisualCss(pageKey = getSelectedVisualPageKey(), sectionOrderOverride = undefined) {
  const controlValues = readVisualControlValues();
  const pageOptions = pageKey ? getPageOptionsForPage(pageKey) : {};
  const sectionStyles = pageKey ? getSectionStylesForPage(pageKey) : {};
  const effectiveAccent = normalizeHexColor(pageOptions.pageAccent, controlValues.themeAccent);
  const effectiveAccentStrong = shiftHex(effectiveAccent, -28);
  const effectiveBackground = normalizeHexColor(pageOptions.pageBackground, controlValues.themeBackground);
  const effectiveInk = normalizeHexColor(pageOptions.pageInk, controlValues.themeInk);
  const effectivePanel = normalizeHexColor(pageOptions.panelTone, "#fffefb");
  const sectionGapScale = clampNumber(Number(pageOptions.sectionGapScale) / 100, 0.7, 1.5, 1);
  const scope = pageKey ? `body[data-page-key="${pageKey}"]` : "body";
  const headingScaleFactor = clampNumber(controlValues.headingScale / 100, 0.88, 1.3, 1.04);
  const buttonRadiusValue = Math.round(controlValues.buttonRadius) >= 78 ? "999px" : `${Math.round(controlValues.buttonRadius)}px`;
  const inputRadius = `${Math.max(8, Math.round(controlValues.cardRadius * 0.5))}px`;
  const shadowAlpha = clampNumber(0.05 + controlValues.shadowStrength / 280, 0.05, 0.42, 0.18);
  const shadowBlur = Math.round(12 + controlValues.shadowStrength * 0.38);
  const shadowDrop = `${Math.round(shadowBlur * 0.42)}px`;
  const sectionGap = Math.round(controlValues.sectionGap * sectionGapScale);
  const sectionGridGap = Math.max(10, Math.round(sectionGap * 0.64));
  const containerWidth = Math.round(controlValues.containerWidth);
  const generatedAt = new Date().toISOString();

  const backgroundBlock = buildVisualBackground(
    {
      ...controlValues,
      themeAccent: effectiveAccent,
      themeBackground: effectiveBackground,
      themeInk: effectiveInk
    },
    scope
  );
  const sectionOrder =
    sectionOrderOverride === undefined ? getSectionOrderForPage(pageKey) : normalizeSectionOrder(sectionOrderOverride);
  const metadata = buildVisualMetadata(controlValues, sectionOrder, pageOptions, sectionStyles);
  const headerModeCss = buildHeaderModeCss(scope, pageOptions.headerMode);
  const pageSpecificCssBlocks = buildPageSpecificCss(pageKey, pageOptions, scope);
  const sectionStyleBlocks = buildSectionStyleCss(pageKey, scope, sectionStyles);

  return [
    metadata,
    `/* generated:${generatedAt} */`,
    `${scope} {`,
    `  --accent: ${effectiveAccent} !important;`,
    `  --accent-strong: ${effectiveAccentStrong} !important;`,
    `  --bg: ${effectiveBackground} !important;`,
    `  --ink: ${effectiveInk} !important;`,
    `  --radius-lg: ${Math.round(controlValues.cardRadius)}px !important;`,
    `  --radius-md: ${Math.max(8, Math.round(controlValues.cardRadius * 0.64))}px !important;`,
    `}`,
    backgroundBlock,
    `${scope} .membership-shell,`,
    `${scope} .delivery-wrap,`,
    `${scope} .custom-story-page,`,
    `${scope} .admin-shell,`,
    `${scope} .pos-shell {`,
    `  gap: ${sectionGridGap}px !important;`,
    `}`,
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
    `  background: ${effectivePanel} !important;`,
    `  border-radius: ${Math.round(controlValues.cardRadius)}px !important;`,
    `  box-shadow: 0 ${shadowDrop} ${shadowBlur}px ${withAlpha(effectiveInk, shadowAlpha)} !important;`,
    `}`,
    headerModeCss,
    ...pageSpecificCssBlocks,
    ...sectionStyleBlocks,
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

function renderVisualPageControls() {
  if (!visualPageControlsEl) {
    return;
  }

  const pageKey = getSelectedVisualPageKey();
  const pageLabel = getVisualPageLabel(pageKey);
  if (visualPageOptionsTitleEl) {
    visualPageOptionsTitleEl.textContent = `${pageLabel} Controls`;
  }
  if (visualPageOptionsCopyEl) {
    visualPageOptionsCopyEl.textContent =
      pageOptionCopyByPage[pageKey] || "Use these options to tailor layout and colors for this page.";
  }

  const schema = getPageOptionSchema(pageKey);
  const options = getPageOptionsForPage(pageKey);
  visualPageControlsEl.innerHTML = "";

  if (schema.length === 0) {
    const empty = document.createElement("p");
    empty.className = "cart-item-sub";
    empty.textContent = "No controls available for this page yet.";
    visualPageControlsEl.appendChild(empty);
    return;
  }

  const updateOption = (definition, input, valueEl = null) => {
    const key = String(definition.key || "");
    if (!key) {
      return;
    }
    const nextOptions = {
      ...getPageOptionsForPage(pageKey),
      [key]: normalizePageOptionValue(definition, definition.type === "toggle" ? input.checked : input.value)
    };
    setPageOptionsForPage(pageKey, nextOptions);
    syncVisualDraftToPageInput(pageKey);

    if (valueEl && definition.type === "range") {
      valueEl.textContent = formatPageOptionRangeValue(definition, nextOptions[key]);
    }

    updateVisualGeneratedCssPreview();
    applyVisualCssToPreview();
    updateVisualCurrentCssSnapshot();
  };

  schema.forEach((definition) => {
    const key = String(definition.key || "").trim();
    if (!key) {
      return;
    }
    const value = options[key];

    if (definition.type === "toggle") {
      const toggleLabel = document.createElement("label");
      toggleLabel.className = "checkbox-row";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = Boolean(value);
      input.disabled = state.designBusy;
      input.addEventListener("change", () => {
        updateOption(definition, input);
      });
      toggleLabel.append(input, document.createTextNode(definition.label));
      visualPageControlsEl.appendChild(toggleLabel);
      return;
    }

    const label = document.createElement("label");
    label.textContent = definition.label;

    if (definition.type === "select") {
      const select = document.createElement("select");
      (definition.options || []).forEach((option) => {
        const optionEl = document.createElement("option");
        optionEl.value = String(option.value);
        optionEl.textContent = String(option.label || option.value);
        select.appendChild(optionEl);
      });
      select.value = String(value ?? definition.defaultValue ?? "");
      select.disabled = state.designBusy;
      select.addEventListener("change", () => {
        updateOption(definition, select);
      });
      label.appendChild(select);
      visualPageControlsEl.appendChild(label);
      return;
    }

    if (definition.type === "color") {
      const colorInput = document.createElement("input");
      colorInput.type = "color";
      colorInput.value = normalizeHexColor(value, definition.defaultValue);
      colorInput.disabled = state.designBusy;
      colorInput.addEventListener("input", () => {
        updateOption(definition, colorInput);
      });
      colorInput.addEventListener("change", () => {
        updateOption(definition, colorInput);
      });
      label.appendChild(colorInput);
      visualPageControlsEl.appendChild(label);
      return;
    }

    if (definition.type === "range") {
      const rangeInput = document.createElement("input");
      rangeInput.type = "range";
      rangeInput.min = String(definition.min);
      rangeInput.max = String(definition.max);
      rangeInput.step = String(definition.step || 1);
      rangeInput.value = String(clampNumber(value, Number(definition.min), Number(definition.max), Number(definition.defaultValue)));
      rangeInput.disabled = state.designBusy;

      const caption = document.createElement("span");
      caption.className = "range-caption";
      caption.textContent = formatPageOptionRangeValue(definition, rangeInput.value);

      rangeInput.addEventListener("input", () => {
        updateOption(definition, rangeInput, caption);
      });
      rangeInput.addEventListener("change", () => {
        updateOption(definition, rangeInput, caption);
      });

      label.append(rangeInput, caption);
      visualPageControlsEl.appendChild(label);
      return;
    }
  });
}

function setVisualSectionStyleRangeLabels() {
  setVisualRangeLabel(visualSectionRadiusValueEl, clampNumber(visualSectionRadiusInput?.value, 0, 40, 0));
  setVisualRangeLabel(visualSectionPadTopValueEl, clampNumber(visualSectionPadTopInput?.value, 0, 120, 0));
  setVisualRangeLabel(visualSectionPadBottomValueEl, clampNumber(visualSectionPadBottomInput?.value, 0, 140, 0));
}

function setVisualSectionStyleControlsDisabled(isDisabled) {
  if (visualSectionStyleTargetSelect) {
    visualSectionStyleTargetSelect.disabled = isDisabled;
  }
  if (visualSectionHiddenInput) {
    visualSectionHiddenInput.disabled = isDisabled;
  }
  if (visualSectionBgInput) {
    visualSectionBgInput.disabled = isDisabled;
  }
  if (visualSectionInkInput) {
    visualSectionInkInput.disabled = isDisabled;
  }
  if (visualSectionRadiusInput) {
    visualSectionRadiusInput.disabled = isDisabled;
  }
  if (visualSectionPadTopInput) {
    visualSectionPadTopInput.disabled = isDisabled;
  }
  if (visualSectionPadBottomInput) {
    visualSectionPadBottomInput.disabled = isDisabled;
  }
  if (visualSectionAlignSelect) {
    visualSectionAlignSelect.disabled = isDisabled;
  }
  if (visualSectionResetBtn) {
    visualSectionResetBtn.disabled = isDisabled || state.designBusy;
  }
}

function renderVisualSectionDesigner() {
  if (!visualSectionStyleTargetSelect) {
    return;
  }
  const pageKey = getSelectedVisualPageKey();
  const sections = getAvailableSectionsForPage(pageKey);
  const selected = getSelectedSectionStyleTarget(pageKey);
  const resolvedTarget = sections.some((entry) => entry.id === selected) ? selected : sections[0]?.id || "";
  setSelectedSectionStyleTarget(pageKey, resolvedTarget);

  const beforeValue = visualSectionStyleTargetSelect.value;
  visualSectionStyleTargetSelect.innerHTML = "";
  sections.forEach((section) => {
    const option = document.createElement("option");
    option.value = section.id;
    option.textContent = section.label;
    visualSectionStyleTargetSelect.appendChild(option);
  });
  visualSectionStyleTargetSelect.value = resolvedTarget;
  if (!resolvedTarget && beforeValue) {
    visualSectionStyleTargetSelect.value = "";
  }

  if (!resolvedTarget) {
    if (visualSectionHiddenInput) {
      visualSectionHiddenInput.checked = false;
    }
    if (visualSectionBgInput) {
      visualSectionBgInput.value = "#fffefb";
    }
    if (visualSectionInkInput) {
      visualSectionInkInput.value = "#221d18";
    }
    if (visualSectionRadiusInput) {
      visualSectionRadiusInput.value = "0";
    }
    if (visualSectionPadTopInput) {
      visualSectionPadTopInput.value = "0";
    }
    if (visualSectionPadBottomInput) {
      visualSectionPadBottomInput.value = "0";
    }
    if (visualSectionAlignSelect) {
      visualSectionAlignSelect.value = "default";
    }
    setVisualSectionStyleRangeLabels();
    setVisualSectionStyleControlsDisabled(true);
    return;
  }

  const style = getSectionStyleForPageSection(pageKey, resolvedTarget);
  const baseControls = readVisualControlValues();
  if (visualSectionHiddenInput) {
    visualSectionHiddenInput.checked = Boolean(style.hidden);
  }
  if (visualSectionBgInput) {
    visualSectionBgInput.value = style.backgroundColor || normalizeHexColor(pageOptionsFallbackColor(pageKey, "panelTone", baseControls.themeBackground), "#fffefb");
  }
  if (visualSectionInkInput) {
    visualSectionInkInput.value = style.textColor || normalizeHexColor(pageOptionsFallbackColor(pageKey, "pageInk", baseControls.themeInk), "#221d18");
  }
  if (visualSectionRadiusInput) {
    visualSectionRadiusInput.value = String(style.radius);
  }
  if (visualSectionPadTopInput) {
    visualSectionPadTopInput.value = String(style.padTop);
  }
  if (visualSectionPadBottomInput) {
    visualSectionPadBottomInput.value = String(style.padBottom);
  }
  if (visualSectionAlignSelect) {
    visualSectionAlignSelect.value = style.align;
  }
  setVisualSectionStyleRangeLabels();
  setVisualSectionStyleControlsDisabled(state.designBusy);
}

function pageOptionsFallbackColor(pageKey, optionKey, fallbackColor) {
  const definition = getPageOptionDefinition(pageKey, optionKey);
  const defaultValue = getPageOptionDefaultValue(definition);
  return normalizeHexColor(defaultValue, fallbackColor);
}

function applyVisualSectionStyleDraft() {
  const pageKey = getSelectedVisualPageKey();
  const sectionId = String(visualSectionStyleTargetSelect?.value || "").trim();
  if (!sectionId) {
    return;
  }

  const nextStyle = normalizeSectionStyleEntry({
    hidden: Boolean(visualSectionHiddenInput?.checked),
    backgroundColor: normalizeOptionalHexColor(visualSectionBgInput?.value),
    textColor: normalizeOptionalHexColor(visualSectionInkInput?.value),
    radius: clampNumber(visualSectionRadiusInput?.value, 0, 40, 0),
    padTop: clampNumber(visualSectionPadTopInput?.value, 0, 120, 0),
    padBottom: clampNumber(visualSectionPadBottomInput?.value, 0, 140, 0),
    align: String(visualSectionAlignSelect?.value || "default")
  });

  upsertSectionStyleForPageSection(pageKey, sectionId, nextStyle);
  syncVisualDraftToPageInput(pageKey);
  setVisualSectionStyleRangeLabels();
  updateVisualGeneratedCssPreview();
  applyVisualCssToPreview();
  updateVisualCurrentCssSnapshot();
}

function resetVisualSectionStyleDraft() {
  const pageKey = getSelectedVisualPageKey();
  const sectionId = String(visualSectionStyleTargetSelect?.value || "").trim();
  if (!sectionId) {
    return;
  }
  const styles = { ...getSectionStylesForPage(pageKey) };
  delete styles[sectionId];
  setSectionStylesForPage(pageKey, styles);
  syncVisualDraftToPageInput(pageKey);
  renderVisualSectionDesigner();
  updateVisualGeneratedCssPreview();
  applyVisualCssToPreview();
  updateVisualCurrentCssSnapshot();
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
  syncVisualDraftToPageInput(pageKey);
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
  syncVisualDraftToPageInput(pageKey);
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
  syncVisualDraftToPageInput();
  visualPresetButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.visualPreset === presetKey);
  });
  refreshVisualRangeLabels();
  updateVisualGeneratedCssPreview();
  applyVisualCssToPreview();
  updateVisualCurrentCssSnapshot();
}

function applyVisualMetadataIfPresent() {
  const pageKey = getSelectedVisualPageKey();
  const selectedCss = String(pageCssInputByKey[pageKey]?.value || "");
  const globalCss = String(siteInputs.globalCustomCss?.value || "");
  const selectedMetadata = readVisualMetadata(selectedCss);
  const globalMetadata = readVisualMetadata(globalCss);
  const metadata = selectedMetadata || globalMetadata;
  if (metadata) {
    setVisualControlValues(metadata);
  }

  if (Array.isArray(selectedMetadata?.sectionOrder)) {
    setSectionOrderForPage(pageKey, selectedMetadata.sectionOrder);
  } else if (Array.isArray(globalMetadata?.sectionOrder)) {
    setSectionOrderForPage(pageKey, globalMetadata.sectionOrder);
  }

  const selectedPageOptions =
    selectedMetadata?.pageOptions && typeof selectedMetadata.pageOptions === "object" ? selectedMetadata.pageOptions : null;
  const globalPageOptions =
    globalMetadata?.pageOptions && typeof globalMetadata.pageOptions === "object" ? globalMetadata.pageOptions : null;
  setPageOptionsForPage(pageKey, selectedPageOptions || globalPageOptions || {});

  const selectedSectionStyles =
    selectedMetadata?.sectionStyles && typeof selectedMetadata.sectionStyles === "object" ? selectedMetadata.sectionStyles : null;
  const globalSectionStyles =
    globalMetadata?.sectionStyles && typeof globalMetadata.sectionStyles === "object" ? globalMetadata.sectionStyles : null;
  setSectionStylesForPage(pageKey, selectedSectionStyles || globalSectionStyles || {});
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
  renderVisualSectionDesigner();
  applySectionOrderToPreview(pageKey);
}

function applyVisualStyleToSelectedPage() {
  const pageKey = getSelectedVisualPageKey();
  const targetInput = pageCssInputByKey[pageKey];
  if (!targetInput) {
    setDesignMessage("Pick a page first.", true);
    return;
  }
  syncVisualDraftToPageInput(pageKey);
  updateVisualCurrentCssSnapshot();
  updateVisualGeneratedCssPreview();
  applyVisualCssToPreview();
  setDesignMessage(`${getVisualPageLabel(pageKey)} style applied. Saving now...`);
  if (!state.designBusy) {
    siteSettingsForm?.requestSubmit?.();
  }
}

function applyVisualStyleGlobally() {
  if (!siteInputs.globalCustomCss) {
    return;
  }
  siteInputs.globalCustomCss.value = buildVisualCss("");
  syncVisualDraftToPageInput();
  updateVisualCurrentCssSnapshot();
  setDesignMessage("Global visual style applied. Saving now...");
  if (!state.designBusy) {
    siteSettingsForm?.requestSubmit?.();
  }
}

function clearSelectedVisualStyle() {
  const pageKey = getSelectedVisualPageKey();
  const targetInput = pageCssInputByKey[pageKey];
  if (!targetInput) {
    return;
  }
  targetInput.value = "";
  setPageOptionsForPage(pageKey, {});
  setSectionStylesForPage(pageKey, {});
  renderVisualPageControls();
  renderVisualSectionDesigner();
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
  renderVisualPageControls();
  renderVisualSectionDesigner();
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
      syncVisualDraftToPageInput();
      refreshVisualRangeLabels();
      updateVisualGeneratedCssPreview();
      applyVisualCssToPreview();
      updateVisualCurrentCssSnapshot();
    });
    input?.addEventListener("change", () => {
      syncVisualDraftToPageInput();
      refreshVisualRangeLabels();
      updateVisualGeneratedCssPreview();
      applyVisualCssToPreview();
      updateVisualCurrentCssSnapshot();
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

  visualSectionStyleTargetSelect?.addEventListener("change", () => {
    const pageKey = getSelectedVisualPageKey();
    setSelectedSectionStyleTarget(pageKey, visualSectionStyleTargetSelect.value);
    renderVisualSectionDesigner();
    applyVisualCssToPreview();
  });
  [
    visualSectionHiddenInput,
    visualSectionBgInput,
    visualSectionInkInput,
    visualSectionRadiusInput,
    visualSectionPadTopInput,
    visualSectionPadBottomInput,
    visualSectionAlignSelect
  ].forEach((input) => {
    input?.addEventListener("input", () => {
      applyVisualSectionStyleDraft();
    });
    input?.addEventListener("change", () => {
      applyVisualSectionStyleDraft();
    });
  });
  visualSectionResetBtn?.addEventListener("click", resetVisualSectionStyleDraft);

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

  renderVisualPageControls();
  renderVisualSectionDesigner();
  setVisualSectionStyleRangeLabels();
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
  state.sectionOrderByPage = {};
  state.pageSpecificOptionsByPage = {};
  state.sectionStylesByPage = {};
  state.selectedSectionStyleTargetByPage = {};
  state.availableSectionsByPage = {};
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
