export function formatMoney(amountCents = 0) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format((Number(amountCents) || 0) / 100);
}

export function normalizeProductCategory(value) {
  return String(value || "").trim().toLowerCase() === "merch" ? "merch" : "book";
}

export function getBookUnitsTotal(cartRows) {
  return (Array.isArray(cartRows) ? cartRows : []).reduce((sum, row) => {
    return normalizeProductCategory(row?.productCategory) === "merch" ? sum : sum + (Number(row?.quantity) || 0);
  }, 0);
}

export function calculateSubtotal(cartRows) {
  return (Array.isArray(cartRows) ? cartRows : []).reduce(
    (sum, row) => sum + (Number(row?.priceCents) || 0) * (Number(row?.quantity) || 0),
    0
  );
}
