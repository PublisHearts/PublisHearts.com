import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";

dotenv.config();

const siteSettingsFilePath =
  (process.env.SITE_SETTINGS_FILE || "").trim() ||
  path.join(process.cwd(), "data", "site-settings.json");

const defaults = {
  brandName: "PublisHearts",
  brandMark: "P",
  logoImageUrl: "",
  pageTitle: "PublisHearts Books",
  pageDescription:
    "PublisHearts bookstore. Shop featured books, pay securely by card, and get your receipt by email.",
  heroEyebrow: "Bookshop",
  heroTitle: "Stories worth shipping.",
  heroCopy:
    "Discover curated titles from PublisHearts and check out securely with card payment. Every customer receives a receipt email instantly.",
  heroCtaLabel: "Shop Books",
  featuredTitle: "Featured Titles",
  featuredCopy: "Each order is processed securely and shipped to the address collected at checkout.",
  promise1Title: "Secure Card Checkout",
  promise1Copy: "Payments run through Stripe, so card data is handled by trusted infrastructure.",
  promise2Title: "Receipt Emails",
  promise2Copy: "Customers get a receipt. You get full order details with shipping info by email.",
  promise3Title: "Ready To Launch",
  promise3Copy: "This store is free to host and easy to customize as your catalog grows.",
  footerLeft: "PublisHearts",
  footerRight: "Books that stay with you",
  themeAccent: "#ad4f2d",
  themeAccentStrong: "#8d391c",
  themeBackground: "#f5efe5",
  themeInk: "#221d18"
};

const textLimits = {
  brandName: 80,
  brandMark: 4,
  logoImageUrl: 600,
  pageTitle: 100,
  pageDescription: 220,
  heroEyebrow: 80,
  heroTitle: 180,
  heroCopy: 600,
  heroCtaLabel: 60,
  featuredTitle: 120,
  featuredCopy: 400,
  promise1Title: 120,
  promise1Copy: 400,
  promise2Title: 120,
  promise2Copy: 400,
  promise3Title: 120,
  promise3Copy: 400,
  footerLeft: 120,
  footerRight: 120
};

let loaded = false;
let settings = { ...defaults };
let writeQueue = Promise.resolve();

export class SiteSettingsValidationError extends Error {}

function cloneSettings(value) {
  return { ...value };
}

function cleanText(value, maxLength, fieldName) {
  const text = String(value || "").trim();
  if (!text) {
    throw new SiteSettingsValidationError(`${fieldName} is required.`);
  }
  if (text.length > maxLength) {
    throw new SiteSettingsValidationError(`${fieldName} must be ${maxLength} characters or less.`);
  }
  return text;
}

function cleanOptionalLogoUrl(value) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }
  if (/^https?:\/\//i.test(text) || text.startsWith("/uploads/")) {
    if (text.length > textLimits.logoImageUrl) {
      throw new SiteSettingsValidationError(
        `Logo image URL must be ${textLimits.logoImageUrl} characters or less.`
      );
    }
    return text;
  }
  throw new SiteSettingsValidationError("Logo image URL must start with https://, http://, or /uploads/.");
}

function cleanColor(value, fieldName) {
  const color = String(value || "").trim().toLowerCase();
  if (!/^#[0-9a-f]{6}$/.test(color)) {
    throw new SiteSettingsValidationError(`${fieldName} must be a hex color like #ad4f2d.`);
  }
  return color;
}

function normalize(raw = {}) {
  const merged = { ...defaults, ...raw };
  return {
    brandName: cleanText(merged.brandName, textLimits.brandName, "Brand name"),
    brandMark: cleanText(merged.brandMark, textLimits.brandMark, "Brand mark"),
    logoImageUrl: cleanOptionalLogoUrl(merged.logoImageUrl),
    pageTitle: cleanText(merged.pageTitle, textLimits.pageTitle, "Page title"),
    pageDescription: cleanText(merged.pageDescription, textLimits.pageDescription, "Page description"),
    heroEyebrow: cleanText(merged.heroEyebrow, textLimits.heroEyebrow, "Hero eyebrow"),
    heroTitle: cleanText(merged.heroTitle, textLimits.heroTitle, "Hero title"),
    heroCopy: cleanText(merged.heroCopy, textLimits.heroCopy, "Hero copy"),
    heroCtaLabel: cleanText(merged.heroCtaLabel, textLimits.heroCtaLabel, "Hero button label"),
    featuredTitle: cleanText(merged.featuredTitle, textLimits.featuredTitle, "Featured title"),
    featuredCopy: cleanText(merged.featuredCopy, textLimits.featuredCopy, "Featured copy"),
    promise1Title: cleanText(merged.promise1Title, textLimits.promise1Title, "Promise 1 title"),
    promise1Copy: cleanText(merged.promise1Copy, textLimits.promise1Copy, "Promise 1 copy"),
    promise2Title: cleanText(merged.promise2Title, textLimits.promise2Title, "Promise 2 title"),
    promise2Copy: cleanText(merged.promise2Copy, textLimits.promise2Copy, "Promise 2 copy"),
    promise3Title: cleanText(merged.promise3Title, textLimits.promise3Title, "Promise 3 title"),
    promise3Copy: cleanText(merged.promise3Copy, textLimits.promise3Copy, "Promise 3 copy"),
    footerLeft: cleanText(merged.footerLeft, textLimits.footerLeft, "Footer left text"),
    footerRight: cleanText(merged.footerRight, textLimits.footerRight, "Footer right text"),
    themeAccent: cleanColor(merged.themeAccent, "Accent color"),
    themeAccentStrong: cleanColor(merged.themeAccentStrong, "Accent strong color"),
    themeBackground: cleanColor(merged.themeBackground, "Background color"),
    themeInk: cleanColor(merged.themeInk, "Text color")
  };
}

async function persist() {
  writeQueue = writeQueue.then(async () => {
    const directory = path.dirname(siteSettingsFilePath);
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(siteSettingsFilePath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
  });
  return writeQueue;
}

async function load() {
  try {
    const raw = await fs.readFile(siteSettingsFilePath, "utf8");
    const parsed = JSON.parse(raw);
    settings = normalize(parsed);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
    settings = normalize(defaults);
    await persist();
  }

  loaded = true;
}

async function ensureLoaded() {
  if (!loaded) {
    await load();
  }
}

export async function ensureSiteSettingsStore() {
  await ensureLoaded();
}

export async function getSiteSettings() {
  await ensureLoaded();
  return cloneSettings(settings);
}

export async function updateSiteSettings(changes) {
  await ensureLoaded();
  settings = normalize({ ...settings, ...changes });
  await persist();
  return cloneSettings(settings);
}
