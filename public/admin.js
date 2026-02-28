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
const inStockInput = document.getElementById("product-in-stock");
const isVisibleInput = document.getElementById("product-is-visible");
const removeImageInput = document.getElementById("remove-image");
const saveProductBtn = document.getElementById("save-product-btn");
const cancelEditBtn = document.getElementById("cancel-edit-btn");
const newProductBtn = document.getElementById("new-product-btn");
const logoutBtn = document.getElementById("logout-btn");
const productMessageEl = document.getElementById("admin-message");

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

const state = {
  adminPassword: window.localStorage.getItem(ADMIN_KEY) || "",
  products: [],
  siteSettings: null,
  productBusy: false,
  designBusy: false,
  dragProductId: null,
  dropTargetId: null,
  dropAfter: false
};

const DEFAULT_SHIPPING_FEE = 5;

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
  inStockInput.checked = true;
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
  inStockInput.checked = product.inStock !== false;
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

        return `<article class="admin-product-card" draggable="true" data-id="${product.id}">
        <img class="admin-product-image" src="${product.imageUrl}" alt="${product.title} cover" />
        <div class="admin-product-body">
          <div class="row-between">
            <h3>${product.title}</h3>
            <strong>${formatMoney(product.priceCents)}</strong>
          </div>
          <p>${product.subtitle || "No description"}</p>
          ${product.included ? `<p><strong>What's included:</strong> ${product.included}</p>` : ""}
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
    await Promise.all([loadProducts(), loadSiteSettings()]);
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
    await Promise.all([loadProducts(), loadSiteSettings()]);
    setProductMessage("Signed in.");
    setDesignMessage("");
    setLoginMessage("");
  } catch (error) {
    setLoginMessage(error.message || "Could not sign in.", true);
  }
});

logoutBtn.addEventListener("click", () => {
  state.adminPassword = "";
  window.localStorage.removeItem(ADMIN_KEY);
  resetForm();
  resetSiteSettingsDraftFields();
  showLogin();
  setProductMessage("");
  setDesignMessage("");
  setLoginMessage("");
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
  formData.append("isVisible", String(isVisibleInput.checked));

  const file = imageFileInput.files?.[0];
  if (file) {
    formData.append("image", file);
  }
  const imageUrl = imageUrlInput.value.trim();
  if (imageUrl) {
    formData.append("imageUrl", imageUrl);
  }
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
