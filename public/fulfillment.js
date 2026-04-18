const loginCard = document.getElementById("fulfillment-login-card");
const fulfillmentPanel = document.getElementById("fulfillment-panel");
const loginForm = document.getElementById("fulfillment-login-form");
const passwordInput = document.getElementById("fulfillment-password");
const loginMessageEl = document.getElementById("fulfillment-login-message");
const logoutBtn = document.getElementById("fulfillment-logout-btn");
const openShippoBtn = document.getElementById("fulfillment-open-shippo-btn");
const refreshOrdersBtn = document.getElementById("fulfillment-refresh-btn");
const exportShippoCsvBtn = document.getElementById("fulfillment-export-shippo-csv-btn");
const ordersSearchInput = document.getElementById("fulfillment-search");
const summaryEl = document.getElementById("fulfillment-summary");
const orderCustomersEl = document.getElementById("fulfillment-order-customers");
const ordersEl = document.getElementById("fulfillment-orders");
const ordersMessageEl = document.getElementById("fulfillment-message");
const soldCounterEl = document.getElementById("fulfillment-sold-counter");
const soldCounterValueEl = document.getElementById("fulfillment-sold-counter-value");
const soldCounterKickerEl = document.getElementById("fulfillment-sold-kicker");
const soldCounterLabelEl = document.getElementById("fulfillment-sold-counter-label");
const soldCounterNoteEl = document.getElementById("fulfillment-sold-counter-note");
const editionBoardEl = document.getElementById("fulfillment-edition-board");

const ADMIN_KEY = "publishearts_admin_password_v1";
const SHIPPO_MANUAL_LABEL_URL = "https://apps.goshippo.com/orders";
const SHIPPO_ORDER_EXPORT_VERSION = "SHIPPO_ORDER_EXPORT_V2";
const COPIES_PER_EDITION = 50;
const PAGE_MODE = String(document.body?.dataset?.pageMode || "fulfillment").trim().toLowerCase();
const isCompletedOrdersPage = PAGE_MODE === "completed-orders";

const state = {
  adminPassword: window.localStorage.getItem(ADMIN_KEY) || "",
  ordersBusy: false,
  ordersPayload: null,
  selectedOrderIds: new Set(),
  soldCounterValue: 0,
  soldCounterAnimationFrame: 0,
  soldCounterEdition: 1
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

function setOrdersMessage(message, isError = false) {
  setMessage(ordersMessageEl, message, isError);
}

function setOrdersBusy(isBusy) {
  state.ordersBusy = isBusy;
  if (refreshOrdersBtn) {
    refreshOrdersBtn.disabled = isBusy;
  }
  if (exportShippoCsvBtn) {
    exportShippoCsvBtn.disabled = isBusy;
  }
  if (openShippoBtn) {
    openShippoBtn.disabled = isBusy;
  }
  if (ordersSearchInput) {
    ordersSearchInput.disabled = isBusy;
  }
  ordersEl?.querySelectorAll("button[data-action]").forEach((button) => {
    button.disabled = isBusy;
  });
  ordersEl?.querySelectorAll("input[data-action='save-package-weight']").forEach((input) => {
    input.disabled = isBusy;
  });
  ordersEl?.querySelectorAll("input[data-action='toggle-selected-order']").forEach((input) => {
    input.disabled = isBusy;
  });
  editionBoardEl?.querySelectorAll("input[data-action='save-package-weight']").forEach((input) => {
    input.disabled = isBusy;
  });
}

function showLogin() {
  loginCard.classList.remove("hidden");
  fulfillmentPanel.classList.add("hidden");
  logoutBtn.classList.add("hidden");
}

function showPanel() {
  loginCard.classList.add("hidden");
  fulfillmentPanel.classList.remove("hidden");
  logoutBtn.classList.remove("hidden");
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  const text = await response.text();
  return { error: text || "Request failed." };
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

function toCsvCell(value) {
  const safeValue = String(value ?? "");
  const needsQuotes = safeValue.includes('"') || safeValue.includes(",") || safeValue.includes("\n") || safeValue.includes("\r");
  const escapedValue = safeValue.replace(/"/g, '""');
  return needsQuotes ? `"${escapedValue}"` : escapedValue;
}

function downloadTextFile(filename, text, mimeType = "text/plain;charset=utf-8") {
  const blob = new Blob([String(text || "")], { type: mimeType });
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(objectUrl);
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

function formatCopyLabel(units) {
  const total = Math.max(0, Math.round(Number(units) || 0));
  return `${formatWholeNumber(total)} ${total === 1 ? "copy" : "copies"}`;
}

function formatShortOrderLabel(orderId) {
  const cleanId = String(orderId || "").trim();
  if (!cleanId) {
    return "Order";
  }
  return cleanId.length > 12 ? `Order ${cleanId.slice(-8)}` : `Order ${cleanId}`;
}

function isOrderShippingRequired(order) {
  return order?.shippingRequired !== false;
}

function isOrderBlockedForStateMismatch(order) {
  if (!isOrderShippingRequired(order)) {
    return false;
  }
  return (
    order?.shippingStateMatchesCustomerState === false ||
    String(order?.fulfillmentHoldReason || "").trim() === "state_mismatch"
  );
}

function isOrderBulkShippable(order) {
  return isOrderShippingRequired(order) && String(order?.fulfillmentStatus || "pending") !== "shipped" && !isOrderBlockedForStateMismatch(order);
}

function syncSelectedOrderIds(orders) {
  const validIds = new Set(
    (Array.isArray(orders) ? orders : [])
      .filter((order) => isOrderBulkShippable(order))
      .map((order) => String(order.id || "").trim())
      .filter(Boolean)
  );
  state.selectedOrderIds = new Set(
    Array.from(state.selectedOrderIds).filter((orderId) => validIds.has(String(orderId || "").trim()))
  );
}

function getSelectedBulkOrders(orders) {
  const safeOrders = Array.isArray(orders) ? orders : [];
  return safeOrders.filter((order) => {
    const orderId = String(order?.id || "").trim();
    return orderId && state.selectedOrderIds.has(orderId) && isOrderBulkShippable(order);
  });
}

function formatOrderSourceLabel(orderSource) {
  const normalized = String(orderSource || "").trim().toLowerCase();
  if (normalized === "admin_pos") {
    return "POS";
  }
  return "Web";
}

function getOrderPackagedAt(order) {
  const packagedAt = Number(order?.packagedAt);
  if (Number.isFinite(packagedAt) && packagedAt > 0) {
    return packagedAt;
  }
  const shippedAt = Number(order?.shippedAt);
  if (Number.isFinite(shippedAt) && shippedAt > 0 && String(order?.fulfillmentStatus || "pending") === "shipped") {
    return shippedAt;
  }
  return 0;
}

function isOrderPackaged(order) {
  return getOrderPackagedAt(order) > 0;
}

function getOrderPackageWeightValue(order) {
  return String(order?.packageWeightValue ?? "").trim();
}

function parsePackageWeightValue(value) {
  const text = String(value ?? "").trim();
  if (!text) {
    return null;
  }
  if (!/^\d+(\.\d{1,2})?$/.test(text)) {
    return null;
  }
  const parsed = Number.parseFloat(text);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 9999) {
    return null;
  }
  return Number(parsed.toFixed(2));
}

function getShippoExportWeightLbs(order) {
  const packageWeight = parsePackageWeightValue(getOrderPackageWeightValue(order));
  if (packageWeight !== null && packageWeight > 0) {
    return packageWeight.toFixed(2);
  }
  const algorithmWeight = Number(order?.shippingWeightLbs);
  if (Number.isFinite(algorithmWeight) && algorithmWeight > 0) {
    return algorithmWeight.toFixed(2);
  }
  return "";
}

function getShippoExportWeightSource(order) {
  const packageWeight = parsePackageWeightValue(getOrderPackageWeightValue(order));
  if (packageWeight !== null && packageWeight > 0) {
    return "package_weight";
  }
  const algorithmWeight = Number(order?.shippingWeightLbs);
  if (Number.isFinite(algorithmWeight) && algorithmWeight > 0) {
    return "shipping_algorithm";
  }
  return "missing";
}

function getItemsSummaryText(items) {
  const normalizedItems = Array.isArray(items) ? items : [];
  return normalizedItems
    .map((item) => {
      const name = sanitizeExportValue(item?.name);
      const quantity = Number.isFinite(Number(item?.quantity)) ? Number(item.quantity) : 0;
      return `${name} x${Math.max(0, quantity)}`;
    })
    .join(" | ");
}

function buildShippoOrdersCsv(orders) {
  const headers = [
    "recipient_name",
    "street_line_1",
    "street_line_2",
    "postal_zip_code",
    "city",
    "state",
    "country",
    "recipient_email",
    "phone_number",
    "order_number",
    "order_date",
    "total_order_weight",
    "total_order_weight_unit",
    "total_order_price",
    "order_currency",
    "shipping_amount_paid_usd",
    "algorithm_weight_lbs",
    "package_weight_lbs",
    "shippo_weight_source",
    "shipping_zone",
    "shipping_state_matches_customer_state",
    "shipping_state_mismatch_reason",
    "order_source",
    "fulfillment_status",
    "units_total",
    "items"
  ];

  const rows = [headers.map((column) => toCsvCell(column)).join(",")];
  const safeRows = Array.isArray(orders) ? orders : [];
  for (const order of safeRows) {
    const createdAtRaw = Number(order?.createdAt);
    const orderDate =
      Number.isFinite(createdAtRaw) && createdAtRaw > 0
        ? new Date(createdAtRaw * 1000).toISOString().slice(0, 10)
        : "";
    const algorithmWeight = Number(order?.shippingWeightLbs);
    const packageWeight = parsePackageWeightValue(getOrderPackageWeightValue(order));
    const row = [
      toCsvCell(order?.shippingName || order?.customerName),
      toCsvCell(order?.shippingAddressLine1),
      toCsvCell(order?.shippingAddressLine2),
      toCsvCell(order?.shippingPostalCode),
      toCsvCell(order?.shippingCity),
      toCsvCell(order?.shippingState),
      toCsvCell(order?.shippingCountry || "US"),
      toCsvCell(order?.customerEmail),
      toCsvCell(order?.customerPhone),
      toCsvCell(order?.id),
      toCsvCell(orderDate),
      toCsvCell(getShippoExportWeightLbs(order)),
      toCsvCell("lb"),
      toCsvCell(formatAmountForExport(order?.amountTotal)),
      toCsvCell(String(order?.currency || "usd").toUpperCase()),
      toCsvCell(formatAmountForExport(order?.amountShipping)),
      toCsvCell(Number.isFinite(algorithmWeight) && algorithmWeight > 0 ? algorithmWeight.toFixed(2) : ""),
      toCsvCell(packageWeight !== null && packageWeight > 0 ? packageWeight.toFixed(2) : ""),
      toCsvCell(getShippoExportWeightSource(order)),
      toCsvCell(Number.isFinite(Number(order?.shippingZone)) ? Number(order.shippingZone) : ""),
      toCsvCell(String(order?.shippingStateMatchesCustomerState !== false)),
      toCsvCell(order?.shippingStateMismatchReason),
      toCsvCell(formatOrderSourceLabel(order?.orderSource)),
      toCsvCell(order?.fulfillmentStatus || "pending"),
      toCsvCell(Number.isFinite(Number(order?.unitsTotal)) ? Math.max(0, Number(order.unitsTotal)) : 0),
      toCsvCell(getItemsSummaryText(order?.items))
    ];
    rows.push(row.join(","));
  }

  return rows.join("\n");
}

function buildShippoOrdersCsvFilename() {
  const now = new Date();
  const utc = now.toISOString().replace(/[:.]/g, "-").replace("T", "-").slice(0, 19);
  return `publishearts-shippo-unshipped-${utc}Z.csv`;
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
  const exportWeight = getShippoExportWeightLbs(order);
  const algorithmWeightRaw = Number(order?.shippingWeightLbs);
  const algorithmWeight =
    Number.isFinite(algorithmWeightRaw) && algorithmWeightRaw > 0 ? algorithmWeightRaw.toFixed(2) : "";
  const items = Array.isArray(order?.items) ? order.items : [];
  const lines = [
    SHIPPO_ORDER_EXPORT_VERSION,
    `EXPORTED_AT=${new Date().toISOString()}`,
    `ORDER_ID=${sanitizeExportValue(order?.id)}`,
    `ORDER_DATE_ISO=${sanitizeExportValue(createdAtIso)}`,
    `FULFILLMENT_STATUS=${sanitizeExportValue(order?.fulfillmentStatus || "pending")}`,
    `ORDER_SOURCE=${sanitizeExportValue(formatOrderSourceLabel(order?.orderSource))}`,
    `CURRENCY=${sanitizeExportValue(String(order?.currency || "usd").toUpperCase())}`,
    `AMOUNT_SHIPPING=${formatAmountForExport(order?.amountShipping)}`,
    `AMOUNT_TOTAL=${formatAmountForExport(order?.amountTotal)}`,
    `UNITS_TOTAL=${Math.max(0, Number(order?.unitsTotal) || 0)}`,
    `ALGORITHM_WEIGHT_LBS=${sanitizeExportValue(algorithmWeight)}`,
    `PACKAGE_WEIGHT_LBS=${sanitizeExportValue(getOrderPackageWeightValue(order))}`,
    `SHIPPO_EXPORT_WEIGHT_LBS=${sanitizeExportValue(exportWeight)}`,
    "SHIPPO_EXPORT_WEIGHT_UNIT=lb",
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

  return lines.join("\n");
}

function buildShippoManualLabelTemplate(order) {
  const shippoWeight = getShippoExportWeightLbs(order) || "1.00";
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
    `Weight (lb): ${shippoWeight}`,
    "",
    `Reference: ${order?.id || ""}`,
    items ? `Items: ${items}` : ""
  ]
    .filter(Boolean)
    .join("\n");
}

async function copyTextToClipboard(text) {
  const value = String(text || "");
  if (!value || !navigator.clipboard || !navigator.clipboard.writeText) {
    return false;
  }
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

function getOrderSearchQuery() {
  return String(ordersSearchInput?.value || "").trim().toLowerCase();
}

function getOrdersForCurrentPage(rawOrders) {
  const safeOrders = Array.isArray(rawOrders) ? rawOrders : [];
  if (isCompletedOrdersPage) {
    return safeOrders.filter(
      (order) => isOrderShippingRequired(order) && String(order?.fulfillmentStatus || "pending") === "shipped"
    );
  }
  return safeOrders;
}

function buildCustomersFromOrders(orders) {
  const customerMap = new Map();
  const safeOrders = Array.isArray(orders) ? orders : [];
  for (const order of safeOrders) {
    const email = String(order?.customerEmail || "").trim();
    const key = email ? email.toLowerCase() : `guest:${String(order?.id || "").trim()}`;
    const existing = customerMap.get(key) || {
      key,
      email,
      name: String(order?.customerName || "Unknown customer").trim(),
      ordersCount: 0,
      unitsTotal: 0,
      amountTotal: 0,
      lastOrderAt: 0,
      orderIds: []
    };
    existing.ordersCount += 1;
    existing.unitsTotal += Math.max(0, Number(order?.unitsTotal) || 0);
    existing.amountTotal += Math.max(0, Number(order?.amountTotal) || 0);
    existing.lastOrderAt = Math.max(existing.lastOrderAt, Number(order?.createdAt) || 0);
    if (!existing.name && order?.customerName) {
      existing.name = String(order.customerName || "").trim();
    }
    existing.orderIds.push(String(order?.id || "").trim());
    customerMap.set(key, existing);
  }
  return Array.from(customerMap.values()).sort((left, right) => right.lastOrderAt - left.lastOrderAt);
}

function getFilteredOrdersForDisplay(payload) {
  const allOrders = getOrdersForCurrentPage(payload?.orders);
  const allCustomers = buildCustomersFromOrders(allOrders);
  const query = getOrderSearchQuery();
  const matchesSearch = (order) => {
    if (!query) {
      return true;
    }
    const haystack = [
      order.id,
      order.customerName,
      order.customerEmail,
      order.customerState,
      order.orderSource,
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

  return { allOrders, orders, customers, query };
}

function renderSummary(allOrders) {
  if (!summaryEl) {
    return;
  }
  const orders = Array.isArray(allOrders) ? allOrders : [];
  if (isCompletedOrdersPage) {
    const trackedOrders = orders.filter((order) => order?.shipmentTrackingNumber || order?.shipmentTrackingUrl);
    const carrierOrders = orders.filter((order) => String(order?.shipmentCarrier || "").trim());
    const recentCutoffSeconds = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;
    const recentOrders = orders.filter((order) => Number(order?.shippedAt) >= recentCutoffSeconds);
    const revenueTotal = orders.reduce((sum, order) => sum + Math.max(0, Number(order?.amountTotal) || 0), 0);

    summaryEl.innerHTML = `
      <article class="admin-health-card">
        <h3>Completed</h3>
        <p><strong>${formatWholeNumber(orders.length)}</strong> shipped orders on file</p>
        <p>Lookup by customer, order number, or state.</p>
      </article>
      <article class="admin-health-card">
        <h3>Revenue</h3>
        <p><strong>${formatMoney(revenueTotal)}</strong> across shipped orders</p>
        <p>Based on order totals already captured in Stripe.</p>
      </article>
      <article class="admin-health-card">
        <h3>Tracking Saved</h3>
        <p><strong>${formatWholeNumber(trackedOrders.length)}</strong> completed orders have tracking info</p>
        <p><strong>${formatWholeNumber(carrierOrders.length)}</strong> have a carrier saved</p>
      </article>
      <article class="admin-health-card">
        <h3>Recent</h3>
        <p><strong>${formatWholeNumber(recentOrders.length)}</strong> shipped in the last 7 days</p>
        <p>Use this page to resend shipment emails or reopen an order.</p>
      </article>
    `;
    return;
  }

  const shippingOrders = orders.filter((order) => isOrderShippingRequired(order));
  const pendingShippingOrders = shippingOrders.filter((order) => String(order.fulfillmentStatus || "pending") !== "shipped");
  const shippedOrders = shippingOrders.filter((order) => String(order.fulfillmentStatus || "pending") === "shipped");
  const pickupOrders = orders.filter((order) => !isOrderShippingRequired(order));
  const blockedOrders = pendingShippingOrders.filter(
    (order) =>
      order.shippingStateMatchesCustomerState === false ||
      String(order.fulfillmentHoldReason || "").trim() === "state_mismatch"
  );
  const missingPackageWeights = pendingShippingOrders.filter((order) => !getOrderPackageWeightValue(order));

  summaryEl.innerHTML = `
    <article class="admin-health-card">
      <h3>Shippo Queue</h3>
      <p><strong>${formatWholeNumber(pendingShippingOrders.length)}</strong> pending shipping orders</p>
      <p><strong>${formatWholeNumber(missingPackageWeights.length)}</strong> still need package weight entered</p>
    </article>
    <article class="admin-health-card">
      <h3>State Blocks</h3>
      <p><strong>${formatWholeNumber(blockedOrders.length)}</strong> orders blocked by state mismatch</p>
      <p>Use the shipping state fix before marking those shipped.</p>
    </article>
    <article class="admin-health-card">
      <h3>Pickup / POS</h3>
      <p><strong>${formatWholeNumber(pickupOrders.length)}</strong> paid orders need no shipping</p>
      <p>These still count toward sold copies.</p>
    </article>
    <article class="admin-health-card">
      <h3>Shipped</h3>
      <p><strong>${formatWholeNumber(shippedOrders.length)}</strong> shipped orders saved in Stripe</p>
      <p>Resend shipment email or move back to pending when needed.</p>
    </article>
  `;
}

function buildEditionOrderBuckets(orders) {
  const safeOrders = Array.isArray(orders) ? [...orders] : [];
  const chronologicalOrders = safeOrders.sort((left, right) => {
    const leftCreatedAt = Number(left?.createdAt) || 0;
    const rightCreatedAt = Number(right?.createdAt) || 0;
    return leftCreatedAt - rightCreatedAt;
  });

  const buckets = [];
  let currentEdition = 1;
  let copiesUsedInEdition = 0;
  let packagedUnitsInEdition = 0;
  let entries = [];

  const flushCurrentEdition = () => {
    buckets.push({
      editionNumber: currentEdition,
      unitsInEdition: copiesUsedInEdition,
      packagedUnitsInEdition,
      entries
    });
  };

  for (const order of chronologicalOrders) {
    let remainingUnits = Math.max(0, Math.round(Number(order?.bookUnitsTotal ?? order?.unitsTotal) || 0));
    if (remainingUnits <= 0) {
      continue;
    }

    const buyerName = String(order?.customerName || order?.shippingName || order?.customerEmail || "Unknown customer").trim();
    const orderId = String(order?.id || "").trim();
    const packagedAt = getOrderPackagedAt(order);
    const packaged = packagedAt > 0;
    const packageWeightValue = getOrderPackageWeightValue(order);
    const shipped = String(order?.fulfillmentStatus || "pending") === "shipped";
    const shippingRequired = isOrderShippingRequired(order);
    const orderSource = formatOrderSourceLabel(order?.orderSource);

    while (remainingUnits > 0) {
      const openSpots = COPIES_PER_EDITION - copiesUsedInEdition;
      if (openSpots <= 0) {
        flushCurrentEdition();
        currentEdition += 1;
        copiesUsedInEdition = 0;
        packagedUnitsInEdition = 0;
        entries = [];
        continue;
      }

      const unitsToAllocate = Math.min(openSpots, remainingUnits);
      entries.push({
        orderId,
        buyerName,
        units: unitsToAllocate,
        packagedAt,
        packageWeightValue,
        isPackaged: packaged,
        isShipped: shipped,
        isShippingRequired: shippingRequired,
        orderSource
      });
      copiesUsedInEdition += unitsToAllocate;
      if (packaged) {
        packagedUnitsInEdition += unitsToAllocate;
      }
      remainingUnits -= unitsToAllocate;

      if (copiesUsedInEdition >= COPIES_PER_EDITION) {
        flushCurrentEdition();
        currentEdition += 1;
        copiesUsedInEdition = 0;
        packagedUnitsInEdition = 0;
        entries = [];
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

  const buckets = buildEditionOrderBuckets(orders);
  editionBoardEl.innerHTML = buckets
    .map((bucket) => {
      const buyersHtml =
        bucket.entries.length > 0
          ? `<ul class="admin-edition-buyers">
              ${bucket.entries
                .map((entry) => {
                  const statusLabel = entry.isShippingRequired
                    ? entry.isShipped
                      ? "Shipped"
                      : entry.isPackaged
                        ? "Packaged"
                        : "Open"
                    : entry.isPackaged
                      ? "Completed"
                      : "POS";
                  const metaParts = [formatShortOrderLabel(entry.orderId), entry.orderSource, formatCopyLabel(entry.units)];
                  if (entry.isPackaged && entry.packagedAt > 0) {
                    metaParts.push(`${entry.isShippingRequired ? "Packed" : "Completed"} ${formatDateTime(entry.packagedAt)}`);
                  }
                  const packagedTitle = entry.isShippingRequired
                    ? entry.isShipped
                      ? "Already shipped"
                      : entry.isPackaged
                        ? "Click to unmark packaged"
                        : "Click to mark packaged"
                    : entry.isPackaged
                      ? "Click to unmark completed"
                      : "Click to mark completed";
                  return `<li>
                    <div
                      class="admin-edition-entry ${entry.isPackaged ? "is-packaged" : ""} ${entry.isShipped ? "is-shipped" : ""}"
                      data-action="toggle-packaged-order"
                      data-id="${escapeHtml(entry.orderId)}"
                      title="${escapeHtml(packagedTitle)}"
                      role="button"
                      tabindex="0"
                      aria-disabled="${entry.isShipped ? "true" : "false"}"
                    >
                      <span class="admin-edition-entry-main">
                        <span class="admin-edition-entry-header">
                          <span class="admin-edition-entry-name">${escapeHtml(entry.buyerName)}</span>
                          ${
                            entry.isShippingRequired
                              ? `<label class="admin-edition-weight" data-package-weight-field>
                                  <span class="admin-edition-weight-label">Wt</span>
                                  <input
                                    class="admin-edition-weight-input"
                                    type="number"
                                    inputmode="decimal"
                                    step="0.01"
                                    min="0"
                                    placeholder="0"
                                    value="${escapeHtml(entry.packageWeightValue)}"
                                    data-action="save-package-weight"
                                    data-id="${escapeHtml(entry.orderId)}"
                                    ${entry.isShipped ? "disabled" : ""}
                                  />
                                </label>`
                              : ""
                          }
                        </span>
                        <span class="admin-edition-entry-meta">${escapeHtml(metaParts.join(" | "))}</span>
                      </span>
                      <span class="admin-edition-entry-side">
                        <strong class="admin-edition-buyer-count">${formatWholeNumber(entry.units)}</strong>
                        <span class="admin-edition-entry-status">${escapeHtml(statusLabel)}</span>
                      </span>
                    </div>
                  </li>`;
                })
                .join("")}
            </ul>`
          : `<p class="cart-item-sub">No book orders in this edition yet.</p>`;

      return `<article class="admin-edition-card">
        <h3>${escapeHtml(formatEditionWindowTitle(bucket.editionNumber))}</h3>
        <p class="admin-edition-progress">${formatWholeNumber(bucket.unitsInEdition)} / ${COPIES_PER_EDITION} copies | ${formatWholeNumber(bucket.packagedUnitsInEdition)} packaged</p>
        ${buyersHtml}
      </article>`;
    })
    .join("");
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
  const soldUnits = orderList.reduce((sum, order) => sum + Math.max(0, Number(order?.bookUnitsTotal ?? order?.unitsTotal) || 0), 0);
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

function renderOrders(payload) {
  if (!ordersEl || !orderCustomersEl) {
    return;
  }

  const { allOrders, orders, customers, query } = getFilteredOrdersForDisplay(payload);
  syncSelectedOrderIds(allOrders);
  updateSoldCounter(allOrders);
  renderEditionBoard(allOrders);
  renderSummary(allOrders);

  if (customers.length > 0) {
    orderCustomersEl.innerHTML = `
      <h3>${isCompletedOrdersPage ? "Completed Customer History" : "Customer History"}${query ? ` (${customers.length} match)` : ""}</h3>
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
    orderCustomersEl.innerHTML = `<h3>${isCompletedOrdersPage ? "Completed Customer History" : "Customer History"}</h3><p class="cart-item-sub">${
      isCompletedOrdersPage ? "No completed orders found yet." : "No customer history yet."
    }</p>`;
  }

  if (orders.length === 0) {
    ordersEl.innerHTML = `<p class="cart-item-sub">${
      query
        ? isCompletedOrdersPage
          ? "No completed orders matched your search."
          : "No orders matched your search."
        : isCompletedOrdersPage
          ? "No completed orders found yet."
          : "No paid orders found yet."
    }</p>`;
    setOrdersBusy(state.ordersBusy);
    return;
  }

  const shippingOrders = orders.filter((order) => isOrderShippingRequired(order));
  const pendingShippingOrders = shippingOrders.filter((order) => String(order.fulfillmentStatus || "pending") !== "shipped");
  const shippedOrders = shippingOrders.filter((order) => String(order.fulfillmentStatus || "pending") === "shipped");
  const pickupOrders = orders.filter((order) => !isOrderShippingRequired(order));
  const visibleBulkEligibleOrders = pendingShippingOrders.filter((order) => isOrderBulkShippable(order));
  const selectedBulkOrders = getSelectedBulkOrders(allOrders);

  const renderOrderCard = (order) => {
    const itemSummary =
      Array.isArray(order.items) && order.items.length > 0
        ? order.items.map((item) => `${escapeHtml(item.name)} x${item.quantity}`).join(", ")
        : "No item summary saved.";
    const pastOrders =
      Array.isArray(order.customerPastOrderIds) && order.customerPastOrderIds.length > 0
        ? order.customerPastOrderIds.map((orderId) => escapeHtml(orderId)).join(", ")
        : "None";
    const shippingRequired = isOrderShippingRequired(order);
    const sourceLabel = formatOrderSourceLabel(order.orderSource);
    const shipped = String(order.fulfillmentStatus || "pending") === "shipped";
    const fulfillmentLabel = shippingRequired ? (shipped ? "Shipped" : "Needs Fulfillment") : "No Shipping Required";
    const fulfillmentClass = shippingRequired ? (shipped ? "shipped" : "pending") : "pickup";
    const shipDate = order.shippedAt ? formatDateTime(order.shippedAt) : "";
    const shippingWeightRaw = Number(order.shippingWeightLbs);
    const shippingWeightLabel =
      !shippingRequired
        ? "Not needed"
        : Number.isFinite(shippingWeightRaw) && shippingWeightRaw > 0
          ? `${shippingWeightRaw.toFixed(2)} lb`
          : "Unknown";
    const shippingBillableWeightRaw = Number(order.shippingBillableWeightLbs);
    const shippingBillableWeightLabel =
      !shippingRequired
        ? "Not needed"
        : Number.isFinite(shippingBillableWeightRaw) && shippingBillableWeightRaw > 0
          ? `${shippingBillableWeightRaw.toFixed(2)} lb`
          : "Unknown";
    const shippingZoneRaw = Number(order.shippingZone);
    const shippingZoneLabel =
      shippingRequired && Number.isFinite(shippingZoneRaw) && shippingZoneRaw >= 1 && shippingZoneRaw <= 8
        ? `Zone ${Math.round(shippingZoneRaw)}`
        : shippingRequired
          ? "Unknown"
          : "Not needed";
    const selectedState = String(order.customerState || "").trim().toUpperCase();
    const shippingState = String(order.shippingState || "").trim().toUpperCase();
    const shippingCountry = String(order.shippingCountry || "US").trim().toUpperCase();
    const shippingStateMatchesCustomerState = order.shippingStateMatchesCustomerState !== false;
    const shippingStateMismatchReason = String(order.shippingStateMismatchReason || "").trim();
    const fulfillmentHoldReason = String(order.fulfillmentHoldReason || "").trim();
    const blockedForStateMismatch = isOrderBlockedForStateMismatch(order);
    const canUseShippingStateFallback =
      blockedForStateMismatch && !selectedState && Boolean(shippingState) && shippingCountry === "US";
    const bulkShippable = isOrderBulkShippable(order);
    const selectedForBulkShip = bulkShippable && state.selectedOrderIds.has(String(order.id || "").trim());
    const stateCheckText = shippingRequired
      ? blockedForStateMismatch
        ? `Blocked - ${shippingStateMismatchReason || `Selected ${selectedState || "Unknown"} vs shipping ${shippingState || "Unknown"} (${shippingCountry})`}`
        : `Match (${selectedState || "Unknown"} -> ${shippingState || selectedState || "Unknown"})`
      : `Not required (${sourceLabel} checkout)`;
    const shippingNameLabel = shippingRequired ? escapeHtml(order.shippingName || "Unknown") : "No shipping required";
    const shippingAddressLabel = shippingRequired ? escapeHtml(order.shippingAddress || "No address") : "Customer left with purchase";
    const packageWeightValue = getOrderPackageWeightValue(order);
    const shippoExportWeight = getShippoExportWeightLbs(order);
    const shippingToolsHtml = shippingRequired && !isCompletedOrdersPage
      ? `
        ${
          canUseShippingStateFallback
            ? `<button class="ghost-btn" type="button" data-action="use-shipping-state" data-id="${escapeHtml(order.id)}">Use Shipping State</button>`
            : ""
        }
        <button class="ghost-btn" type="button" data-action="open-shippo-order" data-id="${escapeHtml(order.id)}">Open Shippo</button>
        <button class="ghost-btn" type="button" data-action="export-shippo-order-txt" data-id="${escapeHtml(order.id)}">Export Shipping TXT</button>
        <button class="ghost-btn" type="button" data-action="edit-shipping-address" data-id="${escapeHtml(order.id)}">Edit Address</button>
        <button class="ghost-btn" type="button" data-action="save-shipping-address" data-id="${escapeHtml(order.id)}">Save Address</button>
      `
      : "";
    const fulfillmentActionHtml = shippingRequired
      ? shipped
        ? `<button class="ghost-btn" type="button" data-action="resend-shipped-email" data-id="${escapeHtml(order.id)}">Send Shipment Email</button>
           <button class="ghost-btn" type="button" data-action="mark-pending-order" data-id="${escapeHtml(order.id)}">Mark Pending</button>`
        : `${blockedForStateMismatch
            ? `<button class="danger-btn" type="button" data-action="override-state-mismatch" data-id="${escapeHtml(order.id)}">
                 Override Block
               </button>`
            : ""}
           <button
             class="primary-btn"
             type="button"
             data-action="mark-shipped-order"
             data-id="${escapeHtml(order.id)}"
             ${blockedForStateMismatch ? 'disabled title="Override or fix the state mismatch first"' : ""}
           >
             Mark Shipped
           </button>`
      : "";

    return `<article class="admin-order-card ${selectedForBulkShip ? "is-selected" : ""}">
      <div class="row-between fulfillment-order-head">
        <div class="fulfillment-order-head-main">
          ${
            bulkShippable
              ? `<label class="fulfillment-select-toggle">
                   <input
                     type="checkbox"
                     data-action="toggle-selected-order"
                     data-id="${escapeHtml(order.id)}"
                     ${selectedForBulkShip ? "checked" : ""}
                   />
                   <span>Select</span>
                 </label>`
              : ""
          }
          <h4>${escapeHtml(order.id)}</h4>
        </div>
        <strong>${formatMoney(order.amountTotal || 0)}</strong>
      </div>
      <p><strong>Status:</strong> <span class="admin-order-status ${fulfillmentClass}">${fulfillmentLabel}</span>${shipDate ? ` - ${escapeHtml(shipDate)}` : ""}</p>
      <p><strong>Source:</strong> ${escapeHtml(sourceLabel)}</p>
      <p><strong>Date:</strong> ${escapeHtml(formatDateTime(order.createdAt))}</p>
      <p><strong>Customer:</strong> ${escapeHtml(order.customerName || "Unknown")} (${escapeHtml(order.customerEmail || "No email")})</p>
      <p><strong>State:</strong> ${escapeHtml(order.customerState || "Unknown")} ${order.customerTaxExemptByState ? "(no-sales-tax state)" : ""}</p>
      <p><strong>Ship to:</strong> ${shippingNameLabel} - ${shippingAddressLabel}</p>
      <p><strong>Address state check:</strong> ${escapeHtml(stateCheckText)}</p>
      ${
        shippingRequired
          ? `<div class="fulfillment-weight-stack">
               <p><strong>Shipping math:</strong> ${escapeHtml(shippingWeightLabel)} estimated | ${escapeHtml(
                 shippingBillableWeightLabel
               )} billable | <strong>Zone:</strong> ${escapeHtml(shippingZoneLabel)}</p>
               <label class="admin-edition-weight fulfillment-inline-weight">
                 <span class="admin-edition-weight-label">Pkg Wt</span>
                 <input
                   class="admin-edition-weight-input"
                   type="number"
                   inputmode="decimal"
                   step="0.01"
                   min="0"
                   placeholder="0"
                   value="${escapeHtml(packageWeightValue)}"
                   data-action="save-package-weight"
                   data-id="${escapeHtml(order.id)}"
                   ${shipped ? "disabled" : ""}
                 />
               </label>
               <p class="cart-item-sub">Shippo export weight: ${escapeHtml(shippoExportWeight || "Missing")} ${
                 shippoExportWeight ? "lb" : ""
               }${packageWeightValue ? " using package weight" : " using shipping algorithm fallback"}</p>
             </div>`
          : `<p><strong>Weight:</strong> Not required for pickup/POS orders.</p>`
      }
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
      ${order.shipmentCarrier ? `<p><strong>Carrier:</strong> ${escapeHtml(order.shipmentCarrier)}</p>` : ""}
      <p><strong>Past orders by this customer:</strong> ${pastOrders}</p>
      <p><strong>Customer total orders:</strong> ${order.customerOrdersCount || 1}</p>
      <div class="admin-card-actions">
        ${shippingToolsHtml}
        <button class="danger-btn" type="button" data-action="exclude-order" data-id="${escapeHtml(order.id)}">Remove Refunded Order</button>
        ${fulfillmentActionHtml}
      </div>
    </article>`;
  };

  if (isCompletedOrdersPage) {
    ordersEl.innerHTML = `
      <h3>Completed Orders (${shippedOrders.length}${query ? ` / ${allOrders.length} total` : ""})</h3>
      <div class="admin-orders-list">
        ${
          shippedOrders.length > 0
            ? shippedOrders.map(renderOrderCard).join("")
            : '<p class="cart-item-sub">No completed shipped orders found.</p>'
        }
      </div>
    `;
    setOrdersBusy(state.ordersBusy);
    return;
  }

  ordersEl.innerHTML = `
    <h3>Needs Fulfillment (${pendingShippingOrders.length}${query ? ` / ${allOrders.length} total` : ""})</h3>
    ${
      visibleBulkEligibleOrders.length > 0
        ? `<div class="fulfillment-bulk-toolbar">
             <div class="fulfillment-bulk-copy">
               <p><strong>${formatWholeNumber(selectedBulkOrders.length)}</strong> selected for bulk ship</p>
               <p>${formatWholeNumber(visibleBulkEligibleOrders.length)} visible eligible order${visibleBulkEligibleOrders.length === 1 ? "" : "s"}${query ? " in this search" : ""}</p>
             </div>
              <div class="admin-card-actions">
                <button class="ghost-btn" type="button" data-action="select-visible-orders">Select Visible</button>
                <button class="ghost-btn" type="button" data-action="clear-selected-orders">Clear Selection</button>
                <button
                  class="ghost-btn"
                  type="button"
                  data-action="bulk-mark-shipped-from-pdf"
                  ${selectedBulkOrders.length === 0 ? "disabled" : ""}
                >
                  Ship from Labels PDF
                </button>
                <button
                  class="primary-btn"
                  type="button"
                  data-action="bulk-mark-shipped-orders"
                 ${selectedBulkOrders.length === 0 ? "disabled" : ""}
               >
                 Mark Selected Shipped
               </button>
             </div>
           </div>`
        : ""
    }
    <div class="admin-orders-list">
      ${
        pendingShippingOrders.length > 0
          ? pendingShippingOrders.map(renderOrderCard).join("")
          : '<p class="cart-item-sub">No shippable orders waiting to go out.</p>'
      }
    </div>
    <h3>In-Person / No Shipping Required (${pickupOrders.length}${query ? ` / ${allOrders.length} total` : ""})</h3>
    <div class="admin-orders-list">
      ${
        pickupOrders.length > 0
          ? pickupOrders.map(renderOrderCard).join("")
          : '<p class="cart-item-sub">No POS or pickup orders yet.</p>'
      }
    </div>
  `;
  setOrdersBusy(state.ordersBusy);
}

async function loadOrders() {
  const payload = await adminRequest("/api/admin/orders?limit=500");
  state.ordersPayload = payload;
  renderOrders(payload);
}

function promptShipmentDetails(options = {}) {
  const multiple = options?.multiple === true;
  const count = Math.max(1, Math.round(Number(options?.count) || 1));
  const carrier = window.prompt(
    multiple ? `Carrier name (optional, applies to ${count} orders):` : "Carrier name (optional):",
    ""
  );
  if (carrier === null) {
    return null;
  }
  const trackingNumber = window.prompt(
    multiple ? "Tracking number (optional, leave blank if each order has its own label):" : "Tracking number (optional):",
    ""
  );
  if (trackingNumber === null) {
    return null;
  }
  const trackingUrl = window.prompt(
    multiple ? "Tracking URL (optional, applies to all selected orders):" : "Tracking URL (optional):",
    ""
  );
  if (trackingUrl === null) {
    return null;
  }
  const note = window.prompt(
    multiple ? "Optional shipment note for every selected customer email:" : "Optional shipment note for customer email:",
    ""
  );
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

async function shipOrder(orderId, shipmentDetails, extraPayload = {}) {
  return adminRequest(`/api/admin/orders/${encodeURIComponent(orderId)}/ship`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      ...(shipmentDetails || {}),
      ...(extraPayload || {})
    })
  });
}

function normalizeTrackingNumber(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "");
}

function normalizeCarrierName(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }
  const lower = raw.toLowerCase();
  if (lower.includes("usps") || lower.includes("postal")) {
    return "USPS";
  }
  if (lower.includes("ups")) {
    return "UPS";
  }
  if (lower.includes("fedex") || lower.includes("federal express")) {
    return "FedEx";
  }
  if (lower.includes("dhl")) {
    return "DHL";
  }
  return raw;
}

function inferCarrierFromTrackingNumber(trackingNumber, fallbackCarrier = "") {
  const normalizedTracking = normalizeTrackingNumber(trackingNumber);
  if (!normalizedTracking) {
    return normalizeCarrierName(fallbackCarrier);
  }
  if (normalizedTracking.startsWith("1Z") && normalizedTracking.length >= 18) {
    return "UPS";
  }
  if (
    /^(92|93|94|95|96|97)\d{18,24}$/.test(normalizedTracking) ||
    /^420\d{5}9\d{20,24}$/.test(normalizedTracking) ||
    /^9\d{20,25}$/.test(normalizedTracking)
  ) {
    return "USPS";
  }
  if (/^\d{12,15}$/.test(normalizedTracking)) {
    return normalizeCarrierName(fallbackCarrier) || "FedEx";
  }
  return normalizeCarrierName(fallbackCarrier);
}

function buildCarrierTrackingUrl(carrier, trackingNumber) {
  const normalizedTracking = normalizeTrackingNumber(trackingNumber);
  if (!normalizedTracking) {
    return "";
  }
  const normalizedCarrier = inferCarrierFromTrackingNumber(normalizedTracking, carrier);
  if (normalizedCarrier === "USPS") {
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(normalizedTracking)}`;
  }
  if (normalizedCarrier === "UPS") {
    return `https://www.ups.com/track?loc=en_US&tracknum=${encodeURIComponent(normalizedTracking)}`;
  }
  if (normalizedCarrier === "FedEx") {
    return `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(normalizedTracking)}`;
  }
  if (normalizedCarrier === "DHL") {
    return `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${encodeURIComponent(normalizedTracking)}`;
  }
  return "";
}

function normalizeMatchToken(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "");
}

function normalizePostalCode(value) {
  const text = String(value || "").trim();
  const match = text.match(/\d{5}/);
  return match ? match[0] : "";
}

function getOrderIdTokensForMatching(orderId) {
  const normalized = normalizeMatchToken(orderId);
  if (!normalized) {
    return [];
  }
  const tokens = [normalized];
  if (normalized.length > 8) {
    tokens.push(normalized.slice(-8));
  }
  return Array.from(new Set(tokens.filter((token) => token.length >= 6)));
}

function getOrderNameTokensForMatching(order) {
  const source = String(order?.shippingName || order?.customerName || "");
  return Array.from(
    new Set(
      source
        .toUpperCase()
        .split(/[^A-Z0-9]+/g)
        .map((part) => part.trim())
        .filter((part) => part.length >= 3)
    )
  );
}

function getLabelZipCodes(label) {
  const values = Array.isArray(label?.zipCodes) ? label.zipCodes : [];
  return Array.from(new Set(values.map((value) => normalizePostalCode(value)).filter(Boolean)));
}

function choosePdfFile() {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/pdf,.pdf";
    input.style.position = "fixed";
    input.style.left = "-9999px";
    document.body.appendChild(input);
    let settled = false;
    const finish = (file = null) => {
      if (settled) {
        return;
      }
      settled = true;
      input.remove();
      resolve(file);
    };

    input.addEventListener("change", () => {
      const file = input.files && input.files[0] ? input.files[0] : null;
      finish(file);
    });
    input.addEventListener("cancel", () => {
      finish(null);
    });

    input.click();
  });
}

async function parseShippingLabelsPdf(pdfFile) {
  const formData = new FormData();
  formData.append("labelsPdf", pdfFile, String(pdfFile?.name || "labels.pdf"));
  return adminRequest("/api/admin/shipping/parse-label-pdf", {
    method: "POST",
    body: formData
  });
}

function matchPdfLabelsToOrders(labels, orders, options = {}) {
  const allowSequentialFallback = options?.allowSequentialFallback === true;
  const safeLabels = Array.isArray(labels) ? labels : [];
  const safeOrders = Array.isArray(orders) ? orders : [];
  const orderMap = new Map(safeOrders.map((order) => [String(order?.id || "").trim(), order]));
  const remainingOrderIds = new Set(Array.from(orderMap.keys()).filter(Boolean));
  const usedLabelIndexes = new Set();
  const assignments = [];

  const assignLabel = (labelIndex, orderId, reason) => {
    if (!remainingOrderIds.has(orderId) || usedLabelIndexes.has(labelIndex)) {
      return false;
    }
    const label = safeLabels[labelIndex];
    if (!label) {
      return false;
    }
    assignments.push({
      orderId,
      label,
      reason
    });
    remainingOrderIds.delete(orderId);
    usedLabelIndexes.add(labelIndex);
    return true;
  };

  for (let index = 0; index < safeLabels.length; index += 1) {
    const label = safeLabels[index];
    const labelText = normalizeMatchToken(`${label?.matchText || label?.preview || ""}`);
    if (!labelText) {
      continue;
    }
    const idMatches = Array.from(remainingOrderIds).filter((orderId) => {
      const tokens = getOrderIdTokensForMatching(orderId);
      return tokens.some((token) => labelText.includes(token));
    });
    if (idMatches.length === 1) {
      assignLabel(index, idMatches[0], "order_id");
    }
  }

  for (let index = 0; index < safeLabels.length; index += 1) {
    if (usedLabelIndexes.has(index)) {
      continue;
    }
    const label = safeLabels[index];
    const labelZips = getLabelZipCodes(label);
    if (labelZips.length === 0) {
      continue;
    }

    const possibleByZip = Array.from(remainingOrderIds).filter((orderId) => {
      const order = orderMap.get(orderId);
      const orderZip = normalizePostalCode(order?.shippingPostalCode || "");
      return Boolean(orderZip) && labelZips.includes(orderZip);
    });

    if (possibleByZip.length === 1) {
      assignLabel(index, possibleByZip[0], "zip_code");
      continue;
    }
    if (possibleByZip.length <= 1) {
      continue;
    }

    const labelPreviewUpper = String(label?.matchText || label?.preview || "").toUpperCase();
    const scored = possibleByZip
      .map((orderId) => {
        const order = orderMap.get(orderId);
        const nameTokens = getOrderNameTokensForMatching(order);
        const tokenMatches = nameTokens.filter((token) => labelPreviewUpper.includes(token)).length;
        return {
          orderId,
          score: tokenMatches
        };
      })
      .sort((left, right) => right.score - left.score);
    const best = scored[0];
    const second = scored[1];
    if (best && best.score > 0 && (!second || best.score > second.score)) {
      assignLabel(index, best.orderId, "zip_name");
    }
  }

  if (allowSequentialFallback) {
    const leftoverLabels = safeLabels
      .map((label, labelIndex) => ({ label, labelIndex }))
      .filter((entry) => !usedLabelIndexes.has(entry.labelIndex))
      .sort((left, right) => {
        const leftIndex = Number(left.label?.index) || left.labelIndex + 1;
        const rightIndex = Number(right.label?.index) || right.labelIndex + 1;
        return leftIndex - rightIndex;
      });
    const leftoverOrderIds = safeOrders
      .map((order) => String(order?.id || "").trim())
      .filter((orderId) => remainingOrderIds.has(orderId));
    const fallbackCount = Math.min(leftoverLabels.length, leftoverOrderIds.length);
    for (let index = 0; index < fallbackCount; index += 1) {
      assignLabel(leftoverLabels[index].labelIndex, leftoverOrderIds[index], "page_order");
    }
  }

  const assignedOrderIds = new Set(assignments.map((entry) => entry.orderId));
  const unresolvedOrders = safeOrders.filter((order) => !assignedOrderIds.has(String(order?.id || "").trim()));
  const unusedLabels = safeLabels.filter((_, labelIndex) => !usedLabelIndexes.has(labelIndex));

  return {
    assignments,
    unresolvedOrders,
    unusedLabels
  };
}

function buildShipmentPayloadFromLabel(label, defaultNote = "Thank you for your order!") {
  const trackingNumber = normalizeTrackingNumber(label?.trackingNumber);
  const carrier = inferCarrierFromTrackingNumber(trackingNumber, label?.carrier || "");
  const trackingUrl = String(label?.trackingUrl || buildCarrierTrackingUrl(carrier, trackingNumber)).trim();
  return {
    carrier,
    trackingNumber,
    trackingUrl,
    note: String(defaultNote || "Thank you for your order!").trim()
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
  const stateValue = window.prompt("State (2-letter):", String(order?.shippingState || "").trim().toUpperCase());
  if (stateValue === null) {
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
    state: String(stateValue || "").trim().toUpperCase(),
    postalCode: String(postalCode || "").trim().toUpperCase(),
    country: String(country || "US").trim().toUpperCase()
  };
}

function updateLocalOrderPackagedState(orderId, packagedAt) {
  if (!Array.isArray(state.ordersPayload?.orders)) {
    return;
  }

  const nextPackagedAt = Number.isFinite(Number(packagedAt)) ? Math.max(0, Math.round(Number(packagedAt))) : 0;
  state.ordersPayload = {
    ...state.ordersPayload,
    orders: state.ordersPayload.orders.map((order) => {
      if (order.id !== orderId) {
        return order;
      }
      return {
        ...order,
        packagedAt: nextPackagedAt,
        packagedAtIso: nextPackagedAt > 0 ? new Date(nextPackagedAt * 1000).toISOString() : ""
      };
    })
  };
}

function updateLocalOrderPackageWeightValue(orderId, packageWeightValue) {
  if (!Array.isArray(state.ordersPayload?.orders)) {
    return;
  }

  const nextPackageWeightValue = String(packageWeightValue ?? "").trim();
  state.ordersPayload = {
    ...state.ordersPayload,
    orders: state.ordersPayload.orders.map((order) => {
      if (order.id !== orderId) {
        return order;
      }
      return {
        ...order,
        packageWeightValue: nextPackageWeightValue
      };
    })
  };
}

async function savePackageWeightValue(orderId, rawValue) {
  const nextValue = String(rawValue || "").trim();
  setOrdersBusy(true);
  setOrdersMessage(nextValue ? `Saving package weight for order ${orderId}...` : `Clearing package weight for order ${orderId}...`);
  try {
    const result = await adminRequest(`/api/admin/orders/${encodeURIComponent(orderId)}/package-weight`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        value: nextValue
      })
    });
    updateLocalOrderPackageWeightValue(orderId, result.packageWeightValue);
    setOrdersMessage(
      result.packageWeightValue
        ? `Saved package weight ${result.packageWeightValue} lb for order ${orderId}.`
        : `Cleared package weight for order ${orderId}.`
    );
  } catch (error) {
    if (error.status === 401) {
      logoutBtn.click();
      return;
    }
    setOrdersMessage(error.message || "Could not update package weight value.", true);
  } finally {
    setOrdersBusy(false);
    if (state.ordersPayload) {
      renderOrders(state.ordersPayload);
    }
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
    await loadOrders();
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
    await loadOrders();
    setOrdersMessage(isCompletedOrdersPage ? "Completed orders ready." : "Fulfillment ready.");
    setLoginMessage("");
  } catch (error) {
    setLoginMessage(error.message || "Could not sign in.", true);
  }
});

logoutBtn.addEventListener("click", () => {
  state.adminPassword = "";
  window.localStorage.removeItem(ADMIN_KEY);
  state.ordersPayload = null;
  state.selectedOrderIds = new Set();
  showLogin();
  setLoginMessage("");
  setOrdersMessage("");
});

openShippoBtn?.addEventListener("click", () => {
  const shippoWindow = window.open(SHIPPO_MANUAL_LABEL_URL, "_blank", "noopener,noreferrer");
  if (!shippoWindow) {
    window.location.href = SHIPPO_MANUAL_LABEL_URL;
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

exportShippoCsvBtn?.addEventListener("click", async () => {
  if (state.ordersBusy) {
    return;
  }

  setOrdersBusy(true);
  setOrdersMessage("Preparing Shippo CSV export...");
  try {
    if (!state.ordersPayload || !Array.isArray(state.ordersPayload?.orders)) {
      await loadOrders();
    }
    const allOrders = Array.isArray(state.ordersPayload?.orders) ? state.ordersPayload.orders : [];
    const pendingShippingOrders = allOrders.filter(
      (order) => isOrderShippingRequired(order) && String(order.fulfillmentStatus || "pending") !== "shipped"
    );
    if (pendingShippingOrders.length === 0) {
      setOrdersMessage("No pending shippable orders to export.", true);
      return;
    }

    const csv = buildShippoOrdersCsv(pendingShippingOrders);
    const filename = buildShippoOrdersCsvFilename();
    downloadTextFile(filename, csv, "text/csv;charset=utf-8");
    setOrdersMessage(`Exported ${pendingShippingOrders.length} pending ship order(s) to ${filename}.`);
  } catch (error) {
    if (error.status === 401) {
      logoutBtn.click();
      return;
    }
    setOrdersMessage(error.message || "Could not export Shippo CSV.", true);
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

editionBoardEl?.addEventListener("click", async (event) => {
  if (event.target.closest("[data-package-weight-field]")) {
    return;
  }

  const row = event.target.closest("[data-action='toggle-packaged-order']");
  if (!row) {
    return;
  }

  const orderId = String(row.dataset.id || "").trim();
  if (!orderId || state.ordersBusy) {
    return;
  }

  const selectedOrder = Array.isArray(state.ordersPayload?.orders)
    ? state.ordersPayload.orders.find((order) => order.id === orderId)
    : null;
  if (!selectedOrder) {
    setOrdersMessage("Order details are missing. Refresh and try again.", true);
    return;
  }

  if (String(selectedOrder.fulfillmentStatus || "pending") === "shipped") {
    setOrdersMessage(`Order ${orderId} is already shipped, so it stays marked packaged.`);
    return;
  }

  const nextPackaged = !isOrderPackaged(selectedOrder);
  setOrdersBusy(true);
  setOrdersMessage(nextPackaged ? `Marking order ${orderId} packaged...` : `Removing packaged mark from order ${orderId}...`);
  try {
    const result = await adminRequest(`/api/admin/orders/${encodeURIComponent(orderId)}/package`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        packaged: nextPackaged
      })
    });
    updateLocalOrderPackagedState(orderId, result.packagedAt);
    setOrdersMessage(nextPackaged ? `Order ${orderId} marked packaged.` : `Packaged mark removed for order ${orderId}.`);
  } catch (error) {
    if (error.status === 401) {
      logoutBtn.click();
      return;
    }
    setOrdersMessage(error.message || "Could not update packaged state.", true);
  } finally {
    setOrdersBusy(false);
    if (state.ordersPayload) {
      renderOrders(state.ordersPayload);
    }
  }
});

editionBoardEl?.addEventListener("keydown", (event) => {
  if (event.target.closest("[data-package-weight-field]")) {
    return;
  }

  const row = event.target.closest("[data-action='toggle-packaged-order']");
  if (!row) {
    return;
  }

  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  event.preventDefault();
  row.click();
});

editionBoardEl?.addEventListener("change", async (event) => {
  const input = event.target.closest("input[data-action='save-package-weight']");
  if (!input) {
    return;
  }

  if (input.validity && !input.validity.valid) {
    input.reportValidity?.();
    return;
  }

  const orderId = String(input.dataset.id || "").trim();
  if (!orderId || state.ordersBusy) {
    return;
  }

  await savePackageWeightValue(orderId, input.value);
});

ordersEl?.addEventListener("change", async (event) => {
  const selectionInput = event.target.closest("input[data-action='toggle-selected-order']");
  if (selectionInput) {
    if (state.ordersBusy) {
      return;
    }
    const orderId = String(selectionInput.dataset.id || "").trim();
    if (!orderId) {
      return;
    }
    if (selectionInput.checked) {
      state.selectedOrderIds.add(orderId);
    } else {
      state.selectedOrderIds.delete(orderId);
    }
    if (state.ordersPayload) {
      renderOrders(state.ordersPayload);
    }
    return;
  }

  const input = event.target.closest("input[data-action='save-package-weight']");
  if (!input) {
    return;
  }

  if (input.validity && !input.validity.valid) {
    input.reportValidity?.();
    return;
  }

  const orderId = String(input.dataset.id || "").trim();
  if (!orderId || state.ordersBusy) {
    return;
  }

  await savePackageWeightValue(orderId, input.value);
});

ordersEl?.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }
  if (state.ordersBusy) {
    return;
  }

  const action = button.dataset.action;
  if (action === "select-visible-orders") {
    if (!state.ordersPayload) {
      return;
    }
    const { orders } = getFilteredOrdersForDisplay(state.ordersPayload);
    const visibleIds = orders.filter((order) => isOrderBulkShippable(order)).map((order) => String(order.id || "").trim());
    if (visibleIds.length === 0) {
      setOrdersMessage("No visible eligible orders to select.", true);
      return;
    }
    visibleIds.forEach((orderId) => state.selectedOrderIds.add(orderId));
    renderOrders(state.ordersPayload);
    setOrdersMessage(`Selected ${visibleIds.length} visible order${visibleIds.length === 1 ? "" : "s"} for bulk ship.`);
    return;
  }

  if (action === "clear-selected-orders") {
    const selectedCount = getSelectedBulkOrders(state.ordersPayload?.orders).length;
    state.selectedOrderIds = new Set();
    if (state.ordersPayload) {
      renderOrders(state.ordersPayload);
    }
    setOrdersMessage(
      selectedCount > 0 ? `Cleared ${selectedCount} selected order${selectedCount === 1 ? "" : "s"}.` : "No bulk ship selection to clear."
    );
    return;
  }

  if (action === "bulk-mark-shipped-from-pdf") {
    const selectedOrders = getSelectedBulkOrders(state.ordersPayload?.orders);
    if (selectedOrders.length === 0) {
      setOrdersMessage("Select at least one pending order first.", true);
      return;
    }

    const pdfFile = await choosePdfFile();
    if (!pdfFile) {
      return;
    }
    if (!String(pdfFile.type || "").includes("pdf") && !String(pdfFile.name || "").toLowerCase().endsWith(".pdf")) {
      setOrdersMessage("Choose a PDF file with shipping labels.", true);
      return;
    }

    setOrdersBusy(true);
    setOrdersMessage(`Reading labels from ${pdfFile.name}...`);
    try {
      const payload = await parseShippingLabelsPdf(pdfFile);
      const parsedLabels = Array.isArray(payload?.labels) ? payload.labels : [];
      if (parsedLabels.length === 0) {
        throw new Error("No tracking numbers were detected in that labels PDF.");
      }

      let matchResult = matchPdfLabelsToOrders(parsedLabels, selectedOrders);
      if (matchResult.unresolvedOrders.length > 0) {
        const canFallbackByPageOrder =
          matchResult.unresolvedOrders.length > 0 &&
          matchResult.unresolvedOrders.length === matchResult.unusedLabels.length;
        if (canFallbackByPageOrder) {
          const fallbackConfirmed = window.confirm(
            `Matched ${matchResult.assignments.length} of ${selectedOrders.length} selected orders automatically.\n\nUse PDF page order to map the remaining ${matchResult.unresolvedOrders.length} order${matchResult.unresolvedOrders.length === 1 ? "" : "s"}?`
          );
          if (fallbackConfirmed) {
            matchResult = matchPdfLabelsToOrders(parsedLabels, selectedOrders, {
              allowSequentialFallback: true
            });
          }
        }
      }

      if (matchResult.unresolvedOrders.length > 0) {
        const preview = matchResult.unresolvedOrders
          .slice(0, 4)
          .map((order) => String(order?.id || "").trim())
          .filter(Boolean)
          .join(", ");
        throw new Error(
          `Could not safely match ${matchResult.unresolvedOrders.length} selected order${matchResult.unresolvedOrders.length === 1 ? "" : "s"} to labels.${preview ? ` Unmatched: ${preview}` : ""}`
        );
      }

      const fallbackCount = matchResult.assignments.filter((entry) => entry.reason === "page_order").length;
      const confirmationMessage = `Mark ${matchResult.assignments.length} order${matchResult.assignments.length === 1 ? "" : "s"} shipped from this PDF and send the thank-you shipment emails now?${
        fallbackCount > 0 ? `\n\n${fallbackCount} mapping${fallbackCount === 1 ? "" : "s"} used page order fallback.` : ""
      }`;
      if (!window.confirm(confirmationMessage)) {
        setOrdersMessage("PDF shipment import cancelled.");
        return;
      }

      const successes = [];
      const failures = [];
      setOrdersMessage(`Marking ${matchResult.assignments.length} selected orders shipped from PDF labels...`);

      for (const assignment of matchResult.assignments) {
        const orderId = String(assignment?.orderId || "").trim();
        if (!orderId) {
          continue;
        }
        try {
          await shipOrder(orderId, buildShipmentPayloadFromLabel(assignment.label), {
            sendEmail: true
          });
          successes.push(orderId);
        } catch (error) {
          if (error.status === 401) {
            logoutBtn.click();
            return;
          }
          failures.push({
            id: orderId,
            message: error.message || "Unknown error"
          });
        }
      }

      await loadOrders();

      if (successes.length > 0 && failures.length === 0) {
        setOrdersMessage(`Marked ${successes.length} order${successes.length === 1 ? "" : "s"} shipped from PDF labels.`);
        return;
      }
      if (successes.length > 0) {
        const firstFailure = failures[0];
        setOrdersMessage(
          `Marked ${successes.length} shipped from PDF labels, but ${failures.length} failed. First failure: ${firstFailure.id} - ${firstFailure.message}`,
          true
        );
        return;
      }

      setOrdersMessage(`Could not mark any selected orders shipped from PDF labels. ${failures[0]?.message || ""}`.trim(), true);
    } catch (error) {
      if (error.status === 401) {
        logoutBtn.click();
        return;
      }
      setOrdersMessage(error.message || "Could not read PDF labels right now.", true);
    } finally {
      setOrdersBusy(false);
    }
    return;
  }

  if (action === "bulk-mark-shipped-orders") {
    const selectedOrders = getSelectedBulkOrders(state.ordersPayload?.orders);
    if (selectedOrders.length === 0) {
      setOrdersMessage("Select at least one pending order first.", true);
      return;
    }

    const shipmentDetails = promptShipmentDetails({
      multiple: true,
      count: selectedOrders.length
    });
    if (!shipmentDetails) {
      return;
    }

    const sameTrackingWarning = shipmentDetails.trackingNumber
      ? `\n\nTracking number "${shipmentDetails.trackingNumber}" will be applied to every selected order.`
      : "";
    const confirmed = window.confirm(
      `Mark ${selectedOrders.length} selected order${selectedOrders.length === 1 ? "" : "s"} as shipped now?${sameTrackingWarning}`
    );
    if (!confirmed) {
      return;
    }

    setOrdersBusy(true);
    setOrdersMessage(`Marking ${selectedOrders.length} selected orders shipped...`);
    try {
      const successes = [];
      const failures = [];

      for (const order of selectedOrders) {
        try {
          await shipOrder(order.id, shipmentDetails);
          successes.push(order.id);
        } catch (error) {
          if (error.status === 401) {
            logoutBtn.click();
            return;
          }
          failures.push({
            id: order.id,
            message: error.message || "Unknown error"
          });
        }
      }

      await loadOrders();

      if (successes.length > 0 && failures.length === 0) {
        setOrdersMessage(`Marked ${successes.length} order${successes.length === 1 ? "" : "s"} shipped.`);
        return;
      }

      if (successes.length > 0) {
        const firstFailure = failures[0];
        setOrdersMessage(
          `Marked ${successes.length} shipped, but ${failures.length} failed. First failure: ${firstFailure.id} - ${firstFailure.message}`,
          true
        );
        return;
      }

      setOrdersMessage(`Could not mark any selected orders shipped. ${failures[0]?.message || ""}`.trim(), true);
    } catch (error) {
      if (error.status === 401) {
        logoutBtn.click();
        return;
      }
      setOrdersMessage(error.message || "Could not bulk mark orders as shipped.", true);
    } finally {
      setOrdersBusy(false);
    }
    return;
  }

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

  if (action === "override-state-mismatch") {
    if (!selectedOrder) {
      setOrdersMessage("Order details are missing. Refresh and try again.", true);
      return;
    }
    if (!blockedForStateMismatch) {
      setOrdersMessage(`Order ${orderId} is not blocked by a state mismatch.`);
      return;
    }

    const confirmOverride = window.confirm(`Override the state mismatch block for this order?\n\n${mismatchReason}`);
    if (!confirmOverride) {
      return;
    }

    setOrdersBusy(true);
    setOrdersMessage("Applying override...");
    try {
      const result = await adminRequest(`/api/admin/orders/${encodeURIComponent(orderId)}/override-state-mismatch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });
      await loadOrders();
      setOrdersMessage(result.message || `Override applied for order ${orderId}.`);
    } catch (error) {
      if (error.status === 401) {
        logoutBtn.click();
        return;
      }
      setOrdersMessage(error.message || "Could not override the state mismatch block.", true);
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

  if (action === "open-shippo-order") {
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
    setOrdersMessage("Marking order shipped...");
    try {
      await shipOrder(orderId, shipmentDetails);
      await loadOrders();
      setOrdersMessage(`Order ${orderId} marked shipped.`);
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

  if (action === "resend-shipped-email") {
    if (!window.confirm("Send shipment email to this customer now?")) {
      return;
    }

    setOrdersBusy(true);
    setOrdersMessage("Queueing shipment email...");
    try {
      await shipOrder(orderId, {}, {
        resendEmail: true
      });
      setOrdersMessage(`Shipment email queued again for order ${orderId}.`);
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

ensureAuthenticated().catch(() => {
  showLogin();
});
