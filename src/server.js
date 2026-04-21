import dotenv from "dotenv";
import express from "express";
import { createHash, createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "crypto";
import fs from "fs/promises";
import multer from "multer";
import os from "os";
import path from "path";
import Stripe from "stripe";
import { v2 as cloudinary } from "cloudinary";
import { execFile } from "child_process";
import { promisify } from "util";
import { fileURLToPath } from "url";
import { inflateRawSync, inflateSync } from "zlib";
import {
  ProductValidationError,
  createProduct,
  deleteProduct,
  ensureProductStore,
  findProductById,
  listProducts,
  reorderProducts,
  updateProduct
} from "./data/productStore.js";
import {
  getEmailHealth,
  sendCustomStoryQuoteRequest,
  sendCustomerReceipt,
  sendOwnerNotification,
  sendShipmentNotification
} from "./lib/email.js";
import {
  SiteSettingsValidationError,
  ensureSiteSettingsStore,
  getSiteSettings,
  updateSiteSettings
} from "./data/siteSettingsStore.js";
import {
  AddressBookValidationError,
  ensureAddressBookStore,
  listAddressBookEntries,
  upsertAddressBookEntry
} from "./data/addressBookStore.js";
import {
  OrderExclusionValidationError,
  ensureOrderExclusionStore,
  excludeOrder,
  listOrderExclusions,
  restoreExcludedOrder
} from "./data/orderExclusionStore.js";
import {
  ManualOrderValidationError,
  createManualOrder,
  ensureManualOrderStore,
  findManualOrderById,
  listManualOrders,
  updateManualOrder
} from "./data/manualOrderStore.js";
import {
  TerminalIntentValidationError,
  deleteTerminalIntent,
  ensureTerminalIntentStore,
  findTerminalIntentById,
  upsertTerminalIntent
} from "./data/terminalIntentStore.js";
import {
  MemberValidationError,
  createMember,
  ensureMemberStore,
  findMemberByAuthTokenHash,
  findMemberByEmail,
  findMemberById,
  findMemberByStripeCustomerId,
  listMembers,
  updateMember
} from "./data/memberStore.js";
import {
  PremiumLibraryValidationError,
  createPremiumLibraryItem,
  deletePremiumLibraryItem,
  ensurePremiumLibraryStore,
  findPremiumLibraryItemById,
  updatePremiumLibraryItem,
  listPremiumLibraryItems
} from "./data/premiumLibraryStore.js";
import {
  MemberCommunityValidationError,
  createMemberCommunityPost,
  ensureMemberCommunityStore,
  listMemberCommunityPosts
} from "./data/memberCommunityStore.js";
import {
  MemberEbookLoanValidationError,
  ensureMemberEbookLoanStore,
  findMemberEbookLoan,
  upsertMemberEbookLoan
} from "./data/memberEbookLoanStore.js";
import {
  MemberPerkFulfillmentValidationError,
  ensureMemberPerkFulfillmentStore,
  findMemberPerkFulfillmentRecord,
  listMemberPerkFulfillmentRecords,
  upsertMemberPerkFulfillmentRecord
} from "./data/memberPerkFulfillmentStore.js";
import {
  checkPostgresJsonStoreConnection,
  getPostgresJsonStoreRuntimeInfo
} from "./data/postgresJsonStore.js";

dotenv.config();
const execFileAsync = promisify(execFile);

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeTerminalLocationId = String(process.env.STRIPE_TERMINAL_LOCATION_ID || "").trim();
const currency = (process.env.STRIPE_CURRENCY || "usd").toLowerCase();
const port = Number(process.env.PORT || 4242);
const stripeAutomaticTaxEnabled = (process.env.STRIPE_AUTOMATIC_TAX || "true").trim().toLowerCase() !== "false";
const parsedManualSalesTaxRate = Number.parseFloat(String(process.env.MANUAL_SALES_TAX_RATE || "0"));
const manualSalesTaxRatePercent =
  Number.isFinite(parsedManualSalesTaxRate) && parsedManualSalesTaxRate >= 0 ? parsedManualSalesTaxRate : 0;
const manualSalesTaxEnabled = manualSalesTaxRatePercent > 0;
const manualSalesTaxApplyToShipping =
  (process.env.MANUAL_SALES_TAX_APPLY_TO_SHIPPING || "false").trim().toLowerCase() === "true";
const usStateCodes = new Set([
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
  "DC"
]);
const parsedManualNonTaxStates = (process.env.MANUAL_NON_TAX_STATES || "AK,DE,MT,NH,OR")
  .split(",")
  .map((code) => String(code || "").trim().toUpperCase())
  .filter((code) => usStateCodes.has(code));
const manualNonTaxStates = new Set(parsedManualNonTaxStates.length > 0 ? parsedManualNonTaxStates : ["AK", "DE", "MT", "NH", "OR"]);
const adminPassword = (process.env.ADMIN_PASSWORD || "").trim();
const stripeTierStandardPriceId = String(process.env.STRIPE_TIER_STANDARD_PRICE_ID || "").trim();
const stripeTierPlusPriceId = String(process.env.STRIPE_TIER_PLUS_PRICE_ID || "").trim();
const stripeTierPremiumPriceId = String(process.env.STRIPE_TIER_PREMIUM_PRICE_ID || "").trim();
const memberPortalReturnPath = String(process.env.MEMBER_PORTAL_RETURN_PATH || "/membership.html").trim() || "/membership.html";
const githubPushToken = (process.env.GITHUB_PUSH_TOKEN || "").trim();
const githubRepoRaw = (process.env.GITHUB_REPO || process.env.GITHUB_REPOSITORY || "").trim();
const githubRepoOwner = (process.env.GITHUB_REPO_OWNER || "PublisHearts").trim() || "PublisHearts";
const githubBranch = (process.env.GITHUB_BRANCH || "main").trim() || "main";
const githubAuthorName = (process.env.GITHUB_AUTHOR_NAME || "PublisHearts Admin Bot").trim();
const githubAuthorEmail = (process.env.GITHUB_AUTHOR_EMAIL || "admin@publishearts.com").trim();
const adminStripeUrl = (process.env.ADMIN_STRIPE_URL || "https://dashboard.stripe.com/").trim();
const adminRenderUrl = (process.env.ADMIN_RENDER_URL || "https://dashboard.render.com/").trim();
const adminFacebookUrl = (process.env.ADMIN_FACEBOOK_URL || "https://business.facebook.com/latest/home").trim();
const adminAmazonKdpUrl = (process.env.ADMIN_AMAZON_KDP_URL || "https://kdp.amazon.com/").trim();
const adminShippoUrl = (process.env.ADMIN_SHIPPO_URL || "https://apps.goshippo.com/orders").trim();
const cloudinaryCloudName = String(process.env.CLOUDINARY_CLOUD_NAME || "").trim();
const cloudinaryApiKey = String(process.env.CLOUDINARY_API_KEY || "").trim();
const cloudinaryApiSecret = String(process.env.CLOUDINARY_API_SECRET || "").trim();
const cloudinaryUploadFolder = String(process.env.CLOUDINARY_UPLOAD_FOLDER || "publishearts/uploads")
  .trim()
  .replace(/^\/+|\/+$/g, "");
const cloudinaryUploadsEnabled = Boolean(cloudinaryCloudName && cloudinaryApiKey && cloudinaryApiSecret);
const premiumEbookTokenSecret = String(
  process.env.PREMIUM_EBOOK_TOKEN_SECRET || stripeSecretKey || adminPassword || "publishearts-premium-ebooks"
).trim();
const premiumEbookDownloadTokenTtlSeconds = Math.max(
  60,
  Number.parseInt(String(process.env.PREMIUM_EBOOK_TOKEN_TTL_SECONDS || "900"), 10) || 900
);
const premiumEbookProtectedUploadsPrefix = "/uploads/premium-ebooks/";
const parsedShippingBaseWeightLbs = Number.parseFloat(
  String(process.env.SHIPPING_BASE_WEIGHT_LBS || process.env.SHIPPING_WEIGHT_PER_UNIT_LBS || "1.5")
);
const shippingBaseWeightLbs =
  Number.isFinite(parsedShippingBaseWeightLbs) && parsedShippingBaseWeightLbs > 0
    ? parsedShippingBaseWeightLbs
    : 1.5;
const parsedShippingAdditionalWeightPerUnitLbs = Number.parseFloat(
  String(process.env.SHIPPING_ADDITIONAL_WEIGHT_PER_UNIT_LBS || "1.0")
);
const shippingAdditionalWeightPerUnitLbs =
  Number.isFinite(parsedShippingAdditionalWeightPerUnitLbs) && parsedShippingAdditionalWeightPerUnitLbs > 0
    ? parsedShippingAdditionalWeightPerUnitLbs
    : 1;
const parsedShippingMinimumDollars = Number.parseFloat(String(process.env.SHIPPING_MIN_FEE || "0"));
const shippingHardMinimumCents = 1000;
const shippingMinimumCents =
  Number.isFinite(parsedShippingMinimumDollars) && parsedShippingMinimumDollars >= 0
    ? Math.max(shippingHardMinimumCents, Math.round(parsedShippingMinimumDollars * 100))
    : shippingHardMinimumCents;
const shippingRateTableDefault =
  "1.5:11.92,2:12.90,3:14.58,4:16.68,5:17.77,10:23.50";
const shippingRateTableRaw =
  String(process.env.USPS_GROUND_ADVANTAGE_RATE_TABLE || "").trim() || shippingRateTableDefault;
const uspsGroundAdvantageRatePoints = parseShippingRateTable(shippingRateTableRaw);
const shippingZoneScaleDefault = "1:0.7424,2:0.7718,3:0.7928,4:0.8221,5:0.8515,6:0.8809,7:0.9262,8:1";
const shippingZoneScaleRaw =
  String(process.env.USPS_GROUND_ADVANTAGE_ZONE_SCALE || "").trim() || shippingZoneScaleDefault;
const uspsGroundAdvantageZoneScale = parseShippingZoneScale(shippingZoneScaleRaw);
const shippingStateZoneMapDefault =
  "NY:1,CT:2,NJ:2,PA:2,MA:2,RI:2,VT:2,NH:2,DE:2,MD:2,DC:2,ME:3,VA:3,WV:3,OH:3,NC:3,SC:4,GA:4,TN:4,KY:4,IN:4,MI:4,IL:4,AL:5,FL:5,MS:5,WI:5,MN:5,IA:5,MO:5,AR:5,LA:5,ND:6,SD:6,NE:6,KS:6,OK:6,TX:6,NM:6,CO:6,WY:6,MT:7,ID:7,UT:7,AZ:7,NV:7,WA:8,OR:8,CA:8,AK:8,HI:8";
const shippingStateZoneMapRaw =
  String(process.env.USPS_STATE_ZONE_MAP || "").trim() || shippingStateZoneMapDefault;
const uspsStateZoneMap = parseShippingStateZoneMap(shippingStateZoneMapRaw);
const parsedShippingDefaultZone = Number.parseInt(String(process.env.USPS_DEFAULT_ZONE || "8"), 10);
const shippingDefaultZone =
  Number.isFinite(parsedShippingDefaultZone) && parsedShippingDefaultZone >= 1 && parsedShippingDefaultZone <= 8
    ? parsedShippingDefaultZone
    : 8;
const parsedShippingCountries = (process.env.ALLOWED_SHIPPING_COUNTRIES || "US")
  .split(",")
  .map((country) => country.trim().toUpperCase())
  .filter((country) => /^[A-Z]{2}$/.test(country));
const allowedShippingCountries = parsedShippingCountries.length > 0 ? parsedShippingCountries : ["US"];
const soldCounterExcludedKeywords = (process.env.SOLD_COUNTER_EXCLUDED_KEYWORDS || "mineral kit")
  .split(",")
  .map((entry) => String(entry || "").trim().toLowerCase())
  .filter(Boolean);
const uspsApiBaseUrl = ((process.env.USPS_API_BASE_URL || "").trim() || "https://apis.usps.com").replace(/\/$/, "");
const uspsOauthUrl =
  (process.env.USPS_OAUTH_URL || "").trim() || `${uspsApiBaseUrl}/oauth2/v3/token`;
const uspsPaymentAuthorizationUrl =
  (process.env.USPS_PAYMENT_AUTH_URL || "").trim() || `${uspsApiBaseUrl}/payments/v3/payment-authorization`;
const uspsLabelUrl =
  (process.env.USPS_LABEL_URL || "").trim() || `${uspsApiBaseUrl}/labels/v3/label`;
const uspsTrackingBaseUrl =
  (process.env.USPS_TRACKING_URL_BASE || "").trim() ||
  "https://tools.usps.com/go/TrackConfirmAction?tLabels=";
const uspsClientId = String(process.env.USPS_CLIENT_ID || "").trim();
const uspsClientSecret = String(process.env.USPS_CLIENT_SECRET || "").trim();
const uspsCrid = String(process.env.USPS_CRID || "").trim();
const uspsMid = String(process.env.USPS_MID || "").trim();
const uspsManifestMid = String(process.env.USPS_MANIFEST_MID || "").trim() || uspsMid;
const uspsAccountType = String(process.env.USPS_ACCOUNT_TYPE || "EPS").trim().toUpperCase();
const uspsAccountNumber = String(process.env.USPS_ACCOUNT_NUMBER || "").trim();
const uspsFromName = String(process.env.USPS_FROM_NAME || "").trim();
const uspsFromCompany = String(process.env.USPS_FROM_COMPANY || "").trim();
const uspsFromAddress1 = String(process.env.USPS_FROM_ADDRESS1 || "").trim();
const uspsFromAddress2 = String(process.env.USPS_FROM_ADDRESS2 || "").trim();
const uspsFromCity = String(process.env.USPS_FROM_CITY || "").trim();
const uspsFromState = String(process.env.USPS_FROM_STATE || "").trim().toUpperCase();
const uspsFromZip5 = String(process.env.USPS_FROM_ZIP5 || "").trim();
const uspsFromZip4 = String(process.env.USPS_FROM_ZIP4 || "").trim();
const uspsDefaultMailClass = String(process.env.USPS_DEFAULT_MAIL_CLASS || "USPS_GROUND_ADVANTAGE")
  .trim()
  .toUpperCase();
const uspsDefaultRateIndicator = String(process.env.USPS_DEFAULT_RATE_INDICATOR || "SP")
  .trim()
  .toUpperCase();
const uspsDefaultProcessingCategory = String(process.env.USPS_DEFAULT_PROCESSING_CATEGORY || "MACHINABLE")
  .trim()
  .toUpperCase();
const parsedUspsDefaultLengthInches = Number.parseFloat(String(process.env.USPS_DEFAULT_PKG_LENGTH_IN || "9"));
const uspsDefaultLengthInches =
  Number.isFinite(parsedUspsDefaultLengthInches) && parsedUspsDefaultLengthInches > 0
    ? parsedUspsDefaultLengthInches
    : 9;
const parsedUspsDefaultWidthInches = Number.parseFloat(String(process.env.USPS_DEFAULT_PKG_WIDTH_IN || "6"));
const uspsDefaultWidthInches =
  Number.isFinite(parsedUspsDefaultWidthInches) && parsedUspsDefaultWidthInches > 0
    ? parsedUspsDefaultWidthInches
    : 6;
const parsedUspsDefaultHeightInches = Number.parseFloat(String(process.env.USPS_DEFAULT_PKG_HEIGHT_IN || "2"));
const uspsDefaultHeightInches =
  Number.isFinite(parsedUspsDefaultHeightInches) && parsedUspsDefaultHeightInches > 0
    ? parsedUspsDefaultHeightInches
    : 2;
const uspsDefaultImageType = String(process.env.USPS_LABEL_IMAGE_TYPE || "PDF")
  .trim()
  .toUpperCase();
const uspsDefaultLabelType = String(process.env.USPS_LABEL_TYPE || "4X6LABEL")
  .trim()
  .toUpperCase();

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;
if (cloudinaryUploadsEnabled) {
  cloudinary.config({
    cloud_name: cloudinaryCloudName,
    api_key: cloudinaryApiKey,
    api_secret: cloudinaryApiSecret,
    secure: true
  });
}
const app = express();
app.set("trust proxy", true);
const parsedPublicSoldCopiesCacheSeconds = Number.parseInt(
  String(process.env.PUBLIC_SOLD_COPIES_CACHE_SECONDS || "45"),
  10
);
const publicSoldCopiesCacheMs =
  Number.isFinite(parsedPublicSoldCopiesCacheSeconds) && parsedPublicSoldCopiesCacheSeconds >= 0
    ? parsedPublicSoldCopiesCacheSeconds * 1000
    : 45000;
const parsedPublicSoldCopiesMaxSessions = Number.parseInt(
  String(process.env.PUBLIC_SOLD_COPIES_MAX_SESSIONS || "2500"),
  10
);
const publicSoldCopiesMaxSessions =
  Number.isFinite(parsedPublicSoldCopiesMaxSessions) && parsedPublicSoldCopiesMaxSessions >= 100
    ? Math.min(10000, parsedPublicSoldCopiesMaxSessions)
    : 2500;
const soldCopiesCacheState = {
  soldCopies: 0,
  paidOrders: 0,
  updatedAtMs: 0,
  inFlightPromise: null
};

function invalidateSoldCopiesCache() {
  soldCopiesCacheState.updatedAtMs = 0;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "../public");
const uploadsDir = (process.env.UPLOADS_DIR || "").trim() || path.join(publicDir, "uploads");
const premiumEbookUploadsDir = path.join(uploadsDir, "premium-ebooks");
const pdfEbookDir = path.join(process.cwd(), "pdfEbook");
const allowedImageMimes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const allowedPdfMimes = new Set(["application/pdf", "application/x-pdf", "application/acrobat"]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname || "").toLowerCase().slice(0, 10);
    const safeExt = /^\.[a-z0-9]+$/.test(extension) ? extension : ".jpg";
    cb(null, `${Date.now()}-${randomUUID().slice(0, 8)}${safeExt}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 6 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (!allowedImageMimes.has(file.mimetype)) {
      cb(new Error("Only JPG, PNG, WEBP, or GIF image uploads are allowed."));
      return;
    }
    cb(null, true);
  }
});

const premiumLibraryStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const fieldName = String(file?.fieldname || "").trim();
    const targetDir = fieldName === "ebookFile" ? premiumEbookUploadsDir : uploadsDir;
    fs.mkdir(targetDir, { recursive: true })
      .then(() => cb(null, targetDir))
      .catch((error) => cb(error));
  },
  filename: (req, file, cb) => {
    const fieldName = String(file?.fieldname || "").trim();
    const extension = path.extname(file?.originalname || "").toLowerCase().slice(0, 10);
    const safeExt = /^\.[a-z0-9]+$/.test(extension)
      ? extension
      : fieldName === "ebookFile"
        ? ".pdf"
        : ".jpg";
    cb(null, `${Date.now()}-${randomUUID().slice(0, 8)}${safeExt}`);
  }
});

const premiumLibraryUpload = multer({
  storage: premiumLibraryStorage,
  limits: {
    fileSize: 30 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const fieldName = String(file?.fieldname || "").trim();
    const mime = String(file?.mimetype || "").trim().toLowerCase();
    const originalName = String(file?.originalname || "").trim().toLowerCase();
    if (fieldName === "ebookFile") {
      if (allowedPdfMimes.has(mime) || mime.includes("pdf") || originalName.endsWith(".pdf")) {
        cb(null, true);
        return;
      }
      cb(new Error("Only PDF ebook uploads are allowed."));
      return;
    }
    if (fieldName === "coverImage") {
      if (allowedImageMimes.has(mime)) {
        cb(null, true);
        return;
      }
      cb(new Error("Only JPG, PNG, WEBP, or GIF cover uploads are allowed."));
      return;
    }
    cb(new Error("Unsupported premium library upload field."));
  }
});

const labelPdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const mime = String(file?.mimetype || "").toLowerCase();
    const originalName = String(file?.originalname || "").toLowerCase();
    if (mime.includes("pdf") || originalName.endsWith(".pdf")) {
      cb(null, true);
      return;
    }
    cb(new Error("Only PDF shipping label uploads are allowed."));
  }
});

function parseLineItemsFromMetadata(metadata = {}) {
  const summary = String(metadata.cart_summary || "").trim();
  if (!summary) {
    return [];
  }

  return summary
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((entry) => {
      const match = entry.match(/^(.*)\s+x(\d+)$/i);
      if (!match) {
        return {
          name: entry,
          quantity: 1,
          amountTotal: null
        };
      }

      return {
        name: match[1].trim() || "Book",
        quantity: Math.max(1, Number.parseInt(match[2], 10) || 1),
        amountTotal: null
      };
    });
}

function readMetadataInteger(metadata, key) {
  const parsed = Number.parseInt(String(metadata?.[key] ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function readMetadataFloat(metadata, key) {
  const parsed = Number.parseFloat(String(metadata?.[key] ?? ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizePackageWeightValue(value) {
  const text = String(value ?? "").trim();
  if (!text) {
    return "";
  }
  if (!/^\d+(\.\d{1,2})?$/.test(text)) {
    return null;
  }
  const parsed = Number.parseFloat(text);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 9999) {
    return null;
  }
  return String(Number(parsed.toFixed(2)));
}

function normalizeFulfillmentStatus(value) {
  const text = String(value || "")
    .trim()
    .toLowerCase();
  if (["fulfilled", "shipped", "sent", "complete", "completed"].includes(text)) {
    return "shipped";
  }
  return "pending";
}

function getPaymentIntentIdFromSession(session) {
  const ref = session?.payment_intent;
  if (!ref) {
    return "";
  }
  if (typeof ref === "string") {
    return ref;
  }
  return String(ref.id || "").trim();
}

function normalizeUsStateCode(value) {
  const code = String(value || "")
    .trim()
    .toUpperCase();
  if (!usStateCodes.has(code)) {
    return "";
  }
  return code;
}

function evaluateCheckoutStateMatch(session, options = {}) {
  const paymentIntentMetadata = options?.paymentIntentMetadata || {};
  const metadata = session?.metadata || {};
  const selectedStateFromSession = normalizeUsStateCode(metadata.customer_state);
  const selectedStateFromPaymentIntent =
    normalizeUsStateCode(paymentIntentMetadata.fulfillment_selected_state_override) ||
    normalizeUsStateCode(paymentIntentMetadata.fulfillment_selected_state);
  const selectedState = selectedStateFromPaymentIntent || selectedStateFromSession;
  const selectedStateSource = selectedStateFromPaymentIntent
    ? "payment_intent"
    : selectedStateFromSession
      ? "session_metadata"
      : "";
  const shippingRequired = isSessionShippingRequired(session, { paymentIntentMetadata });
  const shipping = getOrderShippingAddress(session, { paymentIntentMetadata });
  const shippingCountry = normalizeIsoCountry(shipping?.country, "US");
  const shippingStateRaw = String(shipping?.state || "")
    .trim()
    .toUpperCase();
  const shippingState = normalizeUsStateCode(shippingStateRaw);

  if (!shippingRequired) {
    return {
      selectedState,
      selectedStateSource,
      shippingState,
      shippingStateRaw,
      shippingCountry,
      stateMatch: true,
      mismatchReason: ""
    };
  }

  const stateMatch =
    Boolean(selectedState) &&
    shippingCountry === "US" &&
    Boolean(shippingState) &&
    selectedState === shippingState;

  let mismatchReason = "";
  if (!stateMatch) {
    if (!selectedState) {
      mismatchReason = "Checkout state selection is missing.";
    } else if (shippingCountry !== "US") {
      mismatchReason = `Shipping country ${shippingCountry || "Unknown"} is not supported for state-based shipping.`;
    } else if (!shippingState) {
      mismatchReason = `Shipping state "${shippingStateRaw || "Unknown"}" is invalid or missing.`;
    } else {
      mismatchReason = `Selected state ${selectedState} does not match shipping state ${shippingState}.`;
    }
  }

  return {
    selectedState,
    selectedStateSource,
    shippingState,
    shippingStateRaw,
    shippingCountry,
    stateMatch,
    mismatchReason
  };
}

function buildStateMismatchErrorMessage(matchResult) {
  const selected = matchResult?.selectedState || "Unknown";
  const shippingState = matchResult?.shippingState || matchResult?.shippingStateRaw || "Unknown";
  const shippingCountry = matchResult?.shippingCountry || "Unknown";
  const reason = String(matchResult?.mismatchReason || "").trim();
  const detail = reason || `Selected state ${selected} does not match shipping state ${shippingState}.`;
  return `${detail} (Selected: ${selected}, Shipping: ${shippingState}, Country: ${shippingCountry})`;
}

function parseCartSummaryEntries(metadata = {}) {
  const summary = String(metadata?.cart_summary || "").trim();
  if (!summary) {
    return [];
  }

  return summary
    .split("|")
    .map((entry) => String(entry || "").trim())
    .filter(Boolean)
    .map((entry) => {
      const match = entry.match(/^(.*)\s+x(\d+)$/i);
      if (!match) {
        return {
          name: entry,
          quantity: 1
        };
      }
      return {
        name: String(match[1] || "").trim(),
        quantity: Math.max(1, Number.parseInt(match[2], 10) || 1)
      };
    });
}

function normalizeCounterItemName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeCounterWord(value) {
  const cleaned = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  if (!cleaned) {
    return "";
  }
  if (cleaned.endsWith("ies") && cleaned.length > 4) {
    return `${cleaned.slice(0, -3)}y`;
  }
  if (cleaned.endsWith("s") && cleaned.length > 3) {
    return cleaned.slice(0, -1);
  }
  return cleaned;
}

function buildCounterWordSet(value) {
  const tokens = String(value || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((token) => normalizeCounterWord(token))
    .filter(Boolean);
  return new Set(tokens);
}

function matchesExcludedCounterKeyword(itemName, keyword) {
  const normalizedName = normalizeCounterItemName(itemName);
  const normalizedKeyword = normalizeCounterItemName(keyword);
  if (!normalizedName || !normalizedKeyword) {
    return false;
  }
  if (normalizedName.includes(normalizedKeyword)) {
    return true;
  }

  const itemWords = buildCounterWordSet(normalizedName);
  const keywordWords = Array.from(buildCounterWordSet(normalizedKeyword));
  if (itemWords.size === 0 || keywordWords.length === 0) {
    return false;
  }

  return keywordWords.every((word) => itemWords.has(word));
}

function isCounterBookItemName(value) {
  const normalized = normalizeCounterItemName(value);
  if (!normalized) {
    return false;
  }
  if (normalized === "shipping" || normalized === "sales tax" || normalized === "tax") {
    return false;
  }
  if (soldCounterExcludedKeywords.some((keyword) => matchesExcludedCounterKeyword(normalized, keyword))) {
    return false;
  }
  return true;
}

function calculateBookUnitsFromCartEntries(entries) {
  const safeEntries = Array.isArray(entries) ? entries : [];
  return safeEntries.reduce((sum, entry) => {
    const productCategory = String(entry?.productCategory || "")
      .trim()
      .toLowerCase();
    if (productCategory === "merch") {
      return sum;
    }
    if (productCategory !== "book" && !isCounterBookItemName(entry?.name)) {
      return sum;
    }
    return sum + Math.max(0, Number(entry?.quantity) || 0);
  }, 0);
}

function shouldCountProductTowardBookCounter(product) {
  if (!product || typeof product !== "object") {
    return false;
  }
  if (product.excludeFromBookCounter === true || product.countTowardBookCounter === false) {
    return false;
  }
  const productCategory = String(product.productCategory || "")
    .trim()
    .toLowerCase();
  if (productCategory === "merch") {
    return false;
  }
  if (productCategory === "book") {
    return true;
  }
  return isCounterBookItemName(product.title);
}

function isSessionShippingRequired(session, options = {}) {
  const paymentIntentMetadata = options?.paymentIntentMetadata || {};
  const overrideFlag = parseBooleanFlag(paymentIntentMetadata.fulfillment_shipping_required_override, undefined);
  if (typeof overrideFlag === "boolean") {
    return overrideFlag;
  }
  const paymentIntentFlag = parseBooleanFlag(paymentIntentMetadata.fulfillment_shipping_required, undefined);
  if (typeof paymentIntentFlag === "boolean") {
    return paymentIntentFlag;
  }
  const sessionFlag = parseBooleanFlag(session?.metadata?.shipping_required, undefined);
  if (typeof sessionFlag === "boolean") {
    return sessionFlag;
  }
  return true;
}

function getSessionOrderSource(session, options = {}) {
  const paymentIntentMetadata = options?.paymentIntentMetadata || {};
  const raw = String(paymentIntentMetadata.order_source || session?.metadata?.order_source || "storefront")
    .trim()
    .toLowerCase();
  return raw || "storefront";
}

function getShippingNotRequiredErrorMessageForOrderSource(orderSource) {
  const normalized = String(orderSource || "").trim().toLowerCase();
  if (normalized === "admin_pos") {
    return "This admin POS order was checked out without shipping.";
  }
  return "This order does not require shipping.";
}

function getShippingNotRequiredErrorMessage(session, options = {}) {
  return getShippingNotRequiredErrorMessageForOrderSource(getSessionOrderSource(session, options));
}

function parseCashReceivedCents(value, fallbackCents) {
  if (value === undefined || value === null || value === "") {
    return fallbackCents;
  }
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
}

function isCheckoutValidationErrorMessage(message) {
  const text = String(message || "").trim();
  if (!text) {
    return false;
  }
  return (
    text === "Your cart is empty." ||
    text === "Select a valid U.S. state before checkout." ||
    text === "Enter a valid email address." ||
    text === "Name, address line 1, city, state, and ZIP are required for shipped POS orders." ||
    text === "Only U.S. shipping addresses are supported for shipped POS orders." ||
    text.startsWith("Unknown product id:") ||
    text.endsWith("is currently unavailable.") ||
    text.endsWith("is coming soon and not orderable yet.") ||
    text.endsWith("is sold out right now.")
  );
}

async function buildCheckoutSessionCartDetails(cart, customerState, options = {}) {
  const safeCart = Array.isArray(cart) ? cart : [];
  if (safeCart.length === 0) {
    throw new Error("Your cart is empty.");
  }

  const normalizedCustomerState = normalizeUsStateCode(customerState);
  if (!normalizedCustomerState) {
    throw new Error("Select a valid U.S. state before checkout.");
  }

  const shippingRequired = options?.shippingRequired !== false;
  const lineItems = [];
  const items = [];
  const cartSummaryParts = [];
  let unitsTotal = 0;
  let bookUnitsTotal = 0;
  let shippableUnits = 0;
  let itemsSubtotal = 0;

  for (const item of safeCart) {
    const product = await findProductById(item?.id);
    if (!product) {
      throw new Error(`Unknown product id: ${item?.id}`);
    }
    if (product.isVisible === false && options?.allowHiddenProducts !== true) {
      throw new Error(`${product.title} is currently unavailable.`);
    }
    if (product.isComingSoon === true && product.allowPreorder !== true) {
      throw new Error(`${product.title} is coming soon and not orderable yet.`);
    }
    if (!product.inStock) {
      throw new Error(`${product.title} is sold out right now.`);
    }

    const quantity = Math.max(1, Math.min(10, Number.parseInt(item?.quantity, 10) || 1));
    unitsTotal += quantity;
    if (shouldCountProductTowardBookCounter(product)) {
      bookUnitsTotal += quantity;
    }
    itemsSubtotal += product.priceCents * quantity;
    if (product.shippingEnabled === true) {
      shippableUnits += quantity;
    }
    cartSummaryParts.push(`${product.title} x${quantity}`);
    items.push({
      productId: product.id,
      productCategory: String(product.productCategory || "book").trim().toLowerCase() === "merch" ? "merch" : "book",
      name: product.title,
      quantity,
      unitAmount: product.priceCents,
      amountTotal: product.priceCents * quantity
    });
    lineItems.push({
      price_data: {
        currency,
        unit_amount: product.priceCents,
        product_data: {
          name: product.title,
          description: product.subtitle
        }
      },
      quantity
    });
  }

  const effectiveShippableUnits = shippingRequired ? shippableUnits : 0;
  const shippingEstimate = calculateShippingFromUnits(effectiveShippableUnits, normalizedCustomerState);
  const shippingTotal = shippingEstimate.shippingCents;
  const shippingWeightLbs = shippingEstimate.shippingWeightLbs;
  const shippingBillableWeightLbs = shippingEstimate.shippingBillableWeightLbs;
  const shippingZone = shippingEstimate.shippingZone;
  const shippingZoneMultiplier = shippingEstimate.shippingZoneMultiplier;
  const shippingBaseRateCents = shippingEstimate.shippingBaseRateCents;
  const salesTaxExemptByState = manualNonTaxStates.has(normalizedCustomerState);
  const taxBase = itemsSubtotal + (manualSalesTaxApplyToShipping ? shippingTotal : 0);
  const manualSalesTaxTotal =
    manualSalesTaxEnabled && !salesTaxExemptByState
      ? Math.max(0, Math.round(taxBase * (manualSalesTaxRatePercent / 100)))
      : 0;

  if (shippingRequired && shippingTotal > 0) {
    lineItems.push({
      price_data: {
        currency,
        unit_amount: shippingTotal,
        product_data: {
          name: "Shipping",
          description: `USPS Ground Advantage (est.) - Zone ${shippingZone}, ${shippingBillableWeightLbs} lb billable`
        }
      },
      quantity: 1
    });
    cartSummaryParts.push("Shipping x1");
  }

  if (manualSalesTaxTotal > 0) {
    lineItems.push({
      price_data: {
        currency,
        unit_amount: manualSalesTaxTotal,
        product_data: {
          name: "Sales Tax",
          description: `Manual sales tax (${manualSalesTaxRatePercent.toFixed(2)}%)`
        }
      },
      quantity: 1
    });
    cartSummaryParts.push("Sales Tax x1");
  }

  return {
    customerState: normalizedCustomerState,
    items,
    lineItems,
    unitsTotal,
    bookUnitsTotal,
    shippableUnits: effectiveShippableUnits,
    amountSubtotal: itemsSubtotal,
    shippingTotal,
    manualSalesTaxTotal,
    amountTotal: itemsSubtotal + shippingTotal + manualSalesTaxTotal,
    shippingWeightLbs,
    shippingBillableWeightLbs,
    shippingZone,
    shippingZoneMultiplier,
    shippingBaseRateCents,
    customerTaxExemptByState: salesTaxExemptByState,
    metadata: {
      storefront: "publishearts.com",
      units_total: String(unitsTotal),
      book_units_total: String(bookUnitsTotal),
      shippable_units: String(effectiveShippableUnits),
      shipping_weight_lbs: String(shippingWeightLbs),
      shipping_billable_weight_lbs: String(shippingBillableWeightLbs),
      shipping_zone: String(shippingZone),
      shipping_zone_multiplier: String(shippingZoneMultiplier),
      shipping_base_rate_cents: String(shippingBaseRateCents),
      items_subtotal_cents: String(itemsSubtotal),
      shipping_total_cents: String(shippingTotal),
      manual_sales_tax_rate_pct: String(manualSalesTaxRatePercent),
      manual_sales_tax_cents: String(manualSalesTaxTotal),
      customer_state: normalizedCustomerState,
      shipping_required: String(shippingRequired),
      shipping_state_match_required: String(shippingRequired),
      customer_tax_exempt_by_state: String(salesTaxExemptByState),
      cart_summary: cartSummaryParts.join(" | ").slice(0, 500)
    }
  };
}

async function createCheckoutSessionForCart(req, cart, customerState, options = {}) {
  const shippingRequired = options?.shippingRequired !== false;
  const allowPromotionCodes = options?.allowPromotionCodes !== false;
  const orderSource = String(options?.orderSource || "storefront")
    .trim()
    .toLowerCase() || "storefront";
  const successUrl = String(options?.successUrl || "").trim();
  const cancelUrl = String(options?.cancelUrl || "").trim();
  const sessionDetails = await buildCheckoutSessionCartDetails(cart, customerState, {
    shippingRequired,
    allowHiddenProducts: options?.allowHiddenProducts === true
  });
  const normalizedShippingInput = shippingRequired
    ? normalizeCheckoutShippingInput(options?.shippingDetails, sessionDetails.customerState)
    : null;
  const hasProvidedShippingInput = hasCompleteCheckoutShippingInput(normalizedShippingInput);
  const customerEmail = String(options?.customerEmail || normalizedShippingInput?.email || "")
    .trim()
    .toLowerCase()
    .slice(0, 320);
  if (shippingRequired && options?.requireShippingDetails === true) {
    if (!hasProvidedShippingInput) {
      throw new Error("Name, address line 1, city, state, and ZIP are required for shipped POS orders.");
    }
    if (normalizedShippingInput.country !== "US") {
      throw new Error("Only U.S. shipping addresses are supported for shipped POS orders.");
    }
  }

  const sessionOptions = {
    mode: "payment",
    payment_method_types: ["card"],
    line_items: sessionDetails.lineItems,
    automatic_tax: {
      enabled: manualSalesTaxEnabled ? false : stripeAutomaticTaxEnabled
    },
    billing_address_collection: "required",
    phone_number_collection: {
      enabled: true
    },
    allow_promotion_codes: allowPromotionCodes,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      ...sessionDetails.metadata,
      order_source: orderSource
    },
    payment_intent_data: {
      metadata: {
        order_source: orderSource,
        fulfillment_shipping_required: String(shippingRequired),
        fulfillment_selected_state: sessionDetails.customerState,
        fulfillment_hold_reason: "",
        fulfillment_state_match: String(!shippingRequired)
      }
    }
  };

  if (customerEmail) {
    sessionOptions.customer_email = customerEmail;
    sessionOptions.payment_intent_data.receipt_email = customerEmail;
  }

  if (hasProvidedShippingInput) {
    sessionOptions.payment_intent_data.metadata = {
      ...sessionOptions.payment_intent_data.metadata,
      ...buildCheckoutShippingMetadataOverrides(normalizedShippingInput)
    };
    sessionOptions.payment_intent_data.shipping = {
      name: normalizedShippingInput.name,
      phone: normalizedShippingInput.phone || undefined,
      address: {
        line1: normalizedShippingInput.line1,
        line2: normalizedShippingInput.line2 || undefined,
        city: normalizedShippingInput.city,
        state: normalizedShippingInput.state,
        postal_code: normalizedShippingInput.postalCode,
        country: normalizedShippingInput.country
      }
    };
  }

  if (shippingRequired && !hasProvidedShippingInput) {
    sessionOptions.shipping_address_collection = {
      allowed_countries: allowedShippingCountries
    };
  }

  const session = await stripe.checkout.sessions.create(sessionOptions);
  return {
    session,
    details: sessionDetails
  };
}

function calculateUnitsTotalFromSessionMetadata(session) {
  const metadata = session?.metadata || {};
  const unitsFromMetadata = readMetadataInteger(metadata, "units_total");
  if (Number.isFinite(unitsFromMetadata) && unitsFromMetadata > 0) {
    return unitsFromMetadata;
  }
  const cartEntries = parseCartSummaryEntries(metadata).filter((entry) => {
    const name = String(entry.name || "").trim().toLowerCase();
    return name !== "shipping" && name !== "sales tax" && name !== "tax";
  });
  return cartEntries.reduce((sum, entry) => sum + (Number(entry.quantity) || 0), 0);
}

function calculateBookUnitsTotalFromSessionMetadata(session) {
  const metadata = session?.metadata || {};
  const bookUnitsFromMetadata = readMetadataInteger(metadata, "book_units_total");
  if (Number.isFinite(bookUnitsFromMetadata) && bookUnitsFromMetadata >= 0) {
    return bookUnitsFromMetadata;
  }
  const cartEntries = parseCartSummaryEntries(metadata);
  return calculateBookUnitsFromCartEntries(cartEntries);
}

async function fetchSoldCopiesStatsFromStripe() {
  const excludedOrderIds = new Set(
    (await listOrderExclusions())
      .map((entry) => String(entry?.orderId || "").trim())
      .filter(Boolean)
  );

  let soldCopies = 0;
  let paidOrders = 0;
  const manualOrders = (await listManualOrders()).map((order) => normalizeManualOrderRecord(order)).filter(Boolean);
  for (const order of manualOrders) {
    if (order.paymentStatus !== "paid") {
      continue;
    }
    const orderId = String(order.id || "").trim();
    if (orderId && excludedOrderIds.has(orderId)) {
      continue;
    }
    paidOrders += 1;
    soldCopies += Math.max(0, Number(order.bookUnitsTotal) || 0);
  }

  if (stripe) {
    let scannedSessions = 0;
    let hasMore = true;
    let startingAfter = "";

    while (hasMore && scannedSessions < publicSoldCopiesMaxSessions) {
      const remaining = publicSoldCopiesMaxSessions - scannedSessions;
      const listParams = {
        limit: Math.min(100, remaining)
      };
      if (startingAfter) {
        listParams.starting_after = startingAfter;
      }

      const response = await stripe.checkout.sessions.list(listParams);
      const sessions = Array.isArray(response?.data) ? response.data : [];
      if (sessions.length === 0) {
        break;
      }

      for (const session of sessions) {
        if (session?.payment_status !== "paid") {
          continue;
        }
        const sessionId = String(session?.id || "").trim();
        if (sessionId && excludedOrderIds.has(sessionId)) {
          continue;
        }
        paidOrders += 1;
        soldCopies += calculateBookUnitsTotalFromSessionMetadata(session);
      }

      scannedSessions += sessions.length;
      const lastSession = sessions[sessions.length - 1];
      startingAfter = String(lastSession?.id || "").trim();
      hasMore = Boolean(response?.has_more) && Boolean(startingAfter);
    }
  }

  return {
    soldCopies: Math.max(0, Math.round(Number(soldCopies) || 0)),
    paidOrders: Math.max(0, Math.round(Number(paidOrders) || 0)),
    updatedAtMs: Date.now()
  };
}

async function getSoldCopiesStats() {
  const now = Date.now();
  const hasFreshCache =
    soldCopiesCacheState.updatedAtMs > 0 && now - soldCopiesCacheState.updatedAtMs < publicSoldCopiesCacheMs;
  if (hasFreshCache) {
    return {
      soldCopies: soldCopiesCacheState.soldCopies,
      paidOrders: soldCopiesCacheState.paidOrders,
      updatedAtMs: soldCopiesCacheState.updatedAtMs
    };
  }

  if (soldCopiesCacheState.inFlightPromise) {
    return soldCopiesCacheState.inFlightPromise;
  }

  soldCopiesCacheState.inFlightPromise = fetchSoldCopiesStatsFromStripe()
    .then((stats) => {
      soldCopiesCacheState.soldCopies = stats.soldCopies;
      soldCopiesCacheState.paidOrders = stats.paidOrders;
      soldCopiesCacheState.updatedAtMs = stats.updatedAtMs;
      return stats;
    })
    .catch((error) => {
      if (soldCopiesCacheState.updatedAtMs > 0) {
        return {
          soldCopies: soldCopiesCacheState.soldCopies,
          paidOrders: soldCopiesCacheState.paidOrders,
          updatedAtMs: soldCopiesCacheState.updatedAtMs
        };
      }
      throw error;
    })
    .finally(() => {
      soldCopiesCacheState.inFlightPromise = null;
    });

  return soldCopiesCacheState.inFlightPromise;
}

function formatAddressLine(address) {
  if (!address || typeof address !== "object") {
    return "";
  }
  return [address.line1, address.line2, address.city, address.state, address.postal_code, address.country]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(", ");
}

function buildManualShippingAddressLabel(shipping) {
  if (!shipping || typeof shipping !== "object") {
    return "";
  }
  return formatAddressLine({
    line1: shipping.line1,
    line2: shipping.line2,
    city: shipping.city,
    state: shipping.state,
    postal_code: shipping.postalCode,
    country: shipping.country
  });
}

function isShippingLineItem(item) {
  return String(item?.name || "").trim().toLowerCase() === "shipping";
}

function isTaxLineItem(item) {
  const name = String(item?.name || "").trim().toLowerCase();
  return name === "sales tax" || name === "tax";
}

function getLineAmountTotal(item) {
  const value = Number(item?.amountTotal);
  return Number.isFinite(value) ? value : 0;
}

function computeOrderTotals(session, lineItems = []) {
  const metadata = session?.metadata || {};
  const metadataShipping = readMetadataInteger(metadata, "shipping_total_cents");
  const metadataTax = readMetadataInteger(metadata, "manual_sales_tax_cents");
  const metadataItemsSubtotal = readMetadataInteger(metadata, "items_subtotal_cents");
  const shippingFromLines = lineItems
    .filter((item) => isShippingLineItem(item))
    .reduce((sum, item) => sum + getLineAmountTotal(item), 0);
  const taxFromLines = lineItems
    .filter((item) => isTaxLineItem(item))
    .reduce((sum, item) => sum + getLineAmountTotal(item), 0);
  const itemsFromLines = lineItems
    .filter((item) => !isShippingLineItem(item) && !isTaxLineItem(item))
    .reduce((sum, item) => sum + getLineAmountTotal(item), 0);

  const stripeShipping = Number(session?.total_details?.amount_shipping);
  const stripeTax = Number(session?.total_details?.amount_tax);
  const stripeSubtotal = Number(session?.amount_subtotal);
  const stripeTotal = Number(session?.amount_total);

  const amountShipping =
    Number.isFinite(stripeShipping) && stripeShipping > 0
      ? stripeShipping
      : Number.isFinite(metadataShipping)
        ? metadataShipping
        : shippingFromLines;
  const amountTax =
    Number.isFinite(stripeTax) && stripeTax > 0
      ? stripeTax
      : Number.isFinite(metadataTax)
        ? metadataTax
        : taxFromLines;
  const amountSubtotal =
    Number.isFinite(metadataItemsSubtotal)
      ? metadataItemsSubtotal
      : itemsFromLines > 0
      ? itemsFromLines
      : Number.isFinite(stripeSubtotal)
        ? Math.max(0, stripeSubtotal - amountShipping - amountTax)
        : 0;
  const amountTotal = Number.isFinite(stripeTotal) ? stripeTotal : amountSubtotal + amountShipping + amountTax;

  return {
    amountSubtotal,
    amountShipping,
    amountTax,
    amountTotal
  };
}

function normalizeManualOrderItems(rawItems = []) {
  const safeItems = Array.isArray(rawItems) ? rawItems : [];
  return safeItems
    .map((item) => {
      const name = String(item?.name || item?.title || "Book")
        .trim()
        .slice(0, 220);
      if (!name) {
        return null;
      }
      const quantity = Math.max(1, Math.min(100, Number.parseInt(item?.quantity, 10) || 1));
      const unitAmountRaw = Number(item?.unitAmount ?? item?.unit_amount ?? item?.priceCents ?? 0);
      const unitAmount = Number.isFinite(unitAmountRaw) ? Math.max(0, Math.round(unitAmountRaw)) : 0;
      const amountTotalRaw = Number(item?.amountTotal ?? item?.amount_total ?? unitAmount * quantity);
      const amountTotal = Number.isFinite(amountTotalRaw) ? Math.max(0, Math.round(amountTotalRaw)) : unitAmount * quantity;
      return {
        productId: String(item?.productId || item?.id || "").trim(),
        productCategory: String(item?.productCategory || "").trim().toLowerCase() === "merch" ? "merch" : "book",
        name,
        quantity,
        unitAmount,
        amountTotal
      };
    })
    .filter(Boolean);
}

function evaluateManualOrderStateMatch({ customerState, shippingRequired = true, shippingDetails } = {}) {
  const selectedState = normalizeUsStateCode(customerState);
  if (shippingRequired === false) {
    return {
      selectedState,
      selectedStateSource: selectedState ? "manual_order" : "",
      shippingState: "",
      shippingStateRaw: "",
      shippingCountry: "US",
      stateMatch: true,
      mismatchReason: ""
    };
  }

  const shippingCountry = normalizeIsoCountry(shippingDetails?.country, "US");
  const shippingStateRaw = String(shippingDetails?.state || "")
    .trim()
    .toUpperCase();
  const shippingState = normalizeUsStateCode(shippingStateRaw);
  const stateMatch =
    Boolean(selectedState) &&
    shippingCountry === "US" &&
    Boolean(shippingState) &&
    selectedState === shippingState;

  let mismatchReason = "";
  if (!stateMatch) {
    if (!selectedState) {
      mismatchReason = "Checkout state selection is missing.";
    } else if (shippingCountry !== "US") {
      mismatchReason = `Shipping country ${shippingCountry || "Unknown"} is not supported for state-based shipping.`;
    } else if (!shippingState) {
      mismatchReason = `Shipping state "${shippingStateRaw || "Unknown"}" is invalid or missing.`;
    } else {
      mismatchReason = `Selected state ${selectedState} does not match shipping state ${shippingState}.`;
    }
  }

  return {
    selectedState,
    selectedStateSource: selectedState ? "manual_order" : "",
    shippingState,
    shippingStateRaw,
    shippingCountry,
    stateMatch,
    mismatchReason
  };
}

function normalizeManualOrderRecord(rawOrder) {
  const id = String(rawOrder?.id || "").trim();
  if (!id) {
    return null;
  }

  const shippingRequired = rawOrder?.shippingRequired !== false;
  const items = normalizeManualOrderItems(rawOrder?.items);
  const createdAtRaw = Number.parseInt(String(rawOrder?.createdAt ?? rawOrder?.created_at ?? ""), 10);
  const createdAt =
    Number.isFinite(createdAtRaw) && createdAtRaw > 0
      ? createdAtRaw
      : Math.max(1, Math.floor(Date.parse(String(rawOrder?.createdAtIso || "")) / 1000) || Math.floor(Date.now() / 1000));
  const customerState = normalizeUsStateCode(rawOrder?.customerState);
  const shippingInput = shippingRequired
    ? normalizeCheckoutShippingInput(
        rawOrder?.shippingDetails || {
          name: rawOrder?.shippingName,
          email: rawOrder?.customerEmail,
          phone: rawOrder?.customerPhone,
          line1: rawOrder?.shippingAddressLine1,
          line2: rawOrder?.shippingAddressLine2,
          city: rawOrder?.shippingCity,
          state: rawOrder?.shippingState,
          postalCode: rawOrder?.shippingPostalCode,
          country: rawOrder?.shippingCountry || "US"
        },
        ""
      )
    : null;
  const stateMatchResult = evaluateManualOrderStateMatch({
    customerState,
    shippingRequired,
    shippingDetails: shippingInput
  });
  const unitsTotalRaw = Number(rawOrder?.unitsTotal);
  const unitsTotal =
    Number.isFinite(unitsTotalRaw) && unitsTotalRaw >= 0
      ? Math.round(unitsTotalRaw)
      : items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const bookUnitsTotalRaw = Number(rawOrder?.bookUnitsTotal);
  const bookUnitsTotal =
    Number.isFinite(bookUnitsTotalRaw) && bookUnitsTotalRaw >= 0
      ? Math.round(bookUnitsTotalRaw)
      : calculateBookUnitsFromCartEntries(items);
  const shippableUnitsRaw = Number(rawOrder?.shippableUnits);
  const shippableUnits =
    !shippingRequired
      ? 0
      : Number.isFinite(shippableUnitsRaw) && shippableUnitsRaw >= 0
        ? Math.round(shippableUnitsRaw)
        : unitsTotal;
  const amountSubtotalRaw = Number(rawOrder?.amountSubtotal);
  const amountSubtotal =
    Number.isFinite(amountSubtotalRaw) && amountSubtotalRaw >= 0
      ? Math.round(amountSubtotalRaw)
      : items.reduce((sum, item) => sum + (item.amountTotal || 0), 0);
  const amountShippingRaw = Number(rawOrder?.amountShipping);
  const amountShipping =
    Number.isFinite(amountShippingRaw) && amountShippingRaw >= 0
      ? Math.round(amountShippingRaw)
      : shippingRequired
        ? calculateShippingFromUnits(shippableUnits, customerState || stateMatchResult.shippingState).shippingCents
        : 0;
  const amountTaxRaw = Number(rawOrder?.amountTax);
  const amountTax = Number.isFinite(amountTaxRaw) && amountTaxRaw >= 0 ? Math.round(amountTaxRaw) : 0;
  const amountTotalRaw = Number(rawOrder?.amountTotal);
  const amountTotal =
    Number.isFinite(amountTotalRaw) && amountTotalRaw >= 0
      ? Math.round(amountTotalRaw)
      : amountSubtotal + amountShipping + amountTax;
  const shippingWeightRaw = Number(rawOrder?.shippingWeightLbs);
  const shippingWeightLbs =
    !shippingRequired
      ? 0
      : Number.isFinite(shippingWeightRaw) && shippingWeightRaw > 0
        ? Number(shippingWeightRaw.toFixed(2))
        : calculateShippableWeightLbs(Math.max(1, shippableUnits));
  const shippingBillableWeightRaw = Number(rawOrder?.shippingBillableWeightLbs);
  const shippingBillableWeightLbs =
    !shippingRequired
      ? 0
      : Number.isFinite(shippingBillableWeightRaw) && shippingBillableWeightRaw > 0
        ? Number(shippingBillableWeightRaw.toFixed(2))
        : getBillableShippingWeightLbs(shippingWeightLbs);
  const shippingZoneRaw = Number.parseInt(String(rawOrder?.shippingZone ?? ""), 10);
  const shippingZone = shippingRequired
    ? normalizeShippingZone(shippingZoneRaw, getShippingZoneForState(customerState || stateMatchResult.shippingState))
    : 0;
  const shippedAtRaw = Number.parseInt(String(rawOrder?.shippedAt ?? ""), 10);
  const shippedAt = Number.isFinite(shippedAtRaw) && shippedAtRaw > 0 ? shippedAtRaw : 0;
  const packagedAtRaw = Number.parseInt(String(rawOrder?.packagedAt ?? ""), 10);
  const packagedAt = Number.isFinite(packagedAtRaw) && packagedAtRaw > 0 ? packagedAtRaw : shippedAt || 0;
  const packageWeightValueRaw = normalizePackageWeightValue(rawOrder?.packageWeightValue);
  const packageWeightValue = packageWeightValueRaw === null ? "" : packageWeightValueRaw;
  const paymentMethod = String(rawOrder?.paymentMethod || "cash")
    .trim()
    .toLowerCase() || "cash";
  const rawCashReceivedCents = Number(rawOrder?.cashReceivedCents);
  const cashReceivedCents =
    paymentMethod === "cash" && Number.isFinite(rawCashReceivedCents) && rawCashReceivedCents >= amountTotal
      ? Math.round(rawCashReceivedCents)
      : paymentMethod === "cash"
        ? amountTotal
        : 0;
  const cashChangeDueCents = paymentMethod === "cash" ? Math.max(0, cashReceivedCents - amountTotal) : 0;
  const customerEmail = String(rawOrder?.customerEmail || shippingInput?.email || "")
    .trim()
    .toLowerCase();
  const customerPhone = String(rawOrder?.customerPhone || shippingInput?.phone || "").trim();
  const customerName = String(
    rawOrder?.customerName || shippingInput?.name || (shippingRequired ? "Customer" : "Walk-in Customer")
  ).trim();
  const shipmentPostageCentsRaw = Number(rawOrder?.shipmentPostageCents);
  const shipmentPostageCents =
    Number.isFinite(shipmentPostageCentsRaw) && shipmentPostageCentsRaw >= 0 ? Math.round(shipmentPostageCentsRaw) : 0;
  const explicitHoldReason = String(rawOrder?.fulfillmentHoldReason || "").trim();
  const fulfillmentHoldReason = shippingRequired
    ? explicitHoldReason || (stateMatchResult.stateMatch ? "" : "state_mismatch")
    : "";
  const customerTaxExemptByState =
    rawOrder?.customerTaxExemptByState === true || (customerState ? manualNonTaxStates.has(customerState) : false);

  return {
    id,
    createdAt,
    createdAtIso: createdAt > 0 ? new Date(createdAt * 1000).toISOString() : "",
    paymentStatus: String(rawOrder?.paymentStatus || "paid").trim().toLowerCase() || "paid",
    paymentMethod,
    currency: String(rawOrder?.currency || currency).trim().toLowerCase() || currency,
    amountSubtotal,
    amountShipping,
    amountTax,
    amountTotal,
    unitsTotal,
    bookUnitsTotal,
    shippableUnits,
    shippingWeightLbs,
    shippingBillableWeightLbs,
    shippingZone,
    items,
    fulfillmentStatus: normalizeFulfillmentStatus(rawOrder?.fulfillmentStatus),
    shippedAt,
    shippedAtIso: shippedAt > 0 ? new Date(shippedAt * 1000).toISOString() : "",
    packagedAt,
    packagedAtIso: packagedAt > 0 ? new Date(packagedAt * 1000).toISOString() : "",
    packageWeightValue,
    shipmentCarrier: String(rawOrder?.shipmentCarrier || "").trim(),
    shipmentTrackingNumber: String(rawOrder?.shipmentTrackingNumber || "").trim(),
    shipmentTrackingUrl: String(rawOrder?.shipmentTrackingUrl || "").trim(),
    shipmentNote: String(rawOrder?.shipmentNote || "").trim(),
    shipmentLabelId: String(rawOrder?.shipmentLabelId || "").trim(),
    shipmentLabelUrl: String(rawOrder?.shipmentLabelUrl || "").trim(),
    shipmentPostageCents,
    fulfillmentHoldReason,
    shippingRequired,
    shippingDetails: shippingInput,
    orderSource: String(rawOrder?.orderSource || "admin_pos").trim().toLowerCase() || "admin_pos",
    customerState,
    shippingState: shippingRequired ? stateMatchResult.shippingState || stateMatchResult.shippingStateRaw || "" : "",
    shippingCountry: stateMatchResult.shippingCountry,
    shippingStateMatchesCustomerState: stateMatchResult.stateMatch,
    shippingStateMismatchReason: stateMatchResult.stateMatch ? "" : stateMatchResult.mismatchReason,
    customerTaxExemptByState,
    paymentIntentId: String(rawOrder?.paymentIntentId || "").trim(),
    customerName,
    customerEmail,
    customerPhone,
    shippingName: shippingRequired ? String(shippingInput?.name || customerName).trim() : "",
    shippingAddressLine1: shippingRequired ? String(shippingInput?.line1 || "").trim() : "",
    shippingAddressLine2: shippingRequired ? String(shippingInput?.line2 || "").trim() : "",
    shippingCity: shippingRequired ? String(shippingInput?.city || "").trim() : "",
    shippingAddress: shippingRequired ? buildManualShippingAddressLabel(shippingInput) : "",
    shippingPostalCode: shippingRequired ? String(shippingInput?.postalCode || "").trim() : "",
    customerKey: customerEmail ? customerEmail.toLowerCase() : `guest:${id}`,
    cashReceivedCents,
    cashChangeDueCents
  };
}

function buildManualOrderReceiptPayload(order) {
  const normalizedOrder = normalizeManualOrderRecord(order);
  if (!normalizedOrder) {
    return null;
  }

  return {
    id: normalizedOrder.id,
    createdAt: normalizedOrder.createdAt,
    createdAtIso: normalizedOrder.createdAtIso,
    amountSubtotal: normalizedOrder.amountSubtotal,
    amountShipping: normalizedOrder.amountShipping,
    amountTax: normalizedOrder.amountTax,
    amountDiscount: 0,
    amountTotal: normalizedOrder.amountTotal,
    currency: normalizedOrder.currency,
    paymentMethod: normalizedOrder.paymentMethod,
    cashReceivedCents: normalizedOrder.cashReceivedCents,
    cashChangeDueCents: normalizedOrder.cashChangeDueCents,
    shippingRequired: normalizedOrder.shippingRequired,
    orderSource: normalizedOrder.orderSource,
    customerState: normalizedOrder.customerState,
    shippingState: normalizedOrder.shippingState,
    shippingCountry: normalizedOrder.shippingCountry,
    shippingStateMatchesCustomerState: normalizedOrder.shippingStateMatchesCustomerState,
    shippingStateMismatchReason: normalizedOrder.shippingStateMismatchReason,
    customerTaxExemptByState: normalizedOrder.customerTaxExemptByState,
    customerEmail: normalizedOrder.customerEmail,
    customerName: normalizedOrder.customerName,
    shippingDetails: buildStripeStyleShippingDetails(
      normalizedOrder.shippingDetails || {
        name: normalizedOrder.customerName,
        phone: normalizedOrder.customerPhone,
        line1: "",
        line2: "",
        city: "",
        state: "",
        postalCode: "",
        country: "US"
      }
    ),
    lineItems: normalizedOrder.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      amountTotal: item.amountTotal
    }))
  };
}

function buildCustomerReceiptEmailPayload(order) {
  return {
    orderId: order.id,
    amountSubtotal: order.amountSubtotal,
    amountShipping: order.amountShipping,
    amountTax: order.amountTax,
    amountTotal: order.amountTotal,
    currency: order.currency || currency,
    lineItems: Array.isArray(order.lineItems) ? order.lineItems : [],
    shippingDetails: order.shippingDetails || buildStripeStyleShippingDetails(),
    shippingRequired: order.shippingRequired !== false
  };
}

async function getStripeOrderReceiptContext(orderId) {
  const session = await stripe.checkout.sessions.retrieve(orderId, {
    expand: ["payment_intent"]
  });
  if (!session || session.payment_status !== "paid") {
    return null;
  }

  const lineItemsResponse = await stripe.checkout.sessions.listLineItems(session.id, {
    limit: 100
  });
  let lineItems = lineItemsResponse.data.map((item) => ({
    name: item.description || "Book",
    quantity: item.quantity || 1,
    amountTotal: item.amount_total || 0
  }));
  if (lineItems.length === 0) {
    lineItems = parseLineItemsFromMetadata(session.metadata);
  }

  const totals = computeOrderTotals(session, lineItems);
  const paymentIntentMetadata =
    session.payment_intent && typeof session.payment_intent === "object"
      ? session.payment_intent.metadata || {}
      : {};
  const createdAt = Number(session.created) || 0;
  const shippingRequired = isSessionShippingRequired(session, { paymentIntentMetadata });
  const resolvedShipping = buildStripeStyleShippingDetails(
    getOrderShippingAddress(session, { paymentIntentMetadata })
  );
  const orderSource = getSessionOrderSource(session, { paymentIntentMetadata });
  const stateMatchResult = evaluateCheckoutStateMatch(session, {
    paymentIntentMetadata
  });
  const customerName = String(
    session.customer_details?.name || resolvedShipping.name || session.shipping_details?.name || ""
  ).trim();

  return {
    session,
    paymentIntentMetadata,
    lineItems,
    totals,
    receiptPayload: {
      id: session.id,
      createdAt,
      createdAtIso: createdAt > 0 ? new Date(createdAt * 1000).toISOString() : "",
      amountSubtotal: totals.amountSubtotal,
      amountShipping: totals.amountShipping,
      amountTax: totals.amountTax,
      amountDiscount: session.total_details?.amount_discount || 0,
      amountTotal: totals.amountTotal,
      currency: session.currency || currency,
      paymentMethod:
        Array.isArray(session.payment_method_types) && session.payment_method_types.length > 0
          ? String(session.payment_method_types[0] || "").trim().toLowerCase()
          : "card",
      shippingRequired,
      orderSource,
      customerState: stateMatchResult.selectedState,
      shippingState: stateMatchResult.shippingState || stateMatchResult.shippingStateRaw || "",
      shippingCountry: stateMatchResult.shippingCountry,
      shippingStateMatchesCustomerState: stateMatchResult.stateMatch,
      shippingStateMismatchReason: stateMatchResult.stateMatch ? "" : stateMatchResult.mismatchReason,
      customerTaxExemptByState:
        String(session.metadata?.customer_tax_exempt_by_state || "")
          .trim()
          .toLowerCase() === "true",
      customerEmail: session.customer_details?.email || session.customer_email || "",
      customerName,
      shippingDetails: resolvedShipping,
      lineItems
    }
  };
}

function buildManualCashOrder({ cartDetails, shippingRequired, shippingDetails, cashReceivedCents, customerEmail = "" }) {
  const createdAt = Math.floor(Date.now() / 1000);
  const orderId = `pos_cash_${createdAt}_${randomUUID().slice(0, 8)}`;
  const normalizedCustomerEmail = String(customerEmail || "")
    .trim()
    .toLowerCase();
  const normalizedShippingDetails = shippingRequired
    ? normalizeCheckoutShippingInput(
        {
          ...(shippingDetails || {}),
          email: shippingDetails?.email || normalizedCustomerEmail
        },
        ""
      )
    : null;
  const stateMatchResult = evaluateManualOrderStateMatch({
    customerState: cartDetails.customerState,
    shippingRequired,
    shippingDetails: normalizedShippingDetails
  });
  const customerName = shippingRequired
    ? String(normalizedShippingDetails?.name || "Customer").trim()
    : "Walk-in Customer";
  const resolvedCustomerEmail = shippingRequired
    ? String(normalizedShippingDetails?.email || normalizedCustomerEmail || "").trim().toLowerCase()
    : normalizedCustomerEmail;
  const customerPhone = shippingRequired ? String(normalizedShippingDetails?.phone || "").trim() : "";
  const amountTotal = Math.max(0, Math.round(Number(cartDetails.amountTotal) || 0));
  const cashReceived = Math.max(amountTotal, Math.round(Number(cashReceivedCents) || amountTotal));

  return {
    id: orderId,
    createdAt,
    paymentStatus: "paid",
    paymentMethod: "cash",
    currency,
    amountSubtotal: cartDetails.amountSubtotal,
    amountShipping: cartDetails.shippingTotal,
    amountTax: cartDetails.manualSalesTaxTotal,
    amountTotal,
    unitsTotal: cartDetails.unitsTotal,
    bookUnitsTotal: cartDetails.bookUnitsTotal,
    shippableUnits: cartDetails.shippableUnits,
    shippingWeightLbs: cartDetails.shippingWeightLbs,
    shippingBillableWeightLbs: cartDetails.shippingBillableWeightLbs,
    shippingZone: cartDetails.shippingZone,
    items: cartDetails.items,
    fulfillmentStatus: "pending",
    shippedAt: 0,
    packagedAt: 0,
    packageWeightValue: "",
    shipmentCarrier: "",
    shipmentTrackingNumber: "",
    shipmentTrackingUrl: "",
    shipmentNote: "",
    shipmentLabelId: "",
    shipmentLabelUrl: "",
    shipmentPostageCents: 0,
    fulfillmentHoldReason: shippingRequired ? (stateMatchResult.stateMatch ? "" : "state_mismatch") : "",
    shippingRequired,
    shippingDetails: normalizedShippingDetails,
    orderSource: "admin_pos",
    customerState: cartDetails.customerState,
    shippingState: shippingRequired ? stateMatchResult.shippingState || stateMatchResult.shippingStateRaw || "" : "",
    shippingCountry: stateMatchResult.shippingCountry,
    shippingStateMatchesCustomerState: stateMatchResult.stateMatch,
    shippingStateMismatchReason: stateMatchResult.stateMatch ? "" : stateMatchResult.mismatchReason,
    customerTaxExemptByState: cartDetails.customerTaxExemptByState,
    customerName,
    customerEmail: resolvedCustomerEmail,
    customerPhone,
    cashReceivedCents: cashReceived,
    cashChangeDueCents: Math.max(0, cashReceived - amountTotal)
  };
}

function buildStoredTerminalCartDetails(cartDetails) {
  return {
    customerState: cartDetails.customerState,
    items: Array.isArray(cartDetails.items) ? cartDetails.items : [],
    unitsTotal: Number(cartDetails.unitsTotal) || 0,
    bookUnitsTotal: Number(cartDetails.bookUnitsTotal) || 0,
    shippableUnits: Number(cartDetails.shippableUnits) || 0,
    amountSubtotal: Number(cartDetails.amountSubtotal) || 0,
    shippingTotal: Number(cartDetails.shippingTotal) || 0,
    manualSalesTaxTotal: Number(cartDetails.manualSalesTaxTotal) || 0,
    amountTotal: Number(cartDetails.amountTotal) || 0,
    shippingWeightLbs: Number(cartDetails.shippingWeightLbs) || 0,
    shippingBillableWeightLbs: Number(cartDetails.shippingBillableWeightLbs) || 0,
    shippingZone: Number(cartDetails.shippingZone) || 0,
    customerTaxExemptByState: cartDetails.customerTaxExemptByState === true
  };
}

function buildTerminalManualOrderId(paymentIntentId) {
  return `pos_terminal_${String(paymentIntentId || "").trim()}`;
}

function buildTerminalIntentContext({ paymentIntentId, cartDetails, customerEmail = "", customerName = "" }) {
  return {
    id: String(paymentIntentId || "").trim(),
    createdAt: Math.floor(Date.now() / 1000),
    customerEmail: String(customerEmail || "").trim().toLowerCase(),
    customerName: String(customerName || "").trim(),
    cartDetails: buildStoredTerminalCartDetails(cartDetails)
  };
}

function buildManualTerminalCardOrder({ paymentIntent, terminalIntent }) {
  const cartDetails = terminalIntent?.cartDetails || {};
  const createdAt = Number(paymentIntent?.created) || Math.floor(Date.now() / 1000);
  const paymentIntentId = String(paymentIntent?.id || terminalIntent?.id || "").trim();
  const normalizedCustomerEmail = String(terminalIntent?.customerEmail || "").trim().toLowerCase();
  const normalizedCustomerName = String(terminalIntent?.customerName || "").trim();

  return {
    id: buildTerminalManualOrderId(paymentIntentId),
    createdAt,
    paymentStatus: "paid",
    paymentMethod: "card",
    paymentIntentId,
    currency: String(paymentIntent?.currency || currency).trim().toLowerCase() || currency,
    amountSubtotal: Number(cartDetails.amountSubtotal) || 0,
    amountShipping: Number(cartDetails.shippingTotal) || 0,
    amountTax: Number(cartDetails.manualSalesTaxTotal) || 0,
    amountTotal: Number(paymentIntent?.amount_received || paymentIntent?.amount || cartDetails.amountTotal) || 0,
    unitsTotal: Number(cartDetails.unitsTotal) || 0,
    bookUnitsTotal: Number(cartDetails.bookUnitsTotal) || 0,
    shippableUnits: 0,
    shippingWeightLbs: 0,
    shippingBillableWeightLbs: 0,
    shippingZone: 0,
    items: Array.isArray(cartDetails.items) ? cartDetails.items : [],
    fulfillmentStatus: "pending",
    shippedAt: 0,
    packagedAt: 0,
    packageWeightValue: "",
    shipmentCarrier: "",
    shipmentTrackingNumber: "",
    shipmentTrackingUrl: "",
    shipmentNote: "",
    shipmentLabelId: "",
    shipmentLabelUrl: "",
    shipmentPostageCents: 0,
    fulfillmentHoldReason: "",
    shippingRequired: false,
    shippingDetails: null,
    orderSource: "mobile_pos_terminal",
    customerState: normalizeUsStateCode(cartDetails.customerState),
    shippingState: "",
    shippingCountry: "US",
    shippingStateMatchesCustomerState: true,
    shippingStateMismatchReason: "",
    customerTaxExemptByState: cartDetails.customerTaxExemptByState === true,
    customerName: normalizedCustomerName || "Walk-in Customer",
    customerEmail: normalizedCustomerEmail,
    customerPhone: "",
    cashReceivedCents: 0,
    cashChangeDueCents: 0
  };
}

function buildManualOrderAddressBookInput(order) {
  const normalizedOrder = normalizeManualOrderRecord(order);
  if (!normalizedOrder || normalizedOrder.shippingRequired === false || !normalizedOrder.shippingDetails) {
    return null;
  }
  return {
    orderId: normalizedOrder.id,
    ...normalizedOrder.shippingDetails
  };
}

async function saveManualOrderAddressToBook(order) {
  const input = buildManualOrderAddressBookInput(order);
  if (!input) {
    throw new AddressBookValidationError(
      getShippingNotRequiredErrorMessageForOrderSource(order?.orderSource || "storefront")
    );
  }
  return upsertAddressBookEntry(input);
}

async function findNormalizedManualOrderById(orderId) {
  const manualOrder = await findManualOrderById(orderId);
  return normalizeManualOrderRecord(manualOrder);
}

function getTaxRuntimeStatus() {
  if (manualSalesTaxEnabled) {
    return "manual";
  }
  if (stripeAutomaticTaxEnabled) {
    return "stripe_automatic";
  }
  return "off";
}

function parseShippingRateTable(rawTable) {
  const fallback = [
    { weightLbs: 1.5, cents: 1192 },
    { weightLbs: 2, cents: 1290 },
    { weightLbs: 3, cents: 1458 },
    { weightLbs: 4, cents: 1668 },
    { weightLbs: 5, cents: 1777 },
    { weightLbs: 10, cents: 2350 }
  ];
  const points = String(rawTable || "")
    .split(",")
    .map((segment) => String(segment || "").trim())
    .filter(Boolean)
    .map((segment) => {
      const [weightRaw, dollarsRaw] = segment.split(":");
      const weightLbs = Number.parseFloat(String(weightRaw || "").trim());
      const dollars = Number.parseFloat(String(dollarsRaw || "").trim());
      if (!Number.isFinite(weightLbs) || !Number.isFinite(dollars) || weightLbs <= 0 || dollars <= 0) {
        return null;
      }
      return {
        weightLbs: Number(weightLbs.toFixed(2)),
        cents: Math.round(dollars * 100)
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.weightLbs - right.weightLbs);

  const deduped = [];
  for (const point of points) {
    const previous = deduped[deduped.length - 1];
    if (previous && Math.abs(previous.weightLbs - point.weightLbs) < 0.0001) {
      deduped[deduped.length - 1] = point;
      continue;
    }
    deduped.push(point);
  }

  return deduped.length > 0 ? deduped : fallback;
}

function parseShippingZoneScale(rawScale) {
  const fallback = {
    1: 0.7424,
    2: 0.7718,
    3: 0.7928,
    4: 0.8221,
    5: 0.8515,
    6: 0.8809,
    7: 0.9262,
    8: 1
  };
  const parsed = String(rawScale || "")
    .split(",")
    .map((segment) => String(segment || "").trim())
    .filter(Boolean)
    .reduce((accumulator, segment) => {
      const [zoneRaw, multiplierRaw] = segment.split(":");
      const zone = Number.parseInt(String(zoneRaw || "").trim(), 10);
      const multiplier = Number.parseFloat(String(multiplierRaw || "").trim());
      if (!Number.isFinite(zone) || zone < 1 || zone > 8) {
        return accumulator;
      }
      if (!Number.isFinite(multiplier) || multiplier <= 0) {
        return accumulator;
      }
      accumulator[zone] = Number(multiplier.toFixed(4));
      return accumulator;
    }, {});

  return Object.keys(parsed).length > 0
    ? {
        ...fallback,
        ...parsed
      }
    : fallback;
}

function parseShippingStateZoneMap(rawMap) {
  const fallback = {
    NY: 1,
    CT: 2,
    NJ: 2,
    PA: 2,
    MA: 2,
    RI: 2,
    VT: 2,
    NH: 2,
    DE: 2,
    MD: 2,
    DC: 2,
    ME: 3,
    VA: 3,
    WV: 3,
    OH: 3,
    NC: 3,
    SC: 4,
    GA: 4,
    TN: 4,
    KY: 4,
    IN: 4,
    MI: 4,
    IL: 4,
    AL: 5,
    FL: 5,
    MS: 5,
    WI: 5,
    MN: 5,
    IA: 5,
    MO: 5,
    AR: 5,
    LA: 5,
    ND: 6,
    SD: 6,
    NE: 6,
    KS: 6,
    OK: 6,
    TX: 6,
    NM: 6,
    CO: 6,
    WY: 6,
    MT: 7,
    ID: 7,
    UT: 7,
    AZ: 7,
    NV: 7,
    WA: 8,
    OR: 8,
    CA: 8,
    AK: 8,
    HI: 8
  };
  const parsed = String(rawMap || "")
    .split(",")
    .map((segment) => String(segment || "").trim())
    .filter(Boolean)
    .reduce((accumulator, segment) => {
      const [stateRaw, zoneRaw] = segment.split(":");
      const stateCode = String(stateRaw || "")
        .trim()
        .toUpperCase();
      const zone = Number.parseInt(String(zoneRaw || "").trim(), 10);
      if (!usStateCodes.has(stateCode)) {
        return accumulator;
      }
      if (!Number.isFinite(zone) || zone < 1 || zone > 8) {
        return accumulator;
      }
      accumulator[stateCode] = zone;
      return accumulator;
    }, {});

  return Object.keys(parsed).length > 0
    ? {
        ...fallback,
        ...parsed
      }
    : fallback;
}

function normalizeShippingZone(zoneValue, fallback = shippingDefaultZone) {
  const parsed = Number.parseInt(String(zoneValue ?? ""), 10);
  if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 8) {
    return parsed;
  }
  return fallback;
}

function calculateShippableWeightLbs(shippableUnits) {
  const units = Math.max(0, Number(shippableUnits) || 0);
  if (units <= 0) {
    return 0;
  }
  const calculated = shippingBaseWeightLbs + Math.max(0, units - 1) * shippingAdditionalWeightPerUnitLbs;
  return Number(calculated.toFixed(2));
}

function getBillableShippingWeightLbs(actualWeightLbs) {
  const weight = Math.max(0, Number(actualWeightLbs) || 0);
  if (weight <= 0) {
    return 0;
  }
  if (weight <= shippingBaseWeightLbs) {
    return Number(shippingBaseWeightLbs.toFixed(2));
  }

  // USPS "Weight Not Over" behavior for pounds is tiered, not interpolated.
  return Math.ceil(weight);
}

function getShippingZoneMultiplier(zoneNumber) {
  const zone = normalizeShippingZone(zoneNumber);
  const multiplier = Number(uspsGroundAdvantageZoneScale?.[zone]);
  if (Number.isFinite(multiplier) && multiplier > 0) {
    return multiplier;
  }
  return 1;
}

function getShippingZoneForState(stateCode) {
  const normalizedState = normalizeUsStateCode(stateCode);
  if (!normalizedState) {
    return shippingDefaultZone;
  }
  if (uspsFromState && normalizedState === uspsFromState) {
    return 1;
  }
  const mappedZone = normalizeShippingZone(uspsStateZoneMap?.[normalizedState], 0);
  return mappedZone > 0 ? mappedZone : shippingDefaultZone;
}

function getUspsGroundAdvantageRetailBaseCents(weightLbs) {
  const billableWeight = getBillableShippingWeightLbs(weightLbs);
  if (billableWeight <= 0) {
    return 0;
  }
  const points = uspsGroundAdvantageRatePoints;
  if (!Array.isArray(points) || points.length === 0) {
    return 0;
  }
  if (billableWeight <= points[0].weightLbs) {
    return points[0].cents;
  }
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const next = points[index];
    if (billableWeight <= next.weightLbs) {
      if (Math.abs(billableWeight - next.weightLbs) < 0.0001) {
        return next.cents;
      }
      const span = Math.max(0.1, next.weightLbs - previous.weightLbs);
      const ratio = (billableWeight - previous.weightLbs) / span;
      return Math.round(previous.cents + ratio * (next.cents - previous.cents));
    }
  }

  if (points.length === 1) {
    return points[0].cents;
  }
  const last = points[points.length - 1];
  const prior = points[points.length - 2];
  const span = Math.max(0.1, last.weightLbs - prior.weightLbs);
  const slope = Math.max(1, (last.cents - prior.cents) / span);
  const overweightLbs = billableWeight - last.weightLbs;
  return Math.round(last.cents + overweightLbs * slope);
}

function getUspsGroundAdvantageRetailCents(weightLbs, zoneNumber = shippingDefaultZone) {
  const baseCents = getUspsGroundAdvantageRetailBaseCents(weightLbs);
  if (baseCents <= 0) {
    return 0;
  }
  const zoneMultiplier = getShippingZoneMultiplier(zoneNumber);
  const zoneAdjustedCents = Math.max(0, Math.round(baseCents * zoneMultiplier));
  if (shippingMinimumCents > 0) {
    return Math.max(shippingMinimumCents, zoneAdjustedCents);
  }
  return zoneAdjustedCents;
}

function calculateShippingFromUnits(shippableUnits, customerState) {
  const totalWeightLbs = calculateShippableWeightLbs(shippableUnits);
  const shippingZone = getShippingZoneForState(customerState);
  const shippingZoneMultiplier = getShippingZoneMultiplier(shippingZone);
  const shippingBillableWeightLbs = getBillableShippingWeightLbs(totalWeightLbs);
  if (totalWeightLbs <= 0) {
    return {
      shippingCents: 0,
      shippingWeightLbs: 0,
      shippingBillableWeightLbs: 0,
      shippingZone,
      shippingZoneMultiplier,
      shippingBaseRateCents: 0
    };
  }
  const shippingBaseRateCents = getUspsGroundAdvantageRetailBaseCents(totalWeightLbs);
  const shippingCents = getUspsGroundAdvantageRetailCents(totalWeightLbs, shippingZone);
  return {
    shippingCents,
    shippingWeightLbs: totalWeightLbs,
    shippingBillableWeightLbs,
    shippingZone,
    shippingZoneMultiplier,
    shippingBaseRateCents
  };
}

function getPublicShippingEstimateConfig() {
  return {
    baseWeightLbs: Number(shippingBaseWeightLbs.toFixed(2)),
    additionalWeightPerUnitLbs: Number(shippingAdditionalWeightPerUnitLbs.toFixed(2)),
    minimumCents: shippingMinimumCents,
    defaultZone: shippingDefaultZone,
    fromState: uspsFromState || "",
    ratePoints: uspsGroundAdvantageRatePoints.map((point) => ({
      weightLbs: Number(point.weightLbs),
      cents: Number(point.cents)
    })),
    zoneScale: { ...uspsGroundAdvantageZoneScale },
    stateZoneMap: { ...uspsStateZoneMap }
  };
}

function getAppUrl(req) {
  const configured = (process.env.APP_URL || "").trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  return `${req.protocol}://${req.get("host")}`;
}

function requireStripe(res) {
  if (!stripe) {
    res.status(500).json({
      error: "Stripe is not configured. Add STRIPE_SECRET_KEY in your .env file."
    });
    return false;
  }
  return true;
}

function secureEquals(left, right) {
  const leftHash = createHash("sha256").update(String(left || ""), "utf8").digest();
  const rightHash = createHash("sha256").update(String(right || ""), "utf8").digest();
  return timingSafeEqual(leftHash, rightHash);
}

const activePremiumSubscriptionStatuses = new Set(["active", "trialing"]);
const membershipTierCatalog = {
  standard: {
    key: "standard",
    label: "Standard",
    monthlyPriceLabel: "$10.99 / month",
    monthlyPriceCents: 1099,
    ebookMonthlyLimit: 2,
    allEbooksAccess: false,
    includesRandomPaperback: false,
    includesStickers: true,
    priceId: stripeTierStandardPriceId
  },
  plus: {
    key: "plus",
    label: "Plus",
    monthlyPriceLabel: "$11.99 / month",
    monthlyPriceCents: 1199,
    ebookMonthlyLimit: 4,
    allEbooksAccess: false,
    includesRandomPaperback: false,
    includesStickers: true,
    priceId: stripeTierPlusPriceId
  },
  premium: {
    key: "premium",
    label: "Premium",
    monthlyPriceLabel: "$20.99 / month",
    monthlyPriceCents: 2099,
    ebookMonthlyLimit: null,
    allEbooksAccess: true,
    includesRandomPaperback: true,
    includesStickers: true,
    priceId: stripeTierPremiumPriceId
  }
};
const membershipTierKeysInDisplayOrder = ["standard", "plus", "premium"];
const membershipPlanPricingCacheTtlMs = 5 * 60 * 1000;
const membershipPlanPricingCache = {
  expiresAtMs: 0,
  overridesByTierKey: new Map(),
  invalidTierKeys: new Set()
};

function getMembershipTierPriceEnvVarName(tierKey) {
  const key = normalizeMembershipTierKey(tierKey);
  if (key === "standard") {
    return "STRIPE_TIER_STANDARD_PRICE_ID";
  }
  if (key === "plus") {
    return "STRIPE_TIER_PLUS_PRICE_ID";
  }
  if (key === "premium") {
    return "STRIPE_TIER_PREMIUM_PRICE_ID";
  }
  return "STRIPE_TIER_<TIER>_PRICE_ID";
}

function extractMissingStripePriceIdFromErrorMessage(message) {
  const text = String(message || "").trim();
  if (!text) {
    return "";
  }
  const singleQuoted = text.match(/No such price:\s*'([^']+)'/i);
  if (singleQuoted?.[1]) {
    return String(singleQuoted[1]).trim();
  }
  const doubleQuoted = text.match(/No such price:\s*"([^"]+)"/i);
  if (doubleQuoted?.[1]) {
    return String(doubleQuoted[1]).trim();
  }
  return "";
}

function isStripeMissingPriceError(error, expectedPriceId = "") {
  const code = String(error?.code || "")
    .trim()
    .toLowerCase();
  const message = String(error?.message || "")
    .trim()
    .toLowerCase();
  if (message.includes("no such price")) {
    return true;
  }
  if (code === "resource_missing" && message.includes("price")) {
    return true;
  }
  const missingPriceId = extractMissingStripePriceIdFromErrorMessage(error?.message || "");
  if (expectedPriceId && missingPriceId && missingPriceId === String(expectedPriceId).trim()) {
    return true;
  }
  return false;
}

function formatCurrencyAmount(cents, currencyCode = "usd") {
  const amount = (Number(cents) || 0) / 100;
  const normalizedCurrency = String(currencyCode || "usd").trim().toUpperCase() || "USD";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: normalizedCurrency
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

function formatRecurringInterval(interval, intervalCount = 1) {
  const normalized = String(interval || "")
    .trim()
    .toLowerCase();
  if (!["day", "week", "month", "year"].includes(normalized)) {
    return "";
  }
  const parsedCount = Number.parseInt(String(intervalCount || "1"), 10);
  const count = Number.isFinite(parsedCount) && parsedCount > 0 ? parsedCount : 1;
  if (count === 1) {
    return normalized;
  }
  return `${count} ${normalized}s`;
}

function formatMembershipTierPriceLabel({ amountCents = 0, currencyCode = "usd", interval = "month", intervalCount = 1 } = {}) {
  const money = formatCurrencyAmount(amountCents, currencyCode);
  const intervalLabel = formatRecurringInterval(interval, intervalCount);
  if (!intervalLabel) {
    return money;
  }
  return `${money} / ${intervalLabel}`;
}

function parseStripeUnitAmountCents(price) {
  const direct = Number(price?.unit_amount);
  if (Number.isFinite(direct)) {
    return Math.round(direct);
  }
  const decimalRaw = String(price?.unit_amount_decimal || "").trim();
  if (!decimalRaw) {
    return Number.NaN;
  }
  const decimal = Number.parseFloat(decimalRaw);
  return Number.isFinite(decimal) ? Math.round(decimal) : Number.NaN;
}

function cleanMemberDisplayName(value) {
  const text = String(value || "").trim().slice(0, 80);
  if (!text) {
    throw new Error("Display name is required.");
  }
  if (text.length < 2) {
    throw new Error("Display name must be at least 2 characters.");
  }
  return text;
}

function cleanMemberPassword(value) {
  const password = String(value || "");
  if (!password) {
    throw new Error("Password is required.");
  }
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
  if (password.length > 200) {
    throw new Error("Password is too long.");
  }
  return password;
}

function createMemberPasswordSaltHex() {
  return randomBytes(16).toString("hex");
}

function hashMemberPassword(password, saltHex) {
  return scryptSync(password, saltHex, 64).toString("hex");
}

function createMemberAuthToken() {
  return `${randomUUID().replace(/-/g, "")}${randomBytes(24).toString("hex")}`;
}

function hashMemberAuthToken(token) {
  return createHash("sha256").update(String(token || ""), "utf8").digest("hex");
}

function readBearerToken(req) {
  const rawHeader = String(req.headers?.authorization || "").trim();
  if (!rawHeader.toLowerCase().startsWith("bearer ")) {
    return "";
  }
  return rawHeader.slice(7).trim();
}

function isMemberPremiumActive(member) {
  if (isMemberAdmin(member)) {
    return true;
  }
  const status = String(member?.subscriptionStatus || "inactive")
    .trim()
    .toLowerCase();
  return activePremiumSubscriptionStatuses.has(status);
}

function isMemberPremiumSubscriptionActive(member) {
  const status = String(member?.subscriptionStatus || "inactive")
    .trim()
    .toLowerCase();
  return activePremiumSubscriptionStatuses.has(status);
}

function hasComplimentaryAdminPremiumAccess(member) {
  return isMemberAdmin(member) && !isMemberPremiumSubscriptionActive(member);
}

function isMemberAdmin(member) {
  const role = String(member?.role || "member")
    .trim()
    .toLowerCase();
  return role === "admin";
}

function normalizeMembershipTierKey(value) {
  const tier = String(value || "none")
    .trim()
    .toLowerCase();
  if (tier in membershipTierCatalog) {
    return tier;
  }
  return "none";
}

function getMembershipTierConfigByKey(tierKey) {
  const key = normalizeMembershipTierKey(tierKey);
  return key === "none" ? null : membershipTierCatalog[key];
}

function getMembershipTierConfigByPriceId(priceId) {
  const target = String(priceId || "").trim();
  if (!target) {
    return null;
  }
  return membershipTierKeysInDisplayOrder
    .map((key) => membershipTierCatalog[key])
    .find((config) => String(config?.priceId || "").trim() === target) || null;
}

function getCurrentMonthKey(dateInput = new Date()) {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  return `${year}-${month}`;
}

function cleanMonthKeyOrCurrent(value) {
  const monthKey = String(value || "").trim();
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey)) {
    return monthKey;
  }
  return getCurrentMonthKey();
}

function getMemberMonthlyPerkEligibility(member) {
  const tierSummary = getMemberTierSummary(member);
  const premiumActive = isMemberPremiumActive(member);
  const complimentaryAdminPremiumAccess = hasComplimentaryAdminPremiumAccess(member);
  return {
    stickersEligible: !complimentaryAdminPremiumAccess && premiumActive && Boolean(tierSummary.includesStickers),
    paperbackEligible: !complimentaryAdminPremiumAccess && premiumActive && Boolean(tierSummary.includesRandomPaperback),
    premiumActive
  };
}

function normalizeAdminFulfillmentPerk(value) {
  const perk = String(value || "")
    .trim()
    .toLowerCase();
  if (perk === "stickers" || perk === "paperback") {
    return perk;
  }
  return "";
}

function parseAdminBoolean(value, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }
  const text = String(value || "")
    .trim()
    .toLowerCase();
  if (["true", "1", "yes", "on"].includes(text)) {
    return true;
  }
  if (["false", "0", "no", "off"].includes(text)) {
    return false;
  }
  return fallback;
}

function getMemberTierConfig(member) {
  if (isMemberAdmin(member)) {
    return membershipTierCatalog.premium;
  }
  const tierKey = normalizeMembershipTierKey(member?.membershipTier);
  const explicit = getMembershipTierConfigByKey(tierKey);
  if (explicit) {
    return explicit;
  }
  if (isMemberPremiumActive(member)) {
    return membershipTierCatalog.standard;
  }
  return null;
}

function getMemberTierSummary(member) {
  const tierConfig = getMemberTierConfig(member);
  if (!tierConfig) {
    return {
      membershipTier: "none",
      membershipTierLabel: "Free",
      monthlyPriceLabel: "",
      ebookMonthlyLimit: 0,
      allEbooksAccess: false,
      includesRandomPaperback: false,
      includesStickers: false
    };
  }
  return {
    membershipTier: tierConfig.key,
    membershipTierLabel: tierConfig.label,
    monthlyPriceLabel: tierConfig.monthlyPriceLabel,
    ebookMonthlyLimit: tierConfig.ebookMonthlyLimit,
    allEbooksAccess: Boolean(tierConfig.allEbooksAccess),
    includesRandomPaperback: Boolean(tierConfig.includesRandomPaperback),
    includesStickers: Boolean(tierConfig.includesStickers)
  };
}

function getMemberOrderLookupEmails(member) {
  const emails = Array.isArray(member?.orderLookupEmails) ? member.orderLookupEmails : [];
  const normalized = [];
  const seen = new Set();
  const addEmail = (value) => {
    const email = safeNormalizeCustomerEmail(value);
    if (!email || seen.has(email)) {
      return;
    }
    seen.add(email);
    normalized.push(email);
  };
  addEmail(member?.email);
  for (const entry of emails) {
    addEmail(entry);
  }
  return normalized;
}

function getMemberOrderLookupPhones(member) {
  const phones = Array.isArray(member?.orderLookupPhones) ? member.orderLookupPhones : [];
  return normalizePhoneList(phones);
}

function memberMatchesOrderContacts(memberContactSets, orderContacts) {
  const memberEmails = memberContactSets?.emails instanceof Set ? memberContactSets.emails : new Set();
  const memberPhones = memberContactSets?.phones instanceof Set ? memberContactSets.phones : new Set();
  const orderEmails = Array.isArray(orderContacts?.emails) ? orderContacts.emails : [];
  const orderPhones = Array.isArray(orderContacts?.phones) ? orderContacts.phones : [];
  for (const email of orderEmails) {
    if (email && memberEmails.has(email)) {
      return true;
    }
  }
  for (const phone of orderPhones) {
    if (phone && memberPhones.has(phone)) {
      return true;
    }
  }
  return false;
}

function getSubscriptionPriceIdFromStripeSubscription(subscription) {
  const items = Array.isArray(subscription?.items?.data) ? subscription.items.data : [];
  for (const item of items) {
    const priceId = String(item?.price?.id || item?.plan?.id || "").trim();
    if (priceId) {
      return priceId;
    }
  }
  return "";
}

function getSubscriptionTierConfig(subscription) {
  const metadataTier = String(subscription?.metadata?.membership_tier || "").trim().toLowerCase();
  const metadataConfig = getMembershipTierConfigByKey(metadataTier);
  if (metadataConfig) {
    return metadataConfig;
  }
  const priceId = getSubscriptionPriceIdFromStripeSubscription(subscription);
  return getMembershipTierConfigByPriceId(priceId);
}

function getMembershipPlanImageUrlsFromSettings(settings = {}) {
  return {
    standard: String(settings?.membershipStandardImageUrl || "").trim(),
    plus: String(settings?.membershipPlusImageUrl || "").trim(),
    premium: String(settings?.membershipPremiumImageUrl || "").trim()
  };
}

function getPublicMembershipPlans(planImageUrls = {}) {
  return membershipTierKeysInDisplayOrder.map((key) => {
    const config = membershipTierCatalog[key];
    return {
      key: config.key,
      label: config.label,
      monthlyPriceLabel: config.monthlyPriceLabel,
      monthlyPriceCents: config.monthlyPriceCents,
      ebookMonthlyLimit: config.ebookMonthlyLimit,
      allEbooksAccess: Boolean(config.allEbooksAccess),
      includesRandomPaperback: Boolean(config.includesRandomPaperback),
      includesStickers: Boolean(config.includesStickers),
      configured: Boolean(String(config.priceId || "").trim()),
      imageUrl: String(planImageUrls?.[config.key] || "").trim()
    };
  });
}

async function getPublicMembershipPlansWithLivePricing() {
  const plans = getPublicMembershipPlans().map((plan) => ({ ...plan }));
  if (!stripe) {
    return plans;
  }

  const nowMs = Date.now();
  if (membershipPlanPricingCache.expiresAtMs > nowMs) {
    return plans.map((plan) => ({
      ...plan,
      ...(membershipPlanPricingCache.overridesByTierKey.get(plan.key) || {}),
      configured: Boolean(plan.configured) && !membershipPlanPricingCache.invalidTierKeys.has(plan.key)
    }));
  }

  const liveOverridesByTierKey = new Map();
  const invalidTierKeys = new Set();
  await Promise.all(
    membershipTierKeysInDisplayOrder.map(async (tierKey) => {
      const config = membershipTierCatalog[tierKey];
      const priceId = String(config?.priceId || "").trim();
      if (!priceId) {
        return;
      }
      try {
        const price = await stripe.prices.retrieve(priceId);
        const amountCents = parseStripeUnitAmountCents(price);
        if (!Number.isFinite(amountCents) || amountCents < 0) {
          return;
        }
        const currencyCode = String(price?.currency || currency || "usd")
          .trim()
          .toLowerCase();
        const interval = String(price?.recurring?.interval || "month")
          .trim()
          .toLowerCase();
        const intervalCount = Number.parseInt(String(price?.recurring?.interval_count || "1"), 10) || 1;
        liveOverridesByTierKey.set(tierKey, {
          monthlyPriceCents: amountCents,
          monthlyPriceLabel: formatMembershipTierPriceLabel({
            amountCents,
            currencyCode,
            interval,
            intervalCount
          })
        });
      } catch (error) {
        if (isStripeMissingPriceError(error, priceId)) {
          invalidTierKeys.add(tierKey);
          const envVarName = getMembershipTierPriceEnvVarName(tierKey);
          console.warn(
            `Membership tier "${tierKey}" has invalid Stripe price ID ${priceId}. Update ${envVarName} to a valid recurring Stripe price ID.`
          );
          return;
        }
        console.warn(`Could not load Stripe price for ${tierKey} membership tier:`, error);
      }
    })
  );

  membershipPlanPricingCache.expiresAtMs = Date.now() + membershipPlanPricingCacheTtlMs;
  membershipPlanPricingCache.overridesByTierKey = liveOverridesByTierKey;
  membershipPlanPricingCache.invalidTierKeys = invalidTierKeys;

  return plans.map((plan) => ({
    ...plan,
    ...(liveOverridesByTierKey.get(plan.key) || {}),
    configured: Boolean(plan.configured) && !invalidTierKeys.has(plan.key)
  }));
}

function isBlockingPremiumSubscriptionStatus(status) {
  const normalized = String(status || "")
    .trim()
    .toLowerCase();
  return ["active", "trialing", "past_due", "unpaid", "incomplete", "paused"].includes(normalized);
}

function hasMemberBlockingPremiumSubscription(member) {
  return isBlockingPremiumSubscriptionStatus(member?.subscriptionStatus);
}

function isProtectedPremiumEbookFileUrl(value) {
  const normalized = String(value || "").trim();
  if (!normalized.startsWith(premiumEbookProtectedUploadsPrefix)) {
    return false;
  }
  return !normalized.includes("\\") && !normalized.includes("..");
}

function isPublicPremiumEbookFileUrl(value) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return false;
  }
  if (/^https?:\/\/\S+$/i.test(normalized)) {
    return true;
  }
  if (
    (normalized.startsWith("/ebooks/") || normalized.startsWith("/pdfEbook/")) &&
    !normalized.includes("\\") &&
    !normalized.includes("..")
  ) {
    return true;
  }
  return false;
}

function formatFlipbookFolderTitle(folderName) {
  const text = String(folderName || "").trim();
  if (!text) {
    return "Premium Flipbook";
  }
  const normalized = text
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) {
    return "Premium Flipbook";
  }
  return normalized
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function buildFlipbookLibraryItemId(folderName) {
  const normalized = String(folderName || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");
  const base = normalized || "ebook";
  return `flipbook-${base}`.slice(0, 120);
}

async function listFlipbookLibraryItemsFromDisk() {
  let entries = [];
  try {
    entries = await fs.readdir(pdfEbookDir, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const items = [];
  for (const entry of entries) {
    if (!entry?.isDirectory?.()) {
      continue;
    }
    const folderName = String(entry.name || "").trim();
    if (!folderName) {
      continue;
    }
    const folderPath = path.join(pdfEbookDir, folderName);
    const indexPath = path.join(folderPath, "index.html");
    try {
      await fs.access(indexPath);
    } catch {
      continue;
    }
    items.push({
      id: buildFlipbookLibraryItemId(folderName),
      title: formatFlipbookFolderTitle(folderName),
      monthLabel: "Flipbook",
      description: "Interactive flipbook edition.",
      fileUrl: `/ebooks/${encodeURIComponent(folderName)}/`,
      coverImageUrl: "",
      source: "flipbook"
    });
  }

  items.sort((left, right) => String(left.title || "").localeCompare(String(right.title || ""), undefined, { sensitivity: "base" }));
  return items;
}

async function listAllPremiumLibraryItems() {
  const [storedItems, flipbookItems] = await Promise.all([listPremiumLibraryItems(), listFlipbookLibraryItemsFromDisk()]);
  const merged = [];
  const seenIds = new Set();

  for (const item of storedItems) {
    const id = String(item?.id || "").trim();
    if (!id || seenIds.has(id)) {
      continue;
    }
    seenIds.add(id);
    merged.push({
      ...item,
      source: "stored"
    });
  }

  for (const item of flipbookItems) {
    const id = String(item?.id || "").trim();
    if (!id || seenIds.has(id)) {
      continue;
    }
    seenIds.add(id);
    merged.push(item);
  }

  return merged;
}

function resolvePremiumEbookFilePath(fileUrl) {
  if (!isProtectedPremiumEbookFileUrl(fileUrl)) {
    return "";
  }
  const relativePath = String(fileUrl || "")
    .trim()
    .slice(premiumEbookProtectedUploadsPrefix.length)
    .replace(/^\/+/, "");
  if (!relativePath) {
    return "";
  }
  const baseDir = path.resolve(path.join(uploadsDir, "premium-ebooks"));
  const absolutePath = path.resolve(path.join(baseDir, relativePath));
  if (!absolutePath.startsWith(`${baseDir}${path.sep}`) && absolutePath !== baseDir) {
    return "";
  }
  return absolutePath;
}

function buildPremiumEbookTokenPayload({ memberId, ebookId, monthKey, expiresAtUnix }) {
  return `${String(memberId || "").trim()}|${String(ebookId || "").trim()}|${String(monthKey || "").trim()}|${String(
    expiresAtUnix || ""
  ).trim()}`;
}

function signPremiumEbookTokenPayload(payload) {
  return createHmac("sha256", premiumEbookTokenSecret).update(payload, "utf8").digest("hex");
}

function createPremiumEbookDownloadToken({ memberId, ebookId, monthKey, nowUnix = Math.floor(Date.now() / 1000) }) {
  const expiresAtUnix = nowUnix + premiumEbookDownloadTokenTtlSeconds;
  const payload = buildPremiumEbookTokenPayload({
    memberId,
    ebookId,
    monthKey,
    expiresAtUnix
  });
  const signature = signPremiumEbookTokenPayload(payload);
  return `${expiresAtUnix}.${signature}`;
}

function verifyPremiumEbookDownloadToken({ token, memberId, ebookId, monthKey, nowUnix = Math.floor(Date.now() / 1000) }) {
  const text = String(token || "").trim();
  const dotIndex = text.indexOf(".");
  if (dotIndex <= 0) {
    return false;
  }
  const expiresAtRaw = text.slice(0, dotIndex).trim();
  const suppliedSignature = text.slice(dotIndex + 1).trim().toLowerCase();
  const expiresAtUnix = Number.parseInt(expiresAtRaw, 10);
  if (!Number.isFinite(expiresAtUnix) || expiresAtUnix <= nowUnix) {
    return false;
  }
  if (!/^[a-f0-9]{64}$/.test(suppliedSignature)) {
    return false;
  }
  const payload = buildPremiumEbookTokenPayload({
    memberId,
    ebookId,
    monthKey,
    expiresAtUnix
  });
  const expectedSignature = signPremiumEbookTokenPayload(payload);
  return secureEquals(suppliedSignature, expectedSignature);
}

function pickDeterministicIndex(seed, size) {
  if (!Number.isFinite(size) || size <= 0) {
    return 0;
  }
  const digest = createHash("sha256").update(String(seed || ""), "utf8").digest();
  const numeric = digest.readUInt32BE(0);
  return numeric % size;
}

async function getMonthlyRandomPaperbackForMember(member, monthKey = getCurrentMonthKey()) {
  const tierConfig = getMemberTierConfig(member);
  if (!tierConfig || !tierConfig.includesRandomPaperback) {
    return null;
  }
  const products = await listProducts();
  const bookCandidates = products.filter((product) => {
    const category = String(product?.productCategory || "book")
      .trim()
      .toLowerCase();
    if (category !== "book") {
      return false;
    }
    if (product?.inStock === false) {
      return false;
    }
    if (product?.isComingSoon === true) {
      return false;
    }
    return true;
  });
  if (bookCandidates.length === 0) {
    return null;
  }
  const index = pickDeterministicIndex(`${member.id}:${monthKey}:paperback`, bookCandidates.length);
  const selected = bookCandidates[index];
  return {
    id: selected.id,
    title: selected.title,
    imageUrl: selected.imageUrl || "",
    monthKey
  };
}

async function getMemberPremiumEbookAccessSnapshot(member) {
  const tierConfig = getMemberTierConfig(member);
  if (!tierConfig) {
    return {
      tierConfig: null,
      monthKey: getCurrentMonthKey(),
      items: [],
      selectedIds: [],
      selectedIdSet: new Set(),
      maxSelections: 0
    };
  }

  const monthKey = getCurrentMonthKey();
  const items = await listAllPremiumLibraryItems();
  const validItemIdSet = new Set(items.map((item) => item.id));
  const currentLoan = await findMemberEbookLoan(member.id, monthKey);
  const maxSelections = tierConfig.allEbooksAccess ? items.length : Math.max(0, Number(tierConfig.ebookMonthlyLimit) || 0);
  const selectedIds = tierConfig.allEbooksAccess
    ? items.map((item) => item.id)
    : Array.isArray(currentLoan?.ebookIds)
      ? currentLoan.ebookIds.filter((ebookId) => validItemIdSet.has(ebookId)).slice(0, maxSelections)
      : [];
  return {
    tierConfig,
    monthKey,
    items,
    selectedIds,
    selectedIdSet: new Set(selectedIds),
    maxSelections
  };
}

function toIsoFromStripeTimestamp(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return "";
  }
  return new Date(parsed * 1000).toISOString();
}

function buildMemberClientPayload(member) {
  if (!member) {
    return null;
  }
  const complimentaryPremiumAccess = hasComplimentaryAdminPremiumAccess(member);
  const tierSummary = getMemberTierSummary(member);
  const orderLookupEmails = getMemberOrderLookupEmails(member);
  const orderLookupPhones = getMemberOrderLookupPhones(member);
  return {
    id: member.id,
    displayName: member.displayName,
    email: member.email,
    role: isMemberAdmin(member) ? "admin" : "member",
    stripeCustomerId: member.stripeCustomerId || "",
    stripeSubscriptionId: member.stripeSubscriptionId || "",
    subscriptionStatus: member.subscriptionStatus || "inactive",
    subscriptionCurrentPeriodEnd: member.subscriptionCurrentPeriodEnd || "",
    subscriptionCancelAtPeriodEnd: Boolean(member.subscriptionCancelAtPeriodEnd),
    premiumAccess: isMemberPremiumActive(member),
    complimentaryPremiumAccess,
    membershipTier: tierSummary.membershipTier,
    membershipTierLabel: tierSummary.membershipTierLabel,
    monthlyPriceLabel: tierSummary.monthlyPriceLabel,
    ebookMonthlyLimit: tierSummary.ebookMonthlyLimit,
    allEbooksAccess: tierSummary.allEbooksAccess,
    includesRandomPaperback: tierSummary.includesRandomPaperback,
    includesStickers: tierSummary.includesStickers,
    orderLookupEmails,
    orderLookupPhones,
    createdAt: member.createdAt || "",
    updatedAt: member.updatedAt || ""
  };
}

function buildMemberAdminPayload(member) {
  const profile = buildMemberClientPayload(member);
  if (!profile) {
    return null;
  }
  return {
    ...profile,
    lastLoginAt: member.lastLoginAt || "",
    authTokenIssuedAt: member.authTokenIssuedAt || ""
  };
}

function isTerminatedSubscriptionStatus(status) {
  const normalized = String(status || "")
    .trim()
    .toLowerCase();
  return ["canceled", "unpaid", "incomplete_expired"].includes(normalized);
}

function buildAdminMemberFulfillmentPayload(member, monthKey, record) {
  const profile = buildMemberAdminPayload(member);
  if (!profile) {
    return null;
  }

  const eligibility = getMemberMonthlyPerkEligibility(member);
  const stickersFulfilledAt = String(record?.stickersFulfilledAt || "").trim();
  const paperbackFulfilledAt = String(record?.paperbackFulfilledAt || "").trim();
  const premiumActive = eligibility.premiumActive;
  const cancellationPending = premiumActive && Boolean(profile.subscriptionCancelAtPeriodEnd);
  const terminated = !premiumActive && isTerminatedSubscriptionStatus(profile.subscriptionStatus);

  return {
    ...profile,
    monthKey,
    cancellationPending,
    terminated,
    perks: {
      stickers: {
        eligible: eligibility.stickersEligible,
        fulfilled: Boolean(stickersFulfilledAt),
        fulfilledAt: stickersFulfilledAt,
        owed: eligibility.stickersEligible && !stickersFulfilledAt,
        trackingNumber: String(record?.stickersTrackingNumber || "").trim(),
        note: String(record?.stickersNote || "").trim()
      },
      paperback: {
        eligible: eligibility.paperbackEligible,
        fulfilled: Boolean(paperbackFulfilledAt),
        fulfilledAt: paperbackFulfilledAt,
        owed: eligibility.paperbackEligible && !paperbackFulfilledAt,
        trackingNumber: String(record?.paperbackTrackingNumber || "").trim(),
        note: String(record?.paperbackNote || "").trim()
      }
    }
  };
}

async function resolveMemberFromAuthHeader(req) {
  const token = readBearerToken(req);
  if (!token) {
    return null;
  }
  const tokenHash = hashMemberAuthToken(token);
  return findMemberByAuthTokenHash(tokenHash);
}

async function requireMember(req, res, next) {
  try {
    const member = await resolveMemberFromAuthHeader(req);
    if (!member) {
      return res.status(401).json({ error: "Sign in required." });
    }
    req.member = member;
    return next();
  } catch (error) {
    return res.status(500).json({ error: "Could not validate member session." });
  }
}

async function requireActivePremiumMember(req, res, next) {
  try {
    const member = await resolveMemberFromAuthHeader(req);
    if (!member) {
      return res.status(401).json({ error: "Sign in required." });
    }
    if (!isMemberPremiumActive(member)) {
      return res.status(403).json({
        error: "Premium subscription required.",
        subscriptionStatus: member.subscriptionStatus || "inactive"
      });
    }
    req.member = member;
    return next();
  } catch (error) {
    return res.status(500).json({ error: "Could not validate premium access." });
  }
}

function requirePremiumPriceConfigForTier(tierKey, res) {
  const config = getMembershipTierConfigByKey(tierKey);
  if (!config) {
    res.status(400).json({
      error: "Select a valid membership tier."
    });
    return null;
  }
  if (!String(config.priceId || "").trim()) {
    res.status(503).json({
      error: `${config.label} membership is not configured. Add its Stripe price ID in environment variables.`
    });
    return null;
  }
  return config;
}

async function ensureStripeCustomerForMember(member) {
  if (!stripe) {
    throw new Error("Stripe is not configured.");
  }

  const existingCustomerId = String(member?.stripeCustomerId || "").trim();
  if (existingCustomerId) {
    return existingCustomerId;
  }

  const customer = await stripe.customers.create({
    email: member.email,
    name: member.displayName,
    metadata: {
      member_id: member.id
    }
  });

  const createdCustomerId = String(customer?.id || "").trim();
  if (!createdCustomerId) {
    throw new Error("Stripe did not return a customer ID.");
  }

  await updateMember(member.id, {
    stripeCustomerId: createdCustomerId
  });
  return createdCustomerId;
}

async function findBlockingStripeSubscriptionForCustomer(customerId) {
  if (!stripe) {
    return null;
  }
  const cleanCustomerId = String(customerId || "").trim();
  if (!cleanCustomerId) {
    return null;
  }

  let startingAfter = "";
  let hasMore = true;
  let pagesFetched = 0;
  while (hasMore && pagesFetched < 5) {
    const response = await stripe.subscriptions.list({
      customer: cleanCustomerId,
      status: "all",
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {})
    });
    const subscriptions = Array.isArray(response?.data) ? response.data : [];
    const blocking = subscriptions.find((subscription) => isBlockingPremiumSubscriptionStatus(subscription?.status));
    if (blocking) {
      return blocking;
    }
    hasMore = Boolean(response?.has_more);
    startingAfter = subscriptions.length > 0 ? String(subscriptions[subscriptions.length - 1]?.id || "").trim() : "";
    if (!startingAfter) {
      hasMore = false;
    }
    pagesFetched += 1;
  }

  return null;
}

async function resolveMemberForStripeEvent({ memberId = "", customerId = "", email = "" } = {}) {
  const cleanMemberId = String(memberId || "").trim();
  if (cleanMemberId) {
    const byId = await findMemberById(cleanMemberId);
    if (byId) {
      return byId;
    }
  }

  const cleanCustomerId = String(customerId || "").trim();
  if (cleanCustomerId) {
    const byCustomer = await findMemberByStripeCustomerId(cleanCustomerId);
    if (byCustomer) {
      return byCustomer;
    }
  }

  try {
    const cleanEmail = normalizeCustomerEmail(email);
    if (cleanEmail) {
      const byEmail = await findMemberByEmail(cleanEmail);
      if (byEmail) {
        return byEmail;
      }
    }
  } catch {
    // Ignore invalid emails from webhook payloads.
  }

  return null;
}

async function applyMemberSubscriptionFromStripeSubscription(subscription, { memberIdHint = "" } = {}) {
  if (!subscription || typeof subscription !== "object") {
    return null;
  }

  const subscriptionId = String(subscription.id || "").trim();
  const customerId =
    typeof subscription.customer === "string"
      ? String(subscription.customer || "").trim()
      : String(subscription.customer?.id || "").trim();
  const subscriptionStatus = String(subscription.status || "inactive")
    .trim()
    .toLowerCase();
  const metadata = subscription.metadata && typeof subscription.metadata === "object" ? subscription.metadata : {};
  const metadataMemberId = String(metadata.member_id || "").trim();
  const subscriptionTierConfig = getSubscriptionTierConfig(subscription);

  const member = await resolveMemberForStripeEvent({
    memberId: memberIdHint || metadataMemberId,
    customerId
  });
  if (!member) {
    console.warn(
      `No member account found for subscription update ${subscriptionId || "unknown"} (customer ${customerId || "unknown"})`
    );
    return null;
  }

  const updated = await updateMember(member.id, {
    stripeCustomerId: customerId || member.stripeCustomerId,
    stripeSubscriptionId: subscriptionId || member.stripeSubscriptionId,
    subscriptionStatus,
    membershipTier: subscriptionTierConfig?.key || member.membershipTier || "none",
    subscriptionCurrentPeriodEnd: toIsoFromStripeTimestamp(subscription.current_period_end),
    subscriptionCancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end)
  });
  return updated;
}

async function processPremiumCheckoutCompletedSession(session) {
  if (!stripe || !session || typeof session !== "object") {
    return;
  }

  const metadata = session.metadata && typeof session.metadata === "object" ? session.metadata : {};
  const customerId =
    typeof session.customer === "string"
      ? String(session.customer || "").trim()
      : String(session.customer?.id || "").trim();
  const subscriptionId =
    typeof session.subscription === "string"
      ? String(session.subscription || "").trim()
      : String(session.subscription?.id || "").trim();
  const memberId = String(metadata.member_id || session.client_reference_id || "").trim();
  const requestedTierKey = normalizeMembershipTierKey(metadata.membership_tier || "none");
  const customerEmail = String(session.customer_details?.email || session.customer_email || "").trim().toLowerCase();

  const member = await resolveMemberForStripeEvent({
    memberId,
    customerId,
    email: customerEmail
  });
  if (!member) {
    console.warn(
      `No member account found for premium checkout session ${String(session.id || "unknown")} (customer ${customerId || "unknown"})`
    );
    return;
  }

  await updateMember(member.id, {
    stripeCustomerId: customerId || member.stripeCustomerId,
    stripeSubscriptionId: subscriptionId || member.stripeSubscriptionId,
    membershipTier: requestedTierKey !== "none" ? requestedTierKey : member.membershipTier || "none"
  });

  if (subscriptionId) {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      await applyMemberSubscriptionFromStripeSubscription(subscription, {
        memberIdHint: member.id
      });
    } catch (error) {
      console.error(`Failed syncing premium subscription ${subscriptionId}:`, error);
    }
  }
}

function checkoutSessionBelongsToMember(session, member) {
  if (!session || typeof session !== "object" || !member || typeof member !== "object") {
    return false;
  }

  const metadata = session.metadata && typeof session.metadata === "object" ? session.metadata : {};
  const sessionMemberId = String(metadata.member_id || session.client_reference_id || "").trim();
  const memberId = String(member.id || "").trim();
  if (sessionMemberId) {
    return Boolean(memberId) && sessionMemberId === memberId;
  }

  const sessionCustomerId =
    typeof session.customer === "string"
      ? String(session.customer || "").trim()
      : String(session.customer?.id || "").trim();
  const memberCustomerId = String(member.stripeCustomerId || "").trim();
  if (sessionCustomerId && memberCustomerId && sessionCustomerId === memberCustomerId) {
    return true;
  }

  const sessionEmail = safeNormalizeCustomerEmail(session.customer_details?.email || session.customer_email || "");
  const memberEmail = safeNormalizeCustomerEmail(member.email || "");
  if (sessionEmail && memberEmail && sessionEmail === memberEmail) {
    return true;
  }

  return false;
}

async function processPremiumInvoiceEvent(invoice) {
  if (!stripe || !invoice || typeof invoice !== "object") {
    return;
  }

  const subscriptionId =
    typeof invoice.subscription === "string"
      ? String(invoice.subscription || "").trim()
      : String(invoice.subscription?.id || "").trim();
  if (!subscriptionId) {
    return;
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    await applyMemberSubscriptionFromStripeSubscription(subscription);
  } catch (error) {
    console.error(`Failed syncing premium invoice subscription ${subscriptionId}:`, error);
  }
}

function requireAdmin(req, res, next) {
  if (!adminPassword) {
    return res.status(503).json({
      error: "Admin is not configured. Add ADMIN_PASSWORD to environment variables."
    });
  }

  const supplied = String(req.headers["x-admin-password"] || "");
  if (!secureEquals(supplied, adminPassword)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  return next();
}

function collectUploadedFiles(files, fieldNames = []) {
  if (!files || typeof files !== "object") {
    return [];
  }
  const names = fieldNames.length > 0 ? fieldNames : Object.keys(files);
  return names.flatMap((name) => (Array.isArray(files[name]) ? files[name] : []));
}

function normalizeCloudFolderPath(...segments) {
  return segments
    .map((segment) => String(segment || "").trim())
    .filter(Boolean)
    .join("/")
    .replace(/\/{2,}/g, "/")
    .replace(/^\/+|\/+$/g, "");
}

function cleanCloudinaryPublicIdBase(originalName = "") {
  const ext = path.extname(String(originalName || "")).toLowerCase();
  const base = String(originalName || "")
    .trim()
    .slice(0, 120)
    .replace(ext, "")
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return base || "file";
}

function uploadBufferToCloudinary({ buffer, originalName = "", folder = "" }) {
  return new Promise((resolve, reject) => {
    const publicId = normalizeCloudFolderPath(
      folder,
      `${Date.now()}-${randomUUID().slice(0, 8)}-${cleanCloudinaryPublicIdBase(originalName)}`
    );
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "auto",
        public_id: publicId,
        overwrite: false
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve({
          url: String(result?.secure_url || result?.url || "").trim(),
          publicId: String(result?.public_id || publicId).trim(),
          resourceType: String(result?.resource_type || "image").trim().toLowerCase()
        });
      }
    );
    stream.end(buffer);
  });
}

async function uploadMulterFileToCloudinary(file, folder = "") {
  const content = Buffer.isBuffer(file?.buffer)
    ? file.buffer
    : file?.path
      ? await fs.readFile(file.path)
      : Buffer.alloc(0);
  if (!content || content.length === 0) {
    throw new Error("Uploaded file is empty.");
  }
  const uploaded = await uploadBufferToCloudinary({
    buffer: content,
    originalName: file?.originalname || "",
    folder
  });
  file.publicUrl = uploaded.url;
  file.cloudPublicId = uploaded.publicId;
  file.cloudResourceType = uploaded.resourceType;
  if (file?.path) {
    await fs.unlink(file.path).catch(() => {});
  }
}

async function maybeUploadRequestFilesToCloudinary(files, folderByFieldName = {}) {
  if (!cloudinaryUploadsEnabled || !files || typeof files !== "object") {
    return;
  }
  const entries = Object.entries(folderByFieldName || {});
  for (const [fieldName, folderSuffix] of entries) {
    const fileList = Array.isArray(files[fieldName]) ? files[fieldName] : [];
    const folder = normalizeCloudFolderPath(cloudinaryUploadFolder, folderSuffix);
    for (const file of fileList) {
      await uploadMulterFileToCloudinary(file, folder);
    }
  }
}

function tryParseCloudinaryPublicAsset(publicUrl) {
  const text = String(publicUrl || "").trim();
  if (!text || !cloudinaryUploadsEnabled || !cloudinaryCloudName) {
    return null;
  }
  const cloudNameEscaped = cloudinaryCloudName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(
    new RegExp(`^https?:\\/\\/res\\.cloudinary\\.com\\/${cloudNameEscaped}\\/(image|raw|video)\\/upload\\/(?:v\\d+\\/)?(.+)$`, "i")
  );
  if (!match) {
    return null;
  }
  const resourceType = String(match[1] || "image").trim().toLowerCase();
  const pathPart = String(match[2] || "").trim();
  if (!pathPart) {
    return null;
  }
  const decodedPath = decodeURIComponent(pathPart);
  const withoutExtension = decodedPath.replace(/\.[a-z0-9]+$/i, "");
  if (!withoutExtension) {
    return null;
  }
  return {
    resourceType,
    publicId: withoutExtension
  };
}

async function destroyCloudinaryAsset(publicId, resourceType = "") {
  const id = String(publicId || "").trim();
  if (!cloudinaryUploadsEnabled || !id) {
    return;
  }
  const preferredType = String(resourceType || "").trim().toLowerCase();
  const typeOrder = preferredType ? [preferredType, "image", "raw", "video"] : ["image", "raw", "video"];
  const attempted = new Set();
  for (const type of typeOrder) {
    const normalizedType = String(type || "").trim().toLowerCase();
    if (!normalizedType || attempted.has(normalizedType)) {
      continue;
    }
    attempted.add(normalizedType);
    try {
      const response = await cloudinary.uploader.destroy(id, {
        resource_type: normalizedType,
        invalidate: true
      });
      const result = String(response?.result || "").trim().toLowerCase();
      if (result === "ok" || result === "not found") {
        return;
      }
    } catch {
      // Try next resource type.
    }
  }
}

async function removeUploadedFile(file) {
  if (file?.cloudPublicId) {
    await destroyCloudinaryAsset(file.cloudPublicId, file.cloudResourceType);
  }
  if (!file?.path) {
    return;
  }
  await fs.unlink(file.path).catch(() => {});
}

async function removeUploadedFiles(files, fieldNames = []) {
  if (!files || typeof files !== "object") {
    return;
  }

  const fileList = collectUploadedFiles(files, fieldNames);
  await Promise.all(fileList.map((file) => removeUploadedFile(file)));
}

function parseBooleanFlag(value, defaultValue = undefined) {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }
  if (typeof value === "boolean") {
    return value;
  }

  const text = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(text)) {
    return true;
  }
  if (["false", "0", "no", "off"].includes(text)) {
    return false;
  }
  return defaultValue;
}

function priceToCents(priceInput) {
  const parsed = Number.parseFloat(String(priceInput || ""));
  if (!Number.isFinite(parsed)) {
    return Number.NaN;
  }
  return Math.round(parsed * 100);
}

function optionalPriceToCents(priceInput) {
  const raw = String(priceInput ?? "").trim();
  if (!raw) {
    return undefined;
  }
  return priceToCents(raw);
}

function imageUrlFromRequest(req, { allowUnset = false } = {}) {
  const typedUrl = String(req.body?.imageUrl || "").trim();
  const uploadedPrimary = uploadedImageUrl(req.files, "image");
  if (uploadedPrimary) {
    return uploadedPrimary;
  }
  const singleUploadUrl = uploadedFilePublicUrl(req.file);
  if (singleUploadUrl) {
    return singleUploadUrl;
  }
  if (typedUrl) {
    return typedUrl;
  }
  return allowUnset ? undefined : "";
}

function uploadedImageUrl(files, fieldName) {
  const file = Array.isArray(files?.[fieldName]) ? files[fieldName][0] : null;
  const url = uploadedFilePublicUrl(file);
  if (!url) {
    return undefined;
  }
  return url;
}

function uploadedPremiumEbookUrl(files, fieldName = "ebookFile") {
  const file = Array.isArray(files?.[fieldName]) ? files[fieldName][0] : null;
  if (!file?.filename) {
    return undefined;
  }
  return `${premiumEbookProtectedUploadsPrefix}${file.filename}`;
}

function resolveUploadsAbsolutePathFromPublicUrl(publicUrl) {
  const url = String(publicUrl || "").trim();
  if (!url.startsWith("/uploads/") || url.includes("..") || url.includes("\\")) {
    return "";
  }
  const relativePath = url.slice("/uploads/".length).replace(/^\/+/, "");
  if (!relativePath) {
    return "";
  }
  const baseDir = path.resolve(uploadsDir);
  const absolutePath = path.resolve(path.join(baseDir, relativePath));
  if (!absolutePath.startsWith(`${baseDir}${path.sep}`) && absolutePath !== baseDir) {
    return "";
  }
  return absolutePath;
}

async function removeUploadsFileByPublicUrl(publicUrl) {
  const cloudAsset = tryParseCloudinaryPublicAsset(publicUrl);
  if (cloudAsset?.publicId) {
    await destroyCloudinaryAsset(cloudAsset.publicId, cloudAsset.resourceType);
    return;
  }
  const absolutePath = resolveUploadsAbsolutePathFromPublicUrl(publicUrl);
  if (!absolutePath) {
    return;
  }
  await fs.unlink(absolutePath).catch(() => {});
}

function uploadedFilePublicUrl(file) {
  const explicit = String(file?.publicUrl || "").trim();
  if (explicit) {
    return explicit;
  }
  if (!file?.filename) {
    return "";
  }
  return `/uploads/${file.filename}`;
}

function uploadedImageUrls(files, fieldName) {
  const list = Array.isArray(files?.[fieldName]) ? files[fieldName] : [];
  return list
    .map((file) => uploadedFilePublicUrl(file))
    .filter(Boolean);
}

function parseImageUrlList(raw, { defaultEmpty = false } = {}) {
  if (raw === undefined || raw === null) {
    return defaultEmpty ? [] : undefined;
  }

  if (Array.isArray(raw)) {
    return raw
      .map((entry) => String(entry || "").trim())
      .filter(Boolean);
  }

  const text = String(raw).trim();
  if (!text) {
    return [];
  }

  if (text.startsWith("[")) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed
          .map((entry) => String(entry || "").trim())
          .filter(Boolean);
      }
    } catch {
      // Fall back to newline/comma parsing.
    }
  }

  return text
    .split(/\r?\n|,/g)
    .map((entry) => String(entry || "").trim())
    .filter(Boolean);
}

function getUspsMissingConfigFields() {
  const checks = [
    ["USPS_CLIENT_ID", uspsClientId],
    ["USPS_CLIENT_SECRET", uspsClientSecret],
    ["USPS_CRID", uspsCrid],
    ["USPS_MID", uspsMid],
    ["USPS_ACCOUNT_NUMBER", uspsAccountNumber],
    ["USPS_FROM_NAME", uspsFromName],
    ["USPS_FROM_ADDRESS1", uspsFromAddress1],
    ["USPS_FROM_CITY", uspsFromCity],
    ["USPS_FROM_STATE", uspsFromState],
    ["USPS_FROM_ZIP5", uspsFromZip5]
  ];
  return checks.filter(([, value]) => !String(value || "").trim()).map(([name]) => name);
}

function isUspsConfigured() {
  return getUspsMissingConfigFields().length === 0;
}

function normalizeIsoCountry(value, fallback = "US") {
  const code = String(value || "")
    .trim()
    .toUpperCase();
  if (/^[A-Z]{2}$/.test(code)) {
    return code;
  }
  return fallback;
}

function cleanNumericPostalCode(value, maxLength = 10) {
  const text = String(value || "")
    .trim()
    .replace(/\s+/g, "")
    .slice(0, maxLength);
  return text;
}

function normalizeCustomerEmail(value) {
  const email = String(value || "")
    .trim()
    .toLowerCase()
    .slice(0, 320);
  if (!email) {
    return "";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a valid email address.");
  }
  return email;
}

function safeNormalizeCustomerEmail(value) {
  try {
    return normalizeCustomerEmail(value);
  } catch {
    return "";
  }
}

function normalizePhoneForLookup(value) {
  const digits = String(value || "")
    .replace(/[^\d]/g, "")
    .trim();
  if (!digits) {
    return "";
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1);
  }
  if (digits.length < 7 || digits.length > 15) {
    return "";
  }
  return digits;
}

function normalizePhoneList(values) {
  const list = Array.isArray(values) ? values : [values];
  const seen = new Set();
  const normalized = [];
  for (const value of list) {
    const phone = normalizePhoneForLookup(value);
    if (!phone || seen.has(phone)) {
      continue;
    }
    seen.add(phone);
    normalized.push(phone);
  }
  return normalized;
}

function cleanQuoteRequestText(value, maxLength = 2000) {
  return String(value || "")
    .trim()
    .replace(/\r\n/g, "\n")
    .slice(0, maxLength);
}

function normalizeCheckoutShippingInput(input = {}, fallbackState = "") {
  const shippingName = String(input?.name || "").trim().slice(0, 120);
  const shippingEmail = String(input?.email || "").trim().toLowerCase().slice(0, 320);
  const shippingPhone = String(input?.phone || "").trim().slice(0, 40);
  const shippingLine1 = String(input?.line1 || "").trim().slice(0, 220);
  const shippingLine2 = String(input?.line2 || "").trim().slice(0, 220);
  const shippingCity = String(input?.city || "").trim().slice(0, 120);
  const shippingState = normalizeUsStateCode(input?.state) || normalizeUsStateCode(fallbackState);
  const shippingPostalCode = String(input?.postalCode || input?.postal_code || "")
    .trim()
    .toUpperCase()
    .slice(0, 20);
  const shippingCountry = normalizeIsoCountry(input?.country, "US");

  return {
    name: shippingName,
    email: shippingEmail,
    phone: shippingPhone,
    line1: shippingLine1,
    line2: shippingLine2,
    city: shippingCity,
    state: shippingState,
    postalCode: shippingPostalCode,
    country: shippingCountry
  };
}

function hasCompleteCheckoutShippingInput(shipping) {
  return Boolean(shipping?.name && shipping?.line1 && shipping?.city && shipping?.state && shipping?.postalCode);
}

function buildCheckoutShippingMetadataOverrides(shipping = {}) {
  return {
    fulfillment_shipping_name_override: String(shipping?.name || "").trim(),
    fulfillment_shipping_line1_override: String(shipping?.line1 || "").trim(),
    fulfillment_shipping_line2_override: String(shipping?.line2 || "").trim(),
    fulfillment_shipping_city_override: String(shipping?.city || "").trim(),
    fulfillment_shipping_state_override: normalizeUsStateCode(shipping?.state),
    fulfillment_shipping_postal_override: String(shipping?.postalCode || "")
      .trim()
      .toUpperCase(),
    fulfillment_shipping_country_override: normalizeIsoCountry(shipping?.country, "US")
  };
}

function buildStripeStyleShippingDetails(shipping = {}) {
  const country = normalizeIsoCountry(shipping?.country, "US");
  return {
    name: String(shipping?.name || "").trim(),
    phone: String(shipping?.phone || "").trim(),
    address: {
      line1: String(shipping?.line1 || "").trim(),
      line2: String(shipping?.line2 || "").trim(),
      city: String(shipping?.city || "").trim(),
      state: normalizeUsStateCode(shipping?.state),
      postal_code: String(shipping?.postalCode || "")
        .trim()
        .toUpperCase(),
      country
    }
  };
}

function buildZipCode(zip5, zip4 = "") {
  const normalizedZip5 = cleanNumericPostalCode(zip5, 10);
  const splitFromZip5 = normalizedZip5.split("-");
  const left = splitFromZip5[0] || "";
  const right = cleanNumericPostalCode(zip4 || splitFromZip5[1] || "", 4);
  if (left && right) {
    return `${left}-${right}`;
  }
  return left;
}

function splitPersonName(fullName, fallbackFirstName = "Customer") {
  const value = String(fullName || "").trim().replace(/\s+/g, " ");
  if (!value) {
    return {
      firstName: fallbackFirstName,
      lastName: ""
    };
  }

  const parts = value.split(" ");
  if (parts.length === 1) {
    return {
      firstName: parts[0].slice(0, 40),
      lastName: ""
    };
  }

  return {
    firstName: parts[0].slice(0, 40),
    lastName: parts
      .slice(1)
      .join(" ")
      .slice(0, 40)
  };
}

function parsePositiveNumber(value, fallback, { min = 0.01, max = 9999 } = {}) {
  const parsed = Number.parseFloat(String(value ?? ""));
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(max, Math.max(min, parsed));
}

function deriveOrderWeightLbs(session) {
  const metadata = session?.metadata || {};
  const metadataWeight = readMetadataFloat(metadata, "shipping_weight_lbs");
  if (Number.isFinite(metadataWeight) && metadataWeight > 0) {
    return Number(metadataWeight.toFixed(2));
  }

  const shippableUnits = readMetadataInteger(metadata, "shippable_units");
  if (Number.isFinite(shippableUnits) && shippableUnits > 0) {
    return calculateShippableWeightLbs(shippableUnits);
  }

  const unitsTotal = readMetadataInteger(metadata, "units_total");
  if (Number.isFinite(unitsTotal) && unitsTotal > 0) {
    return calculateShippableWeightLbs(unitsTotal);
  }

  return Number(shippingBaseWeightLbs.toFixed(2));
}

function getOrderShippingAddress(session, options = {}) {
  const paymentIntentMetadata = options?.paymentIntentMetadata || {};
  const paymentIntentShipping =
    session?.payment_intent && typeof session.payment_intent === "object" ? session.payment_intent.shipping || {} : {};
  const paymentIntentAddress = paymentIntentShipping?.address || {};
  const shippingDetails = session?.shipping_details || {};
  const shippingAddress = shippingDetails?.address || {};
  const shippingNameBase = String(
    shippingDetails?.name || paymentIntentShipping?.name || session?.customer_details?.name || ""
  ).trim();
  const shippingNameOverride = String(paymentIntentMetadata.fulfillment_shipping_name_override || "").trim();
  const shippingLine1Base = String(shippingAddress?.line1 || paymentIntentAddress?.line1 || "").trim();
  const shippingLine1Override = String(paymentIntentMetadata.fulfillment_shipping_line1_override || "").trim();
  const shippingLine2Base = String(shippingAddress?.line2 || paymentIntentAddress?.line2 || "").trim();
  const shippingLine2Override = String(paymentIntentMetadata.fulfillment_shipping_line2_override || "").trim();
  const shippingCityBase = String(shippingAddress?.city || paymentIntentAddress?.city || "").trim();
  const shippingCityOverride = String(paymentIntentMetadata.fulfillment_shipping_city_override || "").trim();
  const shippingStateBase = String(shippingAddress?.state || paymentIntentAddress?.state || "").trim().toUpperCase();
  const shippingStateOverride = String(paymentIntentMetadata.fulfillment_shipping_state_override || "").trim().toUpperCase();
  const shippingPostalCodeBase = String(shippingAddress?.postal_code || paymentIntentAddress?.postal_code || "")
    .trim()
    .toUpperCase();
  const shippingPostalCodeOverride = String(
    paymentIntentMetadata.fulfillment_shipping_postal_override ||
      paymentIntentMetadata.fulfillment_shipping_postal_code_override ||
      ""
  )
    .trim()
    .toUpperCase();
  const shippingCountryBase = normalizeIsoCountry(shippingAddress?.country || paymentIntentAddress?.country, "US");
  const shippingCountryOverride = String(paymentIntentMetadata.fulfillment_shipping_country_override || "")
    .trim()
    .toUpperCase();
  const shippingEmail = String(session?.customer_details?.email || session?.customer_email || "").trim().toLowerCase();
  const shippingPhone = String(session?.customer_details?.phone || paymentIntentShipping?.phone || "").trim();

  return {
    name: shippingNameOverride || shippingNameBase,
    email: shippingEmail,
    phone: shippingPhone,
    line1: shippingLine1Override || shippingLine1Base,
    line2: shippingLine2Override || shippingLine2Base,
    city: shippingCityOverride || shippingCityBase,
    state: shippingStateOverride || shippingStateBase,
    postalCode: shippingPostalCodeOverride || shippingPostalCodeBase,
    country: shippingCountryOverride
      ? normalizeIsoCountry(shippingCountryOverride, shippingCountryBase || "US")
      : shippingCountryBase
  };
}

function buildAddressBookInputFromSession(session, options = {}) {
  return {
    orderId: String(session?.id || "").trim(),
    ...getOrderShippingAddress(session, options)
  };
}

async function saveOrderAddressToBook(session, options = {}) {
  const input = buildAddressBookInputFromSession(session, options);
  return upsertAddressBookEntry(input);
}

function buildUspsTrackingUrl(trackingNumber) {
  const value = String(trackingNumber || "").trim();
  if (!value) {
    return "";
  }
  return `${uspsTrackingBaseUrl}${encodeURIComponent(value)}`;
}

function normalizeCarrierName(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }
  const lower = raw.toLowerCase();
  if (lower.includes("usps") || lower.includes("postal")) {
    return "USPS";
  }
  if (lower.includes("ups")) {
    return "UPS";
  }
  if (lower.includes("fedex") || lower.includes("federal express")) {
    return "FedEx";
  }
  if (lower.includes("dhl")) {
    return "DHL";
  }
  return raw.slice(0, 80);
}

function normalizeTrackingNumber(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "");
}

function inferCarrierFromTrackingNumber(trackingNumber, fallbackCarrier = "") {
  const normalized = normalizeTrackingNumber(trackingNumber);
  if (!normalized) {
    return normalizeCarrierName(fallbackCarrier);
  }
  if (normalized.startsWith("1Z") && normalized.length >= 18) {
    return "UPS";
  }
  if (
    /^(92|93|94|95|96|97)\d{18,24}$/.test(normalized) ||
    /^420\d{5}9\d{20,24}$/.test(normalized) ||
    /^9\d{20,25}$/.test(normalized)
  ) {
    return "USPS";
  }
  if (/^\d{12,15}$/.test(normalized)) {
    return normalizeCarrierName(fallbackCarrier) || "FedEx";
  }
  return normalizeCarrierName(fallbackCarrier);
}

function buildCarrierTrackingUrl(carrier, trackingNumber) {
  const normalizedTrackingNumber = normalizeTrackingNumber(trackingNumber);
  if (!normalizedTrackingNumber) {
    return "";
  }
  const normalizedCarrier = inferCarrierFromTrackingNumber(normalizedTrackingNumber, carrier);
  if (normalizedCarrier === "USPS") {
    return buildUspsTrackingUrl(normalizedTrackingNumber);
  }
  if (normalizedCarrier === "UPS") {
    return `https://www.ups.com/track?loc=en_US&tracknum=${encodeURIComponent(normalizedTrackingNumber)}`;
  }
  if (normalizedCarrier === "FedEx") {
    return `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(normalizedTrackingNumber)}`;
  }
  if (normalizedCarrier === "DHL") {
    return `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${encodeURIComponent(normalizedTrackingNumber)}`;
  }
  return "";
}

function looksLikeTrackingNumber(value) {
  const normalized = normalizeTrackingNumber(value);
  if (!normalized || normalized.length < 10 || normalized.length > 34) {
    return false;
  }
  if (/^1Z[0-9A-Z]{16}$/.test(normalized)) {
    return true;
  }
  if (/^(?:92|93|94|95|96|97)\d{18,24}$/.test(normalized)) {
    return true;
  }
  if (/^420\d{5}9\d{20,24}$/.test(normalized)) {
    return true;
  }
  if (/^\d{12,30}$/.test(normalized)) {
    return true;
  }
  return /[0-9]/.test(normalized);
}

function extractTrackingNumberFromTrackingUrl(trackingUrl) {
  const source = String(trackingUrl || "").trim();
  if (!source) {
    return "";
  }

  try {
    const parsed = new URL(source);
    const keys = ["tLabels", "tracknum", "trknbr", "tracking-id", "trackingNumber", "trackingnumber", "tracking"];
    for (const key of keys) {
      const candidate = normalizeTrackingNumber(parsed.searchParams.get(key) || "");
      if (looksLikeTrackingNumber(candidate)) {
        return candidate;
      }
    }
  } catch {}

  const regexCandidates = [
    /1Z[0-9A-Z]{16}/i,
    /(?:92|93|94|95|96|97)\d{18,24}/,
    /420\d{5}9\d{20,24}/,
    /\d{12,30}/
  ];
  for (const expression of regexCandidates) {
    const match = source.match(expression);
    if (!match || !match[0]) {
      continue;
    }
    const candidate = normalizeTrackingNumber(match[0]);
    if (looksLikeTrackingNumber(candidate)) {
      return candidate;
    }
  }
  return "";
}

function resolveTrackingNumberForShipment({ trackingNumber, trackingUrl, labelId } = {}) {
  const direct = normalizeTrackingNumber(trackingNumber);
  if (looksLikeTrackingNumber(direct)) {
    return direct;
  }

  const fromUrl = extractTrackingNumberFromTrackingUrl(trackingUrl);
  if (looksLikeTrackingNumber(fromUrl)) {
    return fromUrl;
  }

  const fromLabel = normalizeTrackingNumber(labelId);
  if (looksLikeTrackingNumber(fromLabel)) {
    return fromLabel;
  }
  return "";
}

function parsePdfHexToUnicodeString(value) {
  const cleaned = String(value || "").replace(/[^0-9A-Fa-f]/g, "");
  if (!cleaned) {
    return "";
  }
  const evenLength = cleaned.length % 4 === 0 ? cleaned : cleaned.padEnd(cleaned.length + (4 - (cleaned.length % 4)), "0");
  let output = "";
  for (let index = 0; index + 3 < evenLength.length; index += 4) {
    const codeUnit = Number.parseInt(evenLength.slice(index, index + 4), 16);
    if (Number.isFinite(codeUnit)) {
      output += String.fromCharCode(codeUnit);
    }
  }
  return output;
}

function parsePdfCharacterMapFromCMapText(cmapText) {
  const source = String(cmapText || "");
  if (!source.includes("begincmap")) {
    return new Map();
  }

  const map = new Map();
  const lines = source.split(/\r?\n/);
  let mode = "";

  for (const rawLine of lines) {
    const line = String(rawLine || "").trim();
    if (!line) {
      continue;
    }
    if (/beginbfchar$/i.test(line)) {
      mode = "bfchar";
      continue;
    }
    if (/beginbfrange$/i.test(line)) {
      mode = "bfrange";
      continue;
    }
    if (/^endbfchar$/i.test(line) || /^endbfrange$/i.test(line)) {
      mode = "";
      continue;
    }

    if (mode === "bfchar") {
      const match = line.match(/^<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/);
      if (!match) {
        continue;
      }
      const sourceCode = Number.parseInt(match[1], 16);
      const mappedValue = parsePdfHexToUnicodeString(match[2]);
      if (Number.isFinite(sourceCode) && mappedValue) {
        map.set(sourceCode, mappedValue);
      }
      continue;
    }

    if (mode === "bfrange") {
      let match = line.match(/^<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/);
      if (match) {
        const sourceStart = Number.parseInt(match[1], 16);
        const sourceEnd = Number.parseInt(match[2], 16);
        const mappedStart = Number.parseInt(match[3], 16);
        if (
          Number.isFinite(sourceStart) &&
          Number.isFinite(sourceEnd) &&
          Number.isFinite(mappedStart) &&
          sourceEnd >= sourceStart &&
          sourceEnd - sourceStart <= 2048
        ) {
          for (let code = sourceStart; code <= sourceEnd; code += 1) {
            map.set(code, String.fromCharCode(mappedStart + (code - sourceStart)));
          }
        }
        continue;
      }

      match = line.match(/^<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*\[(.+)\]$/);
      if (!match) {
        continue;
      }
      const sourceStart = Number.parseInt(match[1], 16);
      const sourceEnd = Number.parseInt(match[2], 16);
      if (!Number.isFinite(sourceStart) || !Number.isFinite(sourceEnd) || sourceEnd < sourceStart || sourceEnd - sourceStart > 2048) {
        continue;
      }
      const mappedEntries = Array.from(match[3].matchAll(/<([0-9A-Fa-f]+)>/g)).map((entry) =>
        parsePdfHexToUnicodeString(entry[1])
      );
      for (let offset = 0; offset <= sourceEnd - sourceStart && offset < mappedEntries.length; offset += 1) {
        if (mappedEntries[offset]) {
          map.set(sourceStart + offset, mappedEntries[offset]);
        }
      }
    }
  }

  return map;
}

function decodePdfStreamTextCandidates(streamBuffer) {
  const decoded = [];
  const seen = new Set();
  const pushCandidate = (bufferValue) => {
    if (!Buffer.isBuffer(bufferValue) || bufferValue.length === 0) {
      return;
    }
    const text = bufferValue.toString("latin1");
    if (!text || seen.has(text)) {
      return;
    }
    seen.add(text);
    decoded.push(text);
  };

  pushCandidate(streamBuffer);
  try {
    pushCandidate(inflateSync(streamBuffer));
  } catch {}
  try {
    pushCandidate(inflateRawSync(streamBuffer));
  } catch {}
  return decoded;
}

function extractPdfCharacterMap(pdfBuffer) {
  if (!Buffer.isBuffer(pdfBuffer) || pdfBuffer.length === 0) {
    return new Map();
  }
  const source = pdfBuffer.toString("latin1");
  const collectedMaps = [];
  let cursor = 0;

  while (cursor < source.length) {
    const streamIndex = source.indexOf("stream", cursor);
    if (streamIndex < 0) {
      break;
    }
    let streamStart = streamIndex + 6;
    if (source.startsWith("\r\n", streamStart)) {
      streamStart += 2;
    } else if (source[streamStart] === "\n") {
      streamStart += 1;
    }
    const streamEnd = source.indexOf("endstream", streamStart);
    if (streamEnd < 0) {
      break;
    }
    let dataEnd = streamEnd;
    if (source[dataEnd - 1] === "\n") {
      dataEnd -= 1;
    }
    if (source[dataEnd - 1] === "\r") {
      dataEnd -= 1;
    }
    if (dataEnd > streamStart) {
      const streamBuffer = pdfBuffer.subarray(streamStart, dataEnd);
      for (const streamText of decodePdfStreamTextCandidates(streamBuffer)) {
        if (!streamText.includes("begincmap")) {
          continue;
        }
        const map = parsePdfCharacterMapFromCMapText(streamText);
        if (map.size > 0) {
          collectedMaps.push(map);
        }
      }
    }
    cursor = streamEnd + 9;
  }

  const merged = new Map();
  for (const map of collectedMaps) {
    for (const [sourceCode, mappedValue] of map.entries()) {
      if (!merged.has(sourceCode) && mappedValue) {
        merged.set(sourceCode, mappedValue);
      }
    }
  }
  return merged;
}

function decodePdfLiteralStringToken(token) {
  const source = String(token || "");
  let output = "";
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character !== "\\") {
      output += character;
      continue;
    }

    index += 1;
    if (index >= source.length) {
      break;
    }
    const escape = source[index];

    if (escape === "n") {
      output += "\n";
      continue;
    }
    if (escape === "r") {
      output += "\r";
      continue;
    }
    if (escape === "t") {
      output += "\t";
      continue;
    }
    if (escape === "b") {
      output += "\b";
      continue;
    }
    if (escape === "f") {
      output += "\f";
      continue;
    }
    if (escape === "(" || escape === ")" || escape === "\\") {
      output += escape;
      continue;
    }
    if (escape === "\r") {
      if (source[index + 1] === "\n") {
        index += 1;
      }
      continue;
    }
    if (escape === "\n") {
      continue;
    }
    if (/[0-7]/.test(escape)) {
      let octal = escape;
      for (let digits = 0; digits < 2; digits += 1) {
        const next = source[index + 1];
        if (!/[0-7]/.test(next || "")) {
          break;
        }
        octal += next;
        index += 1;
      }
      output += String.fromCharCode(Number.parseInt(octal, 8));
      continue;
    }

    output += escape;
  }
  return output;
}

function decodePdfTextWithCharacterMap(value, characterMap = null) {
  const source = String(value || "");
  if (!source) {
    return "";
  }

  const bytes = Buffer.from(source, "latin1");
  if (bytes.length === 0) {
    return "";
  }

  const hasCharacterMap = characterMap instanceof Map && characterMap.size > 0;
  if (bytes.length % 2 === 0) {
    let mappedCount = 0;
    let output = "";
    for (let index = 0; index < bytes.length; index += 2) {
      const code = (bytes[index] << 8) | bytes[index + 1];
      if (hasCharacterMap && characterMap.has(code)) {
        output += String(characterMap.get(code) || "");
        mappedCount += 1;
        continue;
      }
      if (bytes[index] === 0 && bytes[index + 1] >= 0x20 && bytes[index + 1] <= 0x7e) {
        output += String.fromCharCode(bytes[index + 1]);
        continue;
      }
      if (code === 0x09 || code === 0x0a || code === 0x0d) {
        output += String.fromCharCode(code);
        continue;
      }
      if (code >= 0x20 && code <= 0x7e) {
        output += String.fromCharCode(code);
      } else {
        output += " ";
      }
    }
    if (mappedCount > 0) {
      return output;
    }
  }

  if (hasCharacterMap) {
    let mappedCount = 0;
    let output = "";
    for (const byteValue of bytes) {
      if (characterMap.has(byteValue)) {
        output += String(characterMap.get(byteValue) || "");
        mappedCount += 1;
        continue;
      }
      if (byteValue === 0x09 || byteValue === 0x0a || byteValue === 0x0d) {
        output += String.fromCharCode(byteValue);
        continue;
      }
      if (byteValue >= 0x20 && byteValue <= 0x7e) {
        output += String.fromCharCode(byteValue);
      } else {
        output += " ";
      }
    }
    if (mappedCount > 0) {
      return output;
    }
  }

  return source;
}

function extractPdfLiteralStrings(sourceText, characterMap = null) {
  const source = String(sourceText || "");
  const tokens = [];
  let index = 0;

  while (index < source.length) {
    if (source[index] !== "(") {
      index += 1;
      continue;
    }
    index += 1;
    let depth = 1;
    let token = "";

    while (index < source.length && depth > 0) {
      const character = source[index];
      if (character === "\\") {
        const next = source[index + 1];
        if (next !== undefined) {
          token += character;
          token += next;
          index += 2;
          continue;
        }
        index += 1;
        continue;
      }
      if (character === "(") {
        depth += 1;
        token += character;
        index += 1;
        continue;
      }
      if (character === ")") {
        depth -= 1;
        if (depth === 0) {
          index += 1;
          break;
        }
        token += character;
        index += 1;
        continue;
      }
      token += character;
      index += 1;
    }

    const decoded = decodePdfTextWithCharacterMap(decodePdfLiteralStringToken(token), characterMap);
    if (decoded) {
      tokens.push(decoded);
    }
  }

  return tokens;
}

function decodePdfHexStringToken(token, characterMap = null) {
  const cleaned = String(token || "").replace(/[^0-9A-Fa-f]/g, "");
  if (!cleaned) {
    return "";
  }
  const evenLengthHex = cleaned.length % 2 === 0 ? cleaned : `${cleaned}0`;
  try {
    const decoded = Buffer.from(evenLengthHex, "hex").toString("latin1");
    return decodePdfTextWithCharacterMap(decoded, characterMap);
  } catch {
    return "";
  }
}

function extractPdfHexStrings(sourceText, characterMap = null) {
  const source = String(sourceText || "");
  const tokens = [];
  let index = 0;

  while (index < source.length) {
    if (source[index] !== "<" || source[index + 1] === "<") {
      index += 1;
      continue;
    }

    const endIndex = source.indexOf(">", index + 1);
    if (endIndex < 0) {
      break;
    }
    if (source[endIndex + 1] === ">") {
      index = endIndex + 2;
      continue;
    }

    const raw = source.slice(index + 1, endIndex);
    const decoded = decodePdfHexStringToken(raw, characterMap);
    if (decoded) {
      tokens.push(decoded);
    }
    index = endIndex + 1;
  }

  return tokens;
}

function normalizePdfExtractedText(value) {
  return String(value || "")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractPdfTextFromStreamBuffer(streamBuffer, characterMap = null) {
  const texts = [];
  for (const source of decodePdfStreamTextCandidates(streamBuffer)) {
    const pieces = [...extractPdfLiteralStrings(source, characterMap), ...extractPdfHexStrings(source, characterMap)];
    const extracted = normalizePdfExtractedText(pieces.join(" "));
    if (extracted) {
      texts.push(extracted);
    }
  }

  const seen = new Set();
  return texts.filter((entry) => {
    if (!entry || seen.has(entry)) {
      return false;
    }
    seen.add(entry);
    return true;
  });
}

function extractPdfTextSegments(pdfBuffer) {
  if (!Buffer.isBuffer(pdfBuffer) || pdfBuffer.length === 0) {
    return [];
  }
  const source = pdfBuffer.toString("latin1");
  const segments = [];
  const characterMap = extractPdfCharacterMap(pdfBuffer);
  let cursor = 0;

  while (cursor < source.length) {
    const streamIndex = source.indexOf("stream", cursor);
    if (streamIndex < 0) {
      break;
    }
    let streamStart = streamIndex + 6;
    if (source.startsWith("\r\n", streamStart)) {
      streamStart += 2;
    } else if (source[streamStart] === "\n") {
      streamStart += 1;
    }
    const streamEnd = source.indexOf("endstream", streamStart);
    if (streamEnd < 0) {
      break;
    }
    let dataEnd = streamEnd;
    if (source[dataEnd - 1] === "\n") {
      dataEnd -= 1;
    }
    if (source[dataEnd - 1] === "\r") {
      dataEnd -= 1;
    }

    if (dataEnd > streamStart) {
      const streamBuffer = pdfBuffer.subarray(streamStart, dataEnd);
      const streamTexts = extractPdfTextFromStreamBuffer(streamBuffer, characterMap);
      for (const text of streamTexts) {
        if (text.length >= 8) {
          segments.push(text);
        }
      }
    }
    cursor = streamEnd + 9;
  }

  if (segments.length === 0) {
    const fallbackPieces = [...extractPdfLiteralStrings(source, characterMap), ...extractPdfHexStrings(source, characterMap)];
    const fallbackText = normalizePdfExtractedText(fallbackPieces.join(" "));
    if (fallbackText) {
      segments.push(fallbackText);
    }
  }

  return segments;
}

function extractTrackingCandidatesFromText(text) {
  const source = String(text || "").toUpperCase();
  if (!source) {
    return [];
  }
  const candidates = new Map();

  const pushCandidate = (trackingValue, carrierHint, baseScore, index = 0) => {
    const normalizedTrackingNumber = normalizeTrackingNumber(trackingValue);
    if (normalizedTrackingNumber.length < 10) {
      return;
    }
    const inferredCarrier = inferCarrierFromTrackingNumber(normalizedTrackingNumber, carrierHint);
    const existing = candidates.get(normalizedTrackingNumber);
    const candidate = {
      trackingNumber: normalizedTrackingNumber,
      carrier: inferredCarrier,
      score: baseScore,
      index: Number.isFinite(index) ? index : 0
    };
    if (!existing || candidate.score > existing.score || (candidate.score === existing.score && candidate.index < existing.index)) {
      candidates.set(normalizedTrackingNumber, candidate);
    }
  };

  for (const match of source.matchAll(/\b1Z[0-9A-Z]{16}\b/g)) {
    pushCandidate(match[0], "UPS", 130, match.index || 0);
  }

  for (const match of source.matchAll(/\b420\d{5}(9\d{20,24})\b/g)) {
    pushCandidate(match[1], "USPS", 125, match.index || 0);
  }

  for (const match of source.matchAll(/\b(?:92|93|94|95|96|97)\d{18,24}\b/g)) {
    pushCandidate(match[0], "USPS", 120, match.index || 0);
  }

  const hasFedexHint = /\bFEDEX\b/.test(source);
  if (hasFedexHint) {
    for (const match of source.matchAll(/\b\d{12,15}\b/g)) {
      pushCandidate(match[0], "FedEx", 90, match.index || 0);
    }
  }

  const hasTrackingHint = /\bTRACK(?:ING)?\b/.test(source) || /\bTRK\b/.test(source);
  if (hasTrackingHint) {
    for (const match of source.matchAll(/\b\d{18,30}\b/g)) {
      pushCandidate(match[0], "", 65, match.index || 0);
    }
  }

  return Array.from(candidates.values()).sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }
    return left.index - right.index;
  });
}

function extractZipCodesFromText(text) {
  const matches = String(text || "").match(/\b\d{5}(?:-\d{4})?\b/g) || [];
  const seen = new Set();
  const zipCodes = [];
  for (const match of matches) {
    const zipCode = String(match || "").slice(0, 5);
    if (/^\d{5}$/.test(zipCode) && !seen.has(zipCode)) {
      seen.add(zipCode);
      zipCodes.push(zipCode);
    }
  }
  return zipCodes.slice(0, 8);
}

function extractShippingLabelsFromPdfBuffer(pdfBuffer) {
  const segments = extractPdfTextSegments(pdfBuffer);
  const labels = [];
  const seenTrackingNumbers = new Set();

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    const normalizedSegmentText = normalizePdfExtractedText(segment);
    const candidates = extractTrackingCandidatesFromText(segment);
    if (candidates.length === 0) {
      continue;
    }
    const candidatesByPosition = [...candidates].sort((left, right) => {
      if (left.index !== right.index) {
        return left.index - right.index;
      }
      return right.score - left.score;
    });
    for (let candidateOffset = 0; candidateOffset < candidatesByPosition.length; candidateOffset += 1) {
      const candidate = candidatesByPosition[candidateOffset];
      const trackingNumber = normalizeTrackingNumber(candidate.trackingNumber);
      if (!trackingNumber || seenTrackingNumbers.has(trackingNumber)) {
        continue;
      }
      seenTrackingNumbers.add(trackingNumber);
      const carrier = inferCarrierFromTrackingNumber(trackingNumber, candidate.carrier);
      const contextStart = Math.max(0, Math.floor(Number(candidate.index) || 0) - 220);
      const contextEnd = Math.min(segment.length, Math.floor(Number(candidate.index) || 0) + 260);
      const contextSource = segment.slice(contextStart, contextEnd);
      const normalizedContextText = normalizePdfExtractedText(contextSource) || normalizedSegmentText;
      labels.push({
        index: index * 100 + candidateOffset + 1,
        trackingNumber,
        carrier,
        trackingUrl: buildCarrierTrackingUrl(carrier, trackingNumber),
        zipCodes: extractZipCodesFromText(normalizedContextText),
        preview: normalizedContextText.slice(0, 220),
        matchText: normalizedContextText.slice(0, 3000)
      });
    }
  }

  if (labels.length > 0) {
    return labels;
  }

  const fallbackText = normalizePdfExtractedText(pdfBuffer.toString("latin1"));
  const fallbackCandidates = extractTrackingCandidatesFromText(fallbackText);
  for (let index = 0; index < fallbackCandidates.length; index += 1) {
    const candidate = fallbackCandidates[index];
    const trackingNumber = normalizeTrackingNumber(candidate.trackingNumber);
    if (!trackingNumber || seenTrackingNumbers.has(trackingNumber)) {
      continue;
    }
    seenTrackingNumbers.add(trackingNumber);
    const carrier = inferCarrierFromTrackingNumber(trackingNumber, candidate.carrier);
    labels.push({
      index: index + 1,
      trackingNumber,
      carrier,
      trackingUrl: buildCarrierTrackingUrl(carrier, trackingNumber),
      zipCodes: [],
      preview: "",
      matchText: ""
    });
  }

  return labels;
}

function buildUspsFromAddress() {
  const sourceName = uspsFromName || uspsFromCompany || "Shipper";
  const name = splitPersonName(sourceName, "Shipper");
  return {
    firstName: name.firstName,
    lastName: name.lastName,
    firm: uspsFromCompany || "",
    streetAddress: uspsFromAddress1,
    secondaryAddress: uspsFromAddress2 || "",
    city: uspsFromCity,
    state: uspsFromState,
    ZIPCode: buildZipCode(uspsFromZip5, uspsFromZip4)
  };
}

function buildUspsToAddress(session, options = {}) {
  const shipping = getOrderShippingAddress(session, options);
  const name = splitPersonName(shipping.name, "Customer");
  return {
    firstName: name.firstName,
    lastName: name.lastName,
    streetAddress: shipping.line1,
    secondaryAddress: shipping.line2 || "",
    city: shipping.city,
    state: shipping.state,
    ZIPCode: buildZipCode(shipping.postalCode)
  };
}

function buildUspsLabelRequestPayload(session, options = {}) {
  const defaultWeightLbs = deriveOrderWeightLbs(session);
  const weightLbs = parsePositiveNumber(options.weightLbs, defaultWeightLbs, { min: 0.1, max: 70 });
  const lengthInches = parsePositiveNumber(options.lengthInches, uspsDefaultLengthInches, { min: 1, max: 48 });
  const widthInches = parsePositiveNumber(options.widthInches, uspsDefaultWidthInches, { min: 1, max: 48 });
  const heightInches = parsePositiveNumber(options.heightInches, uspsDefaultHeightInches, { min: 1, max: 48 });
  const mailClass = String(options.mailClass || uspsDefaultMailClass)
    .trim()
    .toUpperCase();
  const rateIndicator = String(options.rateIndicator || uspsDefaultRateIndicator)
    .trim()
    .toUpperCase();
  const processingCategory = String(options.processingCategory || uspsDefaultProcessingCategory)
    .trim()
    .toUpperCase();
  const declaredValueDollars = parsePositiveNumber(
    options.declaredValueDollars,
    Math.max(1, Number(session?.amount_total || 0) / 100),
    { min: 0.01, max: 10000 }
  );
  const mailingDate = new Date().toISOString().slice(0, 10);

  return {
    imageInfo: {
      imageType: uspsDefaultImageType,
      labelType: uspsDefaultLabelType,
      receiptOption: "NONE",
      suppressPostage: false,
      suppressMailDate: false,
      returnLabel: false
    },
    toAddress: buildUspsToAddress(session, options),
    fromAddress: buildUspsFromAddress(),
    packageDescription: {
      mailClass,
      rateIndicator,
      weightUOM: "lb",
      weight: Number(weightLbs.toFixed(2)),
      dimensionsUOM: "in",
      length: Number(lengthInches.toFixed(2)),
      width: Number(widthInches.toFixed(2)),
      height: Number(heightInches.toFixed(2)),
      processingCategory,
      mailingDate,
      destinationEntryFacilityType: "NONE",
      packageOptions: {
        packageValue: Number(declaredValueDollars.toFixed(2))
      }
    }
  };
}

async function parseRemotePayload(response) {
  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
}

async function requestUspsAccessToken() {
  const response = await fetch(uspsOauthUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      client_id: uspsClientId,
      client_secret: uspsClientSecret,
      grant_type: "client_credentials"
    })
  });

  const payload = await parseRemotePayload(response);
  if (!response.ok) {
    const details =
      typeof payload === "string"
        ? payload
        : payload?.error_description || payload?.error || payload?.message || "OAuth request failed.";
    throw new Error(`USPS OAuth failed: ${String(details || "").slice(0, 400)}`);
  }

  const token = String(payload?.access_token || "").trim();
  if (!token) {
    throw new Error("USPS OAuth succeeded but returned no access token.");
  }

  return token;
}

async function requestUspsPaymentAuthorizationToken(accessToken) {
  const role = {
    CRID: uspsCrid,
    MID: uspsMid,
    manifestMID: uspsManifestMid,
    accountType: uspsAccountType,
    accountNumber: uspsAccountNumber
  };
  const response = await fetch(uspsPaymentAuthorizationUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      roles: [
        {
          roleName: "PAYER",
          ...role
        },
        {
          roleName: "LABEL_OWNER",
          ...role
        }
      ]
    })
  });

  const payload = await parseRemotePayload(response);
  if (!response.ok) {
    const details =
      typeof payload === "string"
        ? payload
        : payload?.error_description || payload?.error || payload?.message || "Payment auth failed.";
    throw new Error(`USPS payment authorization failed: ${String(details || "").slice(0, 400)}`);
  }

  const token = String(payload?.paymentAuthorizationToken || "").trim();
  if (!token) {
    throw new Error("USPS payment authorization succeeded but returned no token.");
  }
  return token;
}

function parseMultipartBoundary(contentType = "") {
  const boundaryMatch = String(contentType).match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  return String(boundaryMatch?.[1] || boundaryMatch?.[2] || "").trim();
}

function parseMultipartParts(buffer, contentType = "") {
  const boundary = parseMultipartBoundary(contentType);
  if (!boundary) {
    return [];
  }

  const delimiter = `--${boundary}`;
  const source = buffer.toString("latin1");
  const chunks = source.split(delimiter);
  const parts = [];

  for (const chunk of chunks) {
    if (!chunk || chunk === "--" || chunk === "--\r\n") {
      continue;
    }

    let segment = chunk;
    if (segment.startsWith("\r\n")) {
      segment = segment.slice(2);
    }
    if (segment.endsWith("\r\n")) {
      segment = segment.slice(0, -2);
    }
    if (segment.endsWith("--")) {
      segment = segment.slice(0, -2);
    }

    const headerEnd = segment.indexOf("\r\n\r\n");
    if (headerEnd < 0) {
      continue;
    }

    const rawHeaders = segment.slice(0, headerEnd);
    let bodyValue = segment.slice(headerEnd + 4);
    if (bodyValue.endsWith("\r\n")) {
      bodyValue = bodyValue.slice(0, -2);
    }

    const headers = {};
    for (const line of rawHeaders.split("\r\n")) {
      const index = line.indexOf(":");
      if (index <= 0) {
        continue;
      }
      const key = line.slice(0, index).trim().toLowerCase();
      const value = line.slice(index + 1).trim();
      headers[key] = value;
    }

    const disposition = String(headers["content-disposition"] || "");
    const nameMatch = disposition.match(/name="([^"]+)"/i);
    const filenameMatch = disposition.match(/filename="([^"]+)"/i);
    parts.push({
      name: String(nameMatch?.[1] || "").trim(),
      filename: String(filenameMatch?.[1] || "").trim(),
      contentType: String(headers["content-type"] || "").trim(),
      body: Buffer.from(bodyValue, "latin1")
    });
  }

  return parts;
}

async function saveUspsLabelToUploads(orderId, labelBuffer, contentType = "") {
  if (!labelBuffer || labelBuffer.length === 0) {
    return "";
  }
  const safeOrderId = String(orderId || "order")
    .replace(/[^a-z0-9_-]/gi, "-")
    .slice(0, 48);
  const lowerContentType = String(contentType || "").toLowerCase();
  const extension = lowerContentType.includes("zpl")
    ? ".zpl"
    : lowerContentType.includes("png")
      ? ".png"
      : ".pdf";
  const originalName = `${safeOrderId || "order"}-label${extension}`;
  if (cloudinaryUploadsEnabled) {
    try {
      const uploaded = await uploadBufferToCloudinary({
        buffer: labelBuffer,
        originalName,
        folder: normalizeCloudFolderPath(cloudinaryUploadFolder, "usps-labels")
      });
      if (uploaded.url) {
        return uploaded.url;
      }
    } catch (error) {
      const details = String(error?.message || "").trim();
      console.warn(`Could not upload USPS label to cloud storage: ${details || "Unknown Cloudinary error."}`);
    }
  }
  const filename = `${Date.now()}-${safeOrderId}-${randomUUID().slice(0, 8)}${extension}`;
  const filePath = path.join(uploadsDir, filename);
  await fs.mkdir(uploadsDir, { recursive: true });
  await fs.writeFile(filePath, labelBuffer);
  return `/uploads/${filename}`;
}

async function extractUspsLabelResult(orderId, responseBuffer, contentType = "") {
  const lowerContentType = String(contentType || "").toLowerCase();
  let metadata = {};
  let labelUrl = "";

  if (lowerContentType.includes("application/json")) {
    try {
      metadata = JSON.parse(responseBuffer.toString("utf8"));
    } catch {
      metadata = {};
    }
    const encoded = String(metadata?.labelImage || metadata?.labelImageBase64 || "").trim();
    if (encoded) {
      try {
        labelUrl = await saveUspsLabelToUploads(orderId, Buffer.from(encoded, "base64"), "application/pdf");
      } catch {
        labelUrl = "";
      }
    }
  } else if (lowerContentType.includes("multipart/")) {
    const parts = parseMultipartParts(responseBuffer, contentType);
    const metadataPart = parts.find((part) => part.name === "labelMetadata");
    if (metadataPart && metadataPart.body?.length > 0) {
      try {
        metadata = JSON.parse(metadataPart.body.toString("utf8"));
      } catch {
        metadata = {};
      }
    }
    const labelImagePart = parts.find((part) => part.name === "labelImage");
    if (labelImagePart && labelImagePart.body?.length > 0) {
      labelUrl = await saveUspsLabelToUploads(orderId, labelImagePart.body, labelImagePart.contentType);
    }
  } else {
    const plain = responseBuffer.toString("utf8");
    try {
      metadata = JSON.parse(plain);
    } catch {
      metadata = {};
    }
  }

  if (!labelUrl) {
    labelUrl = String(
      metadata?.labelUrl || metadata?.labelURL || metadata?.labelImageUrl || metadata?.labelImageURL || ""
    ).trim();
  }
  const trackingNumber = String(
    metadata?.trackingNumber || metadata?.trackingNo || metadata?.trackingID || metadata?.impb || ""
  ).trim();
  const trackingUrl = String(metadata?.trackingUrl || metadata?.trackingURL || "").trim() || buildUspsTrackingUrl(trackingNumber);
  const labelId = String(metadata?.labelId || metadata?.labelID || metadata?.evsLabelId || trackingNumber || "").trim();
  const postageValue = Number.parseFloat(
    String(metadata?.totalPostage || metadata?.postage || metadata?.postageAmount || "")
  );
  const postageCents = Number.isFinite(postageValue) ? Math.max(0, Math.round(postageValue * 100)) : null;

  return {
    labelId,
    labelUrl,
    trackingNumber,
    trackingUrl,
    postageCents,
    metadata
  };
}

async function createUspsLabelForSession(session, options = {}) {
  const missing = getUspsMissingConfigFields();
  if (missing.length > 0) {
    throw new Error(`USPS is not configured. Missing: ${missing.join(", ")}`);
  }

  const shipping = getOrderShippingAddress(session, {
    paymentIntentMetadata: options.paymentIntentMetadata || {}
  });
  if (!shipping.line1 || !shipping.city || !shipping.state || !shipping.postalCode) {
    throw new Error("Order has no complete shipping address.");
  }

  const accessToken = await requestUspsAccessToken();
  const paymentAuthorizationToken = await requestUspsPaymentAuthorizationToken(accessToken);
  const payload = buildUspsLabelRequestPayload(session, options);

  const response = await fetch(uspsLabelUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "X-Payment-Authorization-Token": paymentAuthorizationToken,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const responseBuffer = Buffer.from(await response.arrayBuffer());
  const contentType = String(response.headers.get("content-type") || "");
  if (!response.ok) {
    const details = responseBuffer.toString("utf8").slice(0, 600);
    throw new Error(`USPS label request failed (${response.status}): ${details || "Unknown USPS error."}`);
  }

  const label = await extractUspsLabelResult(session.id, responseBuffer, contentType);
  if (!label.labelUrl && !label.trackingNumber && !label.labelId) {
    throw new Error("USPS returned an unexpected label response.");
  }

  return {
    ...label,
    request: payload
  };
}

function extractSiteSettingsChanges(req) {
  const removeLogo = String(req.body?.removeLogo || "").toLowerCase() === "true";
  const removeBanner = String(req.body?.removeBanner || "").toLowerCase() === "true";
  const removeMembershipStandardImage =
    String(req.body?.removeMembershipStandardImage || "").toLowerCase() === "true";
  const removeMembershipPlusImage = String(req.body?.removeMembershipPlusImage || "").toLowerCase() === "true";
  const removeMembershipPremiumImage =
    String(req.body?.removeMembershipPremiumImage || "").toLowerCase() === "true";
  let logoImageUrl = uploadedImageUrl(req.files, "logoImage");
  let heroBannerImageUrl = uploadedImageUrl(req.files, "heroBannerImage");
  let membershipStandardImageUrl = uploadedImageUrl(req.files, "membershipStandardImage");
  let membershipPlusImageUrl = uploadedImageUrl(req.files, "membershipPlusImage");
  let membershipPremiumImageUrl = uploadedImageUrl(req.files, "membershipPremiumImage");
  if (removeLogo) {
    logoImageUrl = "";
  } else {
    const typedLogoUrl = String(req.body?.logoImageUrl || "").trim();
    if (typedLogoUrl) {
      logoImageUrl = typedLogoUrl;
    }
  }
  if (removeBanner) {
    heroBannerImageUrl = "";
  } else {
    const typedBannerUrl = String(req.body?.heroBannerImageUrl || "").trim();
    if (typedBannerUrl) {
      heroBannerImageUrl = typedBannerUrl;
    }
  }
  if (removeMembershipStandardImage) {
    membershipStandardImageUrl = "";
  } else {
    const typedStandardUrl = String(req.body?.membershipStandardImageUrl || "").trim();
    if (typedStandardUrl) {
      membershipStandardImageUrl = typedStandardUrl;
    }
  }
  if (removeMembershipPlusImage) {
    membershipPlusImageUrl = "";
  } else {
    const typedPlusUrl = String(req.body?.membershipPlusImageUrl || "").trim();
    if (typedPlusUrl) {
      membershipPlusImageUrl = typedPlusUrl;
    }
  }
  if (removeMembershipPremiumImage) {
    membershipPremiumImageUrl = "";
  } else {
    const typedPremiumUrl = String(req.body?.membershipPremiumImageUrl || "").trim();
    if (typedPremiumUrl) {
      membershipPremiumImageUrl = typedPremiumUrl;
    }
  }

  const fields = [
    "brandName",
    "brandMark",
    "heroBannerImageUrl",
    "pageTitle",
    "pageDescription",
    "heroEyebrow",
    "heroTitle",
    "heroCopy",
    "heroCtaLabel",
    "featuredTitle",
    "featuredCopy",
    "promise1Title",
    "promise1Copy",
    "promise2Title",
    "promise2Copy",
    "promise3Title",
    "promise3Copy",
    "footerLeft",
    "footerRight",
    "themeAccent",
    "themeAccentStrong",
    "themeBackground",
    "themeInk"
  ];

  const changes = {};
  for (const key of fields) {
    if (req.body?.[key] !== undefined) {
      changes[key] = req.body[key];
    }
  }
  if (logoImageUrl !== undefined) {
    changes.logoImageUrl = logoImageUrl;
  }
  if (heroBannerImageUrl !== undefined) {
    changes.heroBannerImageUrl = heroBannerImageUrl;
  }
  if (membershipStandardImageUrl !== undefined) {
    changes.membershipStandardImageUrl = membershipStandardImageUrl;
  }
  if (membershipPlusImageUrl !== undefined) {
    changes.membershipPlusImageUrl = membershipPlusImageUrl;
  }
  if (membershipPremiumImageUrl !== undefined) {
    changes.membershipPremiumImageUrl = membershipPremiumImageUrl;
  }

  return changes;
}

function normalizeGithubRepo(input) {
  const raw = String(input || "").trim();
  if (!raw) {
    return "";
  }

  let cleaned = raw
    .replace(/^https?:\/\/github\.com\//i, "")
    .replace(/^github\.com\//i, "")
    .replace(/\.git$/i, "")
    .replace(/^\/+|\/+$/g, "");

  if (!cleaned) {
    return "";
  }

  if (!cleaned.includes("/")) {
    cleaned = `${githubRepoOwner}/${cleaned}`;
  } else {
    const parts = cleaned.split("/").filter(Boolean);
    if (parts.length >= 2) {
      cleaned = `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
    }
  }

  return cleaned;
}

function buildAuthenticatedGithubRemoteUrl() {
  if (!githubPushToken) {
    return {
      remoteUrl: null,
      error: "GITHUB_PUSH_TOKEN is empty."
    };
  }

  const normalizedRepo =
    normalizeGithubRepo(githubRepoRaw) || "PublisHearts/PublisHearts.com";
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(normalizedRepo)) {
    return {
      remoteUrl: null,
      error: `GITHUB_REPO is invalid. Use owner/repo (current: "${githubRepoRaw || "(empty)"}").`
    };
  }

  const safeToken = encodeURIComponent(githubPushToken);
  return {
    remoteUrl: `https://x-access-token:${safeToken}@github.com/${normalizedRepo}.git`,
    repo: normalizedRepo,
    error: ""
  };
}

function maskSecrets(text) {
  let output = String(text || "");
  if (githubPushToken) {
    output = output.split(githubPushToken).join("***");
    output = output.split(encodeURIComponent(githubPushToken)).join("***");
  }
  if (uspsClientSecret) {
    output = output.split(uspsClientSecret).join("***");
    output = output.split(encodeURIComponent(uspsClientSecret)).join("***");
  }
  if (stripeSecretKey) {
    output = output.split(stripeSecretKey).join("***");
    output = output.split(encodeURIComponent(stripeSecretKey)).join("***");
  }
  return output;
}

async function runGit(args, { allowNonZero = false, cwd = process.cwd() } = {}) {
  try {
    const result = await execFileAsync("git", args, {
      cwd,
      windowsHide: true,
      maxBuffer: 1024 * 1024 * 8
    });
    return {
      code: 0,
      stdout: String(result.stdout || ""),
      stderr: String(result.stderr || "")
    };
  } catch (error) {
    const code = typeof error?.code === "number" ? error.code : 1;
    const stdout = String(error?.stdout || "");
    const stderr = String(error?.stderr || error?.message || "Git command failed.");
    if (allowNonZero) {
      return {
        code,
        stdout,
        stderr
      };
    }
    throw new Error(maskSecrets(stderr || stdout || "Git command failed."));
  }
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function syncPublishContent(targetRoot) {
  const sourceProducts = path.join(process.cwd(), "data/products.json");
  const sourceSettings = path.join(process.cwd(), "data/site-settings.json");
  const sourceAddressBook = path.join(process.cwd(), "data/address-book.json");
  const sourceOrderExclusions = path.join(process.cwd(), "data/order-exclusions.json");
  const sourcePremiumLibrary = path.join(process.cwd(), "data/premium-library.json");
  const sourceUploads = path.join(process.cwd(), "public/uploads");

  const targetProducts = path.join(targetRoot, "data/products.json");
  const targetSettings = path.join(targetRoot, "data/site-settings.json");
  const targetAddressBook = path.join(targetRoot, "data/address-book.json");
  const targetOrderExclusions = path.join(targetRoot, "data/order-exclusions.json");
  const targetPremiumLibrary = path.join(targetRoot, "data/premium-library.json");
  const targetUploads = path.join(targetRoot, "public/uploads");

  await fs.mkdir(path.dirname(targetProducts), { recursive: true });
  await fs.mkdir(path.dirname(targetSettings), { recursive: true });
  await fs.mkdir(path.dirname(targetAddressBook), { recursive: true });
  await fs.mkdir(path.dirname(targetOrderExclusions), { recursive: true });
  await fs.mkdir(path.dirname(targetPremiumLibrary), { recursive: true });
  await fs.copyFile(sourceProducts, targetProducts);
  await fs.copyFile(sourceSettings, targetSettings);
  if (await pathExists(sourceAddressBook)) {
    await fs.copyFile(sourceAddressBook, targetAddressBook);
  } else {
    await fs.writeFile(targetAddressBook, "[]\n", "utf8");
  }
  if (await pathExists(sourceOrderExclusions)) {
    await fs.copyFile(sourceOrderExclusions, targetOrderExclusions);
  } else {
    await fs.writeFile(targetOrderExclusions, "[]\n", "utf8");
  }
  if (await pathExists(sourcePremiumLibrary)) {
    await fs.copyFile(sourcePremiumLibrary, targetPremiumLibrary);
  } else {
    await fs.writeFile(targetPremiumLibrary, "[]\n", "utf8");
  }

  await fs.rm(targetUploads, { recursive: true, force: true });
  await fs.mkdir(path.dirname(targetUploads), { recursive: true });
  if (await pathExists(sourceUploads)) {
    await fs.cp(sourceUploads, targetUploads, { recursive: true });
  } else {
    await fs.mkdir(targetUploads, { recursive: true });
  }
}

async function publishAdminSnapshot(commitMessageInput = "") {
  const remoteConfig = buildAuthenticatedGithubRemoteUrl();
  if (!remoteConfig.remoteUrl) {
    throw new Error(`GitHub publish config error: ${remoteConfig.error}`);
  }
  const remoteUrl = remoteConfig.remoteUrl;

  const cleanMessage = String(commitMessageInput || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 120);
  const finalMessage =
    cleanMessage || `Admin content snapshot ${new Date().toISOString().replace(/\.\d{3}Z$/, "Z")}`;

  const localGitDir = path.join(process.cwd(), ".git");
  const hasLocalGit = await pathExists(localGitDir);

  if (hasLocalGit) {
    await runGit([
      "add",
      "-A",
      "--",
      "data/products.json",
      "data/site-settings.json",
      "data/address-book.json",
      "data/order-exclusions.json",
      "data/premium-library.json",
      "public/uploads"
    ]);

    const stagedCheck = await runGit(["diff", "--cached", "--quiet", "--"], { allowNonZero: true });
    if (stagedCheck.code === 0) {
      return {
        published: false,
        message: "No new changes to publish."
      };
    }

    await runGit([
      "-c",
      `user.name=${githubAuthorName}`,
      "-c",
      `user.email=${githubAuthorEmail}`,
      "commit",
      "-m",
      finalMessage
    ]);

    await runGit(["push", remoteUrl, `HEAD:${githubBranch}`]);
    const head = await runGit(["rev-parse", "--short", "HEAD"]);

    return {
      published: true,
      branch: githubBranch,
      commit: String(head.stdout || "").trim(),
      message: "Published to GitHub."
    };
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "publishearts-publish-"));
  try {
    await runGit(["init"], { cwd: tempDir });
    await runGit(["remote", "add", "origin", remoteUrl], { cwd: tempDir });
    await runGit(["fetch", "--depth", "1", "origin", githubBranch], { cwd: tempDir });
    await runGit(["checkout", "-B", githubBranch, "FETCH_HEAD"], { cwd: tempDir });

    await syncPublishContent(tempDir);
    await runGit(
      [
        "add",
        "-A",
        "--",
        "data/products.json",
        "data/site-settings.json",
        "data/address-book.json",
        "data/order-exclusions.json",
        "data/premium-library.json",
        "public/uploads"
      ],
      {
        cwd: tempDir
      }
    );

    const stagedCheck = await runGit(["diff", "--cached", "--quiet", "--"], {
      allowNonZero: true,
      cwd: tempDir
    });
    if (stagedCheck.code === 0) {
      return {
        published: false,
        message: "No new changes to publish."
      };
    }

    await runGit(
      [
        "-c",
        `user.name=${githubAuthorName}`,
        "-c",
        `user.email=${githubAuthorEmail}`,
        "commit",
        "-m",
        finalMessage
      ],
      { cwd: tempDir }
    );
    await runGit(["push", "origin", `HEAD:${githubBranch}`], { cwd: tempDir });
    const head = await runGit(["rev-parse", "--short", "HEAD"], { cwd: tempDir });

    return {
      published: true,
      branch: githubBranch,
      commit: String(head.stdout || "").trim(),
      message: "Published to GitHub."
    };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function processStripeCheckoutCompletedEvent(eventSession) {
  if (!stripe) {
    return;
  }

  const sessionId = String(eventSession?.id || "").trim();
  if (!sessionId) {
    console.warn("checkout.session.completed missing session id");
    return;
  }

  try {
    // Re-fetch the session from Stripe for complete customer/shipping fields.
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"]
    });
    const checkoutMode = String(session?.mode || "").trim().toLowerCase();
    if (checkoutMode === "subscription") {
      await processPremiumCheckoutCompletedSession(session);
      return;
    }

    const lineItemsResponse = await stripe.checkout.sessions.listLineItems(session.id, {
      limit: 100
    });
    let lineItems = lineItemsResponse.data.map((item) => ({
      name: item.description || "Book",
      quantity: item.quantity || 1,
      amountTotal: item.amount_total || 0
    }));
    if (lineItems.length === 0) {
      lineItems = parseLineItemsFromMetadata(session.metadata);
      if (lineItems.length > 0) {
        console.warn(`Using metadata fallback for line items on session ${session.id}`);
      }
    }
    const totals = computeOrderTotals(session, lineItems);
    const customerEmail = session.customer_details?.email || session.customer_email || "";
    const paymentIntentId = getPaymentIntentIdFromSession(session);
    const paymentIntentMetadata =
      session.payment_intent && typeof session.payment_intent === "object"
        ? session.payment_intent.metadata || {}
        : {};
    const shippingRequired = isSessionShippingRequired(session, { paymentIntentMetadata });
    const resolvedShipping = buildStripeStyleShippingDetails(
      getOrderShippingAddress(session, { paymentIntentMetadata })
    );
    const orderSource = getSessionOrderSource(session, { paymentIntentMetadata });
    const stateMatchResult = evaluateCheckoutStateMatch(session, {
      paymentIntentMetadata
    });
    const holdForStateMismatch = shippingRequired && !stateMatchResult.stateMatch;

    if (paymentIntentId) {
      await stripe.paymentIntents.update(paymentIntentId, {
        metadata: {
          ...paymentIntentMetadata,
          order_source: orderSource,
          fulfillment_shipping_required: String(shippingRequired),
          fulfillment_status:
            holdForStateMismatch
              ? "pending"
              : String(paymentIntentMetadata.fulfillment_status || "pending"),
          fulfillment_hold_reason:
            holdForStateMismatch
              ? "state_mismatch"
              : String(paymentIntentMetadata.fulfillment_hold_reason || ""),
          fulfillment_selected_state: stateMatchResult.selectedState || "",
          fulfillment_shipping_state: stateMatchResult.shippingState || stateMatchResult.shippingStateRaw || "",
          fulfillment_shipping_country: stateMatchResult.shippingCountry || "",
          fulfillment_state_match: String(stateMatchResult.stateMatch),
          fulfillment_state_mismatch_reason: holdForStateMismatch ? stateMatchResult.mismatchReason : ""
        }
      });
    }

    if (holdForStateMismatch) {
      console.warn(`State mismatch hold on order ${session.id}: ${buildStateMismatchErrorMessage(stateMatchResult)}`);
    }

    const notificationTasks = [];

    if (!customerEmail) {
      console.warn(`No customer email found for completed session ${session.id}`);
    } else {
      notificationTasks.push(
        sendCustomerReceipt({
          customerEmail,
          orderId: session.id,
          amountSubtotal: totals.amountSubtotal,
          amountShipping: totals.amountShipping,
          amountTax: totals.amountTax,
          amountTotal: totals.amountTotal,
          currency: session.currency || currency,
          lineItems,
          shippingDetails: resolvedShipping,
          shippingRequired,
          orderSource
        })
          .then(() => {
            console.log(`Customer receipt sent for session ${session.id} -> ${customerEmail}`);
          })
          .catch((error) => {
            console.error(`Failed to send customer receipt for session ${session.id}:`, error);
          })
      );
    }

    notificationTasks.push(
      sendOwnerNotification({
        orderId: session.id,
        amountSubtotal: totals.amountSubtotal,
        amountShipping: totals.amountShipping,
        amountTax: totals.amountTax,
        amountTotal: totals.amountTotal,
        currency: session.currency || currency,
        lineItems,
        customerDetails: {
          ...(session.customer_details || {}),
          name: session.customer_details?.name || resolvedShipping.name || "",
          email: customerEmail,
          phone: session.customer_details?.phone || resolvedShipping.phone || ""
        },
        shippingDetails: resolvedShipping,
        shippingRequired,
        orderSource
      })
        .then(() => {
          console.log(`Owner notification sent for session ${session.id}`);
        })
        .catch((error) => {
          console.error(`Failed to send owner notification for session ${session.id}:`, error);
        })
    );

    await Promise.allSettled(notificationTasks);
  } catch (error) {
    console.error("Failed to process checkout completion:", error);
  }
}

app.post("/api/webhooks/stripe", express.raw({ type: "application/json" }), (req, res) => {
  if (!stripe) {
    return res.status(500).send("Stripe not configured");
  }

  const signature = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return res.status(400).send("Missing webhook signature configuration");
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (error) {
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  // Respond immediately so upstream email/Stripe API slowness cannot cause webhook timeouts/retries.
  res.json({ received: true });

  if (event.type === "checkout.session.completed") {
    const eventSession = event.data.object;
    setImmediate(() => {
      void processStripeCheckoutCompletedEvent(eventSession);
    });
    return;
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const subscription = event.data.object;
    setImmediate(() => {
      void applyMemberSubscriptionFromStripeSubscription(subscription);
    });
    return;
  }

  if (event.type === "invoice.payment_succeeded" || event.type === "invoice.payment_failed") {
    const invoice = event.data.object;
    setImmediate(() => {
      void processPremiumInvoiceEvent(invoice);
    });
  }
});

app.use(express.json());
app.use("/uploads/premium-ebooks", (req, res) => {
  return res.status(403).json({
    error: "Premium ebook files are protected. Access them from your member library."
  });
});
app.use(express.static(publicDir));

if (path.resolve(uploadsDir) !== path.resolve(path.join(publicDir, "uploads"))) {
  app.use("/uploads", express.static(uploadsDir));
}
if (path.resolve(pdfEbookDir) !== path.resolve(publicDir)) {
  app.use("/pdfEbook", express.static(pdfEbookDir));
  app.use("/ebooks", express.static(pdfEbookDir));
}

app.get("/api/site-settings", async (req, res) => {
  const settings = await getSiteSettings();
  res.json({
    ...settings,
    shippingEstimate: getPublicShippingEstimateConfig()
  });
});

app.get("/api/products", async (req, res) => {
  const products = await listProducts();
  const visibleProducts = products.filter((product) => product.isVisible !== false);
  res.json(visibleProducts);
});

app.get("/api/stats/sold-copies", async (req, res) => {
  try {
    const stats = await getSoldCopiesStats();
    return res.json({
      soldCopies: stats.soldCopies,
      asOf: new Date(stats.updatedAtMs || Date.now()).toISOString()
    });
  } catch (error) {
    const details = typeof error?.message === "string" ? error.message : "";
    return res.status(503).json({
      error: details ? `Could not load sold copies: ${details}` : "Could not load sold copies right now."
    });
  }
});

app.get("/api/members/me", async (req, res) => {
  try {
    const member = await resolveMemberFromAuthHeader(req);
    if (!member) {
      return res.json({
        authenticated: false,
        member: null
      });
    }
    const monthKey = getCurrentMonthKey();
    const monthlyRandomPaperback = await getMonthlyRandomPaperbackForMember(member, monthKey);
    return res.json({
      authenticated: true,
      monthKey,
      member: {
        ...buildMemberClientPayload(member),
        monthlyRandomPaperback
      }
    });
  } catch (error) {
    return res.status(500).json({ error: "Could not load member profile." });
  }
});

app.get("/api/members/plans", async (req, res) => {
  try {
    const [plans, settings] = await Promise.all([getPublicMembershipPlansWithLivePricing(), getSiteSettings()]);
    const imageUrls = getMembershipPlanImageUrlsFromSettings(settings);
    return res.json({
      plans: plans.map((plan) => ({
        ...plan,
        imageUrl: String(imageUrls?.[String(plan?.key || "").trim()] || plan?.imageUrl || "").trim()
      }))
    });
  } catch (error) {
    const details = String(error?.message || "").trim();
    return res.status(500).json({
      error: details ? `Could not load membership plans: ${details}` : "Could not load membership plans right now."
    });
  }
});

app.post("/api/members/register", async (req, res) => {
  try {
    const displayName = cleanMemberDisplayName(req.body?.displayName);
    const email = normalizeCustomerEmail(req.body?.email);
    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }
    const password = cleanMemberPassword(req.body?.password);
    const passwordSalt = createMemberPasswordSaltHex();
    const passwordHash = hashMemberPassword(password, passwordSalt);
    const authToken = createMemberAuthToken();
    const authTokenHash = hashMemberAuthToken(authToken);
    const issuedAt = new Date().toISOString();
    const orderLookupPhone = normalizePhoneForLookup(req.body?.phone);

    const created = await createMember({
      displayName,
      email,
      orderLookupEmails: [email],
      orderLookupPhones: orderLookupPhone ? [orderLookupPhone] : [],
      passwordHash,
      passwordSalt,
      authTokenHash,
      authTokenIssuedAt: issuedAt
    });

    const updated = await updateMember(created.id, {
      lastLoginAt: issuedAt
    });

    return res.status(201).json({
      ok: true,
      token: authToken,
      member: buildMemberClientPayload(updated || created)
    });
  } catch (error) {
    if (error instanceof MemberValidationError) {
      return res.status(400).json({ error: error.message });
    }
    const details = String(error?.message || "").trim();
    if (details) {
      return res.status(400).json({ error: details });
    }
    return res.status(500).json({ error: "Could not create member account right now." });
  }
});

app.post("/api/members/login", async (req, res) => {
  try {
    const email = normalizeCustomerEmail(req.body?.email);
    const password = cleanMemberPassword(req.body?.password);
    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    const member = await findMemberByEmail(email);
    if (!member) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const candidateHash = hashMemberPassword(password, member.passwordSalt);
    if (!secureEquals(candidateHash, member.passwordHash)) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const authToken = createMemberAuthToken();
    const authTokenHash = hashMemberAuthToken(authToken);
    const issuedAt = new Date().toISOString();
    const updated = await updateMember(member.id, {
      authTokenHash,
      authTokenIssuedAt: issuedAt,
      lastLoginAt: issuedAt
    });

    return res.json({
      ok: true,
      token: authToken,
      member: buildMemberClientPayload(updated || member)
    });
  } catch (error) {
    if (error instanceof MemberValidationError) {
      return res.status(400).json({ error: error.message });
    }
    const details = String(error?.message || "").trim();
    if (details) {
      return res.status(400).json({ error: details });
    }
    return res.status(500).json({ error: "Could not sign in right now." });
  }
});

app.post("/api/members/logout", requireMember, async (req, res) => {
  try {
    const memberId = String(req.member?.id || "").trim();
    if (!memberId) {
      return res.status(401).json({ error: "Sign in required." });
    }
    await updateMember(memberId, {
      authTokenHash: "",
      authTokenIssuedAt: ""
    });
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: "Could not sign out right now." });
  }
});

async function collectMemberOrdersForContacts({ member, memberContactSets, limit = 120 }) {
  const memberStripeCustomerId = String(member?.stripeCustomerId || "").trim();
  const maxResults = Number.isFinite(limit) ? Math.min(300, Math.max(1, Number(limit) || 1)) : 120;
  const orders = [];
  const discoveredEmailSet = new Set();
  const discoveredPhoneSet = new Set();
  const collectDiscoveredContacts = ({ emails = [], phones = [] } = {}) => {
    for (const email of emails) {
      const normalizedEmail = safeNormalizeCustomerEmail(email);
      if (normalizedEmail) {
        discoveredEmailSet.add(normalizedEmail);
      }
    }
    for (const phone of normalizePhoneList(phones)) {
      discoveredPhoneSet.add(phone);
    }
  };

  const manualOrders = (await listManualOrders())
    .map((order) => normalizeManualOrderRecord(order))
    .filter(Boolean)
    .filter((order) => {
      const orderContactEmails = [
        safeNormalizeCustomerEmail(order?.customerEmail),
        safeNormalizeCustomerEmail(order?.shippingDetails?.email)
      ].filter(Boolean);
      const orderContactPhones = normalizePhoneList([
        order?.customerPhone,
        order?.shippingDetails?.phone
      ]);
      const matches = memberMatchesOrderContacts(memberContactSets, {
        emails: orderContactEmails,
        phones: orderContactPhones
      });
      if (matches) {
        collectDiscoveredContacts({
          emails: orderContactEmails,
          phones: orderContactPhones
        });
      }
      return matches;
    })
    .map((order) => {
      const receipt = buildManualOrderReceiptPayload(order);
      return {
        id: order.id,
        source: "manual",
        createdAt: order.createdAt,
        paymentStatus: order.paymentStatus,
        fulfillmentStatus: order.fulfillmentStatus,
        orderSource: order.orderSource,
        amountSubtotal: receipt.amountSubtotal,
        amountShipping: receipt.amountShipping,
        amountTax: receipt.amountTax,
        amountTotal: receipt.amountTotal,
        currency: receipt.currency,
        lineItems: receipt.lineItems,
        shippingRequired: receipt.shippingRequired,
        shippingDetails: receipt.shippingDetails,
        trackingNumber: String(order.shipmentTrackingNumber || "").trim(),
        trackingUrl: String(order.shipmentTrackingUrl || "").trim(),
        trackingCarrier: String(order.shipmentCarrier || "").trim(),
        trackingNote: String(order.shipmentNote || "").trim()
      };
    });
  orders.push(...manualOrders);

  if (stripe) {
    const seenSessionIds = new Set();
    const collectStripeOrder = (session) => {
      const sessionId = String(session?.id || "").trim();
      if (!sessionId || seenSessionIds.has(sessionId)) {
        return;
      }
      if (String(session?.mode || "").trim().toLowerCase() === "subscription") {
        return;
      }
      const sessionCustomerId =
        typeof session?.customer === "string"
          ? String(session.customer || "").trim()
          : String(session?.customer?.id || "").trim();
      const customerMatchesByStripeId = Boolean(memberStripeCustomerId && sessionCustomerId === memberStripeCustomerId);
      const paymentIntentMetadata =
        session?.payment_intent && typeof session.payment_intent === "object"
          ? session.payment_intent.metadata || {}
          : {};
      const shippingSource = getOrderShippingAddress(session, { paymentIntentMetadata });
      const orderContactEmails = [
        safeNormalizeCustomerEmail(session?.customer_details?.email || ""),
        safeNormalizeCustomerEmail(session?.customer_email || ""),
        safeNormalizeCustomerEmail(shippingSource?.email || "")
      ].filter(Boolean);
      const orderContactPhones = normalizePhoneList([
        session?.customer_details?.phone,
        shippingSource?.phone
      ]);
      const matchesByContact = memberMatchesOrderContacts(memberContactSets, {
        emails: orderContactEmails,
        phones: orderContactPhones
      });
      if (!customerMatchesByStripeId && !matchesByContact) {
        return;
      }
      collectDiscoveredContacts({
        emails: orderContactEmails,
        phones: orderContactPhones
      });
      seenSessionIds.add(sessionId);
      const parsedLineItems = parseLineItemsFromMetadata(session?.metadata || {});
      const totals = computeOrderTotals(session, parsedLineItems);
      const shippingRequired = isSessionShippingRequired(session, { paymentIntentMetadata });
      const shippingDetails = buildStripeStyleShippingDetails(shippingSource);
      const fulfillmentStatus = normalizeFulfillmentStatus(paymentIntentMetadata.fulfillment_status);
      orders.push({
        id: sessionId,
        source: "stripe",
        createdAt: Number(session?.created) > 0 ? new Date(Number(session.created) * 1000).toISOString() : "",
        paymentStatus: String(session?.payment_status || "unknown").trim().toLowerCase(),
        fulfillmentStatus,
        orderSource: getSessionOrderSource(session, { paymentIntentMetadata }),
        amountSubtotal: totals.amountSubtotal,
        amountShipping: totals.amountShipping,
        amountTax: totals.amountTax,
        amountTotal: totals.amountTotal,
        currency: totals.currency,
        lineItems: parsedLineItems,
        shippingRequired,
        shippingDetails,
        trackingNumber: String(paymentIntentMetadata.fulfillment_tracking_number || "").trim(),
        trackingUrl: String(paymentIntentMetadata.fulfillment_tracking_url || "").trim(),
        trackingCarrier: String(paymentIntentMetadata.fulfillment_carrier || "").trim(),
        trackingNote: String(paymentIntentMetadata.fulfillment_note || "").trim()
      });
    };

    const fetchStripeSessionPages = async (paramsBuilder) => {
      let hasMore = true;
      let startingAfter = "";
      let pagesFetched = 0;
      while (hasMore && pagesFetched < 8) {
        const listParams = {
          limit: 100,
          payment_status: "paid",
          expand: ["data.payment_intent"],
          ...paramsBuilder(),
          ...(startingAfter ? { starting_after: startingAfter } : {})
        };
        const response = await stripe.checkout.sessions.list(listParams);
        const sessions = Array.isArray(response?.data) ? response.data : [];
        sessions.forEach((session) => collectStripeOrder(session));
        hasMore = Boolean(response?.has_more);
        startingAfter = sessions.length > 0 ? String(sessions[sessions.length - 1]?.id || "").trim() : "";
        pagesFetched += 1;
        if (!startingAfter) {
          hasMore = false;
        }
        if (orders.length >= maxResults * 2) {
          break;
        }
      }
    };

    if (memberStripeCustomerId) {
      await fetchStripeSessionPages(() => ({ customer: memberStripeCustomerId }));
    } else {
      await fetchStripeSessionPages(() => ({}));
    }
  }

  orders.sort((left, right) => {
    const leftMs = Date.parse(String(left?.createdAt || ""));
    const rightMs = Date.parse(String(right?.createdAt || ""));
    return (Number.isFinite(rightMs) ? rightMs : 0) - (Number.isFinite(leftMs) ? leftMs : 0);
  });

  return {
    orders: orders.slice(0, maxResults),
    discoveredContacts: {
      emails: Array.from(discoveredEmailSet),
      phones: Array.from(discoveredPhoneSet)
    }
  };
}

app.put("/api/members/order-access", requireMember, async (req, res) => {
  try {
    const member = req.member;
    const emailInputsRaw = req.body?.emails;
    const phoneInputsRaw = req.body?.phones;

    const emailInputs = Array.isArray(emailInputsRaw)
      ? emailInputsRaw
      : typeof emailInputsRaw === "string"
        ? emailInputsRaw.split(/[\n,]/g)
        : [];
    const phoneInputs = Array.isArray(phoneInputsRaw)
      ? phoneInputsRaw
      : typeof phoneInputsRaw === "string"
        ? phoneInputsRaw.split(/[\n,]/g)
        : [];

    const normalizedEmails = [];
    const seenEmails = new Set();
    const pushEmail = (value) => {
      const email = safeNormalizeCustomerEmail(value);
      if (!email || seenEmails.has(email)) {
        return;
      }
      seenEmails.add(email);
      normalizedEmails.push(email);
    };
    pushEmail(member.email);
    for (const entry of emailInputs) {
      pushEmail(entry);
    }

    const normalizedPhones = normalizePhoneList(phoneInputs);

    const currentLookupEmails = getMemberOrderLookupEmails(member);
    const currentLookupPhones = getMemberOrderLookupPhones(member);
    const currentContactSets = {
      emails: new Set(currentLookupEmails),
      phones: new Set(currentLookupPhones)
    };
    const { discoveredContacts } = await collectMemberOrdersForContacts({
      member,
      memberContactSets: currentContactSets,
      limit: 300
    });
    const allowedEmailSet = new Set([
      ...currentLookupEmails,
      ...(Array.isArray(discoveredContacts?.emails) ? discoveredContacts.emails : []),
      safeNormalizeCustomerEmail(member.email)
    ]);
    const allowedPhoneSet = new Set([
      ...currentLookupPhones,
      ...(Array.isArray(discoveredContacts?.phones) ? discoveredContacts.phones : [])
    ]);
    const blockedEmails = normalizedEmails.filter((email) => !allowedEmailSet.has(email));
    const blockedPhones = normalizedPhones.filter((phone) => !allowedPhoneSet.has(phone));
    if (blockedEmails.length > 0 || blockedPhones.length > 0) {
      return res.status(403).json({
        error:
          "You can only add contacts already linked to your current order history. Place an order with that contact first, then refresh."
      });
    }

    const updated = await updateMember(member.id, {
      orderLookupEmails: normalizedEmails,
      orderLookupPhones: normalizedPhones
    });

    return res.json({
      ok: true,
      member: buildMemberClientPayload(updated || member)
    });
  } catch (error) {
    if (error instanceof MemberValidationError) {
      return res.status(400).json({ error: error.message });
    }
    const details = String(error?.message || "").trim();
    return res.status(500).json({
      error: details ? `Could not update order access contacts: ${details}` : "Could not update order access contacts."
    });
  }
});

app.post("/api/members/create-subscription-checkout", requireMember, async (req, res) => {
  if (!requireStripe(res)) {
    return;
  }

  const requestedTierKey = normalizeMembershipTierKey(req.body?.tier || "standard");
  const tierConfig = requirePremiumPriceConfigForTier(requestedTierKey, res);
  if (!tierConfig) {
    return;
  }

  try {
    const member = req.member;
    if (hasComplimentaryAdminPremiumAccess(member)) {
      return res.status(409).json({
        error: "Member Admin accounts include complimentary premium access and do not require a paid subscription."
      });
    }
    if (hasMemberBlockingPremiumSubscription(member)) {
      return res.status(409).json({
        error: "You already have an active premium subscription. Use Manage Billing to update or cancel your plan.",
        subscriptionStatus: String(member.subscriptionStatus || "active").trim().toLowerCase()
      });
    }

    const appUrl = getAppUrl(req);
    const customerId = await ensureStripeCustomerForMember(member);
    const blockingSubscription = await findBlockingStripeSubscriptionForCustomer(customerId);
    if (blockingSubscription) {
      try {
        await applyMemberSubscriptionFromStripeSubscription(blockingSubscription, {
          memberIdHint: member.id
        });
      } catch (syncError) {
        console.warn("Failed syncing blocking subscription before checkout:", syncError);
      }
      return res.status(409).json({
        error: "A premium subscription already exists for this account. Use Manage Billing instead of starting a second subscription."
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: tierConfig.priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${appUrl}/membership.html?join=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/membership.html?join=cancel`,
      client_reference_id: member.id,
      metadata: {
        member_id: member.id,
        membership_plan: "premium_books_club",
        membership_tier: tierConfig.key
      },
      subscription_data: {
        metadata: {
          member_id: member.id,
          membership_plan: "premium_books_club",
          membership_tier: tierConfig.key
        }
      }
    });
    return res.json({ url: session.url });
  } catch (error) {
    console.error("Failed creating premium subscription checkout:", error);
    if (isStripeMissingPriceError(error, tierConfig.priceId)) {
      const missingPriceId = extractMissingStripePriceIdFromErrorMessage(error?.message || "") || tierConfig.priceId;
      const envVarName = getMembershipTierPriceEnvVarName(tierConfig.key);
      return res.status(503).json({
        error: `Could not start premium checkout: ${tierConfig.label} tier price ID is invalid (${missingPriceId}). Update ${envVarName} in .env with a valid recurring Stripe price ID from the same account and mode as STRIPE_SECRET_KEY, then restart the server.`
      });
    }
    const details = String(error?.message || "").trim();
    return res.status(500).json({
      error: details ? `Could not start premium checkout: ${details}` : "Could not start premium checkout right now."
    });
  }
});

app.post("/api/members/confirm-subscription-checkout", requireMember, async (req, res) => {
  if (!requireStripe(res)) {
    return;
  }

  const sessionId = String(req.body?.sessionId || req.body?.session_id || req.query?.session_id || "").trim();
  if (!sessionId) {
    return res.status(400).json({ error: "Checkout session ID is required." });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"]
    });
    const checkoutMode = String(session?.mode || "").trim().toLowerCase();
    if (checkoutMode !== "subscription") {
      return res.status(400).json({ error: "Checkout session is not a membership subscription." });
    }
    if (!checkoutSessionBelongsToMember(session, req.member)) {
      return res.status(403).json({ error: "This checkout session does not belong to your member account." });
    }

    await processPremiumCheckoutCompletedSession(session);
    const refreshedMember = (await findMemberById(req.member.id)) || req.member;
    return res.json({
      ok: true,
      member: buildMemberClientPayload(refreshedMember)
    });
  } catch (error) {
    const details = String(error?.message || "").trim();
    if (details.toLowerCase().includes("no such checkout.session")) {
      return res.status(404).json({ error: "Checkout session was not found in this Stripe account." });
    }
    return res.status(500).json({
      error: details
        ? `Could not confirm premium checkout: ${details}`
        : "Could not confirm premium checkout right now."
    });
  }
});

app.post("/api/members/create-billing-portal", requireMember, async (req, res) => {
  if (!requireStripe(res)) {
    return;
  }

  try {
    const member = req.member;
    const customerId = await ensureStripeCustomerForMember(member);
    const appUrl = getAppUrl(req);
    const normalizedReturnPath = memberPortalReturnPath.startsWith("/") ? memberPortalReturnPath : "/membership.html";
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}${normalizedReturnPath}`
    });
    return res.json({ url: portalSession.url });
  } catch (error) {
    console.error("Failed creating Stripe billing portal session:", error);
    const details = String(error?.message || "").trim();
    return res.status(500).json({
      error: details ? `Could not open billing portal: ${details}` : "Could not open billing portal right now."
    });
  }
});

app.get("/api/members/premium/ebooks", requireActivePremiumMember, async (req, res) => {
  try {
    const member = req.member;
    const { tierConfig, monthKey, items, selectedIds, selectedIdSet, maxSelections } = await getMemberPremiumEbookAccessSnapshot(
      member
    );
    if (!tierConfig) {
      return res.status(403).json({ error: "Membership tier is missing for this account." });
    }
    const monthlyRandomPaperback = await getMonthlyRandomPaperbackForMember(member, monthKey);

    const availableEbooks = items.map((item) => {
      const hasAccess = tierConfig.allEbooksAccess || selectedIdSet.has(item.id);
      const isProtectedFile = isProtectedPremiumEbookFileUrl(item.fileUrl);
      const isPublicFile = isPublicPremiumEbookFileUrl(item.fileUrl);
      const token = hasAccess
        ? createPremiumEbookDownloadToken({
            memberId: member.id,
            ebookId: item.id,
            monthKey
          })
        : "";
      const secureFileUrl =
        hasAccess && isProtectedFile
          ? `/api/members/premium/ebooks/${encodeURIComponent(item.id)}/download?token=${encodeURIComponent(token)}`
          : "";
      const directFileUrl = hasAccess && isPublicFile ? String(item.fileUrl || "").trim() : "";
      return {
        ...item,
        hasAccess,
        fileUrl: secureFileUrl || directFileUrl,
        fileProtected: isProtectedFile,
        isBorrowed: selectedIdSet.has(item.id)
      };
    });

    return res.json({
      monthKey,
      tier: getMemberTierSummary(member),
      selectionLimit: tierConfig.allEbooksAccess ? null : maxSelections,
      allEbooksAccess: Boolean(tierConfig.allEbooksAccess),
      selectedEbookIds: selectedIds,
      monthlyRandomPaperback,
      includesStickers: true,
      availableEbooks
    });
  } catch (error) {
    if (error instanceof MemberEbookLoanValidationError) {
      return res.status(400).json({ error: error.message });
    }
    const details = String(error?.message || "").trim();
    return res.status(500).json({
      error: details ? `Could not load premium library: ${details}` : "Could not load premium library right now."
    });
  }
});

app.get("/api/members/premium/ebooks/:ebookId/download", requireActivePremiumMember, async (req, res) => {
  try {
    const member = req.member;
    const ebookId = String(req.params?.ebookId || "").trim();
    if (!ebookId) {
      return res.status(400).json({ error: "Ebook ID is required." });
    }

    const { tierConfig, monthKey, items, selectedIdSet } = await getMemberPremiumEbookAccessSnapshot(member);
    if (!tierConfig) {
      return res.status(403).json({ error: "Membership tier is missing for this account." });
    }

    const token = String(req.query?.token || "").trim();
    const tokenValid = verifyPremiumEbookDownloadToken({
      token,
      memberId: member.id,
      ebookId,
      monthKey
    });
    if (!tokenValid) {
      return res.status(403).json({ error: "This ebook link is invalid or expired. Refresh your library and try again." });
    }

    const item = items.find((entry) => String(entry?.id || "").trim() === ebookId);
    if (!item) {
      return res.status(404).json({ error: "Ebook not found." });
    }

    const hasAccess = tierConfig.allEbooksAccess || selectedIdSet.has(ebookId);
    if (!hasAccess) {
      return res.status(403).json({ error: "This ebook is not in your current monthly access set." });
    }

    const filePath = resolvePremiumEbookFilePath(item.fileUrl);
    if (!filePath) {
      return res.status(404).json({
        error: "This ebook file is not available for protected download yet. Upload it under /uploads/premium-ebooks/."
      });
    }

    await fs.access(filePath);
    const fileName = path.basename(filePath);
    res.setHeader("Cache-Control", "private, no-store, max-age=0");
    res.setHeader("Content-Disposition", `inline; filename=\"${fileName.replace(/"/g, "")}\"`);
    return res.sendFile(filePath);
  } catch (error) {
    const details = String(error?.message || "").trim();
    return res.status(500).json({
      error: details ? `Could not download premium ebook: ${details}` : "Could not download premium ebook right now."
    });
  }
});

app.post("/api/members/premium/ebooks/borrow", requireActivePremiumMember, async (req, res) => {
  try {
    const member = req.member;
    const tierConfig = getMemberTierConfig(member);
    if (!tierConfig) {
      return res.status(403).json({ error: "Membership tier is missing for this account." });
    }
    if (tierConfig.allEbooksAccess) {
      return res.status(409).json({
        error: "This tier already includes access to all ebooks. No monthly borrowing selection is required."
      });
    }

    const selectionLimit = Math.max(0, Number(tierConfig.ebookMonthlyLimit) || 0);
    if (selectionLimit <= 0) {
      return res.status(403).json({ error: "This membership tier has no ebook borrowing allowance." });
    }

    const requestedIdsRaw = Array.isArray(req.body?.ebookIds) ? req.body.ebookIds : [];
    const requestedIds = Array.from(
      new Set(
        requestedIdsRaw
          .map((entry) => String(entry || "").trim())
          .filter(Boolean)
      )
    );

    if (requestedIds.length === 0) {
      return res.status(400).json({ error: "Choose at least one ebook." });
    }
    if (requestedIds.length > selectionLimit) {
      return res.status(400).json({
        error: `This tier allows up to ${selectionLimit} ebook selections per month.`
      });
    }

    const libraryItems = await listPremiumLibraryItems();
    const validIds = new Set(libraryItems.map((item) => item.id));
    for (const ebookId of requestedIds) {
      if (!validIds.has(ebookId)) {
        return res.status(400).json({ error: `Ebook not found: ${ebookId}` });
      }
    }

    const monthKey = getCurrentMonthKey();
    const savedLoan = await upsertMemberEbookLoan({
      memberId: member.id,
      monthKey,
      ebookIds: requestedIds
    });

    return res.json({
      ok: true,
      monthKey,
      selectionLimit,
      selectedEbookIds: savedLoan.ebookIds
    });
  } catch (error) {
    if (error instanceof MemberEbookLoanValidationError) {
      return res.status(400).json({ error: error.message });
    }
    const details = String(error?.message || "").trim();
    return res.status(500).json({
      error: details ? `Could not save ebook picks: ${details}` : "Could not save ebook picks right now."
    });
  }
});

app.get("/api/members/orders", requireMember, async (req, res) => {
  try {
    const member = req.member;
    const memberLookupEmails = getMemberOrderLookupEmails(member);
    const memberLookupPhones = getMemberOrderLookupPhones(member);
    const memberContactSets = {
      emails: new Set(memberLookupEmails),
      phones: new Set(memberLookupPhones)
    };
    const parsedLimit = Number.parseInt(String(req.query?.limit ?? ""), 10);
    const limit = Number.isFinite(parsedLimit) ? Math.min(300, Math.max(1, parsedLimit)) : 120;
    const { orders } = await collectMemberOrdersForContacts({
      member,
      memberContactSets,
      limit
    });

    return res.json({
      orders,
      orderLookupEmails: memberLookupEmails,
      orderLookupPhones: memberLookupPhones
    });
  } catch (error) {
    const details = String(error?.message || "").trim();
    return res.status(500).json({
      error: details ? `Could not load order history: ${details}` : "Could not load order history right now."
    });
  }
});

app.get("/api/members/premium/community/posts", requireActivePremiumMember, async (req, res) => {
  try {
    const parsedLimit = Number.parseInt(String(req.query?.limit ?? ""), 10);
    const limit = Number.isFinite(parsedLimit) ? Math.min(300, Math.max(1, parsedLimit)) : 100;
    const posts = await listMemberCommunityPosts({ limit });
    return res.json(posts);
  } catch (error) {
    const details = String(error?.message || "").trim();
    return res.status(500).json({
      error: details ? `Could not load community posts: ${details}` : "Could not load community posts right now."
    });
  }
});

app.post("/api/members/premium/community/posts", requireActivePremiumMember, async (req, res) => {
  try {
    const body = String(req.body?.body || "").trim();
    const imageUrl = String(req.body?.imageUrl || "").trim();
    if (!body) {
      return res.status(400).json({ error: "Post text is required." });
    }
    const member = req.member;
    const created = await createMemberCommunityPost({
      memberId: member.id,
      authorName: member.displayName,
      body,
      imageUrl
    });
    return res.status(201).json(created);
  } catch (error) {
    if (error instanceof MemberCommunityValidationError) {
      return res.status(400).json({ error: error.message });
    }
    const details = String(error?.message || "").trim();
    return res.status(500).json({
      error: details ? `Could not publish post: ${details}` : "Could not publish post right now."
    });
  }
});

app.post("/api/admin/login", (req, res) => {
  if (!adminPassword) {
    return res.status(503).json({
      error: "Admin is not configured. Add ADMIN_PASSWORD to environment variables."
    });
  }

  const provided = String(req.body?.password || "");
  if (!secureEquals(provided, adminPassword)) {
    return res.status(401).json({ error: "Invalid password" });
  }

  return res.json({ ok: true });
});

app.get("/api/admin/members", requireAdmin, async (req, res) => {
  try {
    const members = await listMembers();
    const payload = members.map((member) => buildMemberAdminPayload(member)).filter(Boolean);
    return res.json(payload);
  } catch (error) {
    const details = String(error?.message || "").trim();
    return res.status(500).json({
      error: details ? `Could not load members: ${details}` : "Could not load members right now."
    });
  }
});

app.get("/api/admin/members/fulfillment", requireAdmin, async (req, res) => {
  try {
    const monthKey = cleanMonthKeyOrCurrent(req.query?.month);
    const [members, fulfillmentRecords] = await Promise.all([
      listMembers(),
      listMemberPerkFulfillmentRecords({ monthKey })
    ]);

    const fulfillmentByMemberId = new Map(
      fulfillmentRecords.map((record) => [String(record?.memberId || "").trim(), record])
    );

    const membershipOrder = new Map([
      ["premium", 1],
      ["plus", 2],
      ["standard", 3],
      ["none", 4]
    ]);

    const payloadMembers = members
      .map((member) =>
        buildAdminMemberFulfillmentPayload(
          member,
          monthKey,
          fulfillmentByMemberId.get(String(member?.id || "").trim())
        )
      )
      .filter(Boolean)
      .sort((left, right) => {
        const leftActive = left.premiumAccess === true ? 1 : 0;
        const rightActive = right.premiumAccess === true ? 1 : 0;
        if (leftActive !== rightActive) {
          return rightActive - leftActive;
        }
        const leftTier = membershipOrder.get(String(left.membershipTier || "none")) || 99;
        const rightTier = membershipOrder.get(String(right.membershipTier || "none")) || 99;
        if (leftTier !== rightTier) {
          return leftTier - rightTier;
        }
        return String(left.email || "")
          .trim()
          .toLowerCase()
          .localeCompare(String(right.email || "").trim().toLowerCase());
      });

    const summary = payloadMembers.reduce(
      (acc, member) => {
        if (member.premiumAccess) {
          acc.activeSubscribers += 1;
        }
        if (member.terminated) {
          acc.terminatedSubscribers += 1;
        }
        if (member.cancellationPending) {
          acc.cancelAtPeriodEnd += 1;
        }
        if (member.perks?.stickers?.owed) {
          acc.stickersOwed += 1;
        }
        if (member.perks?.stickers?.fulfilled) {
          acc.stickersSent += 1;
        }
        if (member.perks?.paperback?.owed) {
          acc.paperbackOwed += 1;
        }
        if (member.perks?.paperback?.fulfilled) {
          acc.paperbackSent += 1;
        }
        return acc;
      },
      {
        totalMembers: payloadMembers.length,
        activeSubscribers: 0,
        terminatedSubscribers: 0,
        cancelAtPeriodEnd: 0,
        stickersOwed: 0,
        stickersSent: 0,
        paperbackOwed: 0,
        paperbackSent: 0
      }
    );

    return res.json({
      monthKey,
      generatedAt: new Date().toISOString(),
      summary,
      members: payloadMembers
    });
  } catch (error) {
    if (error instanceof MemberPerkFulfillmentValidationError) {
      return res.status(400).json({ error: error.message });
    }
    const details = String(error?.message || "").trim();
    return res.status(500).json({
      error: details
        ? `Could not load member fulfillment data: ${details}`
        : "Could not load member fulfillment data right now."
    });
  }
});

app.put("/api/admin/members/fulfillment", requireAdmin, async (req, res) => {
  try {
    const memberId = String(req.body?.memberId || "").trim();
    const perk = normalizeAdminFulfillmentPerk(req.body?.perk);
    const monthKey = cleanMonthKeyOrCurrent(req.body?.monthKey || req.body?.month);
    const fulfilled = parseAdminBoolean(req.body?.fulfilled, false);
    const trackingNumber = String(req.body?.trackingNumber || "")
      .trim()
      .slice(0, 140);
    const note = String(req.body?.note || "")
      .trim()
      .slice(0, 500);

    if (!memberId) {
      return res.status(400).json({ error: "Member ID is required." });
    }
    if (!perk) {
      return res.status(400).json({ error: "Perk must be stickers or paperback." });
    }

    const member = await findMemberById(memberId);
    if (!member) {
      return res.status(404).json({ error: "Member not found." });
    }

    const eligibility = getMemberMonthlyPerkEligibility(member);
    if (fulfilled && perk === "stickers" && !eligibility.stickersEligible) {
      return res.status(400).json({ error: "This member is not currently eligible for monthly stickers." });
    }
    if (fulfilled && perk === "paperback" && !eligibility.paperbackEligible) {
      return res.status(400).json({ error: "This member is not currently eligible for monthly paperback." });
    }

    const currentRecord = await findMemberPerkFulfillmentRecord(member.id, monthKey);
    const nowIso = new Date().toISOString();
    let nextPatch = {};

    if (perk === "stickers") {
      nextPatch = fulfilled
        ? {
            stickersFulfilledAt: String(currentRecord?.stickersFulfilledAt || "").trim() || nowIso,
            stickersTrackingNumber:
              trackingNumber || String(currentRecord?.stickersTrackingNumber || "").trim(),
            stickersNote: note || String(currentRecord?.stickersNote || "").trim()
          }
        : {
            stickersFulfilledAt: "",
            stickersTrackingNumber: "",
            stickersNote: ""
          };
    } else if (perk === "paperback") {
      nextPatch = fulfilled
        ? {
            paperbackFulfilledAt: String(currentRecord?.paperbackFulfilledAt || "").trim() || nowIso,
            paperbackTrackingNumber:
              trackingNumber || String(currentRecord?.paperbackTrackingNumber || "").trim(),
            paperbackNote: note || String(currentRecord?.paperbackNote || "").trim()
          }
        : {
            paperbackFulfilledAt: "",
            paperbackTrackingNumber: "",
            paperbackNote: ""
          };
    }

    const updatedRecord = await upsertMemberPerkFulfillmentRecord({
      memberId: member.id,
      monthKey,
      ...nextPatch
    });

    return res.json({
      ok: true,
      monthKey,
      member: buildAdminMemberFulfillmentPayload(member, monthKey, updatedRecord),
      record: updatedRecord
    });
  } catch (error) {
    if (error instanceof MemberPerkFulfillmentValidationError || error instanceof MemberValidationError) {
      return res.status(400).json({ error: error.message });
    }
    const details = String(error?.message || "").trim();
    return res.status(500).json({
      error: details
        ? `Could not update member fulfillment: ${details}`
        : "Could not update member fulfillment right now."
    });
  }
});

app.post("/api/admin/members/promote", requireAdmin, async (req, res) => {
  try {
    const targetMemberId = String(req.body?.memberId || "").trim();
    const targetEmailRaw = String(req.body?.email || "").trim();
    const targetEmail = targetEmailRaw ? normalizeCustomerEmail(targetEmailRaw) : "";

    let member = null;
    if (targetMemberId) {
      member = await findMemberById(targetMemberId);
    } else if (targetEmail) {
      member = await findMemberByEmail(targetEmail);
    }

    if (!member) {
      return res.status(404).json({ error: "Member not found." });
    }

    const updated = await updateMember(member.id, { role: "admin" });
    return res.json({
      ok: true,
      member: buildMemberAdminPayload(updated || member)
    });
  } catch (error) {
    if (error instanceof MemberValidationError) {
      return res.status(400).json({ error: error.message });
    }
    const details = String(error?.message || "").trim();
    return res.status(details === "Enter a valid email address." ? 400 : 500).json({
      error: details ? `Could not promote member: ${details}` : "Could not promote member right now."
    });
  }
});

app.post("/api/admin/members/demote", requireAdmin, async (req, res) => {
  try {
    const targetMemberId = String(req.body?.memberId || "").trim();
    const targetEmailRaw = String(req.body?.email || "").trim();
    const targetEmail = targetEmailRaw ? normalizeCustomerEmail(targetEmailRaw) : "";

    let member = null;
    if (targetMemberId) {
      member = await findMemberById(targetMemberId);
    } else if (targetEmail) {
      member = await findMemberByEmail(targetEmail);
    }

    if (!member) {
      return res.status(404).json({ error: "Member not found." });
    }

    const updated = await updateMember(member.id, { role: "member" });
    return res.json({
      ok: true,
      member: buildMemberAdminPayload(updated || member)
    });
  } catch (error) {
    if (error instanceof MemberValidationError) {
      return res.status(400).json({ error: error.message });
    }
    const details = String(error?.message || "").trim();
    return res.status(details === "Enter a valid email address." ? 400 : 500).json({
      error: details ? `Could not demote member: ${details}` : "Could not demote member right now."
    });
  }
});

app.get("/api/admin/products", requireAdmin, async (req, res) => {
  const products = await listProducts();
  res.json(products);
});

app.get("/api/admin/premium-library", requireAdmin, async (req, res) => {
  try {
    const items = await listAllPremiumLibraryItems();
    return res.json(items);
  } catch (error) {
    const details = String(error?.message || "").trim();
    return res.status(500).json({
      error: details ? `Could not load premium library: ${details}` : "Could not load premium library right now."
    });
  }
});

app.get("/api/admin/site-settings", requireAdmin, async (req, res) => {
  const settings = await getSiteSettings();
  res.json({
    ...settings,
    shippingEstimate: getPublicShippingEstimateConfig()
  });
});

app.get("/api/admin/health", requireAdmin, async (req, res) => {
  const emailHealth = getEmailHealth();
  const uspsMissingConfig = getUspsMissingConfigFields();
  const deployCommitRaw = (
    process.env.RENDER_GIT_COMMIT ||
    process.env.GIT_COMMIT ||
    process.env.COMMIT_SHA ||
    ""
  ).trim();
  const deployCommit = deployCommitRaw ? deployCommitRaw.slice(0, 12) : "";
  const postgresRuntime = getPostgresJsonStoreRuntimeInfo();
  const postgresHealth = await checkPostgresJsonStoreConnection();

  res.json({
    status: "ok",
    stripeConfigured: Boolean(stripeSecretKey),
    terminalTapToPayEnabled: Boolean(stripeSecretKey && stripeTerminalLocationId),
    terminalLocationId: stripeTerminalLocationId,
    smtpConfigured: emailHealth.smtpConfigured,
    emailSendingEnabled: emailHealth.emailSendingEnabled,
    ownerNotificationEnabled: emailHealth.ownerNotificationEnabled,
    smtpHost: emailHealth.host || "",
    taxMode: getTaxRuntimeStatus(),
    stripeAutomaticTaxEnabled,
    manualSalesTaxRatePercent,
    manualSalesTaxApplyToShipping,
    manualNonTaxStates: Array.from(manualNonTaxStates),
    uspsConfigured: isUspsConfigured(),
    uspsMissingConfig,
    uspsApiBaseUrl,
    appUrl: (process.env.APP_URL || "").trim(),
    quickLinks: [
      { id: "stripe", label: "Stripe", href: adminStripeUrl },
      { id: "render", label: "Render", href: adminRenderUrl },
      { id: "facebook", label: "Facebook", href: adminFacebookUrl },
      { id: "amazon-kdp", label: "Amazon KDP", href: adminAmazonKdpUrl },
      { id: "shippo", label: "Shippo", href: adminShippoUrl }
    ],
    database: {
      enabled: postgresRuntime.enabled,
      envVar: postgresRuntime.databaseUrlSource || "",
      tlsDisabled: postgresRuntime.tlsDisabled,
      connected: postgresHealth.ok === true,
      error: postgresHealth.ok ? "" : postgresHealth.error || postgresRuntime.lastConnectionError || ""
    },
    uploads: {
      mode: cloudinaryUploadsEnabled ? "cloudinary" : "local",
      cloudinaryConfigured: cloudinaryUploadsEnabled,
      cloudName: cloudinaryCloudName || ""
    },
    deployCommit,
    deployCommitRaw
  });
});

app.get("/api/admin/orders", requireAdmin, async (req, res) => {
  const parsedLimit = Number.parseInt(String(req.query?.limit ?? ""), 10);
  const limit = Number.isFinite(parsedLimit) ? Math.min(500, Math.max(1, parsedLimit)) : 50;
  const paidOnly = String(req.query?.paidOnly ?? "true").trim().toLowerCase() !== "false";

  try {
    const excludedOrderIds = new Set(
      (await listOrderExclusions())
        .map((entry) => String(entry?.orderId || "").trim())
        .filter(Boolean)
    );
    const normalizedManualOrders = (await listManualOrders())
      .map((order) => normalizeManualOrderRecord(order))
      .filter(Boolean)
      .filter((order) => {
        if (paidOnly && order.paymentStatus !== "paid") {
          return false;
        }
        return true;
      });
    const manualExcludedCount = normalizedManualOrders.reduce((sum, order) => {
      const orderId = String(order?.id || "").trim();
      return orderId && excludedOrderIds.has(orderId) ? sum + 1 : sum;
    }, 0);
    const visibleSessions = [];
    let excludedVisibleCount = 0;
    if (stripe) {
      let hasMore = true;
      let startingAfter = "";

      while (hasMore && visibleSessions.length < limit) {
        const response = await stripe.checkout.sessions.list({
          limit: Math.min(100, limit - visibleSessions.length),
          expand: ["data.payment_intent"],
          ...(startingAfter ? { starting_after: startingAfter } : {})
        });
        const pageSessions = Array.isArray(response?.data) ? response.data : [];
        if (pageSessions.length === 0) {
          break;
        }

        for (const session of pageSessions) {
          if (paidOnly && session.payment_status !== "paid") {
            continue;
          }
          const sessionId = String(session?.id || "").trim();
          if (sessionId && excludedOrderIds.has(sessionId)) {
            excludedVisibleCount += 1;
            continue;
          }
          visibleSessions.push(session);
          if (visibleSessions.length >= limit) {
            break;
          }
        }

        const lastSession = pageSessions[pageSessions.length - 1];
        startingAfter = String(lastSession?.id || "").trim();
        hasMore = Boolean(response?.has_more) && Boolean(startingAfter);
      }
    }

    const normalizedStripeOrders = visibleSessions
      .map((session) => {
        const totals = computeOrderTotals(session, []);
        const metadata = session.metadata || {};
        const paymentIntentRef = session.payment_intent;
        const paymentIntentId =
          typeof paymentIntentRef === "string"
            ? paymentIntentRef
            : String(paymentIntentRef?.id || "").trim();
        const paymentIntentMetadata =
          paymentIntentRef && typeof paymentIntentRef === "object" && paymentIntentRef.metadata
            ? paymentIntentRef.metadata
            : {};
        const shippingRequired = isSessionShippingRequired(session, { paymentIntentMetadata });
        const orderSource = getSessionOrderSource(session, { paymentIntentMetadata });
        const fulfillmentStatus = normalizeFulfillmentStatus(paymentIntentMetadata.fulfillment_status);
        const shippedAt = readMetadataInteger(paymentIntentMetadata, "fulfillment_shipped_at") || 0;
        const packagedAt = readMetadataInteger(paymentIntentMetadata, "fulfillment_packaged_at") || shippedAt || 0;
        const packageWeightValueRaw = normalizePackageWeightValue(
          paymentIntentMetadata.fulfillment_package_weight_value
        );
        const packageWeightValue = packageWeightValueRaw === null ? "" : packageWeightValueRaw;
        const shipmentCarrier = String(paymentIntentMetadata.fulfillment_carrier || "").trim();
        const shipmentTrackingNumber = String(paymentIntentMetadata.fulfillment_tracking_number || "").trim();
        const shipmentTrackingUrl = String(paymentIntentMetadata.fulfillment_tracking_url || "").trim();
        const shipmentNote = String(paymentIntentMetadata.fulfillment_note || "").trim();
        const shipmentLabelId = String(paymentIntentMetadata.fulfillment_label_id || "").trim();
        const shipmentLabelUrl = String(paymentIntentMetadata.fulfillment_label_url || "").trim();
        const shipmentPostageCentsRaw = readMetadataInteger(paymentIntentMetadata, "fulfillment_postage_cents");
        const shipmentPostageCents =
          Number.isFinite(shipmentPostageCentsRaw) && shipmentPostageCentsRaw >= 0 ? shipmentPostageCentsRaw : 0;
        const stateMatchResult = evaluateCheckoutStateMatch(session, {
          paymentIntentMetadata
        });
        const customerState = stateMatchResult.selectedState;
        const shippingState = stateMatchResult.shippingState || stateMatchResult.shippingStateRaw || "";
        const shippingCountry = stateMatchResult.shippingCountry;
        const shippingStateMatchesCustomerState = stateMatchResult.stateMatch;
        const shippingStateMismatchReason = stateMatchResult.stateMatch ? "" : stateMatchResult.mismatchReason;
        const explicitHoldReason = String(paymentIntentMetadata.fulfillment_hold_reason || "").trim();
        const fulfillmentHoldReason = shippingRequired
          ? explicitHoldReason || (shippingStateMatchesCustomerState ? "" : "state_mismatch")
          : "";
        const customerTaxExemptByState =
          String(metadata.customer_tax_exempt_by_state || "")
            .trim()
            .toLowerCase() === "true";
        const cartEntries = parseCartSummaryEntries(metadata).filter((entry) => {
          const name = String(entry.name || "").trim().toLowerCase();
          return name !== "shipping" && name !== "sales tax" && name !== "tax";
        });
        const unitsFromMetadata = readMetadataInteger(metadata, "units_total");
        const unitsTotal =
          Number.isFinite(unitsFromMetadata) && unitsFromMetadata > 0
            ? unitsFromMetadata
            : cartEntries.reduce((sum, entry) => sum + (entry.quantity || 0), 0);
        const bookUnitsFromMetadata = readMetadataInteger(metadata, "book_units_total");
        const bookUnitsTotal =
          Number.isFinite(bookUnitsFromMetadata) && bookUnitsFromMetadata >= 0
            ? bookUnitsFromMetadata
            : calculateBookUnitsFromCartEntries(cartEntries);
        const shippableUnitsFromMetadata = readMetadataInteger(metadata, "shippable_units");
        const shippableUnits =
          !shippingRequired
            ? 0
            : Number.isFinite(shippableUnitsFromMetadata) && shippableUnitsFromMetadata > 0
              ? shippableUnitsFromMetadata
              : unitsTotal;
        const shippingWeightFromMetadata = readMetadataFloat(metadata, "shipping_weight_lbs");
        const shippingWeightLbs =
          !shippingRequired
            ? 0
            : Number.isFinite(shippingWeightFromMetadata) && shippingWeightFromMetadata > 0
              ? Number(shippingWeightFromMetadata.toFixed(2))
              : calculateShippableWeightLbs(Math.max(1, shippableUnits));
        const shippingBillableWeightFromMetadata = readMetadataFloat(metadata, "shipping_billable_weight_lbs");
        const shippingBillableWeightLbs =
          !shippingRequired
            ? 0
            : Number.isFinite(shippingBillableWeightFromMetadata) && shippingBillableWeightFromMetadata > 0
              ? Number(shippingBillableWeightFromMetadata.toFixed(2))
              : getBillableShippingWeightLbs(shippingWeightLbs);
        const shippingZoneFromMetadata = readMetadataInteger(metadata, "shipping_zone");
        const shippingZone = shippingRequired
          ? normalizeShippingZone(
              shippingZoneFromMetadata,
              getShippingZoneForState(customerState)
            )
          : 0;

        const shipping = getOrderShippingAddress(session, {
          paymentIntentMetadata
        });
        const customerEmail = String(session.customer_details?.email || session.customer_email || "").trim();
        const customerName = String(
          session.customer_details?.name || shipping.name || "Unknown customer"
        ).trim();
        const customerPhone = String(session.customer_details?.phone || "").trim();
        const shippingName = shippingRequired ? String(shipping.name || customerName).trim() : "";
        const shippingAddressLine1 = shippingRequired ? String(shipping.line1 || "").trim() : "";
        const shippingAddressLine2 = shippingRequired ? String(shipping.line2 || "").trim() : "";
        const shippingCity = shippingRequired ? String(shipping.city || "").trim() : "";
        const shippingPostalCode = shippingRequired ? String(shipping.postalCode || "").trim() : "";
        const shippingAddress = shippingRequired
          ? [shippingAddressLine1, shippingAddressLine2, shippingCity, shipping.state, shippingPostalCode, shipping.country]
              .map((part) => String(part || "").trim())
              .filter(Boolean)
              .join(", ")
          : "";
        const createdAt = Number(session.created) || 0;
        const customerKey = customerEmail ? customerEmail.toLowerCase() : `guest:${session.id}`;

        return {
          id: session.id,
          createdAt,
          createdAtIso: createdAt > 0 ? new Date(createdAt * 1000).toISOString() : "",
          paymentStatus: session.payment_status || "unknown",
          currency: session.currency || currency,
          amountSubtotal: totals.amountSubtotal,
          amountShipping: totals.amountShipping,
          amountTax: totals.amountTax,
          amountTotal: totals.amountTotal,
          unitsTotal,
          bookUnitsTotal,
          shippableUnits,
          shippingWeightLbs,
          shippingBillableWeightLbs,
          shippingZone,
          items: cartEntries,
          fulfillmentStatus,
          shippedAt,
          shippedAtIso: shippedAt > 0 ? new Date(shippedAt * 1000).toISOString() : "",
          packagedAt,
          packagedAtIso: packagedAt > 0 ? new Date(packagedAt * 1000).toISOString() : "",
          packageWeightValue,
          shipmentCarrier,
          shipmentTrackingNumber,
          shipmentTrackingUrl,
          shipmentNote,
          shipmentLabelId,
          shipmentLabelUrl,
          shipmentPostageCents,
          fulfillmentHoldReason,
          shippingRequired,
          orderSource,
          customerState,
          shippingState,
          shippingCountry,
          shippingStateMatchesCustomerState,
          shippingStateMismatchReason,
          customerTaxExemptByState,
          paymentIntentId,
          customerName,
          customerEmail,
          customerPhone,
          shippingName,
          shippingAddressLine1,
          shippingAddressLine2,
          shippingCity,
          shippingAddress,
          shippingPostalCode,
          customerKey
        };
      })
      .sort((left, right) => right.createdAt - left.createdAt);
    const normalizedOrders = [...normalizedStripeOrders, ...normalizedManualOrders]
      .filter((order) => {
        const orderId = String(order?.id || "").trim();
        return !(orderId && excludedOrderIds.has(orderId));
      })
      .sort((left, right) => right.createdAt - left.createdAt)
      .slice(0, limit);

    const customerMap = new Map();
    for (const order of normalizedOrders) {
      const existing = customerMap.get(order.customerKey) || {
        key: order.customerKey,
        email: order.customerEmail,
        name: order.customerName,
        ordersCount: 0,
        unitsTotal: 0,
        amountTotal: 0,
        lastOrderAt: 0,
        orderIds: []
      };
      existing.ordersCount += 1;
      existing.unitsTotal += Number(order.unitsTotal) || 0;
      existing.amountTotal += Number(order.amountTotal) || 0;
      existing.lastOrderAt = Math.max(existing.lastOrderAt, order.createdAt);
      if (!existing.name && order.customerName) {
        existing.name = order.customerName;
      }
      existing.orderIds.push(order.id);
      customerMap.set(order.customerKey, existing);
    }

    const orders = normalizedOrders.map((order) => {
      const customer = customerMap.get(order.customerKey);
      const pastOrderIds = (customer?.orderIds || []).filter((id) => id !== order.id).slice(0, 10);
      return {
        id: order.id,
        createdAt: order.createdAt,
        createdAtIso: order.createdAtIso,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod || "",
        currency: order.currency,
        amountSubtotal: order.amountSubtotal,
        amountShipping: order.amountShipping,
        amountTax: order.amountTax,
        amountTotal: order.amountTotal,
        unitsTotal: order.unitsTotal,
        bookUnitsTotal: order.bookUnitsTotal,
        shippableUnits: order.shippableUnits,
        shippingWeightLbs: order.shippingWeightLbs,
        shippingBillableWeightLbs: order.shippingBillableWeightLbs,
        shippingZone: order.shippingZone,
        items: order.items,
        fulfillmentStatus: order.fulfillmentStatus,
        shippedAt: order.shippedAt,
        shippedAtIso: order.shippedAtIso,
        packagedAt: order.packagedAt,
        packagedAtIso: order.packagedAtIso,
        packageWeightValue: order.packageWeightValue,
        shipmentCarrier: order.shipmentCarrier,
        shipmentTrackingNumber: order.shipmentTrackingNumber,
        shipmentTrackingUrl: order.shipmentTrackingUrl,
        shipmentNote: order.shipmentNote,
        shipmentLabelId: order.shipmentLabelId,
        shipmentLabelUrl: order.shipmentLabelUrl,
        shipmentPostageCents: order.shipmentPostageCents,
        fulfillmentHoldReason: order.fulfillmentHoldReason,
        shippingRequired: order.shippingRequired !== false,
        customerState: order.customerState,
        shippingState: order.shippingState,
        shippingCountry: order.shippingCountry,
        shippingStateMatchesCustomerState: order.shippingStateMatchesCustomerState,
        shippingStateMismatchReason: order.shippingStateMismatchReason,
        customerTaxExemptByState: order.customerTaxExemptByState,
        paymentIntentId: order.paymentIntentId,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
        shippingName: order.shippingName,
        shippingAddressLine1: order.shippingAddressLine1,
        shippingAddressLine2: order.shippingAddressLine2,
        shippingCity: order.shippingCity,
        shippingAddress: order.shippingAddress,
        shippingPostalCode: order.shippingPostalCode,
        cashReceivedCents: Number(order.cashReceivedCents) || 0,
        cashChangeDueCents: Number(order.cashChangeDueCents) || 0,
        customerOrdersCount: customer?.ordersCount || 1,
        customerUnitsTotal: customer?.unitsTotal || order.unitsTotal,
        customerPastOrderIds: pastOrderIds
      };
    });

    const customers = Array.from(customerMap.values())
      .sort((left, right) => right.lastOrderAt - left.lastOrderAt)
      .map((customer) => ({
        email: customer.email,
        name: customer.name,
        ordersCount: customer.ordersCount,
        unitsTotal: customer.unitsTotal,
        amountTotal: customer.amountTotal,
        lastOrderAt: customer.lastOrderAt,
        lastOrderAtIso: customer.lastOrderAt ? new Date(customer.lastOrderAt * 1000).toISOString() : "",
        orderIds: customer.orderIds
      }));

    return res.json({
      fetchedAt: new Date().toISOString(),
      paidOnly,
      count: orders.length,
      excludedCount: excludedVisibleCount + manualExcludedCount,
      orders,
      customers
    });
  } catch (error) {
    const details = typeof error?.message === "string" ? error.message : "";
    return res.status(500).json({
      error: details ? `Could not load orders: ${details}` : "Could not load orders right now."
    });
  }
});

app.post("/api/admin/orders/:id/exclude", requireAdmin, async (req, res) => {
  const orderId = String(req.params.id || "").trim();
  if (!orderId) {
    return res.status(400).json({ error: "Order ID is required." });
  }

  try {
    const reason = String(req.body?.reason || "refunded").trim() || "refunded";
    const entry = await excludeOrder(orderId, { reason });
    invalidateSoldCopiesCache();
    return res.json({
      ok: true,
      entry
    });
  } catch (error) {
    if (error instanceof OrderExclusionValidationError) {
      return res.status(400).json({ error: error.message });
    }
    const details = typeof error?.message === "string" ? error.message : "";
    return res.status(500).json({
      error: details ? `Could not remove order: ${details}` : "Could not remove order right now."
    });
  }
});

app.delete("/api/admin/orders/:id/exclude", requireAdmin, async (req, res) => {
  const orderId = String(req.params.id || "").trim();
  if (!orderId) {
    return res.status(400).json({ error: "Order ID is required." });
  }

  try {
    const restored = await restoreExcludedOrder(orderId);
    if (!restored) {
      return res.status(404).json({ error: "Order was not excluded." });
    }
    invalidateSoldCopiesCache();
    return res.json({
      ok: true,
      restored: true
    });
  } catch (error) {
    if (error instanceof OrderExclusionValidationError) {
      return res.status(400).json({ error: error.message });
    }
    const details = typeof error?.message === "string" ? error.message : "";
    return res.status(500).json({
      error: details ? `Could not restore order: ${details}` : "Could not restore order right now."
    });
  }
});

app.get("/api/admin/address-book", requireAdmin, async (req, res) => {
  const parsedLimit = Number.parseInt(String(req.query?.limit ?? ""), 10);
  const limit = Number.isFinite(parsedLimit) ? Math.min(500, Math.max(1, parsedLimit)) : 200;
  try {
    const entries = await listAddressBookEntries(limit);
    return res.json({
      count: entries.length,
      entries
    });
  } catch (error) {
    const details = typeof error?.message === "string" ? error.message : "";
    return res.status(500).json({
      error: details ? `Could not load address book: ${details}` : "Could not load address book right now."
    });
  }
});

app.post("/api/admin/orders/:id/edit-shipping-address", requireAdmin, async (req, res) => {
  const orderId = String(req.params.id || "").trim();
  if (!orderId) {
    return res.status(400).json({ error: "Order ID is required." });
  }

  try {
    const manualOrder = await findNormalizedManualOrderById(orderId);
    if (manualOrder) {
      if (!manualOrder.shippingRequired) {
        return res.status(409).json({
          error: getShippingNotRequiredErrorMessageForOrderSource(manualOrder.orderSource)
        });
      }

      const shippingName = String(req.body?.name || "").trim().slice(0, 120);
      const shippingLine1 = String(req.body?.line1 || "").trim().slice(0, 220);
      const shippingLine2 = String(req.body?.line2 || "").trim().slice(0, 220);
      const shippingCity = String(req.body?.city || "").trim().slice(0, 120);
      const shippingState = normalizeUsStateCode(req.body?.state);
      const shippingPostalCode = String(req.body?.postalCode || req.body?.postal_code || "")
        .trim()
        .toUpperCase()
        .slice(0, 20);
      const shippingCountry = normalizeIsoCountry(req.body?.country, "US");

      if (!shippingName || !shippingLine1 || !shippingCity || !shippingState || !shippingPostalCode) {
        return res.status(400).json({
          error: "Name, address line 1, city, state, and ZIP are required."
        });
      }
      if (shippingCountry !== "US") {
        return res.status(400).json({
          error: "Only U.S. shipping addresses are supported."
        });
      }

      const shippingDetails = {
        ...(manualOrder.shippingDetails || {}),
        name: shippingName,
        email: manualOrder.customerEmail,
        phone: manualOrder.customerPhone,
        line1: shippingLine1,
        line2: shippingLine2,
        city: shippingCity,
        state: shippingState,
        postalCode: shippingPostalCode,
        country: shippingCountry
      };
      const stateMatchResult = evaluateManualOrderStateMatch({
        customerState: manualOrder.customerState,
        shippingRequired: true,
        shippingDetails
      });

      await updateManualOrder(orderId, {
        shippingDetails,
        customerName: shippingName || manualOrder.customerName,
        fulfillmentStatus: manualOrder.fulfillmentStatus === "shipped" ? "shipped" : "pending",
        fulfillmentHoldReason: stateMatchResult.stateMatch ? "" : "state_mismatch",
        shippingState: stateMatchResult.shippingState || shippingState,
        shippingCountry: stateMatchResult.shippingCountry || shippingCountry,
        shippingStateMatchesCustomerState: stateMatchResult.stateMatch,
        shippingStateMismatchReason: stateMatchResult.stateMatch ? "" : stateMatchResult.mismatchReason
      });

      return res.json({
        ok: true,
        orderId,
        shipping: shippingDetails,
        shippingStateMatchesCustomerState: stateMatchResult.stateMatch,
        shippingStateMismatchReason: stateMatchResult.stateMatch ? "" : stateMatchResult.mismatchReason,
        message: stateMatchResult.stateMatch
          ? "Shipping address updated."
          : "Shipping address updated, but checkout state still does not match this state."
      });
    }

    if (!requireStripe(res)) {
      return;
    }

    const session = await stripe.checkout.sessions.retrieve(orderId, {
      expand: ["payment_intent"]
    });
    if (!session || session.payment_status !== "paid") {
      return res.status(404).json({ error: "Paid order not found." });
    }

    const paymentIntentId = getPaymentIntentIdFromSession(session);
    if (!paymentIntentId) {
      return res.status(400).json({ error: "This order has no payment intent to update." });
    }

    const paymentIntentMetadata =
      session.payment_intent && typeof session.payment_intent === "object"
        ? session.payment_intent.metadata || {}
        : {};
    if (!isSessionShippingRequired(session, { paymentIntentMetadata })) {
      return res.status(409).json({
        error: getShippingNotRequiredErrorMessage(session, { paymentIntentMetadata })
      });
    }

    const shippingName = String(req.body?.name || "").trim().slice(0, 120);
    const shippingLine1 = String(req.body?.line1 || "").trim().slice(0, 220);
    const shippingLine2 = String(req.body?.line2 || "").trim().slice(0, 220);
    const shippingCity = String(req.body?.city || "").trim().slice(0, 120);
    const shippingState = normalizeUsStateCode(req.body?.state);
    const shippingPostalCode = String(req.body?.postalCode || req.body?.postal_code || "")
      .trim()
      .toUpperCase()
      .slice(0, 20);
    const shippingCountry = normalizeIsoCountry(req.body?.country, "US");

    if (!shippingName || !shippingLine1 || !shippingCity || !shippingState || !shippingPostalCode) {
      return res.status(400).json({
        error: "Name, address line 1, city, state, and ZIP are required."
      });
    }
    if (shippingCountry !== "US") {
      return res.status(400).json({
        error: "Only U.S. shipping addresses are supported."
      });
    }

    const currentStatus = normalizeFulfillmentStatus(paymentIntentMetadata.fulfillment_status);
    const metadataWithAddress = {
      ...paymentIntentMetadata,
      fulfillment_shipping_name_override: shippingName,
      fulfillment_shipping_line1_override: shippingLine1,
      fulfillment_shipping_line2_override: shippingLine2,
      fulfillment_shipping_city_override: shippingCity,
      fulfillment_shipping_state_override: shippingState,
      fulfillment_shipping_postal_override: shippingPostalCode,
      fulfillment_shipping_country_override: shippingCountry
    };
    const stateMatchResult = evaluateCheckoutStateMatch(session, {
      paymentIntentMetadata: metadataWithAddress
    });
    const nextMetadata = {
      ...metadataWithAddress,
      fulfillment_status: currentStatus === "shipped" ? "shipped" : "pending",
      fulfillment_hold_reason: stateMatchResult.stateMatch ? "" : "state_mismatch",
      fulfillment_shipping_state: stateMatchResult.shippingState || shippingState,
      fulfillment_shipping_country: stateMatchResult.shippingCountry || shippingCountry,
      fulfillment_state_match: String(stateMatchResult.stateMatch),
      fulfillment_state_mismatch_reason: stateMatchResult.stateMatch ? "" : stateMatchResult.mismatchReason
    };

    await stripe.paymentIntents.update(paymentIntentId, {
      metadata: nextMetadata
    });

    return res.json({
      ok: true,
      orderId,
      shipping: getOrderShippingAddress(session, {
        paymentIntentMetadata: nextMetadata
      }),
      shippingStateMatchesCustomerState: stateMatchResult.stateMatch,
      shippingStateMismatchReason: stateMatchResult.stateMatch ? "" : stateMatchResult.mismatchReason,
      message: stateMatchResult.stateMatch
        ? "Shipping address updated."
        : "Shipping address updated, but checkout state still does not match this state."
    });
  } catch (error) {
    const details = typeof error?.message === "string" ? error.message : "";
    return res.status(500).json({
      error: details ? `Could not update shipping address: ${details}` : "Could not update shipping address right now."
    });
  }
});

app.post("/api/admin/orders/:id/save-address", requireAdmin, async (req, res) => {
  const orderId = String(req.params.id || "").trim();
  if (!orderId) {
    return res.status(400).json({ error: "Order ID is required." });
  }

  try {
    const manualOrder = await findNormalizedManualOrderById(orderId);
    if (manualOrder) {
      if (!manualOrder.shippingRequired) {
        return res.status(409).json({
          error: getShippingNotRequiredErrorMessageForOrderSource(manualOrder.orderSource)
        });
      }
      const entry = await saveManualOrderAddressToBook(manualOrder);
      return res.json({
        ok: true,
        entry
      });
    }

    if (!requireStripe(res)) {
      return;
    }

    const session = await stripe.checkout.sessions.retrieve(orderId, {
      expand: ["payment_intent"]
    });
    if (!session || session.payment_status !== "paid") {
      return res.status(404).json({ error: "Paid order not found." });
    }

    const paymentIntentMetadata =
      session.payment_intent && typeof session.payment_intent === "object"
        ? session.payment_intent.metadata || {}
        : {};
    if (!isSessionShippingRequired(session, { paymentIntentMetadata })) {
      return res.status(409).json({
        error: getShippingNotRequiredErrorMessage(session, { paymentIntentMetadata })
      });
    }
    const entry = await saveOrderAddressToBook(session, {
      paymentIntentMetadata
    });
    return res.json({
      ok: true,
      entry
    });
  } catch (error) {
    if (error instanceof AddressBookValidationError) {
      return res.status(400).json({ error: error.message });
    }
    const details = typeof error?.message === "string" ? error.message : "";
    return res.status(500).json({
      error: details ? `Could not save address: ${details}` : "Could not save address right now."
    });
  }
});

app.post("/api/admin/orders/:id/use-shipping-state", requireAdmin, async (req, res) => {
  const orderId = String(req.params.id || "").trim();
  if (!orderId) {
    return res.status(400).json({ error: "Order ID is required." });
  }

  try {
    const manualOrder = await findNormalizedManualOrderById(orderId);
    if (manualOrder) {
      if (!manualOrder.shippingRequired) {
        return res.status(409).json({
          error: getShippingNotRequiredErrorMessageForOrderSource(manualOrder.orderSource)
        });
      }
      if (manualOrder.customerState) {
        return res.status(409).json({
          error: `Checkout state is already set to ${manualOrder.customerState}.`
        });
      }

      const shippingState = normalizeUsStateCode(manualOrder.shippingState);
      if (!shippingState || String(manualOrder.shippingCountry || "US").trim().toUpperCase() !== "US") {
        return res.status(400).json({
          error: "Shipping address must include a valid U.S. state to use this fix."
        });
      }

      await updateManualOrder(orderId, {
        customerState: shippingState,
        customerTaxExemptByState: manualNonTaxStates.has(shippingState),
        fulfillmentStatus: manualOrder.fulfillmentStatus === "shipped" ? "shipped" : "pending",
        fulfillmentHoldReason: "",
        shippingState: shippingState,
        shippingCountry: "US",
        shippingStateMatchesCustomerState: true,
        shippingStateMismatchReason: ""
      });

      return res.json({
        ok: true,
        orderId,
        selectedState: shippingState,
        shippingState,
        sessionMetadataUpdated: false,
        message: `Order state fixed to ${shippingState}.`
      });
    }

    if (!requireStripe(res)) {
      return;
    }

    const session = await stripe.checkout.sessions.retrieve(orderId, {
      expand: ["payment_intent"]
    });
    if (!session || session.payment_status !== "paid") {
      return res.status(404).json({ error: "Paid order not found." });
    }

    const paymentIntentMetadata =
      session.payment_intent && typeof session.payment_intent === "object"
        ? session.payment_intent.metadata || {}
        : {};
    if (!isSessionShippingRequired(session, { paymentIntentMetadata })) {
      return res.status(409).json({
        error: getShippingNotRequiredErrorMessage(session, { paymentIntentMetadata })
      });
    }
    const sessionSelectedState = normalizeUsStateCode(session.metadata?.customer_state);
    if (sessionSelectedState) {
      return res.status(409).json({
        error: `Checkout state is already set to ${sessionSelectedState}.`
      });
    }

    const paymentIntentId = getPaymentIntentIdFromSession(session);
    if (!paymentIntentId) {
      return res.status(400).json({ error: "This order has no payment intent to update." });
    }
    const stateMatchResult = evaluateCheckoutStateMatch(session, {
      paymentIntentMetadata
    });
    const shippingState = stateMatchResult.shippingState;
    if (stateMatchResult.shippingCountry !== "US" || !shippingState) {
      return res.status(400).json({
        error: "Shipping address must include a valid U.S. state to use this fix."
      });
    }

    let sessionMetadataUpdated = false;
    try {
      const metadata = {
        ...(session.metadata || {}),
        customer_state: shippingState
      };
      await stripe.checkout.sessions.update(orderId, { metadata });
      sessionMetadataUpdated = true;
    } catch (error) {
      console.warn(`Could not update checkout session metadata for ${orderId}: ${String(error?.message || error)}`);
    }

    const currentStatus = normalizeFulfillmentStatus(paymentIntentMetadata.fulfillment_status);
    await stripe.paymentIntents.update(paymentIntentId, {
      metadata: {
        ...paymentIntentMetadata,
        fulfillment_status: currentStatus === "shipped" ? "shipped" : "pending",
        fulfillment_hold_reason: "",
        fulfillment_selected_state_override: shippingState,
        fulfillment_selected_state: shippingState,
        fulfillment_shipping_state: shippingState,
        fulfillment_shipping_country: "US",
        fulfillment_state_match: "true",
        fulfillment_state_mismatch_reason: ""
      }
    });

    return res.json({
      ok: true,
      orderId,
      selectedState: shippingState,
      shippingState,
      sessionMetadataUpdated,
      message: sessionMetadataUpdated
        ? `Order state fixed to ${shippingState}.`
        : `Order unblocked with ${shippingState} via payment metadata fallback.`
    });
  } catch (error) {
    const details = typeof error?.message === "string" ? error.message : "";
    return res.status(500).json({
      error: details ? `Could not apply shipping-state fix: ${details}` : "Could not apply shipping-state fix right now."
    });
  }
});

app.post("/api/admin/orders/:id/override-state-mismatch", requireAdmin, async (req, res) => {
  const orderId = String(req.params.id || "").trim();
  if (!orderId) {
    return res.status(400).json({ error: "Order ID is required." });
  }

  try {
    const manualOrder = await findNormalizedManualOrderById(orderId);
    if (manualOrder) {
      if (!manualOrder.shippingRequired) {
        return res.status(409).json({
          error: getShippingNotRequiredErrorMessageForOrderSource(manualOrder.orderSource)
        });
      }
      if (manualOrder.shippingStateMatchesCustomerState) {
        return res.json({
          ok: true,
          orderId,
          selectedState: manualOrder.customerState || "",
          shippingState: manualOrder.shippingState || "",
          message: "Order is not currently blocked by a state mismatch."
        });
      }

      const shippingState = normalizeUsStateCode(manualOrder.shippingState);
      if (!shippingState || String(manualOrder.shippingCountry || "US").trim().toUpperCase() !== "US") {
        return res.status(400).json({
          error: "Shipping address must include a valid U.S. state to override this mismatch."
        });
      }

      await updateManualOrder(orderId, {
        customerState: shippingState,
        customerTaxExemptByState: manualNonTaxStates.has(shippingState),
        fulfillmentStatus: manualOrder.fulfillmentStatus === "shipped" ? "shipped" : "pending",
        fulfillmentHoldReason: "",
        shippingState: shippingState,
        shippingCountry: "US",
        shippingStateMatchesCustomerState: true,
        shippingStateMismatchReason: ""
      });

      return res.json({
        ok: true,
        orderId,
        selectedState: shippingState,
        shippingState,
        message: `Override applied. Order unblocked with ${shippingState}.`
      });
    }

    if (!requireStripe(res)) {
      return;
    }

    const session = await stripe.checkout.sessions.retrieve(orderId, {
      expand: ["payment_intent"]
    });
    if (!session || session.payment_status !== "paid") {
      return res.status(404).json({ error: "Paid order not found." });
    }

    const paymentIntentMetadata =
      session.payment_intent && typeof session.payment_intent === "object"
        ? session.payment_intent.metadata || {}
        : {};
    if (!isSessionShippingRequired(session, { paymentIntentMetadata })) {
      return res.status(409).json({
        error: getShippingNotRequiredErrorMessage(session, { paymentIntentMetadata })
      });
    }

    const stateMatchResult = evaluateCheckoutStateMatch(session, {
      paymentIntentMetadata
    });
    if (stateMatchResult.stateMatch) {
      return res.json({
        ok: true,
        orderId,
        selectedState: stateMatchResult.selectedState || "",
        shippingState: stateMatchResult.shippingState || "",
        message: "Order is not currently blocked by a state mismatch."
      });
    }

    const shippingState = stateMatchResult.shippingState;
    if (stateMatchResult.shippingCountry !== "US" || !shippingState) {
      return res.status(400).json({
        error: "Shipping address must include a valid U.S. state to override this mismatch."
      });
    }

    const paymentIntentId = getPaymentIntentIdFromSession(session);
    if (!paymentIntentId) {
      return res.status(400).json({ error: "This order has no payment intent to update." });
    }

    const currentStatus = normalizeFulfillmentStatus(paymentIntentMetadata.fulfillment_status);
    await stripe.paymentIntents.update(paymentIntentId, {
      metadata: {
        ...paymentIntentMetadata,
        fulfillment_status: currentStatus === "shipped" ? "shipped" : "pending",
        fulfillment_hold_reason: "",
        fulfillment_selected_state_override: shippingState,
        fulfillment_selected_state: shippingState,
        fulfillment_shipping_state: shippingState,
        fulfillment_shipping_country: "US",
        fulfillment_state_match: "true",
        fulfillment_state_mismatch_reason: ""
      }
    });

    return res.json({
      ok: true,
      orderId,
      selectedState: shippingState,
      shippingState,
      message: `Override applied. Order unblocked with ${shippingState}.`
    });
  } catch (error) {
    const details = typeof error?.message === "string" ? error.message : "";
    return res.status(500).json({
      error: details ? `Could not override state mismatch: ${details}` : "Could not override state mismatch right now."
    });
  }
});

app.post("/api/admin/orders/:id/usps-label", requireAdmin, async (req, res) => {
  const orderId = String(req.params.id || "").trim();
  if (!orderId) {
    return res.status(400).json({ error: "Order ID is required." });
  }

  try {
    const manualOrder = await findNormalizedManualOrderById(orderId);
    if (manualOrder) {
      return res.status(409).json({
        error: "USPS label generation is only available for Stripe-backed orders right now."
      });
    }

    if (!requireStripe(res)) {
      return;
    }

    const session = await stripe.checkout.sessions.retrieve(orderId, {
      expand: ["payment_intent"]
    });
    if (!session || session.payment_status !== "paid") {
      return res.status(404).json({ error: "Paid order not found." });
    }

    const paymentIntentMetadata =
      session.payment_intent && typeof session.payment_intent === "object"
        ? session.payment_intent.metadata || {}
        : {};
    if (!isSessionShippingRequired(session, { paymentIntentMetadata })) {
      return res.status(409).json({
        error: getShippingNotRequiredErrorMessage(session, { paymentIntentMetadata })
      });
    }
    const stateMatchResult = evaluateCheckoutStateMatch(session, {
      paymentIntentMetadata
    });
    if (!stateMatchResult.stateMatch) {
      return res.status(409).json({
        error: `Cannot create USPS label: ${buildStateMismatchErrorMessage(stateMatchResult)}`
      });
    }

    const paymentIntentId = getPaymentIntentIdFromSession(session);
    if (!paymentIntentId) {
      return res.status(400).json({ error: "This order has no payment intent to update." });
    }

    const savedAddress = await saveOrderAddressToBook(session, {
      paymentIntentMetadata
    });
    const labelResult = await createUspsLabelForSession(session, {
      weightLbs: req.body?.weightLbs,
      mailClass: req.body?.mailClass,
      rateIndicator: req.body?.rateIndicator,
      processingCategory: req.body?.processingCategory,
      lengthInches: req.body?.lengthInches,
      widthInches: req.body?.widthInches,
      heightInches: req.body?.heightInches,
      declaredValueDollars: req.body?.declaredValueDollars,
      paymentIntentMetadata
    });

    const nextTrackingNumber = String(
      labelResult.trackingNumber || paymentIntentMetadata.fulfillment_tracking_number || ""
    )
      .trim()
      .slice(0, 140);
    const nextTrackingUrl = String(
      labelResult.trackingUrl || paymentIntentMetadata.fulfillment_tracking_url || ""
    )
      .trim()
      .slice(0, 500);
    const nextCarrier = String(
      labelResult.trackingNumber || labelResult.labelId || labelResult.labelUrl
        ? "USPS"
        : paymentIntentMetadata.fulfillment_carrier || ""
    )
      .trim()
      .slice(0, 80);
    const nextLabelId = String(labelResult.labelId || "").trim().slice(0, 140);
    const nextLabelUrl = String(labelResult.labelUrl || "").trim().slice(0, 500);
    const nextPostageCents = Number.isFinite(labelResult.postageCents) ? Math.max(0, Number(labelResult.postageCents)) : null;

    await stripe.paymentIntents.update(paymentIntentId, {
      metadata: {
        ...paymentIntentMetadata,
        fulfillment_carrier: nextCarrier,
        fulfillment_tracking_number: nextTrackingNumber,
        fulfillment_tracking_url: nextTrackingUrl,
        fulfillment_label_id: nextLabelId,
        fulfillment_label_url: nextLabelUrl,
        fulfillment_postage_cents:
          nextPostageCents !== null
            ? String(nextPostageCents)
            : String(paymentIntentMetadata.fulfillment_postage_cents || "")
      }
    });

    return res.json({
      ok: true,
      orderId: session.id,
      addressSaved: true,
      addressBookEntry: savedAddress,
      carrier: nextCarrier,
      trackingNumber: nextTrackingNumber,
      trackingUrl: nextTrackingUrl,
      labelId: nextLabelId,
      labelUrl: nextLabelUrl,
      postageCents: nextPostageCents
    });
  } catch (error) {
    const details = maskSecrets(typeof error?.message === "string" ? error.message : "");
    if (error instanceof AddressBookValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (details.includes("USPS is not configured")) {
      return res.status(503).json({ error: details });
    }
    if (details.includes("shipping address")) {
      return res.status(400).json({ error: details });
    }
    return res.status(500).json({
      error: details ? `Could not create USPS label: ${details}` : "Could not create USPS label right now."
    });
  }
});

app.post("/api/admin/shipping/parse-label-pdf", requireAdmin, labelPdfUpload.single("labelsPdf"), (req, res) => {
  const file = req.file;
  if (!file?.buffer || file.buffer.length === 0) {
    return res.status(400).json({ error: "Attach a labels PDF before continuing." });
  }

  const mime = String(file.mimetype || "").toLowerCase();
  const originalName = String(file.originalname || "").toLowerCase();
  if (!mime.includes("pdf") && !originalName.endsWith(".pdf")) {
    return res.status(400).json({ error: "Only PDF shipping label files are supported." });
  }

  const labels = extractShippingLabelsFromPdfBuffer(file.buffer).map((entry) => ({
    index: Number(entry?.index) || 0,
    trackingNumber: normalizeTrackingNumber(entry?.trackingNumber),
    carrier: normalizeCarrierName(entry?.carrier),
    trackingUrl: String(entry?.trackingUrl || "").trim(),
    zipCodes: Array.isArray(entry?.zipCodes) ? entry.zipCodes.filter((zipCode) => /^\d{5}$/.test(String(zipCode || ""))) : [],
    preview: normalizePdfExtractedText(entry?.preview || "").slice(0, 220),
    matchText: normalizePdfExtractedText(entry?.matchText || "").slice(0, 3000)
  }));
  const validLabels = labels.filter((entry) => Boolean(entry.trackingNumber));
  if (validLabels.length === 0) {
    return res.status(400).json({
      error: "No tracking numbers were found in that PDF. Use a text-based labels PDF, then try again."
    });
  }

  return res.json({
    ok: true,
    labels: validLabels,
    totalLabels: validLabels.length
  });
});

app.post("/api/admin/orders/:id/ship", requireAdmin, async (req, res) => {
  const orderId = String(req.params.id || "").trim();
  if (!orderId) {
    return res.status(400).json({ error: "Order ID is required." });
  }

  const carrierRaw = req.body?.carrier;
  const trackingNumberRaw = req.body?.trackingNumber;
  const trackingUrlRaw = req.body?.trackingUrl;
  const noteRaw = req.body?.note;
  const resendEmail = parseBooleanFlag(req.body?.resendEmail, false) === true;
  const overrideStateMismatch = parseBooleanFlag(req.body?.overrideStateMismatch, false) === true;
  const sendEmail = parseBooleanFlag(req.body?.sendEmail, true) !== false;

  try {
    const manualOrder = await findNormalizedManualOrderById(orderId);
    if (manualOrder) {
      if (!manualOrder.shippingRequired) {
        return res.status(409).json({
          error: getShippingNotRequiredErrorMessageForOrderSource(manualOrder.orderSource)
        });
      }
      if (!manualOrder.shippingStateMatchesCustomerState && !overrideStateMismatch) {
        return res.status(409).json({
          error: `Cannot mark shipped: ${buildStateMismatchErrorMessage({
            selectedState: manualOrder.customerState,
            shippingState: manualOrder.shippingState,
            shippingCountry: manualOrder.shippingCountry,
            mismatchReason: manualOrder.shippingStateMismatchReason
          })}`
        });
      }

      const carrier =
        carrierRaw !== undefined
          ? String(carrierRaw || "").trim().slice(0, 80)
          : String(manualOrder.shipmentCarrier || "").trim().slice(0, 80);
      let trackingNumber =
        trackingNumberRaw !== undefined
          ? String(trackingNumberRaw || "").trim().slice(0, 140)
          : String(manualOrder.shipmentTrackingNumber || "").trim().slice(0, 140);
      let trackingUrl =
        trackingUrlRaw !== undefined
          ? String(trackingUrlRaw || "").trim().slice(0, 500)
          : String(manualOrder.shipmentTrackingUrl || "").trim().slice(0, 500);
      const note =
        noteRaw !== undefined
          ? String(noteRaw || "").trim().slice(0, 500)
          : String(manualOrder.shipmentNote || "").trim().slice(0, 500);
      const fallbackLabelId = String(manualOrder.shipmentLabelId || "").trim();
      trackingNumber = resolveTrackingNumberForShipment({
        trackingNumber,
        trackingUrl,
        labelId: fallbackLabelId
      }).slice(0, 140);
      if (!trackingUrl && trackingNumber) {
        trackingUrl = buildCarrierTrackingUrl(carrier, trackingNumber).slice(0, 500);
      }
      const existingStatus = normalizeFulfillmentStatus(manualOrder.fulfillmentStatus);
      if (existingStatus === "shipped" && !resendEmail) {
        return res.json({
          ok: true,
          alreadyShipped: true,
          message: "Order already marked shipped. Use resendEmail=true to re-send shipment email."
        });
      }
      if (sendEmail && !trackingNumber && !trackingUrl) {
        return res.status(400).json({
          error: "Tracking number or tracking URL is required before sending a shipment email."
        });
      }

      const shippedAtUnix =
        existingStatus === "shipped" && resendEmail && manualOrder.shippedAt > 0
          ? manualOrder.shippedAt
          : Math.floor(Date.now() / 1000);
      const packagedAtUnix = manualOrder.packagedAt > 0 ? manualOrder.packagedAt : shippedAtUnix;
      const updatedOrder = await updateManualOrder(orderId, {
        fulfillmentStatus: "shipped",
        shippedAt: shippedAtUnix,
        packagedAt: packagedAtUnix,
        shipmentCarrier: carrier,
        shipmentTrackingNumber: trackingNumber,
        shipmentTrackingUrl: trackingUrl,
        shipmentNote: note
      });
      const normalizedUpdatedOrder = normalizeManualOrderRecord(updatedOrder);
      if (!sendEmail) {
        return res.json({
          ok: true,
          shipped: true,
          emailed: false,
          emailQueued: false,
          shippedAt: shippedAtUnix
        });
      }
      const customerEmail = String(normalizedUpdatedOrder?.customerEmail || "").trim();
      if (!customerEmail) {
        return res.json({
          ok: true,
          shipped: true,
          emailed: false,
          shippedAt: shippedAtUnix,
          message: "Order marked shipped, but customer email was missing."
        });
      }

      setImmediate(() => {
        void (async () => {
          try {
            await sendShipmentNotification({
              customerEmail,
              customerName: normalizedUpdatedOrder.customerName,
              orderId: normalizedUpdatedOrder.id,
              currency: normalizedUpdatedOrder.currency || currency,
              lineItems: normalizedUpdatedOrder.items,
              shippingDetails: buildStripeStyleShippingDetails(
                normalizedUpdatedOrder.shippingDetails || {
                  name: normalizedUpdatedOrder.customerName,
                  phone: normalizedUpdatedOrder.customerPhone,
                  line1: "",
                  line2: "",
                  city: "",
                  state: "",
                  postalCode: "",
                  country: "US"
                }
              ),
              carrier,
              trackingNumber,
              trackingUrl,
              note
            });
            console.log(`Shipment email sent for order ${normalizedUpdatedOrder.id} -> ${customerEmail}`);
          } catch (error) {
            console.error(`Failed to send shipment notification for order ${normalizedUpdatedOrder.id}:`, error);
          }
        })();
      });

      return res.json({
        ok: true,
        shipped: true,
        emailed: true,
        emailQueued: true,
        shippedAt: shippedAtUnix
      });
    }

    if (!requireStripe(res)) {
      return;
    }

    const session = await stripe.checkout.sessions.retrieve(orderId, {
      expand: ["payment_intent"]
    });
    if (!session || session.payment_status !== "paid") {
      return res.status(404).json({ error: "Paid order not found." });
    }

    const currentMetadata =
      session.payment_intent && typeof session.payment_intent === "object"
        ? session.payment_intent.metadata || {}
        : {};
    if (!isSessionShippingRequired(session, { paymentIntentMetadata: currentMetadata })) {
      return res.status(409).json({
        error: getShippingNotRequiredErrorMessage(session, { paymentIntentMetadata: currentMetadata })
      });
    }
    const stateMatchResult = evaluateCheckoutStateMatch(session, {
      paymentIntentMetadata: currentMetadata
    });
    if (!stateMatchResult.stateMatch && !overrideStateMismatch) {
      return res.status(409).json({
        error: `Cannot mark shipped: ${buildStateMismatchErrorMessage(stateMatchResult)}`
      });
    }

    const paymentIntentId = getPaymentIntentIdFromSession(session);
    if (!paymentIntentId) {
      return res.status(400).json({ error: "This order has no payment intent to update." });
    }

    const carrier =
      carrierRaw !== undefined
        ? String(carrierRaw || "").trim().slice(0, 80)
        : String(currentMetadata.fulfillment_carrier || "").trim().slice(0, 80);
    let trackingNumber =
      trackingNumberRaw !== undefined
        ? String(trackingNumberRaw || "").trim().slice(0, 140)
        : String(currentMetadata.fulfillment_tracking_number || "").trim().slice(0, 140);
    let trackingUrl =
      trackingUrlRaw !== undefined
        ? String(trackingUrlRaw || "").trim().slice(0, 500)
        : String(currentMetadata.fulfillment_tracking_url || "").trim().slice(0, 500);
    const note =
      noteRaw !== undefined
        ? String(noteRaw || "").trim().slice(0, 500)
        : String(currentMetadata.fulfillment_note || "").trim().slice(0, 500);
    const fallbackLabelId = String(currentMetadata.fulfillment_label_id || "").trim();
    trackingNumber = resolveTrackingNumberForShipment({
      trackingNumber,
      trackingUrl,
      labelId: fallbackLabelId
    }).slice(0, 140);
    if (!trackingUrl && trackingNumber) {
      trackingUrl = buildCarrierTrackingUrl(carrier, trackingNumber).slice(0, 500);
    }
    const existingStatus = normalizeFulfillmentStatus(currentMetadata.fulfillment_status);
    if (existingStatus === "shipped" && !resendEmail) {
      return res.json({
        ok: true,
        alreadyShipped: true,
        message: "Order already marked shipped. Use resendEmail=true to re-send shipment email."
      });
    }
    if (sendEmail && !trackingNumber && !trackingUrl) {
      return res.status(400).json({
        error: "Tracking number or tracking URL is required before sending a shipment email."
      });
    }

    const existingShippedAtUnix = readMetadataInteger(currentMetadata, "fulfillment_shipped_at") || 0;
    const shippedAtUnix =
      existingStatus === "shipped" && resendEmail && existingShippedAtUnix > 0
        ? existingShippedAtUnix
        : Math.floor(Date.now() / 1000);
    const nextMetadata = {
      ...currentMetadata,
      fulfillment_status: "shipped",
      fulfillment_shipped_at: String(shippedAtUnix),
      fulfillment_packaged_at: String(readMetadataInteger(currentMetadata, "fulfillment_packaged_at") || shippedAtUnix),
      fulfillment_carrier: carrier,
      fulfillment_tracking_number: trackingNumber,
      fulfillment_tracking_url: trackingUrl,
      fulfillment_note: note
    };
    await stripe.paymentIntents.update(paymentIntentId, {
      metadata: nextMetadata
    });

    if (!sendEmail) {
      return res.json({
        ok: true,
        shipped: true,
        emailed: false,
        emailQueued: false,
        shippedAt: shippedAtUnix
      });
    }

    const customerEmail = String(session.customer_details?.email || session.customer_email || "").trim();
    if (!customerEmail) {
      return res.json({
        ok: true,
        shipped: true,
        emailed: false,
        shippedAt: shippedAtUnix,
        message: "Order marked shipped, but customer email was missing."
      });
    }
    const shippingDetails = buildStripeStyleShippingDetails(
      getOrderShippingAddress(session, {
        paymentIntentMetadata: nextMetadata
      })
    );
    const customerName = String(session.customer_details?.name || shippingDetails.name || "").trim();

    setImmediate(() => {
      void (async () => {
        try {
          const lineItemsResponse = await stripe.checkout.sessions.listLineItems(session.id, {
            limit: 100
          });
          const lineItems = (lineItemsResponse?.data || [])
            .map((item) => ({
              name: item.description || "Book",
              quantity: item.quantity || 1,
              amountTotal: item.amount_total || 0
            }))
            .filter((item) => !isShippingLineItem(item) && !isTaxLineItem(item));

          await sendShipmentNotification({
            customerEmail,
            customerName,
            orderId: session.id,
            currency: session.currency || currency,
            lineItems,
            shippingDetails,
            carrier,
            trackingNumber,
            trackingUrl,
            note
          });
          console.log(`Shipment email sent for order ${session.id} -> ${customerEmail}`);
        } catch (error) {
          console.error(`Failed to send shipment notification for order ${session.id}:`, error);
        }
      })();
    });

    return res.json({
      ok: true,
      shipped: true,
      emailed: true,
      emailQueued: true,
      shippedAt: shippedAtUnix
    });
  } catch (error) {
    const details = typeof error?.message === "string" ? error.message : "";
    return res.status(500).json({
      error: details ? `Could not mark shipped: ${details}` : "Could not mark shipped right now."
    });
  }
});

app.post("/api/admin/orders/:id/package", requireAdmin, async (req, res) => {
  const orderId = String(req.params.id || "").trim();
  if (!orderId) {
    return res.status(400).json({ error: "Order ID is required." });
  }

  const packaged = parseBooleanFlag(req.body?.packaged, true) === true;

  try {
    const manualOrder = await findNormalizedManualOrderById(orderId);
    if (manualOrder) {
      const packagedAtUnix = packaged ? Math.floor(Date.now() / 1000) : 0;
      await updateManualOrder(orderId, {
        packagedAt: packagedAtUnix
      });
      return res.json({
        ok: true,
        packaged,
        packagedAt: packagedAtUnix,
        packagedAtIso: packagedAtUnix > 0 ? new Date(packagedAtUnix * 1000).toISOString() : ""
      });
    }

    if (!requireStripe(res)) {
      return;
    }

    const session = await stripe.checkout.sessions.retrieve(orderId, {
      expand: ["payment_intent"]
    });
    if (!session || session.payment_status !== "paid") {
      return res.status(404).json({ error: "Paid order not found." });
    }

    const paymentIntentId = getPaymentIntentIdFromSession(session);
    if (!paymentIntentId) {
      return res.status(400).json({ error: "This order has no payment intent to update." });
    }

    const currentMetadata =
      session.payment_intent && typeof session.payment_intent === "object"
        ? session.payment_intent.metadata || {}
        : {};
    const packagedAtUnix = packaged ? Math.floor(Date.now() / 1000) : 0;

    await stripe.paymentIntents.update(paymentIntentId, {
      metadata: {
        ...currentMetadata,
        fulfillment_packaged_at: packaged ? String(packagedAtUnix) : ""
      }
    });

    return res.json({
      ok: true,
      packaged,
      packagedAt: packagedAtUnix,
      packagedAtIso: packagedAtUnix > 0 ? new Date(packagedAtUnix * 1000).toISOString() : ""
    });
  } catch (error) {
    const details = typeof error?.message === "string" ? error.message : "";
    return res.status(500).json({
      error: details ? `Could not update packaged state: ${details}` : "Could not update packaged state right now."
    });
  }
});

app.post("/api/admin/orders/:id/package-weight", requireAdmin, async (req, res) => {
  const orderId = String(req.params.id || "").trim();
  if (!orderId) {
    return res.status(400).json({ error: "Order ID is required." });
  }

  const packageWeightValue = normalizePackageWeightValue(req.body?.value);
  if (packageWeightValue === null) {
    return res.status(400).json({ error: "Enter a valid number with up to 2 decimals." });
  }

  try {
    const manualOrder = await findNormalizedManualOrderById(orderId);
    if (manualOrder) {
      await updateManualOrder(orderId, {
        packageWeightValue
      });
      return res.json({
        ok: true,
        packageWeightValue
      });
    }

    if (!requireStripe(res)) {
      return;
    }

    const session = await stripe.checkout.sessions.retrieve(orderId, {
      expand: ["payment_intent"]
    });
    if (!session || session.payment_status !== "paid") {
      return res.status(404).json({ error: "Paid order not found." });
    }

    const paymentIntentId = getPaymentIntentIdFromSession(session);
    if (!paymentIntentId) {
      return res.status(400).json({ error: "This order has no payment intent to update." });
    }

    const currentMetadata =
      session.payment_intent && typeof session.payment_intent === "object"
        ? session.payment_intent.metadata || {}
        : {};

    await stripe.paymentIntents.update(paymentIntentId, {
      metadata: {
        ...currentMetadata,
        fulfillment_package_weight_value: packageWeightValue
      }
    });

    return res.json({
      ok: true,
      packageWeightValue
    });
  } catch (error) {
    const details = typeof error?.message === "string" ? error.message : "";
    return res.status(500).json({
      error: details ? `Could not update package weight value: ${details}` : "Could not update package weight value right now."
    });
  }
});

app.post("/api/admin/orders/:id/mark-pending", requireAdmin, async (req, res) => {
  const orderId = String(req.params.id || "").trim();
  if (!orderId) {
    return res.status(400).json({ error: "Order ID is required." });
  }

  try {
    const manualOrder = await findNormalizedManualOrderById(orderId);
    if (manualOrder) {
      await updateManualOrder(orderId, {
        fulfillmentStatus: "pending",
        shippedAt: 0,
        shipmentCarrier: "",
        shipmentTrackingNumber: "",
        shipmentTrackingUrl: "",
        shipmentNote: ""
      });
      return res.json({
        ok: true,
        shipped: false,
        status: "pending"
      });
    }

    if (!requireStripe(res)) {
      return;
    }

    const session = await stripe.checkout.sessions.retrieve(orderId, {
      expand: ["payment_intent"]
    });
    if (!session || session.payment_status !== "paid") {
      return res.status(404).json({ error: "Paid order not found." });
    }

    const paymentIntentId = getPaymentIntentIdFromSession(session);
    if (!paymentIntentId) {
      return res.status(400).json({ error: "This order has no payment intent to update." });
    }

    const currentMetadata =
      session.payment_intent && typeof session.payment_intent === "object"
        ? session.payment_intent.metadata || {}
        : {};
    await stripe.paymentIntents.update(paymentIntentId, {
      metadata: {
        ...currentMetadata,
        fulfillment_status: "pending",
        fulfillment_shipped_at: "",
        fulfillment_carrier: "",
        fulfillment_tracking_number: "",
        fulfillment_tracking_url: "",
        fulfillment_note: ""
      }
    });

    return res.json({
      ok: true,
      shipped: false,
      status: "pending"
    });
  } catch (error) {
    const details = typeof error?.message === "string" ? error.message : "";
    return res.status(500).json({
      error: details ? `Could not mark pending: ${details}` : "Could not update fulfillment status right now."
    });
  }
});

const siteSettingsUpload = upload.fields([
  { name: "logoImage", maxCount: 1 },
  { name: "heroBannerImage", maxCount: 1 },
  { name: "membershipStandardImage", maxCount: 1 },
  { name: "membershipPlusImage", maxCount: 1 },
  { name: "membershipPremiumImage", maxCount: 1 }
]);

const productUpload = upload.fields([
  { name: "image", maxCount: 1 },
  { name: "productImages", maxCount: 16 },
  { name: "includedImages", maxCount: 16 }
]);

const premiumLibraryAdminUpload = premiumLibraryUpload.fields([
  { name: "ebookFile", maxCount: 1 },
  { name: "coverImage", maxCount: 1 }
]);

app.put("/api/admin/site-settings", requireAdmin, siteSettingsUpload, async (req, res) => {
  try {
    await maybeUploadRequestFilesToCloudinary(req.files, {
      logoImage: "site-settings",
      heroBannerImage: "site-settings",
      membershipStandardImage: "site-settings/memberships",
      membershipPlusImage: "site-settings/memberships",
      membershipPremiumImage: "site-settings/memberships"
    });
    const updated = await updateSiteSettings(extractSiteSettingsChanges(req));
    return res.json(updated);
  } catch (error) {
    await removeUploadedFiles(req.files);
    if (error instanceof SiteSettingsValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error?.message) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: "Could not update site settings." });
  }
});

app.post("/api/admin/products", requireAdmin, productUpload, async (req, res) => {
  try {
    await maybeUploadRequestFilesToCloudinary(req.files, {
      image: "products",
      productImages: "products/gallery",
      includedImages: "products/included"
    });
    const productImageUrls = [
      ...parseImageUrlList(req.body?.productImageUrls, { defaultEmpty: true }),
      ...uploadedImageUrls(req.files, "productImages")
    ];
    const includedImageUrls = [
      ...parseImageUrlList(req.body?.includedImageUrls, { defaultEmpty: true }),
      ...uploadedImageUrls(req.files, "includedImages")
    ];
    const created = await createProduct({
      title: req.body?.title,
      productCategory: req.body?.productCategory,
      subtitle: req.body?.subtitle,
      included: req.body?.included,
      priceCents: priceToCents(req.body?.price),
      imageUrl: imageUrlFromRequest(req),
      productImageUrls,
      includedImageUrls,
      inStock: parseBooleanFlag(req.body?.inStock, true),
      shippingEnabled: parseBooleanFlag(req.body?.shippingEnabled, true),
      shippingFeeCents: optionalPriceToCents(req.body?.shippingFee),
      isVisible: parseBooleanFlag(req.body?.isVisible, true),
      isComingSoon: parseBooleanFlag(req.body?.isComingSoon, false),
      allowPreorder: parseBooleanFlag(req.body?.allowPreorder, false)
    });
    return res.status(201).json(created);
  } catch (error) {
    await removeUploadedFiles(req.files, ["image", "productImages", "includedImages"]);
    if (error instanceof ProductValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error?.message) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: "Could not create product." });
  }
});

app.put("/api/admin/products/:id", requireAdmin, productUpload, async (req, res) => {
  try {
    await maybeUploadRequestFilesToCloudinary(req.files, {
      image: "products",
      productImages: "products/gallery",
      includedImages: "products/included"
    });
    const removeImage = String(req.body?.removeImage || "").toLowerCase() === "true";
    const imageUrl = removeImage ? "" : imageUrlFromRequest(req, { allowUnset: true });
    const nextPriceRaw = String(req.body?.price || "").trim();
    const nextPrice = nextPriceRaw ? priceToCents(nextPriceRaw) : undefined;
    const shippingFeeRaw = String(req.body?.shippingFee || "").trim();
    const nextShippingFee = shippingFeeRaw ? priceToCents(shippingFeeRaw) : undefined;
    const uploadedProductImages = uploadedImageUrls(req.files, "productImages");
    const uploadedIncludedImages = uploadedImageUrls(req.files, "includedImages");
    const productImageListProvided = req.body?.productImageUrls !== undefined || uploadedProductImages.length > 0;
    const includedImageListProvided = req.body?.includedImageUrls !== undefined || uploadedIncludedImages.length > 0;
    const nextProductImageUrls = productImageListProvided
      ? [...parseImageUrlList(req.body?.productImageUrls, { defaultEmpty: true }), ...uploadedProductImages]
      : undefined;
    const nextIncludedImageUrls = includedImageListProvided
      ? [...parseImageUrlList(req.body?.includedImageUrls, { defaultEmpty: true }), ...uploadedIncludedImages]
      : undefined;

    const updated = await updateProduct(req.params.id, {
      title: req.body?.title !== undefined ? req.body.title : undefined,
      productCategory: req.body?.productCategory !== undefined ? req.body.productCategory : undefined,
      subtitle: req.body?.subtitle !== undefined ? req.body.subtitle : undefined,
      included: req.body?.included !== undefined ? req.body.included : undefined,
      priceCents: nextPriceRaw ? nextPrice : undefined,
      imageUrl,
      productImageUrls: nextProductImageUrls,
      includedImageUrls: nextIncludedImageUrls,
      shippingEnabled: parseBooleanFlag(req.body?.shippingEnabled, undefined),
      shippingFeeCents: shippingFeeRaw ? nextShippingFee : undefined,
      isVisible: parseBooleanFlag(req.body?.isVisible, undefined),
      isComingSoon: parseBooleanFlag(req.body?.isComingSoon, undefined),
      allowPreorder: parseBooleanFlag(req.body?.allowPreorder, undefined),
      inStock: parseBooleanFlag(req.body?.inStock, undefined)
    });

    if (!updated) {
      await removeUploadedFiles(req.files, ["image", "productImages", "includedImages"]);
      return res.status(404).json({ error: "Product not found." });
    }

    return res.json(updated);
  } catch (error) {
    await removeUploadedFiles(req.files, ["image", "productImages", "includedImages"]);
    if (error instanceof ProductValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error?.message) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: "Could not update product." });
  }
});

app.post("/api/admin/products/reorder", requireAdmin, async (req, res) => {
  try {
    const productIds = Array.isArray(req.body?.productIds) ? req.body.productIds : [];
    const reordered = await reorderProducts(productIds);
    return res.json(reordered);
  } catch (error) {
    if (error instanceof ProductValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error?.message) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: "Could not reorder products." });
  }
});

app.delete("/api/admin/products/:id", requireAdmin, async (req, res) => {
  const deleted = await deleteProduct(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: "Product not found." });
  }
  return res.json({ ok: true });
});

app.post("/api/admin/premium-library", requireAdmin, premiumLibraryAdminUpload, async (req, res) => {
  try {
    await maybeUploadRequestFilesToCloudinary(req.files, {
      coverImage: "premium-library/covers"
    });
    const typedFileUrl = String(req.body?.fileUrl || "").trim();
    const typedCoverImageUrl = String(req.body?.coverImageUrl || "").trim();
    const fileUrl = uploadedPremiumEbookUrl(req.files, "ebookFile") || typedFileUrl;
    const coverImageUrl = uploadedImageUrl(req.files, "coverImage") || typedCoverImageUrl;
    const created = await createPremiumLibraryItem({
      id: req.body?.id,
      title: req.body?.title,
      monthLabel: req.body?.monthLabel,
      description: req.body?.description,
      fileUrl,
      coverImageUrl
    });
    return res.status(201).json(created);
  } catch (error) {
    await removeUploadedFiles(req.files, ["ebookFile", "coverImage"]);
    if (error instanceof PremiumLibraryValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error?.message) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: "Could not create premium library item." });
  }
});

app.put("/api/admin/premium-library/:id", requireAdmin, premiumLibraryAdminUpload, async (req, res) => {
  const itemId = String(req.params.id || "").trim();
  if (!itemId) {
    await removeUploadedFiles(req.files, ["ebookFile", "coverImage"]);
    return res.status(400).json({ error: "Ebook ID is required." });
  }

  const existingStored = await findPremiumLibraryItemById(itemId);
  const existing = existingStored
    ? existingStored
    : (await listAllPremiumLibraryItems()).find((entry) => String(entry?.id || "").trim() === itemId);
  if (!existing) {
    await removeUploadedFiles(req.files, ["ebookFile", "coverImage"]);
    return res.status(404).json({ error: "Premium library item not found." });
  }

  try {
    await maybeUploadRequestFilesToCloudinary(req.files, {
      coverImage: "premium-library/covers"
    });
    const uploadedFileUrl = uploadedPremiumEbookUrl(req.files, "ebookFile");
    const uploadedCoverImageUrl = uploadedImageUrl(req.files, "coverImage");
    const removeFile = parseBooleanFlag(req.body?.removeFile, false) === true;
    const removeCoverImage = parseBooleanFlag(req.body?.removeCoverImage, false) === true;
    const patch = {};

    if (req.body?.title !== undefined) {
      patch.title = req.body.title;
    }
    if (req.body?.monthLabel !== undefined) {
      patch.monthLabel = req.body.monthLabel;
    }
    if (req.body?.description !== undefined) {
      patch.description = req.body.description;
    }

    if (removeFile) {
      patch.fileUrl = "";
    } else if (uploadedFileUrl) {
      patch.fileUrl = uploadedFileUrl;
    } else if (req.body?.fileUrl !== undefined) {
      patch.fileUrl = String(req.body?.fileUrl || "").trim();
    }

    if (removeCoverImage) {
      patch.coverImageUrl = "";
    } else if (uploadedCoverImageUrl) {
      patch.coverImageUrl = uploadedCoverImageUrl;
    } else if (req.body?.coverImageUrl !== undefined) {
      patch.coverImageUrl = String(req.body?.coverImageUrl || "").trim();
    }

    const updated = existingStored
      ? await updatePremiumLibraryItem(itemId, patch)
      : await createPremiumLibraryItem({
          id: itemId,
          title: patch.title !== undefined ? patch.title : existing.title,
          monthLabel: patch.monthLabel !== undefined ? patch.monthLabel : existing.monthLabel,
          description: patch.description !== undefined ? patch.description : existing.description,
          fileUrl: patch.fileUrl !== undefined ? patch.fileUrl : existing.fileUrl,
          coverImageUrl: patch.coverImageUrl !== undefined ? patch.coverImageUrl : existing.coverImageUrl
        });
    if (!updated) {
      await removeUploadedFiles(req.files, ["ebookFile", "coverImage"]);
      return res.status(404).json({ error: "Premium library item not found." });
    }

    const previousFileUrl = String(existing.fileUrl || "").trim();
    const previousCoverImageUrl = String(existing.coverImageUrl || "").trim();
    const replacedFileWithUpload = Boolean(uploadedFileUrl && previousFileUrl && previousFileUrl !== uploadedFileUrl);
    if (replacedFileWithUpload || removeFile) {
      await removeUploadsFileByPublicUrl(previousFileUrl);
    }

    const replacedCoverWithUpload = Boolean(
      uploadedCoverImageUrl && previousCoverImageUrl && previousCoverImageUrl !== uploadedCoverImageUrl
    );
    if (replacedCoverWithUpload || removeCoverImage) {
      await removeUploadsFileByPublicUrl(previousCoverImageUrl);
    }

    return res.json(updated);
  } catch (error) {
    await removeUploadedFiles(req.files, ["ebookFile", "coverImage"]);
    if (error instanceof PremiumLibraryValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error?.message) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: "Could not update premium library item." });
  }
});

app.delete("/api/admin/premium-library/:id", requireAdmin, async (req, res) => {
  try {
    const deleted = await deletePremiumLibraryItem(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Premium library item not found." });
    }
    await Promise.all([
      removeUploadsFileByPublicUrl(deleted.fileUrl),
      removeUploadsFileByPublicUrl(deleted.coverImageUrl)
    ]);
    return res.json({ ok: true });
  } catch (error) {
    if (error instanceof PremiumLibraryValidationError) {
      return res.status(400).json({ error: error.message });
    }
    const details = String(error?.message || "").trim();
    return res.status(500).json({
      error: details ? `Could not delete premium library item: ${details}` : "Could not delete premium library item."
    });
  }
});

app.post("/api/admin/publish", requireAdmin, async (req, res) => {
  try {
    const result = await publishAdminSnapshot(req.body?.message);
    return res.json(result);
  } catch (error) {
    const text = String(error?.message || "");
    if (text.includes("GitHub publish config error")) {
      return res.status(503).json({ error: text });
    }
    return res.status(500).json({ error: maskSecrets(text || "Could not publish changes.") });
  }
});

app.post("/api/create-checkout-session", async (req, res) => {
  if (!requireStripe(res)) {
    return;
  }

  try {
    const appUrl = getAppUrl(req);
    const cart = Array.isArray(req.body?.cart) ? req.body.cart : [];
    const customerState = req.body?.customerState;
    const { session } = await createCheckoutSessionForCart(req, cart, customerState, {
      shippingRequired: true,
      orderSource: "storefront",
      successUrl: `${appUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${appUrl}/cancel.html`,
      allowPromotionCodes: true,
      allowHiddenProducts: false
    });
    return res.json({ url: session.url });
  } catch (error) {
    console.error("Failed creating checkout session:", error);
    const details = typeof error?.message === "string" ? error.message : "";
    return res.status(isCheckoutValidationErrorMessage(details) ? 400 : 500).json({
      error: details ? `Could not start checkout: ${details}` : "Could not start checkout right now."
    });
  }
});

app.post("/api/custom-story-quote", async (req, res) => {
  const emailHealth = getEmailHealth();
  if (!emailHealth.emailSendingEnabled || !emailHealth.ownerEmailConfigured) {
    return res.status(503).json({
      error: "Quote requests are not configured right now. Please try again later."
    });
  }

  try {
    const customerName = cleanQuoteRequestText(req.body?.name, 120);
    const customerEmail = normalizeCustomerEmail(req.body?.email);
    const customerPhone = cleanQuoteRequestText(req.body?.phone, 40);
    const storyInspiration = cleanQuoteRequestText(req.body?.storyInspiration, 2000);
    const audienceDetails = cleanQuoteRequestText(req.body?.audienceDetails, 1200);
    const timelineDetails = cleanQuoteRequestText(req.body?.timelineDetails, 600);
    const extraNotes = cleanQuoteRequestText(req.body?.extraNotes, 2000);

    if (!customerName) {
      return res.status(400).json({ error: "Name is required." });
    }
    if (!customerEmail) {
      return res.status(400).json({ error: "Email is required." });
    }
    if (!storyInspiration) {
      return res.status(400).json({ error: "Tell us what story you want created." });
    }

    await sendCustomStoryQuoteRequest({
      customerName,
      customerEmail,
      customerPhone,
      storyInspiration,
      audienceDetails,
      timelineDetails,
      extraNotes
    });

    return res.json({
      ok: true,
      message: "Quote request sent."
    });
  } catch (error) {
    const details = typeof error?.message === "string" ? error.message : "";
    return res.status(details === "Enter a valid email address." ? 400 : 500).json({
      error: details || "Could not send quote request right now."
    });
  }
});

app.post("/api/admin/terminal/connection-token", requireAdmin, async (req, res) => {
  if (!requireStripe(res)) {
    return;
  }

  try {
    const requestedLocationId = String(req.body?.locationId || "").trim();
    const locationId = requestedLocationId || stripeTerminalLocationId;
    const token = await stripe.terminal.connectionTokens.create(locationId ? { location: locationId } : {});
    return res.json({
      secret: token.secret,
      locationId
    });
  } catch (error) {
    console.error("Failed creating Stripe Terminal connection token:", error);
    const details = typeof error?.message === "string" ? error.message : "";
    return res.status(500).json({
      error: details ? `Could not start Tap to Pay: ${details}` : "Could not start Tap to Pay right now."
    });
  }
});

app.post("/api/admin/terminal/create-payment-intent", requireAdmin, async (req, res) => {
  if (!requireStripe(res)) {
    return;
  }

  try {
    const cart = Array.isArray(req.body?.cart) ? req.body.cart : [];
    const customerState = req.body?.customerState;
    const customerEmail = normalizeCustomerEmail(req.body?.customerEmail);
    const customerName = String(req.body?.customerName || "").trim().slice(0, 120);
    const needsShipping = parseBooleanFlag(req.body?.needsShipping, false) === true;

    if (needsShipping) {
      return res.status(409).json({
        error: "The first Tap to Pay build supports in-person card sales only. Use browser checkout when shipping is required."
      });
    }

    const cartDetails = await buildCheckoutSessionCartDetails(cart, customerState, {
      shippingRequired: false,
      allowHiddenProducts: true
    });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: cartDetails.amountTotal,
      currency,
      payment_method_types: ["card_present"],
      capture_method: "automatic",
      metadata: {
        ...cartDetails.metadata,
        order_source: "mobile_pos_terminal",
        terminal_checkout: "true",
        fulfillment_shipping_required: "false",
        fulfillment_selected_state: cartDetails.customerState,
        fulfillment_hold_reason: "",
        fulfillment_state_match: "true"
      }
    });

    await upsertTerminalIntent(
      buildTerminalIntentContext({
        paymentIntentId: paymentIntent.id,
        cartDetails,
        customerEmail,
        customerName
      })
    );

    return res.json({
      ok: true,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      amountTotal: cartDetails.amountTotal,
      currency
    });
  } catch (error) {
    console.error("Failed creating Stripe Terminal payment intent:", error);
    const details = typeof error?.message === "string" ? error.message : "";
    return res.status(
      error instanceof TerminalIntentValidationError || isCheckoutValidationErrorMessage(details) ? 400 : 500
    ).json({
      error: details ? `Could not prepare Tap to Pay: ${details}` : "Could not prepare Tap to Pay right now."
    });
  }
});

app.post("/api/admin/terminal/cancel-payment-intent", requireAdmin, async (req, res) => {
  if (!requireStripe(res)) {
    return;
  }

  const paymentIntentId = String(req.body?.paymentIntentId || "").trim();
  if (!paymentIntentId) {
    return res.status(400).json({ error: "Payment intent ID is required." });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (!paymentIntent) {
      return res.status(404).json({ error: "Tap to Pay payment intent was not found." });
    }
    if (paymentIntent.status === "succeeded") {
      return res.status(409).json({ error: "This Tap to Pay payment already succeeded and cannot be canceled." });
    }
    if (paymentIntent.status !== "canceled") {
      await stripe.paymentIntents.cancel(paymentIntentId);
    }
    await deleteTerminalIntent(paymentIntentId);
    return res.json({
      ok: true,
      paymentIntentId,
      canceled: true
    });
  } catch (error) {
    console.error("Failed canceling Stripe Terminal payment intent:", error);
    const details = typeof error?.message === "string" ? error.message : "";
    return res.status(500).json({
      error: details ? `Could not cancel Tap to Pay: ${details}` : "Could not cancel Tap to Pay right now."
    });
  }
});

app.post("/api/admin/terminal/finalize-payment-intent", requireAdmin, async (req, res) => {
  if (!requireStripe(res)) {
    return;
  }

  const paymentIntentId = String(req.body?.paymentIntentId || "").trim();
  if (!paymentIntentId) {
    return res.status(400).json({ error: "Payment intent ID is required." });
  }

  try {
    const existingOrder = await findNormalizedManualOrderById(buildTerminalManualOrderId(paymentIntentId));
    if (existingOrder) {
      return res.json({
        ok: true,
        existing: true,
        order: buildManualOrderReceiptPayload(existingOrder)
      });
    }

    const terminalIntent = await findTerminalIntentById(paymentIntentId);
    if (!terminalIntent) {
      return res.status(404).json({
        error: "Tap to Pay session data was not found. Create the payment again before finalizing."
      });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (!paymentIntent) {
      return res.status(404).json({ error: "Tap to Pay payment intent was not found." });
    }
    if (paymentIntent.status !== "succeeded") {
      return res.status(409).json({
        error: `Tap to Pay payment is ${paymentIntent.status || "not ready"} and cannot be finalized yet.`
      });
    }

    const createdOrder = await createManualOrder(
      buildManualTerminalCardOrder({
        paymentIntent,
        terminalIntent
      })
    );
    await deleteTerminalIntent(paymentIntentId);
    invalidateSoldCopiesCache();

    const receiptPayload = buildManualOrderReceiptPayload(createdOrder);
    const customerEmail = String(createdOrder.customerEmail || "").trim().toLowerCase();
    let emailed = false;

    if (customerEmail && getEmailHealth().emailSendingEnabled) {
      try {
        await sendCustomerReceipt({
          customerEmail,
          ...buildCustomerReceiptEmailPayload(receiptPayload)
        });
        emailed = true;
      } catch (error) {
        console.error("Failed sending Tap to Pay receipt email:", error);
      }
    }

    return res.status(201).json({
      ok: true,
      order: receiptPayload,
      emailed,
      email: customerEmail
    });
  } catch (error) {
    console.error("Failed finalizing Stripe Terminal payment intent:", error);
    const details = typeof error?.message === "string" ? error.message : "";
    return res.status(
      error instanceof ManualOrderValidationError || error instanceof TerminalIntentValidationError ? 400 : 500
    ).json({
      error: details ? `Could not finalize Tap to Pay sale: ${details}` : "Could not finalize Tap to Pay sale right now."
    });
  }
});

app.post("/api/admin/pos/create-checkout-session", requireAdmin, async (req, res) => {
  if (!requireStripe(res)) {
    return;
  }

  try {
    const appUrl = getAppUrl(req);
    const cart = Array.isArray(req.body?.cart) ? req.body.cart : [];
    const customerState = req.body?.customerState;
    const customerEmail = normalizeCustomerEmail(req.body?.customerEmail);
    const needsShipping = parseBooleanFlag(req.body?.needsShipping, false) === true;
    const shippingDetails = needsShipping
      ? normalizeCheckoutShippingInput(req.body?.shippingInfo, customerState)
      : null;
    const { session } = await createCheckoutSessionForCart(req, cart, customerState, {
      shippingRequired: needsShipping,
      requireShippingDetails: needsShipping,
      shippingDetails,
      customerEmail,
      orderSource: "admin_pos",
      successUrl: `${appUrl}/pos?pos=success&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${appUrl}/pos?pos=cancel`,
      allowPromotionCodes: true,
      allowHiddenProducts: true
    });
    return res.json({
      url: session.url,
      sessionId: session.id
    });
  } catch (error) {
    console.error("Failed creating admin POS checkout session:", error);
    const details = typeof error?.message === "string" ? error.message : "";
    return res.status(isCheckoutValidationErrorMessage(details) ? 400 : 500).json({
      error: details ? `Could not start POS checkout: ${details}` : "Could not start POS checkout right now."
    });
  }
});

app.post("/api/admin/pos/create-cash-sale", requireAdmin, async (req, res) => {
  try {
    if (getTaxRuntimeStatus() === "stripe_automatic") {
      return res.status(409).json({
        error:
          "Cash POS needs an exact tax total. Switch Stripe automatic tax off or use manual tax mode before recording cash sales."
      });
    }

    const cart = Array.isArray(req.body?.cart) ? req.body.cart : [];
    const customerState = req.body?.customerState;
    const customerEmail = normalizeCustomerEmail(req.body?.customerEmail);
    const needsShipping = parseBooleanFlag(req.body?.needsShipping, false) === true;
    const shippingDetails = needsShipping
      ? normalizeCheckoutShippingInput(
          {
            ...(req.body?.shippingInfo || {}),
            email: req.body?.shippingInfo?.email || customerEmail
          },
          customerState
        )
      : null;
    const cartDetails = await buildCheckoutSessionCartDetails(cart, customerState, {
      shippingRequired: needsShipping,
      allowHiddenProducts: true
    });

    if (needsShipping) {
      if (!hasCompleteCheckoutShippingInput(shippingDetails)) {
        return res.status(400).json({
          error: "Name, address line 1, city, state, and ZIP are required for shipped POS orders."
        });
      }
      if (shippingDetails.country !== "US") {
        return res.status(400).json({
          error: "Only U.S. shipping addresses are supported for shipped POS orders."
        });
      }
    }

    const cashReceivedCents = parseCashReceivedCents(req.body?.cashReceivedCents, cartDetails.amountTotal);
    if (!Number.isFinite(cashReceivedCents)) {
      return res.status(400).json({ error: "Enter a valid cash amount received." });
    }
    if (cashReceivedCents < cartDetails.amountTotal) {
      return res.status(400).json({ error: "Cash received must be at least the sale total." });
    }

    const createdOrder = await createManualOrder(
      buildManualCashOrder({
        cartDetails,
        shippingRequired: needsShipping,
        shippingDetails,
        cashReceivedCents,
        customerEmail
      })
    );
    invalidateSoldCopiesCache();
    return res.status(201).json({
      ok: true,
      order: buildManualOrderReceiptPayload(createdOrder)
    });
  } catch (error) {
    const details = typeof error?.message === "string" ? error.message : "";
    return res.status(
      error instanceof ManualOrderValidationError || isCheckoutValidationErrorMessage(details) ? 400 : 500
    ).json({
      error: details ? `Could not record cash sale: ${details}` : "Could not record cash sale right now."
    });
  }
});

app.post("/api/admin/orders/:id/send-receipt", requireAdmin, async (req, res) => {
  const orderId = String(req.params.id || "").trim();
  if (!orderId) {
    return res.status(400).json({ error: "Order ID is required." });
  }

  const emailHealth = getEmailHealth();
  if (!emailHealth.emailSendingEnabled) {
    return res.status(503).json({ error: "Receipt email sending is not configured right now." });
  }

  let overrideEmail = "";
  try {
    overrideEmail = normalizeCustomerEmail(req.body?.email);
  } catch (error) {
    return res.status(400).json({ error: error.message || "Enter a valid email address." });
  }

  try {
    const manualOrder = await findNormalizedManualOrderById(orderId);
    if (manualOrder) {
      const customerEmail = overrideEmail || String(manualOrder.customerEmail || "").trim().toLowerCase();
      if (!customerEmail) {
        return res.status(400).json({ error: "No receipt email is available for this order." });
      }

      let receiptPayload = buildManualOrderReceiptPayload(manualOrder);
      if (overrideEmail && overrideEmail !== manualOrder.customerEmail) {
        const updatedOrder = await updateManualOrder(orderId, {
          customerEmail: overrideEmail,
          shippingDetails: manualOrder.shippingRequired
            ? {
                ...(manualOrder.shippingDetails || {}),
                email: overrideEmail
              }
            : manualOrder.shippingDetails
        });
        receiptPayload = buildManualOrderReceiptPayload(updatedOrder);
      }

      await sendCustomerReceipt({
        customerEmail,
        ...buildCustomerReceiptEmailPayload(receiptPayload)
      });

      return res.json({
        ok: true,
        emailed: true,
        orderId,
        email: customerEmail
      });
    }

    if (!requireStripe(res)) {
      return;
    }

    const stripeReceiptContext = await getStripeOrderReceiptContext(orderId);
    if (!stripeReceiptContext) {
      return res.status(404).json({ error: "Paid order not found." });
    }

    const customerEmail =
      overrideEmail || String(stripeReceiptContext.receiptPayload.customerEmail || "").trim().toLowerCase();
    if (!customerEmail) {
      return res.status(400).json({ error: "No receipt email is available for this order." });
    }

    await sendCustomerReceipt({
      customerEmail,
      ...buildCustomerReceiptEmailPayload(stripeReceiptContext.receiptPayload)
    });

    return res.json({
      ok: true,
      emailed: true,
      orderId,
      email: customerEmail
    });
  } catch (error) {
    const details = typeof error?.message === "string" ? error.message : "";
    return res.status(500).json({
      error: details ? `Could not send receipt: ${details}` : "Could not send receipt right now."
    });
  }
});

app.get("/api/order/:sessionId", async (req, res) => {
  const manualOrder = await findNormalizedManualOrderById(req.params.sessionId);
  if (manualOrder) {
    return res.json(buildManualOrderReceiptPayload(manualOrder));
  }

  if (!requireStripe(res)) {
    return;
  }

  try {
    const stripeReceiptContext = await getStripeOrderReceiptContext(req.params.sessionId);
    if (!stripeReceiptContext) {
      return res.status(404).json({ error: "Order not found." });
    }
    return res.json(stripeReceiptContext.receiptPayload);
  } catch {
    return res.status(404).json({ error: "Order not found." });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/admin", (req, res) => {
  res.redirect("/admin.html");
});

app.get("/pos", (req, res) => {
  res.redirect("/pos.html");
});

app.get("/fulfillment", (req, res) => {
  res.redirect("/fulfillment.html");
});

app.get("/completed-orders", (req, res) => {
  res.redirect("/completed-orders.html");
});

app.use((error, req, res, next) => {
  if (!error) {
    return next();
  }

  const isApiRequest = String(req.path || "").startsWith("/api/");
  if (isApiRequest) {
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        if (String(error.field || "").trim() === "labelsPdf") {
          return res.status(400).json({ error: "Labels PDF must be 20MB or smaller." });
        }
        if (String(error.field || "").trim() === "ebookFile") {
          return res.status(400).json({ error: "Ebook PDF must be 30MB or smaller." });
        }
        if (String(error.field || "").trim() === "coverImage") {
          return res.status(400).json({ error: "Ebook cover image must be 30MB or smaller." });
        }
        return res.status(400).json({ error: "Image must be 6MB or smaller." });
      }
      return res.status(400).json({ error: error.message });
    }
    if (error?.message) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: "Unexpected server error." });
  }

  return next(error);
});

app.get("*", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

async function start() {
  await ensureProductStore();
  await ensureSiteSettingsStore();
  await ensureMemberStore();
  await ensurePremiumLibraryStore();
  await ensureMemberEbookLoanStore();
  await ensureMemberCommunityStore();
  await ensureMemberPerkFulfillmentStore();
  await ensureAddressBookStore();
  await ensureOrderExclusionStore();
  await ensureManualOrderStore();
  await ensureTerminalIntentStore();
  await fs.mkdir(uploadsDir, { recursive: true });
  await fs.mkdir(premiumEbookUploadsDir, { recursive: true });

  app.listen(port, () => {
    if (!stripe) {
      console.warn("STRIPE_SECRET_KEY is missing. Checkout is disabled until configured.");
    }
    if (!adminPassword) {
      console.warn("ADMIN_PASSWORD is missing. Admin product editor is disabled.");
    }
    if (stripe) {
      const configuredTierCount = getPublicMembershipPlans().filter((plan) => plan.configured).length;
      if (configuredTierCount === 0) {
        console.warn(
          "No membership tier Stripe prices are configured. Set STRIPE_TIER_STANDARD_PRICE_ID / STRIPE_TIER_PLUS_PRICE_ID / STRIPE_TIER_PREMIUM_PRICE_ID."
        );
      }
    }
    console.log(`PublisHearts store running on http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error("Failed to start PublisHearts store:", error);
  process.exit(1);
});
