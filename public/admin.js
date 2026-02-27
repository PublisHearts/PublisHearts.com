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
const priceInput = document.getElementById("product-price");
const imageFileInput = document.getElementById("product-image-file");
const imageUrlInput = document.getElementById("product-image-url");
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
  designBusy: false
};

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
  priceInput.value = "";
  imageFileInput.value = "";
  imageUrlInput.value = "";
  removeImageInput.checked = false;
  saveProductBtn.textContent = "Save Product";
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
  priceInput.value = (product.priceCents / 100).toFixed(2);
  imageUrlInput.value = "";
  imageFileInput.value = "";
  removeImageInput.checked = false;
  saveProductBtn.textContent = "Update Product";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function formatMoney(cents) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format((Number(cents) || 0) / 100);
}

function renderProducts() {
  if (state.products.length === 0) {
    productsEl.innerHTML = `<p class="cart-item-sub">No products yet. Add your first book above.</p>`;
    return;
  }

  productsEl.innerHTML = state.products
    .map(
      (product) => `<article class="admin-product-card">
        <img class="admin-product-image" src="${product.imageUrl}" alt="${product.title} cover" />
        <div class="admin-product-body">
          <div class="row-between">
            <h3>${product.title}</h3>
            <strong>${formatMoney(product.priceCents)}</strong>
          </div>
          <p>${product.subtitle || "No description"}</p>
          <p class="admin-id">ID: ${product.id}</p>
          <div class="admin-card-actions">
            <button class="ghost-btn" type="button" data-action="edit" data-id="${product.id}">Edit</button>
            <button class="danger-btn" type="button" data-action="delete" data-id="${product.id}">Delete</button>
          </div>
        </div>
      </article>`
    )
    .join("");
}

async function loadProducts() {
  const products = await adminRequest("/api/admin/products");
  state.products = products;
  renderProducts();
}

async function loadSiteSettings() {
  const settings = await adminRequest("/api/admin/site-settings");
  fillSiteSettingsForm(settings);
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
  formData.append("price", priceInput.value);

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

  const logoImageUrl = siteLogoUrlInput.value.trim();
  if (logoImageUrl) {
    formData.append("logoImageUrl", logoImageUrl);
  }
  if (siteRemoveLogoInput.checked) {
    formData.append("removeLogo", "true");
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
