const loginCard = document.getElementById("pos-login-card");
const posPanel = document.getElementById("pos-panel");
const loginForm = document.getElementById("pos-login-form");
const passwordInput = document.getElementById("pos-admin-password");
const loginMessageEl = document.getElementById("pos-login-message");
const logoutBtn = document.getElementById("pos-logout-btn");
const refreshBtn = document.getElementById("pos-refresh-btn");
const posMessageEl = document.getElementById("pos-page-message");
const productsEl = document.getElementById("pos-products");
const searchInput = document.getElementById("pos-search");
const stateSelect = document.getElementById("pos-customer-state");
const needsShippingInput = document.getElementById("pos-needs-shipping");
const hintEl = document.getElementById("pos-hint");
const shippingFieldsEl = document.getElementById("pos-shipping-fields");
const shippingNameInput = document.getElementById("pos-shipping-name");
const shippingEmailInput = document.getElementById("pos-shipping-email");
const shippingPhoneInput = document.getElementById("pos-shipping-phone");
const shippingLine1Input = document.getElementById("pos-shipping-line1");
const shippingLine2Input = document.getElementById("pos-shipping-line2");
const shippingCityInput = document.getElementById("pos-shipping-city");
const shippingPostalInput = document.getElementById("pos-shipping-postal");
const cartItemsEl = document.getElementById("pos-cart-items");
const itemsSubtotalEl = document.getElementById("pos-items-subtotal");
const shippingTotalEl = document.getElementById("pos-shipping-total");
const taxTotalEl = document.getElementById("pos-tax-total");
const grandTotalEl = document.getElementById("pos-grand-total");
const summaryNoteEl = document.getElementById("pos-summary-note");
const checkoutBtn = document.getElementById("pos-checkout-btn");
const cashBtn = document.getElementById("pos-cash-btn");
const clearBtn = document.getElementById("pos-clear-btn");
const newSaleBtn = document.getElementById("pos-new-sale-btn");
const printBtn = document.getElementById("pos-print-btn");
const receiptEl = document.getElementById("pos-receipt");

const ADMIN_KEY = "publishearts_admin_password_v1";
const POS_DRAFT_KEY = "publishearts_pos_draft_v1";
const DEFAULT_POS_STATE = "NY";
const shippingInputs = [
  shippingNameInput,
  shippingEmailInput,
  shippingPhoneInput,
  shippingLine1Input,
  shippingLine2Input,
  shippingCityInput,
  shippingPostalInput
].filter(Boolean);
const US_STATE_OPTIONS = [
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

const state = {
  adminPassword: window.localStorage.getItem(ADMIN_KEY) || "",
  products: [],
  siteSettings: null,
  health: null,
  cart: new Map(),
  busy: false,
  receiptOrder: null
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

function setPosMessage(message, isError = false) {
  setMessage(posMessageEl, message, isError);
}

function canRecordCashSale() {
  return state.health?.taxMode !== "stripe_automatic";
}

function syncActionButtons() {
  checkoutBtn.disabled = state.busy;
  if (cashBtn) {
    cashBtn.disabled = state.busy || !canRecordCashSale();
  }
  clearBtn.disabled = state.busy;
  newSaleBtn.disabled = state.busy;
  refreshBtn.disabled = state.busy;
}

function setBusy(isBusy) {
  state.busy = isBusy;
  syncActionButtons();
  searchInput.disabled = isBusy;
  stateSelect.disabled = isBusy;
  needsShippingInput.disabled = isBusy;
  shippingInputs.forEach((input) => {
    input.disabled = isBusy;
  });
  productsEl.querySelectorAll("button[data-pos-action]").forEach((button) => {
    button.disabled = isBusy;
  });
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatMoney(amountCents = 0) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format((Number(amountCents) || 0) / 100);
}

function parseMoneyToCents(value) {
  const normalized = String(value || "")
    .trim()
    .replace(/[$,\s]/g, "");
  if (!normalized) {
    return null;
  }
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return Number.NaN;
  }
  return Math.round(Number.parseFloat(normalized) * 100);
}

function formatPaymentMethodLabel(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "cash") {
    return "Cash";
  }
  if (normalized === "card") {
    return "Card";
  }
  if (normalized) {
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }
  return "Card";
}

function formatIsoDateTime(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return "Unknown";
  }
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatAddress(address) {
  if (!address || typeof address !== "object") {
    return "Not provided";
  }
  return [address.line1, address.line2, address.city, address.state, address.postal_code, address.country]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(", ");
}

function normalizeImageUrl(value) {
  return String(value || "").trim();
}

function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return response.text().then((text) => ({ error: text || "Request failed." }));
}

async function adminRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      "x-admin-password": state.adminPassword
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

function showLogin() {
  loginCard.classList.remove("hidden");
  posPanel.classList.add("hidden");
  logoutBtn.classList.add("hidden");
}

function showPanel() {
  loginCard.classList.add("hidden");
  posPanel.classList.remove("hidden");
  logoutBtn.classList.remove("hidden");
}

function populateStateOptions() {
  stateSelect.innerHTML = [
    '<option value="">Select a state</option>',
    ...US_STATE_OPTIONS.map((stateCode) => `<option value="${stateCode}">${stateCode}</option>`)
  ].join("");
}

function looksLikeEmail(value) {
  const text = String(value || "").trim();
  if (!text) {
    return true;
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
}

function getShippingFormData() {
  return {
    name: String(shippingNameInput?.value || "").trim(),
    email: String(shippingEmailInput?.value || "").trim(),
    phone: String(shippingPhoneInput?.value || "").trim(),
    line1: String(shippingLine1Input?.value || "").trim(),
    line2: String(shippingLine2Input?.value || "").trim(),
    city: String(shippingCityInput?.value || "").trim(),
    state: String(stateSelect?.value || "").trim().toUpperCase(),
    postalCode: String(shippingPostalInput?.value || "")
      .trim()
      .toUpperCase(),
    country: "US"
  };
}

function setShippingFormData(data = {}) {
  if (shippingNameInput) {
    shippingNameInput.value = String(data?.name || "").trim();
  }
  if (shippingEmailInput) {
    shippingEmailInput.value = String(data?.email || "").trim();
  }
  if (shippingPhoneInput) {
    shippingPhoneInput.value = String(data?.phone || "").trim();
  }
  if (shippingLine1Input) {
    shippingLine1Input.value = String(data?.line1 || "").trim();
  }
  if (shippingLine2Input) {
    shippingLine2Input.value = String(data?.line2 || "").trim();
  }
  if (shippingCityInput) {
    shippingCityInput.value = String(data?.city || "").trim();
  }
  if (shippingPostalInput) {
    shippingPostalInput.value = String(data?.postalCode || data?.postal_code || "")
      .trim()
      .toUpperCase();
  }
}

function clearShippingForm() {
  setShippingFormData({});
}

function syncShippingFieldsVisibility() {
  if (!shippingFieldsEl) {
    return;
  }
  shippingFieldsEl.classList.toggle("hidden", !needsShippingInput.checked);
}

function validateShippingForm() {
  if (!needsShippingInput.checked) {
    return null;
  }
  const shippingInfo = getShippingFormData();
  if (!shippingInfo.name || !shippingInfo.line1 || !shippingInfo.city || !shippingInfo.state || !shippingInfo.postalCode) {
    throw new Error("Enter name, address line 1, city, state, and ZIP for shipped POS orders.");
  }
  if (!looksLikeEmail(shippingInfo.email)) {
    throw new Error("Enter a valid email address or leave the email field blank.");
  }
  return shippingInfo;
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
  return Number((baseWeight + Math.max(0, units - 1) * additionalWeight).toFixed(2));
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
  return Math.round(last.cents + (billableWeight - last.weightLbs) * slope);
}

function getUspsGroundAdvantageRetailCents(weightLbs, zoneNumber) {
  const config = getShippingConfig();
  const baseCents = getUspsGroundAdvantageRetailBaseCents(weightLbs);
  if (baseCents <= 0) {
    return 0;
  }
  const zoneAdjustedCents = Math.max(0, Math.round(baseCents * getShippingZoneMultiplier(zoneNumber)));
  const minimumCents = Math.max(0, Number.parseInt(String(config.minimumCents ?? 0), 10) || 0);
  if (minimumCents > 0) {
    return Math.max(minimumCents, zoneAdjustedCents);
  }
  return zoneAdjustedCents;
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

function isProductAvailable(product) {
  if (!product || product.inStock === false) {
    return false;
  }
  if (product.isComingSoon === true && product.allowPreorder !== true) {
    return false;
  }
  return true;
}

function getDefaultState() {
  const fromState = String(state.siteSettings?.shippingEstimate?.fromState || "")
    .trim()
    .toUpperCase();
  if (US_STATE_OPTIONS.includes(fromState)) {
    return fromState;
  }
  return DEFAULT_POS_STATE;
}

function loadDraft() {
  try {
    const raw = window.sessionStorage.getItem(POS_DRAFT_KEY);
    if (!raw) {
      return;
    }
    const draft = JSON.parse(raw);
    const entries = Array.isArray(draft?.cart) ? draft.cart : [];
    state.cart = new Map();
    entries.forEach((entry) => {
      const id = String(entry?.id || "").trim();
      const quantity = Math.max(1, Math.min(10, Number(entry?.quantity) || 1));
      if (id) {
        state.cart.set(id, { id, quantity });
      }
    });
    if (US_STATE_OPTIONS.includes(String(draft?.customerState || "").trim().toUpperCase())) {
      stateSelect.value = String(draft.customerState).trim().toUpperCase();
    }
    needsShippingInput.checked = draft?.needsShipping === true;
    setShippingFormData(draft?.shippingInfo || {});
  } catch {
    window.sessionStorage.removeItem(POS_DRAFT_KEY);
  }
}

function saveDraft() {
  const cart = Array.from(state.cart.values()).map((entry) => ({
    id: entry.id,
    quantity: entry.quantity
  }));
  window.sessionStorage.setItem(
    POS_DRAFT_KEY,
      JSON.stringify({
        cart,
        customerState: stateSelect.value,
        needsShipping: needsShippingInput.checked,
        shippingInfo: getShippingFormData()
      })
  );
}

function clearDraft() {
  state.cart = new Map();
  stateSelect.value = getDefaultState();
  needsShippingInput.checked = false;
  clearShippingForm();
  syncShippingFieldsVisibility();
  window.sessionStorage.removeItem(POS_DRAFT_KEY);
}

function resetSaleAfterSuccess() {
  window.sessionStorage.removeItem(POS_DRAFT_KEY);
  state.cart = new Map();
  needsShippingInput.checked = false;
  stateSelect.value = getDefaultState();
  clearShippingForm();
  syncShippingFieldsVisibility();
  renderAll();
}

function getFilteredProducts() {
  const query = String(searchInput.value || "").trim().toLowerCase();
  return state.products.filter((product) => {
    if (!isProductAvailable(product)) {
      return false;
    }
    if (!query) {
      return true;
    }
    return [product.title, product.subtitle, product.id]
      .map((value) => String(value || "").toLowerCase())
      .join(" ")
      .includes(query);
  });
}

function getCartRows() {
  return Array.from(state.cart.values())
    .map((entry) => {
      const product = state.products.find((item) => item.id === entry.id);
      if (!isProductAvailable(product)) {
        return null;
      }
      return {
        ...product,
        quantity: Math.max(1, Math.min(10, Number(entry.quantity) || 1))
      };
    })
    .filter(Boolean);
}

function getSubtotalCents() {
  return getCartRows().reduce((sum, item) => sum + (Number(item.priceCents) || 0) * item.quantity, 0);
}

function getShippableUnits() {
  if (!needsShippingInput.checked) {
    return 0;
  }
  return getCartRows().reduce((sum, item) => {
    if (!isShippingEnabled(item)) {
      return sum;
    }
    return sum + item.quantity;
  }, 0);
}

function getShippingEstimateCents() {
  const shippableUnits = getShippableUnits();
  if (shippableUnits <= 0) {
    return 0;
  }
  const weightLbs = calculateShippableWeightLbs(shippableUnits);
  const zone = getShippingZoneForState(stateSelect.value || getDefaultState());
  return getUspsGroundAdvantageRetailCents(weightLbs, zone);
}

function getManualTaxEstimateCents(subtotalCents, shippingCents) {
  if (!state.health || state.health.taxMode !== "manual") {
    return 0;
  }
  const selectedState = String(stateSelect.value || "").trim().toUpperCase();
  const nonTaxStates = Array.isArray(state.health.manualNonTaxStates) ? state.health.manualNonTaxStates : [];
  if (nonTaxStates.includes(selectedState)) {
    return 0;
  }
  const ratePercent = Number(state.health.manualSalesTaxRatePercent) || 0;
  if (ratePercent <= 0) {
    return 0;
  }
  const base = subtotalCents + (state.health.manualSalesTaxApplyToShipping ? shippingCents : 0);
  return Math.max(0, Math.round(base * (ratePercent / 100)));
}

function getSummaryTotals() {
  const subtotalCents = getSubtotalCents();
  const shippingCents = getShippingEstimateCents();
  const taxMode = state.health?.taxMode || "off";
  const manualTaxCents = getManualTaxEstimateCents(subtotalCents, shippingCents);
  const exactTotal = taxMode !== "stripe_automatic";

  return {
    taxMode,
    subtotalCents,
    shippingCents,
    taxCents: exactTotal ? manualTaxCents : null,
    amountTotalCents: exactTotal ? subtotalCents + shippingCents + manualTaxCents : null
  };
}

function renderCatalog() {
  const products = getFilteredProducts();
  if (products.length === 0) {
    productsEl.innerHTML = '<p class="cart-item-sub">No sellable titles match that search.</p>';
    return;
  }

  productsEl.innerHTML = products
    .map((product) => {
      const quantity = Math.max(0, Number(state.cart.get(product.id)?.quantity) || 0);
      const isHidden = product.isVisible === false;
      const imageUrl = normalizeImageUrl(product.imageUrl);
      return `<article class="pos-product-card">
        <div class="pos-product-media">
          ${
            imageUrl
              ? `<img class="pos-product-image" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(product.title)} cover" />`
              : `<div class="pos-product-image pos-product-fallback">${escapeHtml(product.title.slice(0, 1) || "B")}</div>`
          }
        </div>
        <div class="pos-product-body">
          <div class="row-between">
            <h3>${escapeHtml(product.title)}</h3>
            <strong>${formatMoney(product.priceCents)}</strong>
          </div>
          <p>${escapeHtml(product.subtitle || "No description.")}</p>
          <div class="admin-badges">
            ${isHidden ? '<span class="admin-stock-badge sold-out">Hidden Online</span>' : ""}
            ${product.allowPreorder === true && product.isComingSoon === true ? '<span class="admin-stock-badge in-stock">Preorder</span>' : ""}
            ${
              isShippingEnabled(product)
                ? '<span class="admin-stock-badge in-stock">Shippable</span>'
                : '<span class="admin-stock-badge sold-out">No Shipping Line</span>'
            }
          </div>
          <div class="qty-controls pos-qty-controls">
            <button class="qty-btn" type="button" data-pos-action="decrease" data-id="${escapeHtml(product.id)}">-</button>
            <span>${quantity}</span>
            <button class="qty-btn" type="button" data-pos-action="increase" data-id="${escapeHtml(product.id)}">+</button>
          </div>
        </div>
      </article>`;
    })
    .join("");
}

function renderCart() {
  const rows = getCartRows();
  if (rows.length === 0) {
    cartItemsEl.innerHTML = '<p class="cart-item-sub">No books in this sale yet.</p>';
    return;
  }

  cartItemsEl.innerHTML = rows
    .map((item) => `<article class="pos-cart-row">
      <div>
        <strong>${escapeHtml(item.title)}</strong>
        <p>${escapeHtml(item.subtitle || "Book sale")}</p>
      </div>
      <div class="pos-cart-row-side">
        <div class="qty-controls">
          <button class="qty-btn" type="button" data-pos-action="decrease" data-id="${escapeHtml(item.id)}">-</button>
          <span>${item.quantity}</span>
          <button class="qty-btn" type="button" data-pos-action="increase" data-id="${escapeHtml(item.id)}">+</button>
        </div>
        <strong>${formatMoney((Number(item.priceCents) || 0) * item.quantity)}</strong>
      </div>
    </article>`)
    .join("");
}

function syncHintCopy() {
  syncShippingFieldsVisibility();
  hintEl.textContent = needsShippingInput.checked
    ? "Enter the shipping details below. The shipping estimate uses the selected ship-to state and the order enters fulfillment."
    : "For in-person handoff, leave shipping off. The sale still counts toward sold copies but skips the shipping queue.";
}

function renderSummary() {
  const summary = getSummaryTotals();
  const estimatedBaseTotal = summary.subtotalCents + summary.shippingCents;

  itemsSubtotalEl.textContent = formatMoney(summary.subtotalCents);
  shippingTotalEl.textContent = formatMoney(summary.shippingCents);

  if (!state.health || summary.taxMode === "stripe_automatic") {
    taxTotalEl.textContent = "Calculated by Stripe";
    grandTotalEl.textContent = `${formatMoney(estimatedBaseTotal)} + tax`;
    summaryNoteEl.textContent = needsShippingInput.checked
      ? "Shipping is estimated here. Stripe calculates the final tax at checkout, so cash checkout stays disabled."
      : "No shipping line will be added. Stripe calculates the final tax at checkout, so cash checkout stays disabled.";
  } else if (summary.taxMode === "manual") {
    taxTotalEl.textContent = formatMoney(summary.taxCents);
    grandTotalEl.textContent = formatMoney(summary.amountTotalCents);
    summaryNoteEl.textContent = `Manual tax mode is active (${Number(state.health.manualSalesTaxRatePercent || 0).toFixed(
      2
    )}%). Cash sales use this exact total.`;
  } else {
    taxTotalEl.textContent = formatMoney(0);
    grandTotalEl.textContent = formatMoney(summary.amountTotalCents ?? estimatedBaseTotal);
    summaryNoteEl.textContent = "Tax is off for this local estimate. Cash sales use the exact total shown here.";
  }
}

function renderReceipt(order) {
  state.receiptOrder = order || null;
  printBtn.disabled = !state.receiptOrder;
  if (!state.receiptOrder) {
    receiptEl.innerHTML = '<p class="cart-item-sub">Complete a POS transaction to load a printable receipt here.</p>';
    return;
  }

  const lineItems = Array.isArray(order.lineItems) ? order.lineItems : [];
  const productLines = lineItems.filter((item) => {
    const name = String(item?.name || "").trim().toLowerCase();
    return name !== "shipping" && name !== "sales tax" && name !== "tax";
  });
  const brandName = String(state.siteSettings?.brandName || "PublisHearts").trim() || "PublisHearts";
  const customerName =
    String(order.customerName || order.shippingDetails?.name || "Customer").trim() || "Customer";
  const shippingAddress = order.shippingRequired === false ? "No shipping required" : formatAddress(order.shippingDetails?.address);
  const paymentMethodLabel = formatPaymentMethodLabel(order.paymentMethod);
  const cashReceivedCents = Number(order.cashReceivedCents);
  const cashChangeDueCents = Number(order.cashChangeDueCents);

  receiptEl.innerHTML = `
    <div class="pos-receipt-brand">
      <p>${escapeHtml(brandName)}</p>
      <h3>Merchant Receipt</h3>
    </div>
    <div class="pos-receipt-meta">
      <p><strong>Order:</strong> ${escapeHtml(order.id || "Unknown")}</p>
      <p><strong>Date:</strong> ${escapeHtml(formatIsoDateTime(order.createdAtIso))}</p>
      <p><strong>Customer:</strong> ${escapeHtml(customerName)}</p>
      <p><strong>Email:</strong> ${escapeHtml(order.customerEmail || "Not provided")}</p>
      <p><strong>Payment:</strong> ${escapeHtml(paymentMethodLabel)}</p>
      ${
        Number.isFinite(cashReceivedCents) && cashReceivedCents > 0
          ? `<p><strong>Cash Received:</strong> ${escapeHtml(formatMoney(cashReceivedCents))}</p>`
          : ""
      }
      ${
        Number.isFinite(cashChangeDueCents) && cashChangeDueCents > 0
          ? `<p><strong>Change Due:</strong> ${escapeHtml(formatMoney(cashChangeDueCents))}</p>`
          : ""
      }
      <p><strong>Fulfillment:</strong> ${order.shippingRequired === false ? "In-person / no shipping" : "Ship this order"}</p>
      <p><strong>Ship To:</strong> ${escapeHtml(shippingAddress)}</p>
    </div>
    <div class="order-panel">
      <h4>Items</h4>
      <ul class="order-list">
        ${
          productLines.length > 0
            ? productLines
                .map(
                  (item) =>
                    `<li><span>${escapeHtml(item.name)} x${escapeHtml(item.quantity)}</span><strong>${formatMoney(item.amountTotal)}</strong></li>`
                )
                .join("")
            : '<li><span>No product lines captured.</span><strong>-</strong></li>'
        }
      </ul>
    </div>
    <div class="order-panel">
      <h4>Totals</h4>
      <ul class="order-list">
        <li><span>Items</span><strong>${formatMoney(order.amountSubtotal)}</strong></li>
        <li><span>Shipping</span><strong>${formatMoney(order.amountShipping)}</strong></li>
        <li><span>Tax</span><strong>${formatMoney(order.amountTax)}</strong></li>
        <li><span>Total</span><strong>${formatMoney(order.amountTotal)}</strong></li>
      </ul>
    </div>
  `;
}

function renderAll() {
  renderCatalog();
  renderCart();
  renderSummary();
  syncActionButtons();
}

async function loadProducts() {
  state.products = await adminRequest("/api/admin/products");
}

async function loadSiteSettings() {
  state.siteSettings = await adminRequest("/api/admin/site-settings");
}

async function loadHealth() {
  state.health = await adminRequest("/api/admin/health");
}

async function refreshData() {
  await Promise.all([loadProducts(), loadSiteSettings(), loadHealth()]);
  if (!stateSelect.value) {
    stateSelect.value = getDefaultState();
  }
  syncHintCopy();
  renderAll();
}

function updateQuantity(productId, delta) {
  const product = state.products.find((entry) => entry.id === productId);
  if (!isProductAvailable(product)) {
    return;
  }
  const current = state.cart.get(productId);
  const nextQuantity = Math.max(0, Math.min(10, (current?.quantity || 0) + delta));
  if (nextQuantity <= 0) {
    state.cart.delete(productId);
  } else {
    state.cart.set(productId, {
      id: productId,
      quantity: nextQuantity
    });
  }
  saveDraft();
  renderAll();
}

async function loadReceiptOrder(sessionId) {
  const response = await fetch(`/api/order/${encodeURIComponent(sessionId)}`);
  const payload = await parseResponse(response);
  if (!response.ok) {
    throw new Error(payload.error || "Could not load receipt.");
  }
  renderReceipt(payload);
}

function clearReturnParams() {
  const url = new URL(window.location.href);
  let changed = false;
  ["pos", "session_id"].forEach((key) => {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  });
  if (!changed) {
    return;
  }
  const search = url.searchParams.toString();
  const nextUrl = `${url.pathname}${search ? `?${search}` : ""}${url.hash}`;
  window.history.replaceState({}, "", nextUrl);
}

async function handleReturnFromStripe() {
  const params = new URLSearchParams(window.location.search);
  const posState = String(params.get("pos") || "").trim().toLowerCase();
  const sessionId = String(params.get("session_id") || "").trim();
  if (!posState) {
    return;
  }

  try {
    if (posState === "success" && sessionId) {
      await loadReceiptOrder(sessionId);
      setPosMessage(`POS payment completed for ${sessionId}. Receipt loaded below.`);
      resetSaleAfterSuccess();
    } else if (posState === "cancel") {
      setPosMessage("Stripe checkout was canceled. Your draft sale is still on the page.");
    }
  } catch (error) {
    setPosMessage(error.message || "Could not load the completed POS receipt.", true);
  } finally {
    clearReturnParams();
  }
}

async function ensureAuthenticated() {
  if (!state.adminPassword) {
    showLogin();
    return;
  }

  try {
    await login(state.adminPassword);
    showPanel();
    await refreshData();
    await handleReturnFromStripe();
  } catch {
    state.adminPassword = "";
    window.localStorage.removeItem(ADMIN_KEY);
    showLogin();
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = String(passwordInput.value || "").trim();
  if (!password) {
    return;
  }

  try {
    setLoginMessage("Signing in...");
    await login(password);
    state.adminPassword = password;
    window.localStorage.setItem(ADMIN_KEY, password);
    passwordInput.value = "";
    showPanel();
    setPosMessage("");
    await refreshData();
    await handleReturnFromStripe();
    setLoginMessage("");
  } catch (error) {
    setLoginMessage(error.message || "Could not sign in.", true);
  }
});

logoutBtn.addEventListener("click", () => {
  state.adminPassword = "";
  window.localStorage.removeItem(ADMIN_KEY);
  clearDraft();
  renderReceipt(null);
  showLogin();
  setLoginMessage("");
  setPosMessage("");
});

refreshBtn.addEventListener("click", async () => {
  if (state.busy) {
    return;
  }
  setBusy(true);
  setPosMessage("Refreshing POS...");
  try {
    await refreshData();
    setPosMessage("POS refreshed.");
  } catch (error) {
    if (error.status === 401) {
      logoutBtn.click();
      return;
    }
    setPosMessage(error.message || "Could not refresh POS.", true);
  } finally {
    setBusy(false);
  }
});

searchInput.addEventListener("input", () => {
  renderCatalog();
});

productsEl.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-pos-action]");
  if (!button || state.busy) {
    return;
  }
  const productId = String(button.dataset.id || "").trim();
  const action = String(button.dataset.posAction || "").trim();
  if (!productId) {
    return;
  }
  if (action === "increase") {
    updateQuantity(productId, 1);
  } else if (action === "decrease") {
    updateQuantity(productId, -1);
  }
});

cartItemsEl.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-pos-action]");
  if (!button || state.busy) {
    return;
  }
  const productId = String(button.dataset.id || "").trim();
  const action = String(button.dataset.posAction || "").trim();
  if (!productId) {
    return;
  }
  if (action === "increase") {
    updateQuantity(productId, 1);
  } else if (action === "decrease") {
    updateQuantity(productId, -1);
  }
});

stateSelect.addEventListener("change", () => {
  saveDraft();
  renderSummary();
});

needsShippingInput.addEventListener("change", () => {
  saveDraft();
  syncHintCopy();
  renderSummary();
});

shippingInputs.forEach((input) => {
  input.addEventListener("input", () => {
    saveDraft();
  });
});

clearBtn.addEventListener("click", () => {
  clearDraft();
  renderAll();
  setPosMessage("POS cart cleared.");
});

newSaleBtn.addEventListener("click", () => {
  clearDraft();
  renderReceipt(null);
  renderAll();
  setPosMessage("Ready for a new sale.");
});

function promptCashReceivedCents(totalCents) {
  const promptValue = window.prompt(
    `Cash received for this sale? Leave blank to use the exact total (${formatMoney(totalCents)}).`,
    ((Number(totalCents) || 0) / 100).toFixed(2)
  );
  if (promptValue === null) {
    return null;
  }
  if (!String(promptValue || "").trim()) {
    return totalCents;
  }
  return parseMoneyToCents(promptValue);
}

checkoutBtn.addEventListener("click", async () => {
  if (state.busy) {
    return;
  }

  const cart = getCartRows().map((item) => ({
    id: item.id,
    quantity: item.quantity
  }));
  if (cart.length === 0) {
    setPosMessage("Add at least one book before opening checkout.", true);
    return;
  }
  if (!stateSelect.value) {
    setPosMessage("Choose a state before opening checkout.", true);
    return;
  }
  let shippingInfo = null;
  try {
    shippingInfo = validateShippingForm();
  } catch (error) {
    setPosMessage(error.message || "Enter the shipping details before opening checkout.", true);
    return;
  }

  setBusy(true);
  setPosMessage("Redirecting to Stripe checkout...");
  try {
    saveDraft();
    const result = await adminRequest("/api/admin/pos/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        cart,
        customerState: stateSelect.value,
        needsShipping: needsShippingInput.checked,
        shippingInfo
      })
    });
    const nextUrl = String(result?.url || "").trim();
    if (!nextUrl) {
      throw new Error("Stripe did not return a checkout URL.");
    }
    window.location.href = nextUrl;
  } catch (error) {
    if (error.status === 401) {
      logoutBtn.click();
      return;
    }
    setPosMessage(error.message || "Could not open Stripe checkout.", true);
    setBusy(false);
  }
});

cashBtn?.addEventListener("click", async () => {
  if (state.busy) {
    return;
  }

  const cart = getCartRows().map((item) => ({
    id: item.id,
    quantity: item.quantity
  }));
  if (cart.length === 0) {
    setPosMessage("Add at least one book before recording a cash sale.", true);
    return;
  }
  if (!stateSelect.value) {
    setPosMessage("Choose a state before recording a cash sale.", true);
    return;
  }

  const summary = getSummaryTotals();
  if (!canRecordCashSale() || !Number.isFinite(summary.amountTotalCents)) {
    setPosMessage(
      "Cash POS needs an exact tax total. Switch Stripe automatic tax off or use manual tax mode before recording cash sales.",
      true
    );
    return;
  }

  let shippingInfo = null;
  try {
    shippingInfo = validateShippingForm();
  } catch (error) {
    setPosMessage(error.message || "Enter the shipping details before recording a cash sale.", true);
    return;
  }

  const cashReceivedCents = promptCashReceivedCents(summary.amountTotalCents);
  if (cashReceivedCents === null) {
    return;
  }
  if (!Number.isFinite(cashReceivedCents)) {
    setPosMessage("Enter a valid cash amount received.", true);
    return;
  }
  if (cashReceivedCents < summary.amountTotalCents) {
    setPosMessage("Cash received must be at least the total due.", true);
    return;
  }

  setBusy(true);
  setPosMessage("Recording cash sale...");
  try {
    saveDraft();
    const result = await adminRequest("/api/admin/pos/create-cash-sale", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        cart,
        customerState: stateSelect.value,
        needsShipping: needsShippingInput.checked,
        shippingInfo,
        cashReceivedCents
      })
    });
    renderReceipt(result?.order || null);
    resetSaleAfterSuccess();
    const changeDueCents = Math.max(0, cashReceivedCents - summary.amountTotalCents);
    setPosMessage(
      changeDueCents > 0
        ? `Cash sale recorded. Change due: ${formatMoney(changeDueCents)}.`
        : "Cash sale recorded."
    );
  } catch (error) {
    if (error.status === 401) {
      logoutBtn.click();
      return;
    }
    setPosMessage(error.message || "Could not record cash sale.", true);
  } finally {
    setBusy(false);
  }
});

printBtn.addEventListener("click", () => {
  if (!state.receiptOrder) {
    setPosMessage("Complete a sale first so there is a receipt to print.", true);
    return;
  }
  window.print();
});

populateStateOptions();
loadDraft();
if (!stateSelect.value) {
  stateSelect.value = DEFAULT_POS_STATE;
}
syncHintCopy();
renderAll();
renderReceipt(null);

ensureAuthenticated().catch(() => {
  showLogin();
});
