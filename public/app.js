const productsGrid = document.getElementById("products-grid");
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

const state = {
  products: [],
  cart: new Map(),
  checkingOut: false,
  siteSettings: null
};

const CART_KEY = "publishearts_cart_v1";

function formatMoney(amountCents = 0) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(amountCents / 100);
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

  setText(brandNameHeader, settings.brandName);
  setText(brandMarkText, settings.brandMark);
  setText(heroEyebrow, settings.heroEyebrow);
  setText(heroTitle, settings.heroTitle);
  setText(heroCopy, settings.heroCopy);
  setText(heroCta, settings.heroCtaLabel);
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

  const bannerUrl = String(settings.heroBannerImageUrl || "").trim();
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
      if (!product || product.inStock === false) {
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

function getShippingTotal() {
  return getCartRows().reduce((sum, item) => {
    if (!isShippingEnabled(item)) {
      return sum;
    }
    const fee = Number.isFinite(item.shippingFeeCents) ? item.shippingFeeCents : 500;
    return sum + fee * item.quantity;
  }, 0);
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

  productsGrid.innerHTML = state.products
    .map(
      (product, index) => `<article class="product-card" style="animation-delay:${index * 60}ms">
          <img class="product-cover" src="${product.imageUrl}" alt="${product.title} cover" loading="lazy" />
          <div class="product-body">
            <div>
              <h3 class="product-title">${product.title}</h3>
              <p class="product-subtitle">${product.subtitle}</p>
              ${
                isShippingEnabled(product)
                  ? `<p class="product-stock">+ ${formatMoney(product.shippingFeeCents || 500)} shipping</p>`
                  : ""
              }
              ${product.inStock === false ? '<p class="product-stock sold-out-text">Currently sold out</p>' : ""}
            </div>
            <details class="included-tab">
              <summary>What's Included</summary>
              <p>${product.included || "No extras listed for this title yet."}</p>
            </details>
            <div class="product-row">
              <span class="price">${formatMoney(product.priceCents)}</span>
              <button
                class="primary-btn ${product.inStock === false ? "sold-out-btn" : ""}"
                type="button"
                data-action="add"
                data-id="${product.id}"
                ${product.inStock === false ? "disabled" : ""}
              >
                ${product.inStock === false ? "Sold Out" : "Add to cart"}
              </button>
            </div>
          </div>
        </article>`
    )
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
  if (!product || product.inStock === false) {
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
    if (!product || product.inStock === false) {
      state.cart.delete(productId);
      changed = true;
    }
  });
  if (changed) {
    saveCart();
  }
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
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ cart })
    });

    const payload = await response.json();
    if (!response.ok) {
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

loadCart();
loadSiteSettings().catch(() => {});
loadProducts().catch(() => {
  productsGrid.innerHTML = `<p>Could not load books. Refresh and try again.</p>`;
});

