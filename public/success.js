const receiptCopy = document.getElementById("receipt-copy");
const orderItems = document.getElementById("order-items");
const orderItemsSubtotal = document.getElementById("order-items-subtotal");
const orderShipping = document.getElementById("order-shipping");
const orderTax = document.getElementById("order-tax");
const orderTotal = document.getElementById("order-total");
const shippingName = document.getElementById("shipping-name");
const shippingAddress = document.getElementById("shipping-address");
const orderEmail = document.getElementById("order-email");
const CART_KEY = "publishearts_cart_v1";

function formatMoney(amountCents = 0, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase()
  }).format(amountCents / 100);
}

function formatAddress(address) {
  if (!address) {
    return "Shipping address not provided.";
  }
  return [address.line1, address.line2, address.city, address.state, address.postal_code, address.country]
    .filter(Boolean)
    .join(", ");
}

function isShippingLineItem(item) {
  const name = String(item?.name || "").trim().toLowerCase();
  return name === "shipping";
}

async function loadOrder() {
  const sessionId = new URLSearchParams(window.location.search).get("session_id");
  if (!sessionId) {
    receiptCopy.textContent = "Missing order reference. Please check your email receipt.";
    return;
  }

  try {
    const response = await fetch(`/api/order/${encodeURIComponent(sessionId)}`);
    const order = await response.json();

    if (!response.ok) {
      throw new Error(order.error || "Could not load order");
    }

    receiptCopy.textContent =
      "A receipt email has been sent. Your shipping details and order summary are below.";
    const shippingFromLines = (order.lineItems || [])
      .filter((item) => isShippingLineItem(item))
      .reduce((sum, item) => sum + (Number(item.amountTotal) || 0), 0);
    const shippingTotal = Number(order.amountShipping);
    const normalizedShippingTotal = Number.isFinite(shippingTotal) ? shippingTotal : shippingFromLines;
    const taxTotal = Number.isFinite(Number(order.amountTax)) ? Number(order.amountTax) : 0;
    const subtotalFromApi = Number(order.amountSubtotal);
    const itemsSubtotalCents = Number.isFinite(subtotalFromApi)
      ? Math.max(0, subtotalFromApi - normalizedShippingTotal)
      : Math.max(0, (Number(order.amountTotal) || 0) - normalizedShippingTotal - taxTotal);

    const productLineItems = (order.lineItems || []).filter((item) => !isShippingLineItem(item));

    orderItems.innerHTML = productLineItems
      .map(
        (item) =>
          `<li><span>${item.name} x${item.quantity}</span><strong>${formatMoney(item.amountTotal, order.currency)}</strong></li>`
      )
      .join("");

    if (productLineItems.length === 0) {
      orderItems.innerHTML = `<li><span>No product lines available.</span><strong>-</strong></li>`;
    }

    orderItemsSubtotal.textContent = formatMoney(itemsSubtotalCents, order.currency);
    orderShipping.textContent = formatMoney(normalizedShippingTotal, order.currency);
    orderTax.textContent = formatMoney(taxTotal, order.currency);
    orderTotal.textContent = formatMoney(order.amountTotal, order.currency);
    shippingName.textContent = order.shippingDetails?.name || "Name not provided";
    shippingAddress.textContent = formatAddress(order.shippingDetails?.address);
    orderEmail.textContent = order.customerEmail ? `Receipt sent to: ${order.customerEmail}` : "";
    window.localStorage.removeItem(CART_KEY);
  } catch (error) {
    receiptCopy.textContent = error.message || "Could not load your order details.";
  }
}

loadOrder();
