export const products = [
  {
    id: "the-heart-ledger",
    title: "The Heart Ledger",
    subtitle: "A literary romance about second chances and inherited letters.",
    included: "",
    priceCents: 1899,
    imageUrl: "https://placehold.co/600x800/f8f1de/2f2a23?text=The+Heart+Ledger",
    shippingEnabled: true,
    shippingFeeCents: 500,
    inStock: true,
    sortOrder: 0
  },
  {
    id: "ink-after-midnight",
    title: "Ink After Midnight",
    subtitle: "A fast-paced mystery set inside an old publishing house.",
    included: "",
    priceCents: 2199,
    imageUrl: "https://placehold.co/600x800/e1ecf2/1b2a38?text=Ink+After+Midnight",
    shippingEnabled: true,
    shippingFeeCents: 500,
    inStock: true,
    sortOrder: 1
  },
  {
    id: "the-map-of-soft-stars",
    title: "The Map of Soft Stars",
    subtitle: "A reflective coming-of-age novel filled with poetic storytelling.",
    included: "",
    priceCents: 2499,
    imageUrl: "https://placehold.co/600x800/eee2e2/35211f?text=The+Map+of+Soft+Stars",
    shippingEnabled: true,
    shippingFeeCents: 500,
    inStock: true,
    sortOrder: 2
  }
];

const byId = new Map(products.map((product) => [product.id, product]));

export function getProductById(productId) {
  return byId.get(productId);
}
