import { getCustomerState, setupStateGate } from "./stateGate.js";

const memberTokenStorageKey = "publishearts_member_token_v1";

const productsGrid = document.getElementById("products-grid");
const storeSearchInput = document.getElementById("store-search");
const storeFilterTabs = Array.from(document.querySelectorAll("[data-store-filter]"));
const cartPanel = document.getElementById("cart-panel");
const cartItems = document.getElementById("cart-items");
const cartCount = document.getElementById("cart-count");
const cartSubtotal = document.getElementById("cart-subtotal");
const cartShipping = document.getElementById("cart-shipping");
const cartTotal = document.getElementById("cart-total");
const checkoutBtn = document.getElementById("checkout-btn");
const checkoutMessage = document.getElementById("checkout-message");
const openCartBtn = document.getElementById("open-cart");
const closeCartBtn = document.getElementById("close-cart");
const siteMetaDescription = document.getElementById("site-meta-description");
const brandNameHeader = document.getElementById("brand-name-header");
const brandMarkText = document.getElementById("brand-mark-text");
const brandMarkImage = document.getElementById("brand-mark-image");
const heroBannerWrap = document.getElementById("hero-banner-wrap");
const heroBannerImage = document.getElementById("hero-banner-image");
const heroEyebrow = document.getElementById("hero-eyebrow");
const heroTitle = document.getElementById("hero-title");
const heroCopy = document.getElementById("hero-copy");
const heroCta = document.getElementById("hero-cta");
const featuredTitle = document.getElementById("featured-title");
const featuredCopy = document.getElementById("featured-copy");
const promise1Title = document.getElementById("promise-1-title");
const promise1Copy = document.getElementById("promise-1-copy");
const promise2Title = document.getElementById("promise-2-title");
const promise2Copy = document.getElementById("promise-2-copy");
const promise3Title = document.getElementById("promise-3-title");
const promise3Copy = document.getElementById("promise-3-copy");
const footerLeft = document.getElementById("footer-left");
const footerRight = document.getElementById("footer-right");

const SHOP_PREMIUM_CTA_LABEL = "Join Premium: Get a Free Book + Full Collection Access";
const SHOP_PREMIUM_CTA_HREF = "/membership.html";
const SHOP_HERO_BANNER_FALLBACK = "/uploads/shop-hero-membership-tiers.png";

const state = {
  products: [],
  cart: new Map(),
  checkingOut: false,
  siteSettings: null,
  activeStoreFilter: "all",
  searchQuery: ""
};
let stateGate = null;

const CART_KEY = "publishearts_cart_v1";
const DEFAULT_SHIPPING_CONFIG = Object.freeze({
  baseWeightLbs: 1.5,
  additionalWeightPerUnitLbs: 1,
  minimumCents: 1000,
  defaultZone: 8,
  fromState: "NY",
  ratePoints: [
    { weightLbs: 1.5, cents: 1192 },
    { weightLbs: 2, cents: 1290 },
    { weightLbs: 3, cents: 1458 },
    { weightLbs: 4, cents: 1668 },
    { weightLbs: 5, cents: 1777 },
    { weightLbs: 10, cents: 2350 }
  ],
  zoneScale: {
    1: 0.7424,
    2: 0.7718,
    3: 0.7928,
    4: 0.8221,
    5: 0.8515,
    6: 0.8809,
    7: 0.9262,
    8: 1
  },
  stateZoneMap: {
    NY: 1,
    CT: 2,
    NJ: 2,
    PA: 2,
    MA: 2,
    RI: 2,
    VT: 2,
    NH: 2,
    DE: 2,
    MD: 2,
    DC: 2,
    ME: 3,
    VA: 3,
    WV: 3,
    OH: 3,
    NC: 3,
    SC: 4,
    GA: 4,
    TN: 4,
    KY: 4,
    IN: 4,
    MI: 4,
    IL: 4,
    AL: 5,
    FL: 5,
    MS: 5,
    WI: 5,
    MN: 5,
    IA: 5,
    MO: 5,
    AR: 5,
    LA: 5,
    ND: 6,
    SD: 6,
    NE: 6,
    KS: 6,
    OK: 6,
    TX: 6,
    NM: 6,
    CO: 6,
    WY: 6,
    MT: 7,
    ID: 7,
    UT: 7,
    AZ: 7,
    NV: 7,
    WA: 8,
    OR: 8,
    CA: 8,
    AK: 8,
    HI: 8
  }
});

function formatMoney(amountCents = 0) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(amountCents / 100);
}

function readMemberToken() {
  const sessionToken = String(window.sessionStorage.getItem(memberTokenStorageKey) || "").trim();
  const localToken = String(window.localStorage.getItem(memberTokenStorageKey) || "").trim();
  const token = sessionToken || localToken;
  if (token && !sessionToken) {
    window.sessionStorage.setItem(memberTokenStorageKey, token);
  }
  if (localToken) {
    window.localStorage.removeItem(memberTokenStorageKey);
  }
  return token;
}

function getShippingConfig() {
  const config = state.siteSettings?.shippingEstimate;
  if (!config || typeof config !== "object") {
    return DEFAULT_SHIPPING_CONFIG;
  }
  return {
    ...DEFAULT_SHIPPING_CONFIG,
    ...config
  };
}

function normalizeShippingZone(zoneValue, fallback = DEFAULT_SHIPPING_CONFIG.defaultZone) {
  const zone = Number.parseInt(String(zoneValue ?? ""), 10);
  if (Number.isFinite(zone) && zone >= 1 && zone <= 8) {
    return zone;
  }
  return fallback;
}

function isShippingEnabled(product) {
  if (!product) {
    return false;
  }
  if (product.shippingEnabled === true) {
    return true;
  }
  if (product.shippingEnabled === false) {
    return false;
  }

  const text = String(product.shippingEnabled || "")
    .trim()
    .toLowerCase();
  if (["false", "0", "no", "off"].includes(text)) {
    return false;
  }
  if (["true", "1", "yes", "on"].includes(text)) {
    return true;
  }
  return true;
}

function isComingSoon(product) {
  if (!product) {
    return false;
  }
  if (product.isComingSoon === true) {
    return true;
  }
  if (product.isComingSoon === false) {
    return false;
  }

  const text = String(product.isComingSoon || "")
    .trim()
    .toLowerCase();
  if (["true", "1", "yes", "on", "comingsoon", "coming-soon"].includes(text)) {
    return true;
  }
  return false;
}

function isPreorderEnabled(product) {
  if (!product) {
    return false;
  }
  if (product.allowPreorder === true) {
    return true;
  }
  if (product.allowPreorder === false) {
    return false;
  }

  const text = String(product.allowPreorder || "")
    .trim()
    .toLowerCase();
  if (["true", "1", "yes", "on", "preorder", "pre-order", "enabled"].includes(text)) {
    return true;
  }
  return false;
}

function isOrderable(product) {
  if (!product || product.inStock === false) {
    return false;
  }
  if (isComingSoon(product) && !isPreorderEnabled(product)) {
    return false;
  }
  return true;
}

function normalizeStoreFilterValue(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (["books", "accessories", "games", "stickers"].includes(normalized)) {
    return normalized;
  }
  return "all";
}

function getStoreSearchHaystack(product) {
  return [product?.title, product?.subtitle, product?.included, product?.productCategory]
    .map((entry) => String(entry || "").trim().toLowerCase())
    .filter(Boolean)
    .join(" ");
}

function getStoreCategory(product) {
  const productCategory = String(product?.productCategory || "")
    .trim()
    .toLowerCase();
  if (productCategory === "book") {
    return "books";
  }

  const haystack = getStoreSearchHaystack(product);
  if (/(sticker|stickers|decal|decals)/i.test(haystack)) {
    return "stickers";
  }
  if (/(game|games|card game|board game|puzzle|dice|deck)/i.test(haystack)) {
    return "games";
  }
  return "accessories";
}

function updateStoreFilterUi() {
  const activeFilter = normalizeStoreFilterValue(state.activeStoreFilter);
  storeFilterTabs.forEach((button) => {
    const buttonFilter = normalizeStoreFilterValue(button.dataset.storeFilter);
    const isActive = buttonFilter === activeFilter;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

function getFilteredProducts() {
  const activeFilter = normalizeStoreFilterValue(state.activeStoreFilter);
  const searchQuery = String(state.searchQuery || "")
    .trim()
    .toLowerCase();
  return state.products.filter((product) => {
    if (activeFilter !== "all" && getStoreCategory(product) !== activeFilter) {
      return false;
    }
    if (searchQuery && !getStoreSearchHaystack(product).includes(searchQuery)) {
      return false;
    }
    return true;
  });
}

function collectImageUrls(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => String(entry || "").trim())
    .filter(Boolean);
}

function getProductGalleryImages(product) {
  const unique = [];
  const seen = new Set();
  const addUrl = (raw) => {
    const url = String(raw || "").trim();
    if (!url || seen.has(url)) {
      return;
    }
    seen.add(url);
    unique.push(url);
  };

  addUrl(product?.imageUrl);
  collectImageUrls(product?.productImageUrls).forEach(addUrl);
  return unique;
}

function getIncludedGalleryImages(product) {
  return collectImageUrls(product?.includedImageUrls);
}

function setText(el, value) {
  const text = String(value || "").trim();
  if (!el || !text) {
    return;
  }
  el.textContent = text;
}

function setStripeLinkedText(el, value) {
  const text = String(value || "").trim();
  if (!el || !text) {
    return;
  }

  const privacyToken = "[[PRIVACY_LINK]]";
  const securityToken = "[[SECURITY_LINK]]";
  const decoratedText = text
    .replace(
      /Privacy Policy\s*[\u2014-]\s*https:\/\/stripe\.com\/privacy/gi,
      privacyToken
    )
    .replace(
      /Security Overview\s*[\u2014-]\s*https:\/\/stripe\.com\/docs\/security/gi,
      securityToken
    );

  el.replaceChildren();
  const tokenOrUrlMatches = Array.from(
    decoratedText.matchAll(/\[\[PRIVACY_LINK\]\]|\[\[SECURITY_LINK\]\]|https?:\/\/[^\s]+/gi)
  );

  if (tokenOrUrlMatches.length > 0) {
    let cursor = 0;
    tokenOrUrlMatches.forEach((match) => {
      const start = match.index ?? 0;
      const end = start + match[0].length;
      if (start > cursor) {
        el.append(document.createTextNode(decoratedText.slice(cursor, start)));
      }

      const link = document.createElement("a");
      if (match[0] === privacyToken) {
        link.href = "https://stripe.com/privacy";
        link.textContent = "Privacy Policy";
      } else if (match[0] === securityToken) {
        link.href = "https://stripe.com/docs/security";
        link.textContent = "Security Overview";
      } else {
        link.href = match[0];
        link.textContent = match[0];
      }
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.className = "inline-link";
      el.append(link);

      cursor = end;
    });

    if (cursor < decoratedText.length) {
      el.append(document.createTextNode(decoratedText.slice(cursor)));
    }
    return;
  }

  const wordMatch = text.match(/stripe/i);
  if (!wordMatch || typeof wordMatch.index !== "number") {
    el.textContent = text;
    return;
  }

  const start = wordMatch.index;
  const end = start + wordMatch[0].length;
  if (start > 0) {
    el.append(document.createTextNode(text.slice(0, start)));
  }
  const stripeLink = document.createElement("a");
  stripeLink.href = "https://stripe.com";
  stripeLink.target = "_blank";
  stripeLink.rel = "noopener noreferrer";
  stripeLink.className = "inline-link";
  stripeLink.textContent = text.slice(start, end);
  el.append(stripeLink);
  if (end < text.length) {
    el.append(document.createTextNode(text.slice(end)));
  }
}

function setHexVar(name, value) {
  const hex = String(value || "").trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
    return;
  }
  document.documentElement.style.setProperty(name, hex);
}

function applySiteSettings(settings) {
  state.siteSettings = settings || null;
  if (!settings || typeof settings !== "object") {
    return;
  }

  const pageKey = String(document.body?.dataset?.pageKey || "").trim();
  const isShopPage = pageKey === "shop";

  setText(brandNameHeader, settings.brandName);
  setText(brandMarkText, settings.brandMark);
  setText(heroEyebrow, settings.heroEyebrow);
  setText(heroTitle, settings.heroTitle);
  setText(heroCopy, settings.heroCopy);
  if (heroCta) {
    heroCta.href = SHOP_PREMIUM_CTA_HREF;
    setText(heroCta, isShopPage ? SHOP_PREMIUM_CTA_LABEL : settings.heroCtaLabel);
  }
  setText(featuredTitle, settings.featuredTitle);
  setText(featuredCopy, settings.featuredCopy);
  setText(promise1Title, settings.promise1Title);
  setStripeLinkedText(promise1Copy, settings.promise1Copy);
  setText(promise2Title, settings.promise2Title);
  setText(promise2Copy, settings.promise2Copy);
  setText(promise3Title, settings.promise3Title);
  setText(promise3Copy, settings.promise3Copy);
  setText(footerLeft, settings.footerLeft);
  setText(footerRight, settings.footerRight);
  setHexVar("--accent", settings.themeAccent);
  setHexVar("--accent-strong", settings.themeAccentStrong);
  setHexVar("--bg", settings.themeBackground);
  setHexVar("--ink", settings.themeInk);

  const pageTitle = String(settings.pageTitle || "").trim();
  if (pageTitle) {
    document.title = pageTitle;
  }

  const description = String(settings.pageDescription || "").trim();
  if (siteMetaDescription && description) {
    siteMetaDescription.setAttribute("content", description);
  }

  const logoUrl = String(settings.logoImageUrl || "").trim();
  if (brandMarkImage && brandMarkText) {
    if (logoUrl) {
      brandMarkImage.src = logoUrl;
      brandMarkImage.classList.remove("hidden");
      brandMarkText.classList.add("hidden");
    } else {
      brandMarkImage.removeAttribute("src");
      brandMarkImage.classList.add("hidden");
      brandMarkText.classList.remove("hidden");
    }
  }

  const configuredBannerUrl = String(settings.heroBannerImageUrl || "").trim();
  const bannerUrl = isShopPage ? SHOP_HERO_BANNER_FALLBACK : configuredBannerUrl;
  if (heroBannerWrap && heroBannerImage) {
    if (bannerUrl) {
      heroBannerImage.src = bannerUrl;
      heroBannerImage.alt = `${settings.brandName || "Store"} banner`;
      heroBannerWrap.classList.remove("hidden");
    } else {
      heroBannerImage.removeAttribute("src");
      heroBannerImage.alt = "";
      heroBannerWrap.classList.add("hidden");
    }
  }

  if (state.products.length > 0) {
    renderProducts();
    updateCartUi();
  }
}

function saveCart() {
  const serializable = Array.from(state.cart.values());
  window.localStorage.setItem(CART_KEY, JSON.stringify(serializable));
}

function loadCart() {
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    if (!raw) {
      return;
    }
    const items = JSON.parse(raw);
    if (!Array.isArray(items)) {
      return;
    }
    for (const item of items) {
      if (item && item.id && Number.isFinite(item.quantity)) {
        state.cart.set(item.id, {
          id: item.id,
          quantity: Math.max(1, Math.min(10, Number(item.quantity)))
        });
      }
    }
  } catch {
    window.localStorage.removeItem(CART_KEY);
  }
}

function getCartRows() {
  return Array.from(state.cart.values())
    .map((cartItem) => {
      const product = state.products.find((entry) => entry.id === cartItem.id);
      if (!isOrderable(product)) {
        return null;
      }
      return {
        ...product,
        quantity: cartItem.quantity
      };
    })
    .filter(Boolean);
}

function getSubtotal() {
  return getCartRows().reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
}

function calculateShippableWeightLbs(shippableUnits) {
  const config = getShippingConfig();
  const units = Math.max(0, Number(shippableUnits) || 0);
  if (units <= 0) {
    return 0;
  }
  const baseWeight = Number(config.baseWeightLbs) > 0 ? Number(config.baseWeightLbs) : DEFAULT_SHIPPING_CONFIG.baseWeightLbs;
  const additionalWeight =
    Number(config.additionalWeightPerUnitLbs) > 0
      ? Number(config.additionalWeightPerUnitLbs)
      : DEFAULT_SHIPPING_CONFIG.additionalWeightPerUnitLbs;
  const calculated = baseWeight + Math.max(0, units - 1) * additionalWeight;
  return Number(calculated.toFixed(2));
}

function getBillableShippingWeightLbs(actualWeightLbs) {
  const config = getShippingConfig();
  const baseWeight = Number(config.baseWeightLbs) > 0 ? Number(config.baseWeightLbs) : DEFAULT_SHIPPING_CONFIG.baseWeightLbs;
  const weight = Math.max(0, Number(actualWeightLbs) || 0);
  if (weight <= 0) {
    return 0;
  }
  if (weight <= baseWeight) {
    return Number(baseWeight.toFixed(2));
  }
  return Math.ceil(weight);
}

function getShippingZoneMultiplier(zoneNumber) {
  const config = getShippingConfig();
  const defaultZone = normalizeShippingZone(config.defaultZone, DEFAULT_SHIPPING_CONFIG.defaultZone);
  const zone = normalizeShippingZone(zoneNumber, defaultZone);
  const multiplier = Number(config.zoneScale?.[zone]);
  if (Number.isFinite(multiplier) && multiplier > 0) {
    return multiplier;
  }
  return 1;
}

function getShippingZoneForState(stateCode) {
  const config = getShippingConfig();
  const normalizedState = String(stateCode || "")
    .trim()
    .toUpperCase();
  const defaultZone = normalizeShippingZone(config.defaultZone, DEFAULT_SHIPPING_CONFIG.defaultZone);
  if (!normalizedState) {
    return defaultZone;
  }
  const fromState = String(config.fromState || "")
    .trim()
    .toUpperCase();
  if (fromState && normalizedState === fromState) {
    return 1;
  }
  const mappedZone = normalizeShippingZone(config.stateZoneMap?.[normalizedState], 0);
  return mappedZone > 0 ? mappedZone : defaultZone;
}

function getUspsGroundAdvantageRetailBaseCents(weightLbs) {
  const config = getShippingConfig();
  const points = Array.isArray(config.ratePoints) ? config.ratePoints : [];
  const normalizedPoints = points
    .map((point) => ({
      weightLbs: Number(point?.weightLbs),
      cents: Number(point?.cents)
    }))
    .filter((point) => Number.isFinite(point.weightLbs) && point.weightLbs > 0 && Number.isFinite(point.cents) && point.cents > 0)
    .sort((left, right) => left.weightLbs - right.weightLbs);
  if (normalizedPoints.length === 0) {
    return 0;
  }
  const billableWeight = getBillableShippingWeightLbs(weightLbs);
  if (billableWeight <= 0) {
    return 0;
  }
  if (billableWeight <= normalizedPoints[0].weightLbs) {
    return normalizedPoints[0].cents;
  }

  for (let index = 1; index < normalizedPoints.length; index += 1) {
    const previous = normalizedPoints[index - 1];
    const next = normalizedPoints[index];
    if (billableWeight <= next.weightLbs) {
      if (Math.abs(billableWeight - next.weightLbs) < 0.0001) {
        return next.cents;
      }
      const span = Math.max(0.1, next.weightLbs - previous.weightLbs);
      const ratio = (billableWeight - previous.weightLbs) / span;
      return Math.round(previous.cents + ratio * (next.cents - previous.cents));
    }
  }

  if (normalizedPoints.length === 1) {
    return normalizedPoints[0].cents;
  }

  const last = normalizedPoints[normalizedPoints.length - 1];
  const prior = normalizedPoints[normalizedPoints.length - 2];
  const span = Math.max(0.1, last.weightLbs - prior.weightLbs);
  const slope = Math.max(1, (last.cents - prior.cents) / span);
  const overweightLbs = billableWeight - last.weightLbs;
  return Math.round(last.cents + overweightLbs * slope);
}

function getUspsGroundAdvantageRetailCents(weightLbs, zoneNumber) {
  const config = getShippingConfig();
  const baseCents = getUspsGroundAdvantageRetailBaseCents(weightLbs);
  if (baseCents <= 0) {
    return 0;
  }
  const zoneMultiplier = getShippingZoneMultiplier(zoneNumber);
  const zoneAdjustedCents = Math.max(0, Math.round(baseCents * zoneMultiplier));
  const minimumCents = Math.max(0, Number.parseInt(String(config.minimumCents ?? 0), 10) || 0);
  if (minimumCents > 0) {
    return Math.max(minimumCents, zoneAdjustedCents);
  }
  return zoneAdjustedCents;
}

function getDisplayedStartingShippingCents() {
  const config = getShippingConfig();
  const defaultZone = normalizeShippingZone(config.defaultZone, DEFAULT_SHIPPING_CONFIG.defaultZone);
  const firstUnitWeight = calculateShippableWeightLbs(1);
  return getUspsGroundAdvantageRetailCents(firstUnitWeight, defaultZone);
}

function getShippableUnits() {
  return getCartRows().reduce((sum, item) => {
    if (!isShippingEnabled(item)) {
      return sum;
    }
    return sum + item.quantity;
  }, 0);
}

function getShippingTotal() {
  const shippableUnits = getShippableUnits();
  if (shippableUnits <= 0) {
    return 0;
  }
  const totalWeightLbs = calculateShippableWeightLbs(shippableUnits);
  const shippingZone = getShippingZoneForState(getCustomerState());
  return getUspsGroundAdvantageRetailCents(totalWeightLbs, shippingZone);
}

function getOrderTotal() {
  return getSubtotal() + getShippingTotal();
}

function setCheckoutMessage(message, isError = false) {
  checkoutMessage.textContent = message || "";
  checkoutMessage.classList.toggle("error", Boolean(isError));
}

function updateCartUi() {
  const rows = getCartRows();
  const itemCount = rows.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = getSubtotal();
  const shippingTotal = getShippingTotal();
  cartCount.textContent = String(itemCount);
  if (cartSubtotal) {
    cartSubtotal.textContent = formatMoney(subtotal);
  }
  if (cartShipping) {
    cartShipping.textContent = formatMoney(shippingTotal);
  }
  if (cartTotal) {
    cartTotal.textContent = formatMoney(subtotal + shippingTotal);
  }
  checkoutBtn.disabled = rows.length === 0 || state.checkingOut;

  if (rows.length === 0) {
    cartItems.innerHTML = `<p class="cart-item-sub">Your cart is empty.</p>`;
    return;
  }

  cartItems.innerHTML = rows
    .map(
      (item) => `<article class="cart-item">
          <div class="row-between">
            <div class="cart-item-title">${item.title}</div>
            <strong>${formatMoney(item.priceCents * item.quantity)}</strong>
          </div>
          <div class="cart-item-sub">${item.subtitle}</div>
          <div class="qty-controls">
            <button class="qty-btn" type="button" data-action="decrease" data-id="${item.id}">-</button>
            <span>${item.quantity}</span>
            <button class="qty-btn" type="button" data-action="increase" data-id="${item.id}">+</button>
            <button class="remove-link" type="button" data-action="remove" data-id="${item.id}">Remove</button>
          </div>
        </article>`
    )
    .join("");
}

function renderProducts() {
  if (state.products.length === 0) {
    productsGrid.innerHTML = `<p>No books are configured yet.</p>`;
    return;
  }

  const filteredProducts = getFilteredProducts();
  if (filteredProducts.length === 0) {
    productsGrid.innerHTML = `<p>No products match this filter yet.</p>`;
    return;
  }

  productsGrid.innerHTML = filteredProducts
    .map((product, index) => {
      const preorderOpen = isComingSoon(product) && isPreorderEnabled(product);
      const orderable = isOrderable(product);
      const galleryImages = getProductGalleryImages(product);
      const primaryImage = galleryImages[0] || product.imageUrl;
      const productGalleryHtml =
        galleryImages.length > 1
          ? `<div class="product-gallery">
              ${galleryImages
                .slice(1)
                .map(
                  (imageUrl, imageIndex) =>
                    `<img class="product-thumb" src="${imageUrl}" alt="${product.title} gallery image ${imageIndex + 2}" loading="lazy" />`
                )
                .join("")}
            </div>`
          : "";

      const includedImages = getIncludedGalleryImages(product);
      const includedGalleryHtml =
        includedImages.length > 0
          ? `<div class="included-gallery">
              ${includedImages
                .map(
                  (imageUrl, imageIndex) =>
                    `<img class="included-image" src="${imageUrl}" alt="${product.title} included item ${imageIndex + 1}" loading="lazy" />`
                )
                .join("")}
            </div>`
          : "";

      return `<article class="product-card" style="animation-delay:${index * 60}ms">
          <img class="product-cover" src="${primaryImage}" alt="${product.title} cover" loading="lazy" />
          ${productGalleryHtml}
          <div class="product-body">
            <div>
              <h3 class="product-title">${product.title}</h3>
              <p class="product-subtitle">${product.subtitle}</p>
              ${
                isShippingEnabled(product)
                  ? `<p class="product-stock">USPS Ground Advantage shipping (zone-based, from ${formatMoney(getDisplayedStartingShippingCents())})</p>`
                  : ""
              }
              ${
                isComingSoon(product)
                  ? preorderOpen
                    ? '<p class="product-stock">Coming soon preview - preorder is open</p>'
                    : '<p class="product-stock sold-out-text">Coming soon</p>'
                  : ""
              }
              ${product.inStock === false ? '<p class="product-stock sold-out-text">Currently sold out</p>' : ""}
            </div>
            <details class="included-tab">
              <summary>What's Included</summary>
              <p>${product.included || "No extras listed for this title yet."}</p>
              ${includedGalleryHtml}
            </details>
            <div class="product-row">
              <span class="price">${formatMoney(product.priceCents)}</span>
              <button
                class="primary-btn ${orderable ? "" : "sold-out-btn"}"
                type="button"
                data-action="add"
                data-id="${product.id}"
                ${orderable ? "" : "disabled"}
              >
                ${
                  preorderOpen
                    ? "Preorder"
                    : isComingSoon(product)
                      ? "Coming Soon"
                      : product.inStock === false
                        ? "Sold Out"
                        : "Add to cart"
                }
              </button>
            </div>
          </div>
        </article>`;
    })
    .join("");
}

function openCart() {
  cartPanel.classList.add("open");
  cartPanel.setAttribute("aria-hidden", "false");
}

function closeCart() {
  cartPanel.classList.remove("open");
  cartPanel.setAttribute("aria-hidden", "true");
}

function addToCart(productId) {
  const product = state.products.find((entry) => entry.id === productId);
  if (!isOrderable(product)) {
    return;
  }

  const current = state.cart.get(productId);
  if (!current) {
    state.cart.set(productId, { id: productId, quantity: 1 });
  } else {
    current.quantity = Math.min(10, current.quantity + 1);
    state.cart.set(productId, current);
  }
  saveCart();
  updateCartUi();
  openCart();
}

function adjustQuantity(productId, delta) {
  const item = state.cart.get(productId);
  if (!item) {
    return;
  }
  item.quantity = Math.max(1, Math.min(10, item.quantity + delta));
  state.cart.set(productId, item);
  saveCart();
  updateCartUi();
}

function removeFromCart(productId) {
  state.cart.delete(productId);
  saveCart();
  updateCartUi();
}

function sanitizeCartAgainstCatalog() {
  let changed = false;
  Array.from(state.cart.keys()).forEach((productId) => {
    const product = state.products.find((entry) => entry.id === productId);
    if (!isOrderable(product)) {
      state.cart.delete(productId);
      changed = true;
    }
  });
  if (changed) {
    saveCart();
  }
}

function readPreorderTargetId() {
  const params = new URLSearchParams(window.location.search);
  const raw = String(params.get("preorder") || "").trim();
  return raw;
}

function clearPreorderTargetId() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("preorder")) {
    return;
  }
  url.searchParams.delete("preorder");
  const nextSearch = url.searchParams.toString();
  const nextUrl = `${url.pathname}${nextSearch ? `?${nextSearch}` : ""}${url.hash}`;
  window.history.replaceState({}, "", nextUrl);
}

function applyPreorderDeepLink() {
  const preorderId = readPreorderTargetId();
  if (!preorderId) {
    return;
  }

  const product = state.products.find((entry) => entry.id === preorderId);
  if (!product) {
    setCheckoutMessage("Preorder title not found.");
    clearPreorderTargetId();
    return;
  }

  if (!isOrderable(product)) {
    setCheckoutMessage(`${product.title} is not available for preorder yet.`, true);
    clearPreorderTargetId();
    return;
  }

  const current = state.cart.get(preorderId);
  if (!current) {
    state.cart.set(preorderId, { id: preorderId, quantity: 1 });
    saveCart();
    updateCartUi();
  }

  openCart();
  setCheckoutMessage(`${product.title} added to cart for preorder.`);
  clearPreorderTargetId();
}

async function loadProducts() {
  const response = await fetch("/api/products");
  if (!response.ok) {
    throw new Error("Could not load products");
  }
  state.products = await response.json();
  sanitizeCartAgainstCatalog();
  renderProducts();
  updateCartUi();
  applyPreorderDeepLink();
}

async function loadSiteSettings() {
  const response = await fetch("/api/site-settings");
  if (!response.ok) {
    throw new Error("Could not load site settings");
  }
  const settings = await response.json();
  applySiteSettings(settings);
}

async function checkout() {
  if (state.checkingOut) {
    return;
  }

  const memberToken = readMemberToken();
  if (!memberToken) {
    setCheckoutMessage("Create a free account or sign in before checkout.", true);
    window.setTimeout(() => {
      window.location.assign("/signup.html");
    }, 450);
    return;
  }

  const customerState = getCustomerState();
  if (!customerState) {
    setCheckoutMessage("Select your state before checkout.", true);
    stateGate?.open();
    return;
  }

  const cart = getCartRows().map((item) => ({ id: item.id, quantity: item.quantity }));
  if (cart.length === 0) {
    setCheckoutMessage("Add at least one book to continue.", true);
    return;
  }

  state.checkingOut = true;
  checkoutBtn.disabled = true;
  setCheckoutMessage("Redirecting to secure checkout...");

  try {
    const response = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${memberToken}`
      },
      body: JSON.stringify({ cart, customerState })
    });

    const payload = await response.json();
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        setCheckoutMessage("Sign in required before checkout.", true);
        state.checkingOut = false;
        updateCartUi();
        window.setTimeout(() => {
          window.location.assign("/login.html");
        }, 450);
        return;
      }
      throw new Error(payload.error || "Checkout failed");
    }
    if (!payload.url) {
      throw new Error("Checkout URL missing");
    }

    window.location.href = payload.url;
  } catch (error) {
    setCheckoutMessage(error.message || "Could not start checkout.", true);
    state.checkingOut = false;
    updateCartUi();
  }
}

productsGrid.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action='add']");
  if (!button) {
    return;
  }
  addToCart(button.dataset.id);
});

cartItems.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }

  const { action, id } = button.dataset;
  if (!id) {
    return;
  }

  if (action === "increase") {
    adjustQuantity(id, 1);
  } else if (action === "decrease") {
    adjustQuantity(id, -1);
  } else if (action === "remove") {
    removeFromCart(id);
  }
});

openCartBtn.addEventListener("click", openCart);
closeCartBtn.addEventListener("click", closeCart);
checkoutBtn.addEventListener("click", checkout);

cartPanel.addEventListener("click", (event) => {
  if (event.target === cartPanel) {
    closeCart();
  }
});

storeFilterTabs.forEach((button) => {
  button.addEventListener("click", () => {
    state.activeStoreFilter = normalizeStoreFilterValue(button.dataset.storeFilter);
    updateStoreFilterUi();
    renderProducts();
  });
});

storeSearchInput?.addEventListener("input", () => {
  state.searchQuery = String(storeSearchInput.value || "");
  renderProducts();
});

updateStoreFilterUi();

loadCart();
stateGate = setupStateGate({
  onStateChange: () => {
    setCheckoutMessage("");
    updateCartUi();
  }
});
loadSiteSettings().catch(() => {});
loadProducts().catch(() => {
  productsGrid.innerHTML = `<p>Could not load books. Refresh and try again.</p>`;
});

