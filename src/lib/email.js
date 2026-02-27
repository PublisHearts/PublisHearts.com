import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpSecure = (process.env.SMTP_SECURE || "false").toLowerCase() === "true";
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const fromEmail = process.env.FROM_EMAIL;
const ownerEmail = process.env.OWNER_EMAIL;
let printedConfigWarning = false;
let printedOwnerWarning = false;

const transporter =
  smtpHost && smtpUser && smtpPass
    ? nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      })
    : null;

function emailConfigured() {
  const configured = Boolean(transporter && fromEmail);
  if (!configured && !printedConfigWarning) {
    printedConfigWarning = true;
    console.warn("SMTP is not fully configured. Receipt and order emails are disabled.");
  }
  return configured;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatMoney(amount = 0, currency = "usd") {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase()
    }).format(amount / 100);
  } catch {
    return `$${(amount / 100).toFixed(2)}`;
  }
}

function formatAddress(address) {
  if (!address) {
    return "Not provided";
  }

  return [address.line1, address.line2, address.city, address.state, address.postal_code, address.country]
    .filter(Boolean)
    .join(", ");
}

function orderLineItemsHtml(lineItems, currency) {
  return lineItems
    .map((item) => {
      const rowTotal = formatMoney(item.amountTotal || 0, currency);
      return `<tr>
        <td style="padding:8px 0;">${escapeHtml(item.name)}</td>
        <td style="padding:8px 0; text-align:center;">${item.quantity || 1}</td>
        <td style="padding:8px 0; text-align:right;">${rowTotal}</td>
      </tr>`;
    })
    .join("");
}

function orderLineItemsText(lineItems, currency) {
  return lineItems
    .map((item) => {
      const rowTotal = formatMoney(item.amountTotal || 0, currency);
      return `- ${item.name} x${item.quantity || 1} (${rowTotal})`;
    })
    .join("\n");
}

export async function sendCustomerReceipt({
  customerEmail,
  orderId,
  amountTotal,
  currency,
  lineItems,
  shippingDetails
}) {
  if (!emailConfigured() || !customerEmail) {
    return;
  }

  const total = formatMoney(amountTotal || 0, currency);
  const textItems = orderLineItemsText(lineItems, currency);
  const htmlItems = orderLineItemsHtml(lineItems, currency);
  const shippingName = shippingDetails?.name || "Not provided";
  const shippingAddress = formatAddress(shippingDetails?.address);

  await transporter.sendMail({
    from: fromEmail,
    to: customerEmail,
    subject: `PublisHearts receipt - Order ${orderId}`,
    text: `Thank you for your order from PublisHearts.

Order ID: ${orderId}
Total: ${total}

Shipping:
Name: ${shippingName}
Address: ${shippingAddress}

Items:
${textItems}

If you have any questions, reply to this email.`,
    html: `<div style="font-family:Arial,sans-serif; color:#1f2937; line-height:1.4;">
      <h2 style="margin:0 0 12px;">Thank you for your order.</h2>
      <p style="margin:0 0 8px;">Order ID: <strong>${escapeHtml(orderId)}</strong></p>
      <p style="margin:0 0 16px;">Total: <strong>${escapeHtml(total)}</strong></p>
      <h3 style="margin:0 0 8px;">Shipping</h3>
      <p style="margin:0 0 4px;">Name: ${escapeHtml(shippingName)}</p>
      <p style="margin:0 0 16px;">Address: ${escapeHtml(shippingAddress)}</p>
      <table style="width:100%; border-collapse:collapse; margin:0 0 16px;">
        <thead>
          <tr>
            <th style="text-align:left; border-bottom:1px solid #d1d5db; padding:6px 0;">Item</th>
            <th style="text-align:center; border-bottom:1px solid #d1d5db; padding:6px 0;">Qty</th>
            <th style="text-align:right; border-bottom:1px solid #d1d5db; padding:6px 0;">Total</th>
          </tr>
        </thead>
        <tbody>${htmlItems}</tbody>
      </table>
      <p style="margin:0;">If you have any questions, reply to this email.</p>
    </div>`
  });
}

export async function sendOwnerNotification({ orderId, amountTotal, currency, lineItems, customerDetails, shippingDetails }) {
  if (!emailConfigured()) {
    return;
  }

  if (!ownerEmail) {
    if (!printedOwnerWarning) {
      printedOwnerWarning = true;
      console.warn("OWNER_EMAIL is missing. Store owner notifications are disabled.");
    }
    return;
  }

  const total = formatMoney(amountTotal || 0, currency);
  const customerName = customerDetails?.name || "Unknown";
  const customerEmail = customerDetails?.email || "Unknown";
  const customerPhone = customerDetails?.phone || "Not provided";
  const shippingName = shippingDetails?.name || "Not provided";
  const shippingAddress = formatAddress(shippingDetails?.address);
  const textItems = orderLineItemsText(lineItems, currency);
  const htmlItems = orderLineItemsHtml(lineItems, currency);

  await transporter.sendMail({
    from: fromEmail,
    to: ownerEmail,
    subject: `New PublisHearts order - ${orderId}`,
    text: `New order received.

Order ID: ${orderId}
Total: ${total}

Customer:
Name: ${customerName}
Email: ${customerEmail}
Phone: ${customerPhone}

Shipping:
Name: ${shippingName}
Address: ${shippingAddress}

Items:
${textItems}`,
    html: `<div style="font-family:Arial,sans-serif; color:#1f2937; line-height:1.4;">
      <h2 style="margin:0 0 12px;">New order received</h2>
      <p style="margin:0 0 4px;">Order ID: <strong>${escapeHtml(orderId)}</strong></p>
      <p style="margin:0 0 16px;">Total: <strong>${escapeHtml(total)}</strong></p>
      <h3 style="margin:0 0 8px;">Customer</h3>
      <p style="margin:0 0 4px;">Name: ${escapeHtml(customerName)}</p>
      <p style="margin:0 0 4px;">Email: ${escapeHtml(customerEmail)}</p>
      <p style="margin:0 0 16px;">Phone: ${escapeHtml(customerPhone)}</p>
      <h3 style="margin:0 0 8px;">Shipping</h3>
      <p style="margin:0 0 4px;">Name: ${escapeHtml(shippingName)}</p>
      <p style="margin:0 0 16px;">Address: ${escapeHtml(shippingAddress)}</p>
      <h3 style="margin:0 0 8px;">Items</h3>
      <table style="width:100%; border-collapse:collapse;">
        <thead>
          <tr>
            <th style="text-align:left; border-bottom:1px solid #d1d5db; padding:6px 0;">Item</th>
            <th style="text-align:center; border-bottom:1px solid #d1d5db; padding:6px 0;">Qty</th>
            <th style="text-align:right; border-bottom:1px solid #d1d5db; padding:6px 0;">Total</th>
          </tr>
        </thead>
        <tbody>${htmlItems}</tbody>
      </table>
    </div>`
  });
}
