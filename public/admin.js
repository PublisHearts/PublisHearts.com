const loginCard = document.getElementById("login-card");
const adminPanel = document.getElementById("admin-panel");
const loginForm = document.getElementById("login-form");
const passwordInput = document.getElementById("admin-password");
const loginMessageEl = document.getElementById("login-message");
const productsEl = document.getElementById("admin-products");
const productForm = document.getElementById("product-form");
const productIdInput = document.getElementById("product-id");
const titleInput = document.getElementById("product-title");
const subtitleInput = document.getElementById("product-subtitle");
const includedInput = document.getElementById("product-included");
const priceInput = document.getElementById("product-price");
const shippingEnabledInput = document.getElementById("product-shipping-enabled");
const shippingFeeInput = document.getElementById("product-shipping-fee");
const imageFileInput = document.getElementById("product-image-file");
const imageUrlInput = document.getElementById("product-image-url");
const productGalleryFilesInput = document.getElementById("product-gallery-files");
const productGalleryUrlsInput = document.getElementById("product-gallery-urls");
const includedGalleryFilesInput = document.getElementById("included-gallery-files");
const includedGalleryUrlsInput = document.getElementById("included-gallery-urls");
const inStockInput = document.getElementById("product-in-stock");
const isComingSoonInput = document.getElementById("product-is-coming-soon");
const allowPreorderInput = document.getElementById("product-allow-preorder");
const isVisibleInput = document.getElementById("product-is-visible");
const removeImageInput = document.getElementById("remove-image");
const saveProductBtn = document.getElementById("save-product-btn");
const cancelEditBtn = document.getElementById("cancel-edit-btn");
const newProductBtn = document.getElementById("new-product-btn");
const logoutBtn = document.getElementById("logout-btn");
const publishBtn = document.getElementById("publish-btn");
const productMessageEl = document.getElementById("admin-message");
const publishMessageEl = document.getElementById("publish-message");
const refreshHealthBtn = document.getElementById("refresh-health-btn");
const adminHealthEl = document.getElementById("admin-health");
const healthMessageEl = document.getElementById("health-message");
const refreshOrdersBtn = document.getElementById("refresh-orders-btn");
const ordersSearchInput = document.getElementById("orders-search");
const orderCustomersEl = document.getElementById("admin-order-customers");
const ordersEl = document.getElementById("admin-orders");
const ordersMessageEl = document.getElementById("orders-message");
const soldCounterEl = document.getElementById("admin-sold-counter");
const soldCounterValueEl = document.getElementById("admin-sold-counter-value");
const soldCounterKickerEl = document.getElementById("admin-sold-kicker");
const soldCounterLabelEl = document.getElementById("admin-sold-counter-label");
const soldCounterNoteEl = document.getElementById("admin-sold-counter-note");
const editionBoardEl = document.getElementById("admin-edition-board");

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
  themeInk: document.getElementById("site-theme-ink")
};

const ADMIN_KEY = "publishearts_admin_password_v1";
const SHIPPO_MANUAL_LABEL_URL = "https://apps.goshippo.com/orders";
const SHIPPO_ORDER_EXPORT_VERSION = "SHIPPO_ORDER_EXPORT_V1";

const state = {
  adminPassword: window.localStorage.getItem(ADMIN_KEY) || "",
  products: [],
  siteSettings: null,
  productBusy: false,
  designBusy: false,
  publishBusy: false,
  healthBusy: false,
  ordersBusy: false,
  ordersPayload: null,
  soldCounterValue: 0,
  soldCounterAnimationFrame: 0,
  soldCounterEdition: 1,
  dragProductId: null,
  dropTargetId: null,
  dropAfter: false
};

const DEFAULT_SHIPPING_FEE = 5;
const COPIES_PER_EDITION = 50;

function setMessage(targetEl, message, isError = false) {
  if (!targetEl) {
    return;
  }
  targetEl.textContent = message || "";
  targetEl.classList.toggle("error", Boolean(isError));
}

function setProductMessage(message, isError = false) {
  setMessage(productMessageEl, message, isError);
}

function setDesignMessage(message, isError = false) {
  setMessage(designMessageEl, message, isError);
}

function setPublishMessage(message, isError = false) {
  setMessage(publishMessageEl, message, isError);
}

function setHealthMessage(message, isError = false) {
  setMessage(healthMessageEl, message, isError);
}

function setOrdersMessage(message, isError = false) {
  setMessage(ordersMessageEl, message, isError);
}

function setLoginMessage(message, isError = false) {
  setMessage(loginMessageEl, message, isError);
}

function setProductBusy(isBusy) {
  state.productBusy = isBusy;
  saveProductBtn.disabled = isBusy;
}

function setDesignBusy(isBusy) {
  state.designBusy = isBusy;
  saveSiteSettingsBtn.disabled = isBusy;
  resetSiteSettingsBtn.disabled = isBusy;
}

function setPublishBusy(isBusy) {
  state.publishBusy = isBusy;
  if (publishBtn) {
    publishBtn.disabled = isBusy;
  }
}

function setHealthBusy(isBusy) {
  state.healthBusy = isBusy;
  if (refreshHealthBtn) {
    refreshHealthBtn.disabled = isBusy;
  }
}

function setOrdersBusy(isBusy) {
  state.ordersBusy = isBusy;
  if (refreshOrdersBtn) {
    refreshOrdersBtn.disabled = isBusy;
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

function resetForm() {
  productIdInput.value = "";
  titleInput.value = "";
  subtitleInput.value = "";
  includedInput.value = "";
  priceInput.value = "";
  shippingEnabledInput.checked = true;
  shippingFeeInput.value = DEFAULT_SHIPPING_FEE.toFixed(2);
  imageFileInput.value = "";
  imageUrlInput.value = "";
  productGalleryFilesInput.value = "";
  productGalleryUrlsInput.value = "";
  includedGalleryFilesInput.value = "";
  includedGalleryUrlsInput.value = "";
  inStockInput.checked = true;
  isComingSoonInput.checked = false;
  allowPreorderInput.checked = false;
  isVisibleInput.checked = true;
  removeImageInput.checked = false;
  saveProductBtn.textContent = "Save Product";
  syncShippingInputs();
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

  state.siteSettings = settings;
  resetSiteSettingsDraftFields();
}

function beginEdit(productId) {
  const product = state.products.find((item) => item.id === productId);
  if (!product) {
    return;
  }

  productIdInput.value = product.id;
  titleInput.value = product.title;
  subtitleInput.value = product.subtitle || "";
  includedInput.value = product.included || "";
  priceInput.value = (product.priceCents / 100).toFixed(2);
  shippingEnabledInput.checked = isShippingEnabled(product);
  const shippingFeeCents = Number.isFinite(product.shippingFeeCents)
    ? product.shippingFeeCents
    : DEFAULT_SHIPPING_FEE * 100;
  shippingFeeInput.value = (shippingFeeCents / 100).toFixed(2);
  imageUrlInput.value = "";
  imageFileInput.value = "";
  productGalleryFilesInput.value = "";
  includedGalleryFilesInput.value = "";
  productGalleryUrlsInput.value = normalizeImageList(product.productImageUrls).join("\n");
  includedGalleryUrlsInput.value = normalizeImageList(product.includedImageUrls).join("\n");
  inStockInput.checked = product.inStock !== false;
  isComingSoonInput.checked = product.isComingSoon === true;
  allowPreorderInput.checked = product.allowPreorder === true;
  isVisibleInput.checked = product.isVisible !== false;
  removeImageInput.checked = false;
  saveProductBtn.textContent = "Update Product";
  syncShippingInputs();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function formatMoney(cents) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format((Number(cents) || 0) / 100);
}

function formatDateTime(epochSeconds) {
  const value = Number(epochSeconds);
  if (!Number.isFinite(value) || value <= 0) {
    return "Unknown date";
  }
  return new Date(value * 1000).toLocaleString();
}

function formatWholeNumber(value) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0
  }).format(Math.max(0, Math.round(Number(value) || 0)));
}

function formatEditionOrdinal(value) {
  const edition = Math.max(1, Math.round(Number(value) || 1));
  const mod100 = edition % 100;
  const mod10 = edition % 10;
  let suffix = "th";
  if (mod100 < 11 || mod100 > 13) {
    if (mod10 === 1) {
      suffix = "st";
    } else if (mod10 === 2) {
      suffix = "nd";
    } else if (mod10 === 3) {
      suffix = "rd";
    }
  }
  return `${edition}${suffix}`;
}

function getEditionProgress(totalCopies) {
  const total = Math.max(0, Math.round(Number(totalCopies) || 0));
  const completedEditions = Math.floor(total / COPIES_PER_EDITION);
  const currentEdition = completedEditions + 1;
  const copiesInCurrentEdition = total % COPIES_PER_EDITION;
  const milestoneReached = total > 0 && copiesInCurrentEdition === 0;
  return {
    total,
    completedEditions,
    currentEdition,
    copiesInCurrentEdition,
    milestoneReached
  };
}

function buildEditionBreakdown(totalCopies, maxSegments = 8) {
  const progress = getEditionProgress(totalCopies);
  const totalEditions = progress.currentEdition;
  const startEdition = Math.max(1, totalEditions - maxSegments + 1);
  const parts = [];

  for (let edition = startEdition; edition <= totalEditions; edition += 1) {
    const soldInEdition =
      edition <= progress.completedEditions ? COPIES_PER_EDITION : progress.copiesInCurrentEdition;
    parts.push(`${formatEditionOrdinal(edition)}: ${formatWholeNumber(soldInEdition)}/${COPIES_PER_EDITION}`);
  }

  if (startEdition > 1) {
    return `Earlier editions complete | ${parts.join(" | ")}`;
  }
  return parts.join(" | ");
}

function formatEditionWindowTitle(value) {
  const edition = Math.max(1, Math.round(Number(value) || 1));
  const words = {
    1: "First",
    2: "Second",
    3: "Third",
    4: "Fourth",
    5: "Fifth",
    6: "Sixth",
    7: "Seventh",
    8: "Eighth",
    9: "Ninth",
    10: "Tenth"
  };
  const ordinalWord = words[edition] || formatEditionOrdinal(edition);
  return `The ${ordinalWord} 50`;
}

function buildEditionBuyerBuckets(orders) {
  const safeOrders = Array.isArray(orders) ? [...orders] : [];
  const chronologicalOrders = safeOrders.sort((left, right) => {
    const leftCreatedAt = Number(left?.createdAt) || 0;
    const rightCreatedAt = Number(right?.createdAt) || 0;
    return leftCreatedAt - rightCreatedAt;
  });

  const buckets = [];
  let currentEdition = 1;
  let copiesUsedInEdition = 0;
  let buyerMap = new Map();

  const flushCurrentEdition = () => {
    const buyers = Array.from(buyerMap.entries())
      .map(([name, units]) => ({
        name,
        units
      }))
      .sort((left, right) => {
        if (right.units !== left.units) {
          return right.units - left.units;
        }
        return left.name.localeCompare(right.name);
      });

    buckets.push({
      editionNumber: currentEdition,
      unitsInEdition: copiesUsedInEdition,
      buyers
    });
  };

  for (const order of chronologicalOrders) {
    let remainingUnits = Math.max(0, Math.round(Number(getOrderUnits(order)) || 0));
    if (remainingUnits <= 0) {
      continue;
    }

    const buyerName = String(order?.customerName || order?.shippingName || order?.customerEmail || "Unknown customer").trim();

    while (remainingUnits > 0) {
      const openSpots = COPIES_PER_EDITION - copiesUsedInEdition;
      if (openSpots <= 0) {
        flushCurrentEdition();
        currentEdition += 1;
        copiesUsedInEdition = 0;
        buyerMap = new Map();
        continue;
      }

      const unitsToAllocate = Math.min(openSpots, remainingUnits);
      buyerMap.set(buyerName, (buyerMap.get(buyerName) || 0) + unitsToAllocate);
      copiesUsedInEdition += unitsToAllocate;
      remainingUnits -= unitsToAllocate;

      if (copiesUsedInEdition >= COPIES_PER_EDITION) {
        flushCurrentEdition();
        currentEdition += 1;
        copiesUsedInEdition = 0;
        buyerMap = new Map();
      }
    }
  }

  if (copiesUsedInEdition > 0 || buckets.length === 0) {
    flushCurrentEdition();
  }

  return buckets;
}

function renderEditionBoard(orders) {
  if (!editionBoardEl) {
    return;
  }

  const buckets = buildEditionBuyerBuckets(orders);
  editionBoardEl.innerHTML = buckets
    .map((bucket) => {
      const buyersHtml =
        bucket.buyers.length > 0
          ? `<ul class="admin-edition-buyers">
              ${bucket.buyers
                .map(
                  (buyer) => `<li>
                    <span>${escapeHtml(buyer.name)}</span>
                    <strong class="admin-edition-buyer-count">${formatWholeNumber(buyer.units)}</strong>
                  </li>`
                )
                .join("")}
            </ul>`
          : `<p class="cart-item-sub">No book orders in this edition yet.</p>`;

      return `<article class="admin-edition-card">
        <h3>${escapeHtml(formatEditionWindowTitle(bucket.editionNumber))}</h3>
        <p>${formatWholeNumber(bucket.unitsInEdition)} / ${COPIES_PER_EDITION} copies</p>
        ${buyersHtml}
      </article>`;
    })
    .join("");
}

function getOrderUnits(order) {
  const bookUnitsTotal = Number(order?.bookUnitsTotal);
  if (Number.isFinite(bookUnitsTotal) && bookUnitsTotal >= 0) {
    return bookUnitsTotal;
  }

  const unitsTotal = Number(order?.unitsTotal);
  if (Number.isFinite(unitsTotal) && unitsTotal > 0) {
    return unitsTotal;
  }

  if (!Array.isArray(order?.items) || order.items.length === 0) {
    return 0;
  }

  return order.items.reduce((sum, item) => {
    const quantity = Number(item?.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return sum;
    }
    return sum + quantity;
  }, 0);
}

function setSoldCounterValue(value) {
  if (!soldCounterValueEl) {
    return;
  }
  soldCounterValueEl.textContent = formatWholeNumber(value);
}

function animateSoldCounter(targetValue) {
  const target = Math.max(0, Math.round(Number(targetValue) || 0));
  if (!soldCounterValueEl) {
    state.soldCounterValue = target;
    return;
  }

  if (state.soldCounterAnimationFrame) {
    window.cancelAnimationFrame(state.soldCounterAnimationFrame);
    state.soldCounterAnimationFrame = 0;
  }

  const start = Math.max(0, Math.round(Number(state.soldCounterValue) || 0));
  if (start === target) {
    setSoldCounterValue(target);
    return;
  }

  const distance = Math.abs(target - start);
  const durationMs = Math.min(1500, 450 + distance * 28);
  const startedAt = performance.now();
  soldCounterEl?.classList.add("is-animating");

  const tick = (now) => {
    const progress = Math.min(1, (now - startedAt) / durationMs);
    const eased = 1 - Math.pow(1 - progress, 3);
    const nextValue = Math.round(start + (target - start) * eased);
    state.soldCounterValue = nextValue;
    setSoldCounterValue(nextValue);

    if (progress < 1) {
      state.soldCounterAnimationFrame = window.requestAnimationFrame(tick);
      return;
    }

    state.soldCounterAnimationFrame = 0;
    state.soldCounterValue = target;
    setSoldCounterValue(target);
    soldCounterEl?.classList.remove("is-animating");
  };

  state.soldCounterAnimationFrame = window.requestAnimationFrame(tick);
}

function updateSoldCounter(orders) {
  const orderList = Array.isArray(orders) ? orders : [];
  const soldUnits = orderList.reduce((sum, order) => sum + getOrderUnits(order), 0);
  const editionProgress = getEditionProgress(soldUnits);
  if (editionProgress.currentEdition !== state.soldCounterEdition) {
    state.soldCounterEdition = editionProgress.currentEdition;
    state.soldCounterValue = 0;
    setSoldCounterValue(0);
  }

  animateSoldCounter(editionProgress.copiesInCurrentEdition);
  soldCounterEl?.classList.toggle("is-empty", soldUnits <= 0);
  soldCounterEl?.classList.toggle("edition-milestone", editionProgress.milestoneReached);
  if (soldCounterKickerEl) {
    soldCounterKickerEl.textContent = editionProgress.milestoneReached
      ? `${formatEditionOrdinal(editionProgress.completedEditions)} edition complete`
      : `${formatEditionOrdinal(editionProgress.currentEdition)} edition in progress`;
  }
  if (soldCounterLabelEl) {
    soldCounterLabelEl.textContent = `/ ${COPIES_PER_EDITION} copies in ${formatEditionOrdinal(
      editionProgress.currentEdition
    )} edition`;
  }
  if (soldCounterNoteEl) {
    soldCounterNoteEl.textContent = `Across ${formatWholeNumber(orderList.length)} paid orders | Editions: ${buildEditionBreakdown(
      soldUnits
    )}`;
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function sanitizeExportValue(value) {
  return String(value ?? "")
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatAmountForExport(cents) {
  return ((Number(cents) || 0) / 100).toFixed(2);
}

function downloadTextFile(filename, text) {
  const blob = new Blob([String(text || "")], { type: "text/plain;charset=utf-8" });
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(objectUrl);
}

function safeExportFilename(orderId) {
  const safeOrderId = String(orderId || "order")
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return `shippo-order-${safeOrderId || "order"}.txt`;
}

function buildShippoOrderExportText(order) {
  const createdAtRaw = Number(order?.createdAt);
  const createdAtIso =
    Number.isFinite(createdAtRaw) && createdAtRaw > 0 ? new Date(createdAtRaw * 1000).toISOString() : "";
  const shippingWeightRaw = Number(order?.shippingWeightLbs);
  const shippingWeight =
    Number.isFinite(shippingWeightRaw) && shippingWeightRaw > 0 ? shippingWeightRaw.toFixed(2) : "";
  const billableWeightRaw = Number(order?.shippingBillableWeightLbs);
  const billableWeight =
    Number.isFinite(billableWeightRaw) && billableWeightRaw > 0 ? billableWeightRaw.toFixed(2) : "";
  const items = Array.isArray(order?.items) ? order.items : [];
  const lines = [
    SHIPPO_ORDER_EXPORT_VERSION,
    `EXPORTED_AT=${new Date().toISOString()}`,
    `ORDER_ID=${sanitizeExportValue(order?.id)}`,
    `ORDER_DATE_ISO=${sanitizeExportValue(createdAtIso)}`,
    `FULFILLMENT_STATUS=${sanitizeExportValue(order?.fulfillmentStatus || "pending")}`,
    `CURRENCY=${sanitizeExportValue(String(order?.currency || "usd").toUpperCase())}`,
    `AMOUNT_SUBTOTAL=${formatAmountForExport(order?.amountSubtotal)}`,
    `AMOUNT_SHIPPING=${formatAmountForExport(order?.amountShipping)}`,
    `AMOUNT_TAX=${formatAmountForExport(order?.amountTax)}`,
    `AMOUNT_TOTAL=${formatAmountForExport(order?.amountTotal)}`,
    `UNITS_TOTAL=${Math.max(0, Number(order?.unitsTotal) || 0)}`,
    `SHIPPABLE_UNITS=${Math.max(0, Number(order?.shippableUnits) || 0)}`,
    `PACKAGE_WEIGHT_AMOUNT=${sanitizeExportValue(shippingWeight)}`,
    "PACKAGE_WEIGHT_UNIT=lb",
    `PACKAGE_BILLABLE_WEIGHT_AMOUNT=${sanitizeExportValue(billableWeight)}`,
    "PACKAGE_BILLABLE_WEIGHT_UNIT=lb",
    `SHIPPING_ZONE=${Math.max(0, Number(order?.shippingZone) || 0)}`,
    `CUSTOMER_NAME=${sanitizeExportValue(order?.customerName)}`,
    `CUSTOMER_EMAIL=${sanitizeExportValue(order?.customerEmail)}`,
    `CUSTOMER_PHONE=${sanitizeExportValue(order?.customerPhone)}`,
    `SHIP_TO_NAME=${sanitizeExportValue(order?.shippingName)}`,
    `SHIP_TO_LINE1=${sanitizeExportValue(order?.shippingAddressLine1)}`,
    `SHIP_TO_LINE2=${sanitizeExportValue(order?.shippingAddressLine2)}`,
    `SHIP_TO_CITY=${sanitizeExportValue(order?.shippingCity)}`,
    `SHIP_TO_STATE=${sanitizeExportValue(order?.shippingState)}`,
    `SHIP_TO_POSTAL_CODE=${sanitizeExportValue(order?.shippingPostalCode)}`,
    `SHIP_TO_COUNTRY=${sanitizeExportValue(order?.shippingCountry || "US")}`,
    `ITEM_COUNT=${items.length}`
  ];

  items.forEach((item, index) => {
    const itemNumber = index + 1;
    lines.push(`ITEM_${itemNumber}_NAME=${sanitizeExportValue(item?.name)}`);
    lines.push(`ITEM_${itemNumber}_QUANTITY=${Math.max(0, Number(item?.quantity) || 0)}`);
  });

  lines.push("SHIPPO_RATE_SELECTION=cheapest");
  lines.push("SHIPPO_LABEL_ACTION=save_only");
  lines.push("SHIPPO_PURCHASE_LABEL=no");
  return lines.join("\n");
}

function buildShippoManualLabelTemplate(order) {
  const shippingWeightRaw = Number(order?.shippingWeightLbs);
  const shippingWeight =
    Number.isFinite(shippingWeightRaw) && shippingWeightRaw > 0 ? shippingWeightRaw.toFixed(2) : "1.00";
  const items =
    Array.isArray(order?.items) && order.items.length > 0
      ? order.items.map((item) => `${item.name} x${item.quantity}`).join(", ")
      : "";
  return [
    `Order ID: ${order?.id || ""}`,
    "",
    "Ship To",
    `Name: ${order?.shippingName || ""}`,
    `Address Line 1: ${order?.shippingAddressLine1 || ""}`,
    `Address Line 2: ${order?.shippingAddressLine2 || ""}`,
    `City: ${order?.shippingCity || ""}`,
    `State: ${order?.shippingState || ""}`,
    `ZIP: ${order?.shippingPostalCode || ""}`,
    `Country: ${order?.shippingCountry || "US"}`,
    "",
    "Parcel",
    `Weight (lb): ${shippingWeight}`,
    "",
    `Reference: ${order?.id || ""}`,
    items ? `Items: ${items}` : ""
  ]
    .filter(Boolean)
    .join("\n");
}

async function copyTextToClipboard(text) {
  const value = String(text || "");
  if (!value) {
    return false;
  }
  if (!navigator.clipboard || !navigator.clipboard.writeText) {
    return false;
  }
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

function renderHealth(health) {
  if (!adminHealthEl) {
    return;
  }

  if (!health || typeof health !== "object") {
    adminHealthEl.innerHTML = `<p class="cart-item-sub">Health data unavailable.</p>`;
    return;
  }

  const taxModeLabel =
    health.taxMode === "manual"
      ? `Manual (${Number(health.manualSalesTaxRatePercent || 0).toFixed(2)}%)`
      : health.taxMode === "stripe_automatic"
        ? "Stripe Automatic Tax"
        : "Off";
  const deployLabel = health.deployCommit || "Unknown";
  const appUrl = String(health.appUrl || "").trim() || "(not set)";
  const smtpHost = String(health.smtpHost || "").trim() || "(not set)";
  const nonTaxStates = Array.isArray(health.manualNonTaxStates) ? health.manualNonTaxStates.join(", ") : "";
  const uspsConfigured = health.uspsConfigured === true;
  const uspsMissing = Array.isArray(health.uspsMissingConfig) ? health.uspsMissingConfig.join(", ") : "";
  const uspsBaseUrl = String(health.uspsApiBaseUrl || "").trim() || "(not set)";

  adminHealthEl.innerHTML = `
    <article class="admin-health-card">
      <h3>Payments</h3>
      <p><strong>Stripe:</strong> ${health.stripeConfigured ? "Configured" : "Missing key"}</p>
      <p><strong>Tax mode:</strong> ${escapeHtml(taxModeLabel)}</p>
      <p><strong>Tax on shipping:</strong> ${health.manualSalesTaxApplyToShipping ? "Yes" : "No"}</p>
      <p><strong>No-tax states:</strong> ${escapeHtml(nonTaxStates || "(none)")}</p>
    </article>
    <article class="admin-health-card">
      <h3>Email</h3>
      <p><strong>SMTP:</strong> ${health.smtpConfigured ? "Configured" : "Not configured"}</p>
      <p><strong>Receipt sending:</strong> ${health.emailSendingEnabled ? "Enabled" : "Disabled"}</p>
      <p><strong>Owner alerts:</strong> ${health.ownerNotificationEnabled ? "Enabled" : "Disabled"}</p>
      <p><strong>Host:</strong> ${escapeHtml(smtpHost)}</p>
    </article>
    <article class="admin-health-card">
      <h3>Deploy</h3>
      <p><strong>Commit:</strong> ${escapeHtml(deployLabel)}</p>
      <p><strong>App URL:</strong> ${escapeHtml(appUrl)}</p>
      <p><strong>Status:</strong> ${health.status === "ok" ? "OK" : "Unknown"}</p>
    </article>
    <article class="admin-health-card">
      <h3>Shipping API</h3>
      <p><strong>USPS labels:</strong> ${uspsConfigured ? "Configured" : "Missing config"}</p>
      <p><strong>USPS base URL:</strong> ${escapeHtml(uspsBaseUrl)}</p>
      <p><strong>Missing fields:</strong> ${escapeHtml(uspsMissing || "(none)")}</p>
    </article>
  `;
}

function renderOrders(payload) {
  if (!ordersEl || !orderCustomersEl) {
    return;
  }

  const allOrders = Array.isArray(payload?.orders) ? payload.orders : [];
  const allCustomers = Array.isArray(payload?.customers) ? payload.customers : [];
  updateSoldCounter(allOrders);
  renderEditionBoard(allOrders);
  const query = String(ordersSearchInput?.value || "")
    .trim()
    .toLowerCase();
  const matchesSearch = (order) => {
    if (!query) {
      return true;
    }
    const haystack = [
      order.id,
      order.customerName,
      order.customerEmail,
      order.customerState,
      order.shippingName,
      order.shippingAddress
    ]
      .map((value) => String(value || "").toLowerCase())
      .join(" ");
    return haystack.includes(query);
  };

  const orders = allOrders.filter(matchesSearch);
  const orderCustomerEmails = new Set(
    orders
      .map((order) => String(order.customerEmail || "").trim().toLowerCase())
      .filter(Boolean)
  );
  const customers = allCustomers.filter((customer) => {
    const email = String(customer.email || "")
      .trim()
      .toLowerCase();
    const name = String(customer.name || "")
      .trim()
      .toLowerCase();
    if (!query) {
      return true;
    }
    return email.includes(query) || name.includes(query) || orderCustomerEmails.has(email);
  });

  if (customers.length > 0) {
    orderCustomersEl.innerHTML = `
      <h3>Customer History${query ? ` (${customers.length} match)` : ""}</h3>
      <div class="admin-customer-list">
        ${customers
          .slice(0, 20)
          .map(
            (customer) => `<article class="admin-customer-card">
              <p><strong>${escapeHtml(customer.name || "Unknown customer")}</strong></p>
              <p>${escapeHtml(customer.email || "No email on file")}</p>
              <p>Orders: <strong>${customer.ordersCount || 0}</strong> | Units: <strong>${customer.unitsTotal || 0}</strong> | Total: <strong>${formatMoney(customer.amountTotal || 0)}</strong></p>
              <p>Last order: ${escapeHtml(formatDateTime(customer.lastOrderAt))}</p>
            </article>`
          )
          .join("")}
      </div>
    `;
  } else {
    orderCustomersEl.innerHTML = `<h3>Customer History</h3><p class="cart-item-sub">No customer history yet.</p>`;
  }

  if (orders.length === 0) {
    ordersEl.innerHTML = `<p class="cart-item-sub">${
      query ? "No orders matched your search." : "No paid orders found yet."
    }</p>`;
    return;
  }

  const pendingOrders = orders.filter((order) => String(order.fulfillmentStatus || "pending") !== "shipped");
  const shippedOrders = orders.filter((order) => String(order.fulfillmentStatus || "pending") === "shipped");

  const renderOrderCard = (order) => {
    const itemSummary =
      Array.isArray(order.items) && order.items.length > 0
        ? order.items.map((item) => `${escapeHtml(item.name)} x${item.quantity}`).join(", ")
        : "No item summary saved.";
    const pastOrders =
      Array.isArray(order.customerPastOrderIds) && order.customerPastOrderIds.length > 0
        ? order.customerPastOrderIds.map((orderId) => escapeHtml(orderId)).join(", ")
        : "None";
    const shipped = String(order.fulfillmentStatus || "pending") === "shipped";
    const fulfillmentLabel = shipped ? "Shipped" : "Needs Fulfillment";
    const shipDate = order.shippedAt ? formatDateTime(order.shippedAt) : "";
    const labelId = String(order.shipmentLabelId || "").trim();
    const labelUrl = String(order.shipmentLabelUrl || "").trim();
    const postageCentsRaw = Number(order.shipmentPostageCents);
    const hasPostage = Number.isFinite(postageCentsRaw) && postageCentsRaw > 0;
    const shippingWeightRaw = Number(order.shippingWeightLbs);
    const shippingWeightLabel =
      Number.isFinite(shippingWeightRaw) && shippingWeightRaw > 0 ? `${shippingWeightRaw.toFixed(2)} lb` : "Unknown";
    const shippingBillableWeightRaw = Number(order.shippingBillableWeightLbs);
    const shippingBillableWeightLabel =
      Number.isFinite(shippingBillableWeightRaw) && shippingBillableWeightRaw > 0
        ? `${shippingBillableWeightRaw.toFixed(2)} lb`
        : "Unknown";
    const shippingZoneRaw = Number(order.shippingZone);
    const shippingZoneLabel =
      Number.isFinite(shippingZoneRaw) && shippingZoneRaw >= 1 && shippingZoneRaw <= 8
        ? `Zone ${Math.round(shippingZoneRaw)}`
        : "Unknown";
    const selectedState = String(order.customerState || "").trim().toUpperCase();
    const shippingState = String(order.shippingState || "").trim().toUpperCase();
    const shippingCountry = String(order.shippingCountry || "US").trim().toUpperCase();
    const shippingStateMatchesCustomerState = order.shippingStateMatchesCustomerState !== false;
    const shippingStateMismatchReason = String(order.shippingStateMismatchReason || "").trim();
    const fulfillmentHoldReason = String(order.fulfillmentHoldReason || "").trim();
    const blockedForStateMismatch =
      !shippingStateMatchesCustomerState || fulfillmentHoldReason === "state_mismatch";
    const canUseShippingStateFallback =
      blockedForStateMismatch && !selectedState && Boolean(shippingState) && shippingCountry === "US";
    const uspsButtonLabel = "Open Shippo Manual Label";
    const stateCheckText = blockedForStateMismatch
      ? `Blocked - ${shippingStateMismatchReason || `Selected ${selectedState || "Unknown"} vs shipping ${shippingState || "Unknown"} (${shippingCountry})`}`
      : `Match (${selectedState || "Unknown"} -> ${shippingState || selectedState || "Unknown"})`;

    return `<article class="admin-order-card">
      <div class="row-between">
        <h4>${escapeHtml(order.id)}</h4>
        <strong>${formatMoney(order.amountTotal || 0)}</strong>
      </div>
      <p><strong>Status:</strong> <span class="admin-order-status ${shipped ? "shipped" : "pending"}">${fulfillmentLabel}</span>${shipDate ? ` - ${escapeHtml(shipDate)}` : ""}</p>
      <p><strong>Date:</strong> ${escapeHtml(formatDateTime(order.createdAt))}</p>
      <p><strong>Customer:</strong> ${escapeHtml(order.customerName || "Unknown")} (${escapeHtml(order.customerEmail || "No email")})</p>
      <p><strong>State:</strong> ${escapeHtml(order.customerState || "Unknown")} ${
        order.customerTaxExemptByState ? '(no-sales-tax state)' : ""
      }</p>
      <p><strong>Ship to:</strong> ${escapeHtml(order.shippingName || "Unknown")} - ${escapeHtml(order.shippingAddress || "No address")}</p>
      <p><strong>Address state check:</strong> ${escapeHtml(stateCheckText)}</p>
      <p><strong>Weight:</strong> ${escapeHtml(shippingWeightLabel)} actual | ${escapeHtml(shippingBillableWeightLabel)} billable | <strong>Zone:</strong> ${escapeHtml(shippingZoneLabel)}</p>
      <p><strong>Units:</strong> ${order.unitsTotal || 0} | <strong>Items:</strong> ${formatMoney(order.amountSubtotal || 0)} | <strong>Shipping:</strong> ${formatMoney(order.amountShipping || 0)} | <strong>Tax:</strong> ${formatMoney(order.amountTax || 0)}</p>
      <p><strong>Items ordered:</strong> ${itemSummary}</p>
      ${
        order.shipmentTrackingNumber || order.shipmentTrackingUrl
          ? `<p><strong>Tracking:</strong> ${
              order.shipmentTrackingUrl
                ? `<a class="inline-link" href="${escapeHtml(order.shipmentTrackingUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(order.shipmentTrackingUrl)}</a>`
                : escapeHtml(order.shipmentTrackingNumber)
            }</p>`
          : ""
      }
      ${
        labelUrl
          ? `<p><strong>USPS Label:</strong> <a class="inline-link" href="${escapeHtml(labelUrl)}" target="_blank" rel="noopener noreferrer">Open Label</a></p>`
          : ""
      }
      ${labelId ? `<p><strong>USPS Label ID:</strong> ${escapeHtml(labelId)}</p>` : ""}
      ${hasPostage ? `<p><strong>USPS Postage:</strong> ${formatMoney(postageCentsRaw)}</p>` : ""}
      ${order.shipmentCarrier ? `<p><strong>Carrier:</strong> ${escapeHtml(order.shipmentCarrier)}</p>` : ""}
      <p><strong>Past orders by this customer:</strong> ${pastOrders}</p>
      <p><strong>Customer total orders:</strong> ${order.customerOrdersCount || 1}</p>
      <div class="admin-card-actions">
        ${
          canUseShippingStateFallback
            ? `<button class="ghost-btn" type="button" data-action="use-shipping-state" data-id="${escapeHtml(order.id)}">Use Shipping State</button>`
            : ""
        }
        <button class="ghost-btn" type="button" data-action="create-usps-label" data-id="${escapeHtml(order.id)}" ${
          blockedForStateMismatch ? "disabled title=\"Fix state mismatch first\"" : ""
        }>${uspsButtonLabel}</button>
        <button class="ghost-btn" type="button" data-action="export-shippo-order-txt" data-id="${escapeHtml(order.id)}">
          Export Shipping TXT
        </button>
        <button class="ghost-btn" type="button" data-action="edit-shipping-address" data-id="${escapeHtml(order.id)}">Edit Address</button>
        <button class="ghost-btn" type="button" data-action="save-shipping-address" data-id="${escapeHtml(order.id)}">Save Address</button>
        <button class="danger-btn" type="button" data-action="exclude-order" data-id="${escapeHtml(order.id)}">Remove Refunded Order</button>
        ${
          shipped
            ? `<button class="ghost-btn" type="button" data-action="resend-shipped-email" data-id="${escapeHtml(order.id)}">Resend Shipment Email</button>
               <button class="ghost-btn" type="button" data-action="mark-pending-order" data-id="${escapeHtml(order.id)}">Mark Pending</button>`
            : blockedForStateMismatch
              ? `<button class="danger-btn" type="button" data-action="force-mark-shipped-order" data-id="${escapeHtml(order.id)}">
                   Override Block + Mark Shipped + Email
                 </button>`
              : `<button class="primary-btn" type="button" data-action="mark-shipped-order" data-id="${escapeHtml(order.id)}">
                   Mark Shipped + Email Customer
                 </button>`
        }
      </div>
    </article>`;
  };

  ordersEl.innerHTML = `
    <h3>Needs Fulfillment (${pendingOrders.length}${query ? ` / ${allOrders.length} total` : ""})</h3>
    <div class="admin-orders-list">
      ${pendingOrders.length > 0 ? pendingOrders.map(renderOrderCard).join("") : '<p class="cart-item-sub">No orders waiting to ship.</p>'}
    </div>
    <h3>Shipped (${shippedOrders.length}${query ? ` / ${allOrders.length} total` : ""})</h3>
    <div class="admin-orders-list">
      ${shippedOrders.length > 0 ? shippedOrders.map(renderOrderCard).join("") : '<p class="cart-item-sub">No shipped orders yet.</p>'}
    </div>
  `;
}

function normalizeImageList(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => String(entry || "").trim())
    .filter(Boolean);
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

function renderProducts() {
  if (state.products.length === 0) {
    productsEl.innerHTML = `<p class="cart-item-sub">No products yet. Add your first book above.</p>`;
    return;
  }

  productsEl.innerHTML = state.products
    .map(
      (product) => {
        const shippingEnabled = isShippingEnabled(product);
        const shippingFee = Number.isFinite(product.shippingFeeCents)
          ? product.shippingFeeCents
          : DEFAULT_SHIPPING_FEE * 100;
        const isVisible = product.isVisible !== false;
        const isComingSoon = product.isComingSoon === true;
        const allowPreorder = product.allowPreorder === true;
        const productGalleryCount = normalizeImageList(product.productImageUrls).length;
        const includedGalleryCount = normalizeImageList(product.includedImageUrls).length;

        return `<article class="admin-product-card" draggable="true" data-id="${product.id}">
        <img class="admin-product-image" src="${product.imageUrl}" alt="${product.title} cover" />
        <div class="admin-product-body">
          <div class="row-between">
            <h3>${product.title}</h3>
            <strong>${formatMoney(product.priceCents)}</strong>
          </div>
          <p>${product.subtitle || "No description"}</p>
          ${product.included ? `<p><strong>What's included:</strong> ${product.included}</p>` : ""}
          <p>Product gallery images: <strong>${productGalleryCount}</strong></p>
          <p>Included images: <strong>${includedGalleryCount}</strong></p>
          <div class="admin-badges">
            <span class="admin-stock-badge ${product.inStock === false ? "sold-out" : "in-stock"}">
              ${product.inStock === false ? "Sold Out" : "In Stock"}
            </span>
            <span class="admin-stock-badge ${shippingEnabled ? "in-stock" : "sold-out"}">
              ${
                !shippingEnabled
                  ? "No Shipping Fee"
                  : `Shipping ${formatMoney(shippingFee)}`
              }
            </span>
            <span class="admin-stock-badge ${isVisible ? "in-stock" : "sold-out"}">
              ${isVisible ? "Visible" : "Hidden"}
            </span>
            <span class="admin-stock-badge ${isComingSoon && !allowPreorder ? "sold-out" : "in-stock"}">
              ${isComingSoon ? (allowPreorder ? "Preorder Open" : "Coming Soon") : "Orderable"}
            </span>
            <span class="admin-drag-hint">Drag to reorder</span>
          </div>
          <p class="admin-id">ID: ${product.id}</p>
          <div class="admin-card-actions">
            <button class="ghost-btn" type="button" data-action="edit" data-id="${product.id}">Edit</button>
            <button class="ghost-btn" type="button" data-action="toggle-shipping" data-id="${product.id}">
              ${shippingEnabled ? "Turn Shipping Off" : "Turn Shipping On"}
            </button>
            <button class="ghost-btn" type="button" data-action="toggle-visibility" data-id="${product.id}">
              ${isVisible ? "Hide Listing" : "Show Listing"}
            </button>
            <button class="ghost-btn" type="button" data-action="toggle-coming-soon" data-id="${product.id}">
              ${isComingSoon ? "Make Orderable" : "Mark Coming Soon"}
            </button>
            <button class="ghost-btn" type="button" data-action="toggle-preorder" data-id="${product.id}">
              ${allowPreorder ? "Disable Preorder" : "Enable Preorder"}
            </button>
            <button class="danger-btn" type="button" data-action="delete" data-id="${product.id}">Delete</button>
          </div>
        </div>
      </article>`;
      }
    )
    .join("");
}

async function loadProducts() {
  const products = await adminRequest("/api/admin/products");
  state.products = products;
  renderProducts();
}

async function loadHealth() {
  const health = await adminRequest("/api/admin/health");
  renderHealth(health);
}

async function loadOrders() {
  const payload = await adminRequest("/api/admin/orders?limit=100");
  state.ordersPayload = payload;
  renderOrders(payload);
}

function promptShipmentDetails() {
  const carrier = window.prompt("Carrier name (optional):", "");
  if (carrier === null) {
    return null;
  }
  const trackingNumber = window.prompt("Tracking number (optional):", "");
  if (trackingNumber === null) {
    return null;
  }
  const trackingUrl = window.prompt("Tracking URL (optional):", "");
  if (trackingUrl === null) {
    return null;
  }
  const note = window.prompt("Optional shipment note for customer email:", "");
  if (note === null) {
    return null;
  }
  return {
    carrier: String(carrier || "").trim(),
    trackingNumber: String(trackingNumber || "").trim(),
    trackingUrl: String(trackingUrl || "").trim(),
    note: String(note || "").trim()
  };
}

function promptShippingAddressUpdate(order) {
  const shippingName = window.prompt("Shipping name:", String(order?.shippingName || "").trim());
  if (shippingName === null) {
    return null;
  }
  const line1 = window.prompt("Address line 1:", String(order?.shippingAddressLine1 || "").trim());
  if (line1 === null) {
    return null;
  }
  const line2 = window.prompt("Address line 2 (optional):", String(order?.shippingAddressLine2 || "").trim());
  if (line2 === null) {
    return null;
  }
  const city = window.prompt("City:", String(order?.shippingCity || "").trim());
  if (city === null) {
    return null;
  }
  const state = window.prompt("State (2-letter):", String(order?.shippingState || "").trim().toUpperCase());
  if (state === null) {
    return null;
  }
  const postalCode = window.prompt("ZIP code:", String(order?.shippingPostalCode || "").trim().toUpperCase());
  if (postalCode === null) {
    return null;
  }
  const country = window.prompt("Country code:", String(order?.shippingCountry || "US").trim().toUpperCase());
  if (country === null) {
    return null;
  }

  return {
    name: String(shippingName || "").trim(),
    line1: String(line1 || "").trim(),
    line2: String(line2 || "").trim(),
    city: String(city || "").trim(),
    state: String(state || "").trim().toUpperCase(),
    postalCode: String(postalCode || "").trim().toUpperCase(),
    country: String(country || "US").trim().toUpperCase()
  };
}

function syncShippingInputs() {
  if (!shippingEnabledInput || !shippingFeeInput) {
    return;
  }
  shippingFeeInput.disabled = !shippingEnabledInput.checked;
}

async function loadSiteSettings() {
  const settings = await adminRequest("/api/admin/site-settings");
  fillSiteSettingsForm(settings);
}

function moveProductInState(movedId, targetId, placeAfter = false) {
  const sourceIndex = state.products.findIndex((item) => item.id === movedId);
  const targetIndex = state.products.findIndex((item) => item.id === targetId);
  if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) {
    return false;
  }

  const next = [...state.products];
  const [moved] = next.splice(sourceIndex, 1);
  let insertionIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
  if (placeAfter) {
    insertionIndex += 1;
  }
  if (insertionIndex > next.length) {
    insertionIndex = next.length;
  }
  next.splice(insertionIndex, 0, moved);
  state.products = next;
  return true;
}

async function persistCurrentProductOrder() {
  const productIds = state.products.map((product) => product.id);
  const reordered = await adminRequest("/api/admin/products/reorder", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ productIds })
  });
  state.products = reordered;
  renderProducts();
}

function clearDropClasses() {
  productsEl.querySelectorAll(".admin-product-card.drop-target").forEach((card) => {
    card.classList.remove("drop-target");
  });
  productsEl.querySelectorAll(".admin-product-card.drop-after").forEach((card) => {
    card.classList.remove("drop-after");
  });
}

function clearDragClasses() {
  productsEl.querySelectorAll(".admin-product-card.dragging").forEach((card) => {
    card.classList.remove("dragging");
  });
  clearDropClasses();
}

function showLogin() {
  loginCard.classList.remove("hidden");
  adminPanel.classList.add("hidden");
}

function showPanel() {
  loginCard.classList.add("hidden");
  adminPanel.classList.remove("hidden");
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

async function ensureAuthenticated() {
  if (!state.adminPassword) {
    showLogin();
    return;
  }

  try {
    await login(state.adminPassword);
    showPanel();
    await Promise.all([loadProducts(), loadSiteSettings(), loadHealth(), loadOrders()]);
  } catch {
    state.adminPassword = "";
    window.localStorage.removeItem(ADMIN_KEY);
    showLogin();
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = passwordInput.value;
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
    await Promise.all([loadProducts(), loadSiteSettings(), loadHealth(), loadOrders()]);
    setProductMessage("Signed in.");
    setDesignMessage("");
    setPublishMessage("");
    setHealthMessage("");
    setOrdersMessage("");
    setLoginMessage("");
  } catch (error) {
    setLoginMessage(error.message || "Could not sign in.", true);
  }
});

logoutBtn.addEventListener("click", () => {
  state.adminPassword = "";
  window.localStorage.removeItem(ADMIN_KEY);
  state.ordersPayload = null;
  resetForm();
  resetSiteSettingsDraftFields();
  showLogin();
  setProductMessage("");
  setDesignMessage("");
  setPublishMessage("");
  setHealthMessage("");
  setOrdersMessage("");
  setLoginMessage("");
});

refreshHealthBtn?.addEventListener("click", async () => {
  if (state.healthBusy) {
    return;
  }
  setHealthBusy(true);
  setHealthMessage("Refreshing health...");
  try {
    await loadHealth();
    setHealthMessage("Health refreshed.");
  } catch (error) {
    if (error.status === 401) {
      logoutBtn.click();
      return;
    }
    setHealthMessage(error.message || "Could not load health status.", true);
  } finally {
    setHealthBusy(false);
  }
});

refreshOrdersBtn?.addEventListener("click", async () => {
  if (state.ordersBusy) {
    return;
  }
  setOrdersBusy(true);
  setOrdersMessage("Loading orders...");
  try {
    await loadOrders();
    setOrdersMessage("Orders refreshed.");
  } catch (error) {
    if (error.status === 401) {
      logoutBtn.click();
      return;
    }
    setOrdersMessage(error.message || "Could not load orders.", true);
  } finally {
    setOrdersBusy(false);
  }
});

ordersSearchInput?.addEventListener("input", () => {
  if (!state.ordersPayload) {
    return;
  }
  renderOrders(state.ordersPayload);
});

ordersEl?.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }

  const action = button.dataset.action;
  const orderId = String(button.dataset.id || "").trim();
  if (!orderId || state.ordersBusy) {
    return;
  }
  const selectedOrder = Array.isArray(state.ordersPayload?.orders)
    ? state.ordersPayload.orders.find((order) => order.id === orderId)
    : null;
  const blockedForStateMismatch =
    selectedOrder &&
    (selectedOrder.shippingStateMatchesCustomerState === false ||
      String(selectedOrder.fulfillmentHoldReason || "").trim() === "state_mismatch");
  const mismatchReason =
    selectedOrder && String(selectedOrder.shippingStateMismatchReason || "").trim()
      ? String(selectedOrder.shippingStateMismatchReason || "").trim()
      : "Selected checkout state does not match shipping address state.";

  if (action === "use-shipping-state") {
    if (!selectedOrder) {
      setOrdersMessage("Order details are missing. Refresh and try again.", true);
      return;
    }
    setOrdersBusy(true);
    setOrdersMessage("Applying shipping-state fix...");
    try {
      const result = await adminRequest(`/api/admin/orders/${encodeURIComponent(orderId)}/use-shipping-state`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });
      await loadOrders();
      setOrdersMessage(result.message || `Order ${orderId} updated.`);
    } catch (error) {
      if (error.status === 401) {
        logoutBtn.click();
        return;
      }
      setOrdersMessage(error.message || "Could not apply shipping-state fix.", true);
    } finally {
      setOrdersBusy(false);
    }
    return;
  }

  if (action === "save-shipping-address") {
    setOrdersBusy(true);
    setOrdersMessage("Saving shipping address to address book...");
    try {
      await adminRequest(`/api/admin/orders/${encodeURIComponent(orderId)}/save-address`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });
      setOrdersMessage(`Address saved for order ${orderId}.`);
    } catch (error) {
      if (error.status === 401) {
        logoutBtn.click();
        return;
      }
      setOrdersMessage(error.message || "Could not save shipping address.", true);
    } finally {
      setOrdersBusy(false);
    }
    return;
  }

  if (action === "exclude-order") {
    const confirmed = window.confirm(
      "Remove this refunded order from Admin lists and sold counters?\n\nThis does not delete it from Stripe."
    );
    if (!confirmed) {
      return;
    }

    setOrdersBusy(true);
    setOrdersMessage("Removing refunded order...");
    try {
      await adminRequest(`/api/admin/orders/${encodeURIComponent(orderId)}/exclude`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          reason: "refunded"
        })
      });
      await loadOrders();
      setOrdersMessage(`Order ${orderId} removed from counters and admin list.`);
    } catch (error) {
      if (error.status === 401) {
        logoutBtn.click();
        return;
      }
      setOrdersMessage(error.message || "Could not remove refunded order.", true);
    } finally {
      setOrdersBusy(false);
    }
    return;
  }

  if (action === "edit-shipping-address") {
    if (!selectedOrder) {
      setOrdersMessage("Order details are missing. Refresh and try again.", true);
      return;
    }

    const nextAddress = promptShippingAddressUpdate(selectedOrder);
    if (!nextAddress) {
      return;
    }

    setOrdersBusy(true);
    setOrdersMessage("Updating shipping address...");
    try {
      const result = await adminRequest(`/api/admin/orders/${encodeURIComponent(orderId)}/edit-shipping-address`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(nextAddress)
      });
      await loadOrders();
      setOrdersMessage(result.message || `Shipping address updated for order ${orderId}.`);
    } catch (error) {
      if (error.status === 401) {
        logoutBtn.click();
        return;
      }
      setOrdersMessage(error.message || "Could not update shipping address.", true);
    } finally {
      setOrdersBusy(false);
    }
    return;
  }

  if (action === "create-usps-label") {
    if (blockedForStateMismatch) {
      setOrdersMessage(`Cannot create label: ${mismatchReason}`, true);
      return;
    }
    if (!selectedOrder) {
      setOrdersMessage("Order details are missing. Refresh and try again.", true);
      return;
    }

    setOrdersBusy(true);
    setOrdersMessage("Opening Shippo manual label page...");
    try {
      const template = buildShippoManualLabelTemplate(selectedOrder);
      const copied = await copyTextToClipboard(template);
      const shippoWindow = window.open(SHIPPO_MANUAL_LABEL_URL, "_blank", "noopener,noreferrer");
      if (!shippoWindow) {
        window.location.href = SHIPPO_MANUAL_LABEL_URL;
      }
      if (!copied) {
        window.prompt("Copy this into Shippo manual label fields:", template);
      }
      setOrdersMessage(
        copied
          ? `Opened Shippo for order ${orderId}. Shipping fields copied to clipboard.`
          : `Opened Shippo for order ${orderId}. Copy the field template from the popup and paste into Shippo.`
      );
    } catch (error) {
      setOrdersMessage(error.message || "Could not open Shippo label flow.", true);
    } finally {
      setOrdersBusy(false);
    }
    return;
  }

  if (action === "export-shippo-order-txt") {
    if (!selectedOrder) {
      setOrdersMessage("Order details are missing. Refresh and try again.", true);
      return;
    }

    try {
      const exportText = buildShippoOrderExportText(selectedOrder);
      const filename = safeExportFilename(selectedOrder.id);
      downloadTextFile(filename, exportText);
      setOrdersMessage(`Exported ${filename}.`);
    } catch (error) {
      setOrdersMessage(error.message || "Could not export shipping TXT.", true);
    }
    return;
  }

  if (action === "mark-shipped-order") {
    if (blockedForStateMismatch) {
      setOrdersMessage(`Cannot mark shipped: ${mismatchReason}`, true);
      return;
    }
    const shipmentDetails = promptShipmentDetails();
    if (!shipmentDetails) {
      return;
    }

    setOrdersBusy(true);
    setOrdersMessage("Marking order shipped and sending customer email...");
    try {
      await adminRequest(`/api/admin/orders/${encodeURIComponent(orderId)}/ship`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(shipmentDetails)
      });
      await loadOrders();
      setOrdersMessage(`Order ${orderId} marked shipped and customer emailed.`);
    } catch (error) {
      if (error.status === 401) {
        logoutBtn.click();
        return;
      }
      setOrdersMessage(error.message || "Could not mark order as shipped.", true);
    } finally {
      setOrdersBusy(false);
    }
    return;
  }

  if (action === "force-mark-shipped-order") {
    if (!selectedOrder) {
      setOrdersMessage("Order details are missing. Refresh and try again.", true);
      return;
    }

    const confirmOverride = window.confirm(
      `Override state mismatch and mark this order shipped anyway?\n\n${mismatchReason}`
    );
    if (!confirmOverride) {
      return;
    }

    const shipmentDetails = promptShipmentDetails();
    if (!shipmentDetails) {
      return;
    }

    setOrdersBusy(true);
    setOrdersMessage("Overriding state block, marking shipped, and sending customer email...");
    try {
      await adminRequest(`/api/admin/orders/${encodeURIComponent(orderId)}/ship`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...shipmentDetails,
          overrideStateMismatch: true
        })
      });
      await loadOrders();
      setOrdersMessage(`Override applied. Order ${orderId} marked shipped and customer emailed.`);
    } catch (error) {
      if (error.status === 401) {
        logoutBtn.click();
        return;
      }
      setOrdersMessage(error.message || "Could not override and mark order as shipped.", true);
    } finally {
      setOrdersBusy(false);
    }
    return;
  }

  if (action === "resend-shipped-email") {
    if (!window.confirm("Resend shipment email to this customer?")) {
      return;
    }

    setOrdersBusy(true);
    setOrdersMessage("Resending shipment email...");
    try {
      await adminRequest(`/api/admin/orders/${encodeURIComponent(orderId)}/ship`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          resendEmail: true
        })
      });
      setOrdersMessage(`Shipment email re-sent for order ${orderId}.`);
    } catch (error) {
      if (error.status === 401) {
        logoutBtn.click();
        return;
      }
      setOrdersMessage(error.message || "Could not resend shipment email.", true);
    } finally {
      setOrdersBusy(false);
    }
    return;
  }

  if (action === "mark-pending-order") {
    if (!window.confirm("Move this order back to pending fulfillment?")) {
      return;
    }

    setOrdersBusy(true);
    setOrdersMessage("Updating order status...");
    try {
      await adminRequest(`/api/admin/orders/${encodeURIComponent(orderId)}/mark-pending`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });
      await loadOrders();
      setOrdersMessage(`Order ${orderId} moved back to pending.`);
    } catch (error) {
      if (error.status === 401) {
        logoutBtn.click();
        return;
      }
      setOrdersMessage(error.message || "Could not update order status.", true);
    } finally {
      setOrdersBusy(false);
    }
  }
});

publishBtn.addEventListener("click", async () => {
  if (state.publishBusy || state.productBusy || state.designBusy) {
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
      logoutBtn.click();
      return;
    }
    setPublishMessage(error.message || "Could not publish changes.", true);
  } finally {
    setPublishBusy(false);
  }
});

newProductBtn.addEventListener("click", () => {
  resetForm();
  setProductMessage("Create mode enabled.");
});

cancelEditBtn.addEventListener("click", () => {
  resetForm();
  setProductMessage("Edit canceled.");
});

productsEl.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }

  const action = button.dataset.action;
  const productId = button.dataset.id;
  if (!productId) {
    return;
  }

  if (action === "edit") {
    beginEdit(productId);
    return;
  }

  if (action === "toggle-shipping") {
    const product = state.products.find((item) => item.id === productId);
    if (!product) {
      return;
    }

    const nextShippingEnabled = !isShippingEnabled(product);
    try {
      setProductMessage(
        nextShippingEnabled ? "Turning shipping on..." : "Turning shipping off..."
      );
      await adminRequest(`/api/admin/products/${encodeURIComponent(productId)}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          shippingEnabled: nextShippingEnabled
        })
      });
      await loadProducts();
      setProductMessage(
        nextShippingEnabled
          ? `Shipping enabled for "${product.title}".`
          : `Shipping disabled for "${product.title}".`
      );
    } catch (error) {
      if (error.status === 401) {
        logoutBtn.click();
        return;
      }
      setProductMessage(error.message || "Could not update shipping setting.", true);
    }
    return;
  }

  if (action === "toggle-visibility") {
    const product = state.products.find((item) => item.id === productId);
    if (!product) {
      return;
    }

    const nextVisibility = product.isVisible === false;
    try {
      setProductMessage(nextVisibility ? "Showing listing..." : "Hiding listing...");
      await adminRequest(`/api/admin/products/${encodeURIComponent(productId)}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          isVisible: nextVisibility
        })
      });
      await loadProducts();
      setProductMessage(
        nextVisibility
          ? `"${product.title}" is now visible on storefront.`
          : `"${product.title}" is hidden from storefront.`
      );
    } catch (error) {
      if (error.status === 401) {
        logoutBtn.click();
        return;
      }
      setProductMessage(error.message || "Could not update listing visibility.", true);
    }
    return;
  }

  if (action === "toggle-coming-soon") {
    const product = state.products.find((item) => item.id === productId);
    if (!product) {
      return;
    }

    const nextComingSoon = product.isComingSoon !== true;
    try {
      setProductMessage(nextComingSoon ? "Marking as coming soon..." : "Making product orderable...");
      await adminRequest(`/api/admin/products/${encodeURIComponent(productId)}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          isComingSoon: nextComingSoon
        })
      });
      await loadProducts();
      setProductMessage(
        nextComingSoon
          ? `"${product.title}" is now marked Coming Soon.`
          : `"${product.title}" is now orderable.`
      );
    } catch (error) {
      if (error.status === 401) {
        logoutBtn.click();
        return;
      }
      setProductMessage(error.message || "Could not update coming soon status.", true);
    }
    return;
  }

  if (action === "toggle-preorder") {
    const product = state.products.find((item) => item.id === productId);
    if (!product) {
      return;
    }

    const nextAllowPreorder = product.allowPreorder !== true;
    try {
      setProductMessage(nextAllowPreorder ? "Enabling preorder..." : "Disabling preorder...");
      await adminRequest(`/api/admin/products/${encodeURIComponent(productId)}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          allowPreorder: nextAllowPreorder
        })
      });
      await loadProducts();
      setProductMessage(
        nextAllowPreorder
          ? `Preorder enabled for "${product.title}".`
          : `Preorder disabled for "${product.title}".`
      );
    } catch (error) {
      if (error.status === 401) {
        logoutBtn.click();
        return;
      }
      setProductMessage(error.message || "Could not update preorder status.", true);
    }
    return;
  }

  if (action === "delete") {
    if (!window.confirm("Delete this product?")) {
      return;
    }

    try {
      setProductMessage("Deleting product...");
      await adminRequest(`/api/admin/products/${encodeURIComponent(productId)}`, {
        method: "DELETE"
      });
      resetForm();
      await loadProducts();
      setProductMessage("Product deleted.");
    } catch (error) {
      if (error.status === 401) {
        logoutBtn.click();
      }
      setProductMessage(error.message || "Could not delete product.", true);
    }
  }
});

productsEl.addEventListener("dragstart", (event) => {
  const card = event.target.closest(".admin-product-card");
  if (!card || state.productBusy) {
    event.preventDefault();
    return;
  }
  state.dragProductId = card.dataset.id || null;
  state.dropTargetId = null;
  state.dropAfter = false;
  card.classList.add("dragging");
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", state.dragProductId || "");
  }
});

productsEl.addEventListener("dragover", (event) => {
  if (!state.dragProductId) {
    return;
  }
  const card = event.target.closest(".admin-product-card");
  if (!card || card.dataset.id === state.dragProductId) {
    return;
  }
  event.preventDefault();
  clearDropClasses();
  const bounds = card.getBoundingClientRect();
  state.dropAfter = event.clientY > bounds.top + bounds.height / 2;
  state.dropTargetId = card.dataset.id || null;
  card.classList.add(state.dropAfter ? "drop-after" : "drop-target");
});

productsEl.addEventListener("drop", async (event) => {
  if (!state.dragProductId) {
    return;
  }
  event.preventDefault();
  const draggedId = state.dragProductId;
  const targetId = state.dropTargetId;
  const placeAfter = state.dropAfter;
  state.dragProductId = null;
  state.dropTargetId = null;
  state.dropAfter = false;
  clearDragClasses();

  if (!targetId || !draggedId) {
    return;
  }

  const moved = moveProductInState(draggedId, targetId, placeAfter);
  if (!moved) {
    return;
  }

  renderProducts();
  setProductMessage("Saving product order...");
  try {
    await persistCurrentProductOrder();
    setProductMessage("Product order updated.");
  } catch (error) {
    if (error.status === 401) {
      logoutBtn.click();
      return;
    }
    await loadProducts();
    setProductMessage(error.message || "Could not reorder products.", true);
  }
});

productsEl.addEventListener("dragend", () => {
  state.dragProductId = null;
  state.dropTargetId = null;
  state.dropAfter = false;
  clearDragClasses();
});

productForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (state.productBusy) {
    return;
  }

  setProductBusy(true);
  setProductMessage("Saving product...");

  const formData = new FormData();
  formData.append("title", titleInput.value);
  formData.append("subtitle", subtitleInput.value);
  formData.append("included", includedInput.value);
  formData.append("price", priceInput.value);
  formData.append("shippingEnabled", String(shippingEnabledInput.checked));
  if (shippingEnabledInput.checked) {
    formData.append("shippingFee", shippingFeeInput.value);
  }
  formData.append("inStock", String(inStockInput.checked));
  formData.append("isComingSoon", String(isComingSoonInput.checked));
  formData.append("allowPreorder", String(allowPreorderInput.checked));
  formData.append("isVisible", String(isVisibleInput.checked));

  const file = imageFileInput.files?.[0];
  if (file) {
    formData.append("image", file);
  }
  const imageUrl = imageUrlInput.value.trim();
  if (imageUrl) {
    formData.append("imageUrl", imageUrl);
  }
  formData.append("productImageUrls", productGalleryUrlsInput.value);
  formData.append("includedImageUrls", includedGalleryUrlsInput.value);

  const productGalleryFiles = Array.from(productGalleryFilesInput.files || []);
  productGalleryFiles.forEach((file) => {
    formData.append("productImages", file);
  });

  const includedGalleryFiles = Array.from(includedGalleryFilesInput.files || []);
  includedGalleryFiles.forEach((file) => {
    formData.append("includedImages", file);
  });

  if (removeImageInput.checked) {
    formData.append("removeImage", "true");
  }

  const editingId = productIdInput.value;
  const method = editingId ? "PUT" : "POST";
  const targetUrl = editingId
    ? `/api/admin/products/${encodeURIComponent(editingId)}`
    : "/api/admin/products";

  try {
    await adminRequest(targetUrl, {
      method,
      body: formData
    });
    resetForm();
    await loadProducts();
    setProductMessage(editingId ? "Product updated." : "Product created.");
  } catch (error) {
    if (error.status === 401) {
      logoutBtn.click();
      return;
    }
    setProductMessage(error.message || "Could not save product.", true);
  } finally {
    setProductBusy(false);
  }
});

shippingEnabledInput.addEventListener("change", () => {
  syncShippingInputs();
});

resetSiteSettingsBtn.addEventListener("click", () => {
  fillSiteSettingsForm(state.siteSettings);
  setDesignMessage("Unsaved design changes were cleared.");
});

siteSettingsForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (state.designBusy) {
    return;
  }

  setDesignBusy(true);
  setDesignMessage("Saving storefront design...");

  const formData = new FormData();
  Object.entries(siteInputs).forEach(([key, input]) => {
    if (!input) {
      return;
    }
    formData.append(key, input.value);
  });

  const logoFile = siteLogoFileInput.files?.[0];
  if (logoFile) {
    formData.append("logoImage", logoFile);
  }

  const bannerFile = siteBannerFileInput.files?.[0];
  if (bannerFile) {
    formData.append("heroBannerImage", bannerFile);
  }

  const logoImageUrl = siteLogoUrlInput.value.trim();
  if (logoImageUrl) {
    formData.append("logoImageUrl", logoImageUrl);
  }
  const heroBannerImageUrl = siteBannerUrlInput.value.trim();
  if (heroBannerImageUrl) {
    formData.append("heroBannerImageUrl", heroBannerImageUrl);
  }
  if (siteRemoveLogoInput.checked) {
    formData.append("removeLogo", "true");
  }
  if (siteRemoveBannerInput.checked) {
    formData.append("removeBanner", "true");
  }

  try {
    const updated = await adminRequest("/api/admin/site-settings", {
      method: "PUT",
      body: formData
    });
    fillSiteSettingsForm(updated);
    setDesignMessage("Storefront design updated.");
  } catch (error) {
    if (error.status === 401) {
      logoutBtn.click();
      return;
    }
    setDesignMessage(error.message || "Could not save storefront design.", true);
  } finally {
    setDesignBusy(false);
  }
});

ensureAuthenticated().catch(() => {
  showLogin();
});

syncShippingInputs();
