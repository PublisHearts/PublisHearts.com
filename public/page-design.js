const SETTINGS_ENDPOINT = "/api/site-settings";
const GLOBAL_STYLE_ID = "publishearts-global-custom-css";
const PAGE_STYLE_ID = "publishearts-page-custom-css";

const fallbackPageKeyByPath = Object.freeze({
  "/": "home",
  "/index.html": "home",
  "/shop.html": "shop",
  "/login.html": "login",
  "/signup.html": "signup",
  "/membership.html": "account",
  "/about.html": "about",
  "/delivery.html": "delivery",
  "/custom-story.html": "customStory",
  "/success.html": "success",
  "/cancel.html": "cancel",
  "/admin.html": "admin",
  "/admin-pages.html": "adminPages",
  "/pos.html": "pos",
  "/fulfillment.html": "fulfillment",
  "/completed-orders.html": "completedOrders"
});

function setHexVar(name, value) {
  const hex = String(value || "").trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
    return;
  }
  document.documentElement.style.setProperty(name, hex);
}

function upsertStyle(styleId, cssText) {
  const css = String(cssText || "");
  const existing = document.getElementById(styleId);
  if (!css.trim()) {
    if (existing) {
      existing.remove();
    }
    return;
  }
  const styleEl = existing || document.createElement("style");
  styleEl.id = styleId;
  styleEl.textContent = css;
  if (!existing) {
    document.head.appendChild(styleEl);
  }
}

function applyTheme(settings) {
  setHexVar("--accent", settings?.themeAccent);
  setHexVar("--accent-strong", settings?.themeAccentStrong);
  setHexVar("--bg", settings?.themeBackground);
  setHexVar("--ink", settings?.themeInk);
}

function applyBrand(settings) {
  const brandName = String(settings?.brandName || "").trim();
  const brandMark = String(settings?.brandMark || "").trim();

  if (brandName) {
    const brandNameNodes = document.querySelectorAll(".brand > span:last-child");
    brandNameNodes.forEach((node) => {
      node.textContent = brandName;
    });
  }

  if (brandMark) {
    const brandMarkNodes = document.querySelectorAll(".brand-mark");
    brandMarkNodes.forEach((node) => {
      const nestedTextNode = node.querySelector("#brand-mark-text");
      if (nestedTextNode) {
        nestedTextNode.textContent = brandMark;
        return;
      }
      if (node.querySelector("img")) {
        return;
      }
      node.textContent = brandMark;
    });
  }
}

function resolvePageKey() {
  const bodyPageKey = String(document.body?.dataset?.pageKey || "")
    .trim();
  if (bodyPageKey) {
    return bodyPageKey;
  }

  const pathname = String(window.location.pathname || "/")
    .trim()
    .toLowerCase();
  return fallbackPageKeyByPath[pathname] || "";
}

async function loadSettings() {
  const response = await fetch(SETTINGS_ENDPOINT, {
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error("Could not load page design settings.");
  }
  return response.json();
}

async function initializePageDesign() {
  const settings = await loadSettings();
  applyTheme(settings);
  applyBrand(settings);

  const pageKey = resolvePageKey();
  const pageCssFieldKey = pageKey ? `${pageKey}CustomCss` : "";
  const globalCustomCss = String(settings?.globalCustomCss || "");
  const pageCustomCss = pageCssFieldKey ? String(settings?.[pageCssFieldKey] || "") : "";
  upsertStyle(GLOBAL_STYLE_ID, globalCustomCss);
  upsertStyle(PAGE_STYLE_ID, pageCustomCss);
}

initializePageDesign().catch(() => {});
