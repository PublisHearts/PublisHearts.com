const productsGrid = document.getElementById("products-grid");
const cartPanel = document.getElementById("cart-panel");
const cartItems = document.getElementById("cart-items");
const cartCount = document.getElementById("cart-count");
const cartSubtotal = document.getElementById("cart-subtotal");
const checkoutBtn = document.getElementById("checkout-btn");
const checkoutMessage = document.getElementById("checkout-message");
const openCartBtn = document.getElementById("open-cart");
const closeCartBtn = document.getElementById("close-cart");

const state = {
  products: [],
  cart: new Map(),
  checkingOut: false
};

const CART_KEY = "publishearts_cart_v1";

function formatMoney(amountCents = 0) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(amountCents / 100);
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
      if (!product) {
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

function setCheckoutMessage(message, isError = false) {
  checkoutMessage.textContent = message || "";
  checkoutMessage.classList.toggle("error", Boolean(isError));
}

function updateCartUi() {
  const rows = getCartRows();
  const itemCount = rows.reduce((sum, item) => sum + item.quantity, 0);
  cartCount.textContent = String(itemCount);
  cartSubtotal.textContent = formatMoney(getSubtotal());
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
            </div>
            <div class="product-row">
              <span class="price">${formatMoney(product.priceCents)}</span>
              <button class="primary-btn" type="button" data-action="add" data-id="${product.id}">Add to cart</button>
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

async function loadProducts() {
  const response = await fetch("/api/products");
  if (!response.ok) {
    throw new Error("Could not load products");
  }
  state.products = await response.json();
  renderProducts();
  updateCartUi();
}

async function checkout() {
  if (state.checkingOut) {
    return;
  }

  const cart = Array.from(state.cart.values());
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
loadProducts().catch(() => {
  productsGrid.innerHTML = `<p>Could not load books. Refresh and try again.</p>`;
});
