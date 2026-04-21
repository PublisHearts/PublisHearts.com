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
    return parsed;
  } catch {
    return null;
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

function applySectionOrder(sectionOrder) {
  const normalizedOrder = normalizeSectionOrder(sectionOrder);
  if (normalizedOrder.length === 0) {
    return;
  }

  const sectionsRoot = document.querySelector("[data-page-sections-root]");
  if (!sectionsRoot) {
    return;
  }

  const sectionNodes = Array.from(sectionsRoot.children).filter(
    (node) => node && node.hasAttribute && node.hasAttribute("data-page-section-id")
  );
  if (sectionNodes.length < 2) {
    return;
  }

  const sectionById = new Map();
  sectionNodes.forEach((node) => {
    const id = String(node.getAttribute("data-page-section-id") || "").trim();
    if (id && !sectionById.has(id)) {
      sectionById.set(id, node);
    }
  });

  const finalOrder = [];
  normalizedOrder.forEach((id) => {
    if (sectionById.has(id) && !finalOrder.includes(id)) {
      finalOrder.push(id);
    }
  });
  sectionNodes.forEach((node) => {
    const id = String(node.getAttribute("data-page-section-id") || "").trim();
    if (id && !finalOrder.includes(id)) {
      finalOrder.push(id);
    }
  });

  finalOrder.forEach((id) => {
    const node = sectionById.get(id);
    if (node) {
      sectionsRoot.appendChild(node);
    }
  });
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
  const pageVisualMetadata = readVisualMetadata(pageCustomCss);
  const globalVisualMetadata = readVisualMetadata(globalCustomCss);
  const sectionOrder =
    normalizeSectionOrder(pageVisualMetadata?.sectionOrder).length > 0
      ? pageVisualMetadata.sectionOrder
      : globalVisualMetadata?.sectionOrder;
  applySectionOrder(sectionOrder);
  upsertStyle(GLOBAL_STYLE_ID, globalCustomCss);
  upsertStyle(PAGE_STYLE_ID, pageCustomCss);
}

initializePageDesign().catch(() => {});
