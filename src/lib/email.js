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

function extractPrimaryEmailAddress(value = "") {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }
  const angleMatch = text.match(/<([^>]+)>/);
  if (angleMatch && angleMatch[1]) {
    return String(angleMatch[1]).trim().toLowerCase();
  }
  const first = text.split(",")[0];
  return String(first || "").trim().toLowerCase();
}

function buildOwnerBccAddressForRecipient(recipientEmail = "") {
  if (!ownerEmail) {
    return undefined;
  }
  const ownerNormalized = extractPrimaryEmailAddress(ownerEmail);
  const recipientNormalized = extractPrimaryEmailAddress(recipientEmail);
  if (!ownerNormalized || ownerNormalized === recipientNormalized) {
    return undefined;
  }
  return ownerEmail;
}

function formatOrderSourceLabel(orderSource) {
  const normalized = String(orderSource || "").trim().toLowerCase();
  if (normalized === "admin_pos") {
    return "Admin POS";
  }
  return "Storefront";
}

function normalizeLineItems(lineItems) {
  if (!Array.isArray(lineItems)) {
    return [];
  }

  return lineItems
    .map((item) => {
      const name = item?.name ? String(item.name) : "Book";
      const quantity = Math.max(1, Number.parseInt(item?.quantity, 10) || 1);
      const parsedAmount = Number(item?.amountTotal);
      const amountTotal = Number.isFinite(parsedAmount) ? parsedAmount : null;
      return { name, quantity, amountTotal };
    })
    .filter((item) => Boolean(item.name));
}

function isShippingLineItem(item) {
  return String(item?.name || "").trim().toLowerCase() === "shipping";
}

function isTaxLineItem(item) {
  const name = String(item?.name || "").trim().toLowerCase();
  return name === "sales tax" || name === "tax";
}

function getUnitsTotal(lineItems) {
  return lineItems.reduce((sum, item) => {
    if (isShippingLineItem(item) || isTaxLineItem(item)) {
      return sum;
    }
    return sum + (item.quantity || 1);
  }, 0);
}

function orderLineItemsHtml(lineItems, currency) {
  const items = normalizeLineItems(lineItems);
  if (items.length === 0) {
    return `<tr>
      <td colspan="3" style="padding:10px 0; color:#6b7280;">No line items captured.</td>
    </tr>`;
  }

  return items
    .map((item) => {
      const rowTotal = Number.isFinite(item.amountTotal) ? formatMoney(item.amountTotal, currency) : "-";
      return `<tr>
        <td style="padding:8px 0;">${escapeHtml(item.name)}</td>
        <td style="padding:8px 0; text-align:center;">${item.quantity || 1}</td>
        <td style="padding:8px 0; text-align:right;">${rowTotal}</td>
      </tr>`;
    })
    .join("");
}

function orderLineItemsText(lineItems, currency) {
  const items = normalizeLineItems(lineItems);
  if (items.length === 0) {
    return "- No line items captured";
  }

  return items
    .map((item) => {
      const rowTotal = Number.isFinite(item.amountTotal) ? formatMoney(item.amountTotal, currency) : null;
      return rowTotal
        ? `- ${item.name} x${item.quantity || 1} (${rowTotal})`
        : `- ${item.name} x${item.quantity || 1}`;
    })
    .join("\n");
}

export function getEmailHealth() {
  const smtpConfigured = Boolean(smtpHost && smtpUser && smtpPass);
  const emailSendingEnabled = Boolean(transporter && fromEmail);
  return {
    smtpConfigured,
    emailSendingEnabled,
    ownerNotificationEnabled: Boolean(emailSendingEnabled && ownerEmail),
    fromEmailConfigured: Boolean(fromEmail),
    ownerEmailConfigured: Boolean(ownerEmail),
    host: smtpHost ? String(smtpHost) : ""
  };
}

export async function sendShipmentNotification({
  customerEmail,
  customerName,
  orderId,
  currency,
  lineItems,
  shippingDetails,
  carrier,
  trackingNumber,
  trackingUrl,
  note
}) {
  if (!emailConfigured() || !customerEmail) {
    return;
  }

  const normalizedItems = normalizeLineItems(lineItems);
  const unitsTotal = getUnitsTotal(normalizedItems);
  const textItems = orderLineItemsText(normalizedItems, currency);
  const htmlItems = orderLineItemsHtml(normalizedItems, currency);
  const shipmentName = shippingDetails?.name || customerName || "Customer";
  const shipmentAddress = formatAddress(shippingDetails?.address);
  const safeCarrier = String(carrier || "").trim();
  const safeTrackingNumber = String(trackingNumber || "").trim();
  const safeTrackingUrl = String(trackingUrl || "").trim();
  const safeNote = String(note || "").trim();
  const ownerBcc = buildOwnerBccAddressForRecipient(customerEmail);
  const trackingBlockText = safeTrackingUrl
    ? `Tracking: ${safeTrackingUrl}`
    : safeTrackingNumber
      ? `Tracking #: ${safeTrackingNumber}`
      : "Tracking: Pending";
  const trackingBlockHtml = safeTrackingUrl
    ? `<a href="${escapeHtml(safeTrackingUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(safeTrackingUrl)}</a>`
    : safeTrackingNumber
      ? escapeHtml(safeTrackingNumber)
      : "Pending";

  await transporter.sendMail({
    from: fromEmail,
    to: customerEmail,
    bcc: ownerBcc,
    subject: `PublisHearts shipping update - Order ${orderId}`,
    text: `Good news - your PublisHearts order is on the way.

Order ID: ${orderId}
Ship to: ${shipmentName}
Address: ${shipmentAddress}
${safeCarrier ? `Carrier: ${safeCarrier}` : ""}
${trackingBlockText}
${safeNote ? `Note: ${safeNote}` : ""}

Items (${unitsTotal} units):
${textItems}

Thank you for supporting PublisHearts.`,
    html: `<div style="font-family:Arial,sans-serif; color:#1f2937; line-height:1.4;">
      <h2 style="margin:0 0 12px;">Your order is on the way</h2>
      <p style="margin:0 0 8px;">Order ID: <strong>${escapeHtml(orderId)}</strong></p>
      <p style="margin:0 0 4px;">Ship to: <strong>${escapeHtml(shipmentName)}</strong></p>
      <p style="margin:0 0 8px;">Address: ${escapeHtml(shipmentAddress)}</p>
      ${safeCarrier ? `<p style="margin:0 0 4px;">Carrier: <strong>${escapeHtml(safeCarrier)}</strong></p>` : ""}
      <p style="margin:0 0 8px;">Tracking: <strong>${trackingBlockHtml}</strong></p>
      ${safeNote ? `<p style="margin:0 0 12px;">Note: ${escapeHtml(safeNote)}</p>` : ""}
      <h3 style="margin:0 0 8px;">Items (${unitsTotal} units)</h3>
      <table style="width:100%; border-collapse:collapse; margin:0 0 12px;">
        <thead>
          <tr>
            <th style="text-align:left; border-bottom:1px solid #d1d5db; padding:6px 0;">Item</th>
            <th style="text-align:center; border-bottom:1px solid #d1d5db; padding:6px 0;">Qty</th>
            <th style="text-align:right; border-bottom:1px solid #d1d5db; padding:6px 0;">Total</th>
          </tr>
        </thead>
        <tbody>${htmlItems}</tbody>
      </table>
      <p style="margin:0;">Thank you for supporting PublisHearts.</p>
    </div>`
  });
}

export async function sendCustomerReceipt({
  customerEmail,
  orderId,
  amountSubtotal,
  amountShipping,
  amountTax,
  amountTotal,
  currency,
  lineItems,
  shippingDetails,
  shippingRequired = true
}) {
  if (!emailConfigured() || !customerEmail) {
    return;
  }

  const normalizedItems = normalizeLineItems(lineItems);
  const unitsTotal = getUnitsTotal(normalizedItems);
  const subtotal = formatMoney(amountSubtotal || 0, currency);
  const shippingTotal = formatMoney(amountShipping || 0, currency);
  const taxTotal = formatMoney(amountTax || 0, currency);
  const total = formatMoney(amountTotal || 0, currency);
  const textItems = orderLineItemsText(normalizedItems, currency);
  const htmlItems = orderLineItemsHtml(normalizedItems, currency);
  const requiresShipping = shippingRequired !== false;
  const shippingName = shippingDetails?.name || "Not provided";
  const shippingAddress = requiresShipping ? formatAddress(shippingDetails?.address) : "No shipping address required";
  const fulfillmentMode = requiresShipping ? "Ship this order" : "In-person / no shipping required";
  const ownerBcc = buildOwnerBccAddressForRecipient(customerEmail);

  await transporter.sendMail({
    from: fromEmail,
    to: customerEmail,
    bcc: ownerBcc,
    subject: `PublisHearts receipt - Order ${orderId}`,
    text: `Thank you for your order from PublisHearts.

Order ID: ${orderId}
Subtotal: ${subtotal}
Shipping: ${shippingTotal}
Sales tax: ${taxTotal}
Total: ${total}
Units ordered: ${unitsTotal}

Fulfillment:
Mode: ${fulfillmentMode}
Name: ${shippingName}
Address: ${shippingAddress}

Items:
${textItems}

If you have any questions, reply to this email.`,
    html: `<div style="font-family:Arial,sans-serif; color:#1f2937; line-height:1.4;">
      <h2 style="margin:0 0 12px;">Thank you for your order.</h2>
      <p style="margin:0 0 8px;">Order ID: <strong>${escapeHtml(orderId)}</strong></p>
      <p style="margin:0 0 4px;">Subtotal: <strong>${escapeHtml(subtotal)}</strong></p>
      <p style="margin:0 0 4px;">Shipping: <strong>${escapeHtml(shippingTotal)}</strong></p>
      <p style="margin:0 0 4px;">Sales tax: <strong>${escapeHtml(taxTotal)}</strong></p>
      <p style="margin:0 0 16px;">Total: <strong>${escapeHtml(total)}</strong></p>
      <p style="margin:0 0 16px;">Units ordered: <strong>${unitsTotal}</strong></p>
      <h3 style="margin:0 0 8px;">Fulfillment</h3>
      <p style="margin:0 0 4px;">Mode: <strong>${escapeHtml(fulfillmentMode)}</strong></p>
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

export async function sendOwnerNotification({
  orderId,
  amountSubtotal,
  amountShipping,
  amountTax,
  amountTotal,
  currency,
  lineItems,
  customerDetails,
  shippingDetails,
  shippingRequired = true,
  orderSource = "storefront"
}) {
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

  const normalizedItems = normalizeLineItems(lineItems);
  const unitsTotal = getUnitsTotal(normalizedItems);
  const subtotal = formatMoney(amountSubtotal || 0, currency);
  const shippingTotal = formatMoney(amountShipping || 0, currency);
  const taxTotal = formatMoney(amountTax || 0, currency);
  const total = formatMoney(amountTotal || 0, currency);
  const customerName = customerDetails?.name || "Unknown";
  const customerEmail = customerDetails?.email || "Unknown";
  const customerPhone = customerDetails?.phone || "Not provided";
  const requiresShipping = shippingRequired !== false;
  const shippingName = shippingDetails?.name || "Not provided";
  const shippingAddress = requiresShipping ? formatAddress(shippingDetails?.address) : "No shipping address required";
  const fulfillmentMode = requiresShipping ? "Ship this order" : "In-person / no shipping required";
  const orderSourceLabel = formatOrderSourceLabel(orderSource);
  const textItems = orderLineItemsText(normalizedItems, currency);
  const htmlItems = orderLineItemsHtml(normalizedItems, currency);

  await transporter.sendMail({
    from: fromEmail,
    to: ownerEmail,
    subject: `New PublisHearts order - ${orderId}`,
    text: `New order received.

Order ID: ${orderId}
Subtotal: ${subtotal}
Shipping: ${shippingTotal}
Sales tax: ${taxTotal}
Total: ${total}
Units ordered: ${unitsTotal}
Source: ${orderSourceLabel}

Customer:
Name: ${customerName}
Email: ${customerEmail}
Phone: ${customerPhone}

Shipping:
Mode: ${fulfillmentMode}
Name: ${shippingName}
Address: ${shippingAddress}

Items:
${textItems}`,
    html: `<div style="font-family:Arial,sans-serif; color:#1f2937; line-height:1.4;">
      <h2 style="margin:0 0 12px;">New order received</h2>
      <p style="margin:0 0 4px;">Order ID: <strong>${escapeHtml(orderId)}</strong></p>
      <p style="margin:0 0 4px;">Subtotal: <strong>${escapeHtml(subtotal)}</strong></p>
      <p style="margin:0 0 4px;">Shipping: <strong>${escapeHtml(shippingTotal)}</strong></p>
      <p style="margin:0 0 4px;">Sales tax: <strong>${escapeHtml(taxTotal)}</strong></p>
      <p style="margin:0 0 16px;">Total: <strong>${escapeHtml(total)}</strong></p>
      <p style="margin:0 0 16px;">Units ordered: <strong>${unitsTotal}</strong></p>
      <p style="margin:0 0 16px;">Source: <strong>${escapeHtml(orderSourceLabel)}</strong></p>
      <h3 style="margin:0 0 8px;">Customer</h3>
      <p style="margin:0 0 4px;">Name: ${escapeHtml(customerName)}</p>
      <p style="margin:0 0 4px;">Email: ${escapeHtml(customerEmail)}</p>
      <p style="margin:0 0 16px;">Phone: ${escapeHtml(customerPhone)}</p>
      <h3 style="margin:0 0 8px;">Fulfillment</h3>
      <p style="margin:0 0 4px;">Mode: <strong>${escapeHtml(fulfillmentMode)}</strong></p>
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

export async function sendCustomStoryQuoteRequest({
  customerName,
  customerEmail,
  customerPhone,
  storyInspiration,
  audienceDetails,
  timelineDetails,
  extraNotes
}) {
  if (!emailConfigured()) {
    return false;
  }

  if (!ownerEmail) {
    if (!printedOwnerWarning) {
      printedOwnerWarning = true;
      console.warn("OWNER_EMAIL is missing. Store owner notifications are disabled.");
    }
    return false;
  }

  const safeName = String(customerName || "").trim() || "Unknown";
  const safeEmail = String(customerEmail || "").trim().toLowerCase() || "Unknown";
  const safePhone = String(customerPhone || "").trim() || "Not provided";
  const safeStoryInspiration = String(storyInspiration || "").trim() || "Not provided";
  const safeAudienceDetails = String(audienceDetails || "").trim() || "Not provided";
  const safeTimelineDetails = String(timelineDetails || "").trim() || "Not provided";
  const safeExtraNotes = String(extraNotes || "").trim() || "None";

  await transporter.sendMail({
    from: fromEmail,
    to: ownerEmail,
    replyTo: safeEmail !== "Unknown" ? safeEmail : undefined,
    subject: `Custom story quote request - ${safeName}`,
    text: `New custom story quote request.

Name: ${safeName}
Email: ${safeEmail}
Phone: ${safePhone}

Story inspiration:
${safeStoryInspiration}

Audience / reader details:
${safeAudienceDetails}

Timeline / occasion:
${safeTimelineDetails}

Extra notes:
${safeExtraNotes}`,
    html: `<div style="font-family:Arial,sans-serif; color:#1f2937; line-height:1.5;">
      <h2 style="margin:0 0 12px;">New custom story quote request</h2>
      <p style="margin:0 0 4px;">Name: <strong>${escapeHtml(safeName)}</strong></p>
      <p style="margin:0 0 4px;">Email: <strong>${escapeHtml(safeEmail)}</strong></p>
      <p style="margin:0 0 16px;">Phone: <strong>${escapeHtml(safePhone)}</strong></p>
      <h3 style="margin:0 0 8px;">Story inspiration</h3>
      <p style="margin:0 0 16px; white-space:pre-wrap;">${escapeHtml(safeStoryInspiration)}</p>
      <h3 style="margin:0 0 8px;">Audience / reader details</h3>
      <p style="margin:0 0 16px; white-space:pre-wrap;">${escapeHtml(safeAudienceDetails)}</p>
      <h3 style="margin:0 0 8px;">Timeline / occasion</h3>
      <p style="margin:0 0 16px; white-space:pre-wrap;">${escapeHtml(safeTimelineDetails)}</p>
      <h3 style="margin:0 0 8px;">Extra notes</h3>
      <p style="margin:0; white-space:pre-wrap;">${escapeHtml(safeExtraNotes)}</p>
    </div>`
  });

  return true;
}
