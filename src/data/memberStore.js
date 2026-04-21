import { randomUUID } from "crypto";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import {
  isPostgresJsonStoreEnabled,
  readPostgresJsonStore,
  writePostgresJsonStore
} from "./postgresJsonStore.js";

dotenv.config();

const memberAccountsFilePath =
  (process.env.MEMBER_ACCOUNTS_FILE || "").trim() || path.join(process.cwd(), "data", "member-accounts.json");
const memberAccountsStoreKey = "member-accounts";

const validSubscriptionStatuses = new Set([
  "inactive",
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "paused"
]);
const validMemberRoles = new Set(["member", "admin"]);
const validMembershipTiers = new Set(["none", "standard", "plus", "premium"]);
const configuredMemberAdminEmails = new Set(
  String(process.env.MEMBER_ADMIN_EMAILS || "")
    .split(",")
    .map((entry) => String(entry || "").trim().toLowerCase())
    .filter((entry) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entry))
);

let loaded = false;
let members = [];
let writeQueue = Promise.resolve();

export class MemberValidationError extends Error {}

function cloneMember(member) {
  return {
    ...member
  };
}

function cleanDisplayName(value) {
  const text = String(value || "").trim();
  if (!text) {
    throw new MemberValidationError("Display name is required.");
  }
  if (text.length < 2 || text.length > 80) {
    throw new MemberValidationError("Display name must be between 2 and 80 characters.");
  }
  return text;
}

function normalizeEmail(value) {
  const email = String(value || "")
    .trim()
    .toLowerCase();
  if (!email) {
    throw new MemberValidationError("Email is required.");
  }
  if (email.length > 180) {
    throw new MemberValidationError("Email is too long.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new MemberValidationError("Enter a valid email address.");
  }
  return email;
}

function cleanHash(value, label) {
  const hash = String(value || "").trim().toLowerCase();
  if (!hash) {
    throw new MemberValidationError(`${label} is required.`);
  }
  if (!/^[a-f0-9]{32,512}$/.test(hash)) {
    throw new MemberValidationError(`${label} is invalid.`);
  }
  return hash;
}

function cleanOptionalTokenHash(value) {
  const hash = String(value || "").trim().toLowerCase();
  if (!hash) {
    return "";
  }
  if (!/^[a-f0-9]{32,512}$/.test(hash)) {
    throw new MemberValidationError("Session token hash is invalid.");
  }
  return hash;
}

function cleanOptionalStripeId(value, maxLength = 180) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }
  if (text.length > maxLength) {
    throw new MemberValidationError("Stripe reference is too long.");
  }
  return text;
}

function cleanOptionalText(value, maxLength = 240) {
  return String(value || "")
    .trim()
    .replace(/\r\n/g, "\n")
    .slice(0, maxLength);
}

function cleanOptionalPhone(value, maxLength = 24) {
  return String(value || "")
    .trim()
    .slice(0, maxLength);
}

function cleanOptionalStateCode(value) {
  const code = String(value || "")
    .trim()
    .toUpperCase();
  if (!code) {
    return "";
  }
  if (!/^[A-Z]{2}$/.test(code)) {
    return "";
  }
  return code;
}

function cleanOptionalPostalCode(value, maxLength = 20) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .slice(0, maxLength);
}

function cleanOptionalCountryCode(value, fallback = "US") {
  const code = String(value || fallback)
    .trim()
    .toUpperCase();
  if (/^[A-Z]{2}$/.test(code)) {
    return code;
  }
  return fallback;
}

function cleanIsoTimestamp(value) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    throw new MemberValidationError("Timestamp value is invalid.");
  }
  return date.toISOString();
}

function cleanSubscriptionStatus(value) {
  const text = String(value || "inactive")
    .trim()
    .toLowerCase();
  if (!validSubscriptionStatuses.has(text)) {
    return "inactive";
  }
  return text;
}

function cleanBoolean(value, fallback = false) {
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

function cleanMemberRole(value, fallback = "member") {
  const role = String(value || fallback)
    .trim()
    .toLowerCase();
  if (!validMemberRoles.has(role)) {
    return "member";
  }
  return role;
}

function cleanMembershipTier(value, fallback = "none") {
  const normalizedValue = String(value || "")
    .trim()
    .toLowerCase();
  const normalizedFallback = String(fallback || "none")
    .trim()
    .toLowerCase();
  const normalizedTier = validMembershipTiers.has(normalizedValue)
    ? normalizedValue
    : validMembershipTiers.has(normalizedFallback)
      ? normalizedFallback
      : "none";
  if (!validMembershipTiers.has(normalizedTier)) {
    return "none";
  }
  return normalizedTier;
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

function cleanEmailLookupList(value, fallbackEmails = []) {
  const entries = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[\n,]/g)
      : [];
  const normalized = [];
  const seen = new Set();
  for (const entry of entries) {
    let email = "";
    try {
      email = normalizeEmail(entry);
    } catch {
      continue;
    }
    if (seen.has(email)) {
      continue;
    }
    seen.add(email);
    normalized.push(email);
  }

  for (const fallback of fallbackEmails) {
    const email = String(fallback || "").trim().toLowerCase();
    if (!email || seen.has(email)) {
      continue;
    }
    seen.add(email);
    normalized.push(email);
  }

  return normalized;
}

function cleanPhoneLookupList(value) {
  const entries = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[\n,]/g)
      : [];
  const normalized = [];
  const seen = new Set();
  for (const entry of entries) {
    const phone = normalizePhoneForLookup(entry);
    if (!phone || seen.has(phone)) {
      continue;
    }
    seen.add(phone);
    normalized.push(phone);
  }
  return normalized;
}

function shouldForceAdminRoleForEmail(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) {
    return false;
  }
  return configuredMemberAdminEmails.has(normalizedEmail);
}

function normalizeStoredMember(raw = {}) {
  const createdAt = cleanIsoTimestamp(raw.createdAt) || new Date().toISOString();
  const updatedAt = cleanIsoTimestamp(raw.updatedAt) || createdAt;
  const idCandidate = String(raw.id || "").trim() || randomUUID();
  const email = normalizeEmail(raw.email);
  const role = shouldForceAdminRoleForEmail(email) ? "admin" : cleanMemberRole(raw.role, "member");
  const orderLookupEmails = cleanEmailLookupList(raw.orderLookupEmails, [email]);
  const orderLookupPhones = cleanPhoneLookupList(raw.orderLookupPhones);

  return {
    id: idCandidate,
    displayName: cleanDisplayName(raw.displayName),
    email,
    role,
    membershipTier: cleanMembershipTier(raw.membershipTier, "none"),
    orderLookupEmails,
    orderLookupPhones,
    passwordHash: cleanHash(raw.passwordHash, "Password hash"),
    passwordSalt: cleanHash(raw.passwordSalt, "Password salt"),
    authTokenHash: cleanOptionalTokenHash(raw.authTokenHash),
    authTokenIssuedAt: cleanIsoTimestamp(raw.authTokenIssuedAt),
    lastLoginAt: cleanIsoTimestamp(raw.lastLoginAt),
    stripeCustomerId: cleanOptionalStripeId(raw.stripeCustomerId),
    stripeSubscriptionId: cleanOptionalStripeId(raw.stripeSubscriptionId),
    subscriptionStatus: cleanSubscriptionStatus(raw.subscriptionStatus),
    subscriptionCurrentPeriodEnd: cleanIsoTimestamp(raw.subscriptionCurrentPeriodEnd),
    subscriptionCancelAtPeriodEnd: cleanBoolean(raw.subscriptionCancelAtPeriodEnd, false),
    phone: cleanOptionalPhone(raw.phone),
    state: cleanOptionalStateCode(raw.state),
    bio: cleanOptionalText(raw.bio, 1200),
    shippingName: cleanOptionalText(raw.shippingName, 120),
    shippingAddressLine1: cleanOptionalText(raw.shippingAddressLine1, 220),
    shippingAddressLine2: cleanOptionalText(raw.shippingAddressLine2, 220),
    shippingCity: cleanOptionalText(raw.shippingCity, 120),
    shippingState: cleanOptionalStateCode(raw.shippingState),
    shippingPostalCode: cleanOptionalPostalCode(raw.shippingPostalCode, 20),
    shippingCountry: cleanOptionalCountryCode(raw.shippingCountry, "US"),
    createdAt,
    updatedAt
  };
}

async function persistMembers() {
  writeQueue = writeQueue.then(async () => {
    if (isPostgresJsonStoreEnabled()) {
      await writePostgresJsonStore(memberAccountsStoreKey, members);
      return;
    }
    const directory = path.dirname(memberAccountsFilePath);
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(memberAccountsFilePath, `${JSON.stringify(members, null, 2)}\n`, "utf8");
  });
  return writeQueue;
}

function normalizeMembersArray(parsed) {
  if (!Array.isArray(parsed)) {
    throw new MemberValidationError("Member accounts file must contain an array.");
  }
  const seenEmails = new Set();
  return parsed.map((entry) => {
    const normalized = normalizeStoredMember(entry);
    if (seenEmails.has(normalized.email)) {
      throw new MemberValidationError(`Duplicate member email found: ${normalized.email}`);
    }
    seenEmails.add(normalized.email);
    return normalized;
  });
}

async function readMembersFromDiskArray() {
  try {
    const raw = await fs.readFile(memberAccountsFilePath, "utf8");
    return normalizeMembersArray(JSON.parse(raw));
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
    return [];
  }
}

async function loadMembersFromDisk() {
  try {
    const raw = await fs.readFile(memberAccountsFilePath, "utf8");
    members = normalizeMembersArray(JSON.parse(raw));
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
    members = [];
    await persistMembers();
  }
  loaded = true;
}

async function loadMembersFromPostgres() {
  const stored = await readPostgresJsonStore(memberAccountsStoreKey);
  if (stored.found) {
    members = normalizeMembersArray(stored.value);
    loaded = true;
    return;
  }
  members = await readMembersFromDiskArray();
  await persistMembers();
  loaded = true;
}

async function ensureLoaded() {
  if (!loaded) {
    if (isPostgresJsonStoreEnabled()) {
      await loadMembersFromPostgres();
      return;
    }
    await loadMembersFromDisk();
  }
}

export async function ensureMemberStore() {
  await ensureLoaded();
}

export async function listMembers() {
  await ensureLoaded();
  return members.map((entry) => cloneMember(entry));
}

export async function findMemberById(memberId) {
  await ensureLoaded();
  const targetId = String(memberId || "").trim();
  if (!targetId) {
    return null;
  }
  const found = members.find((entry) => entry.id === targetId);
  return found ? cloneMember(found) : null;
}

export async function findMemberByEmail(email) {
  await ensureLoaded();
  let normalizedEmail = "";
  try {
    normalizedEmail = normalizeEmail(email);
  } catch {
    return null;
  }
  const found = members.find((entry) => entry.email === normalizedEmail);
  return found ? cloneMember(found) : null;
}

export async function findMemberByAuthTokenHash(tokenHash) {
  await ensureLoaded();
  const hash = cleanOptionalTokenHash(tokenHash);
  if (!hash) {
    return null;
  }
  const found = members.find((entry) => entry.authTokenHash === hash);
  return found ? cloneMember(found) : null;
}

export async function findMemberByStripeCustomerId(stripeCustomerId) {
  await ensureLoaded();
  const customerId = cleanOptionalStripeId(stripeCustomerId);
  if (!customerId) {
    return null;
  }
  const found = members.find((entry) => entry.stripeCustomerId === customerId);
  return found ? cloneMember(found) : null;
}

export async function createMember({
  displayName,
  email,
  role,
  membershipTier,
  phone = "",
  state = "",
  bio = "",
  shippingName = "",
  shippingAddressLine1 = "",
  shippingAddressLine2 = "",
  shippingCity = "",
  shippingState = "",
  shippingPostalCode = "",
  shippingCountry = "US",
  orderLookupEmails,
  orderLookupPhones,
  passwordHash,
  passwordSalt,
  authTokenHash = "",
  authTokenIssuedAt = ""
}) {
  await ensureLoaded();
  const cleanName = cleanDisplayName(displayName);
  const cleanEmail = normalizeEmail(email);
  const cleanPasswordHash = cleanHash(passwordHash, "Password hash");
  const cleanPasswordSalt = cleanHash(passwordSalt, "Password salt");
  const cleanTokenHash = cleanOptionalTokenHash(authTokenHash);
  const cleanTokenIssuedAt = cleanIsoTimestamp(authTokenIssuedAt);
  const defaultRole = shouldForceAdminRoleForEmail(cleanEmail) || members.length === 0 ? "admin" : "member";
  const cleanRole = cleanMemberRole(role, defaultRole);
  const normalizedMembershipTier = cleanMembershipTier(membershipTier, "none");
  const cleanOrderLookupEmails = cleanEmailLookupList(orderLookupEmails, [cleanEmail]);
  const cleanOrderLookupPhones = cleanPhoneLookupList(orderLookupPhones);

  if (members.some((entry) => entry.email === cleanEmail)) {
    throw new MemberValidationError("An account with this email already exists.");
  }

  const createdAt = new Date().toISOString();
  const created = {
    id: randomUUID(),
    displayName: cleanName,
    email: cleanEmail,
    role: cleanRole,
    membershipTier: normalizedMembershipTier,
    orderLookupEmails: cleanOrderLookupEmails,
    orderLookupPhones: cleanOrderLookupPhones,
    passwordHash: cleanPasswordHash,
    passwordSalt: cleanPasswordSalt,
    authTokenHash: cleanTokenHash,
    authTokenIssuedAt: cleanTokenIssuedAt,
    lastLoginAt: cleanTokenIssuedAt || "",
    stripeCustomerId: "",
    stripeSubscriptionId: "",
    subscriptionStatus: "inactive",
    subscriptionCurrentPeriodEnd: "",
    subscriptionCancelAtPeriodEnd: false,
    phone: cleanOptionalPhone(phone),
    state: cleanOptionalStateCode(state),
    bio: cleanOptionalText(bio, 1200),
    shippingName: cleanOptionalText(shippingName, 120),
    shippingAddressLine1: cleanOptionalText(shippingAddressLine1, 220),
    shippingAddressLine2: cleanOptionalText(shippingAddressLine2, 220),
    shippingCity: cleanOptionalText(shippingCity, 120),
    shippingState: cleanOptionalStateCode(shippingState),
    shippingPostalCode: cleanOptionalPostalCode(shippingPostalCode, 20),
    shippingCountry: cleanOptionalCountryCode(shippingCountry, "US"),
    createdAt,
    updatedAt: createdAt
  };

  members.unshift(created);
  await persistMembers();
  return cloneMember(created);
}

export async function updateMember(memberId, updates) {
  await ensureLoaded();
  const targetId = String(memberId || "").trim();
  if (!targetId) {
    throw new MemberValidationError("Member ID is required.");
  }

  const index = members.findIndex((entry) => entry.id === targetId);
  if (index === -1) {
    return null;
  }

  const current = members[index];
  const patch = updates && typeof updates === "object" ? updates : {};
  const nextEmail =
    patch.email !== undefined
      ? normalizeEmail(patch.email)
      : current.email;
  const forcedAdminRole = shouldForceAdminRoleForEmail(nextEmail);

  if (
    nextEmail !== current.email &&
    members.some((entry) => entry.id !== targetId && entry.email === nextEmail)
  ) {
    throw new MemberValidationError("Another member already uses this email.");
  }

  const nextOrderLookupEmails =
    patch.orderLookupEmails !== undefined
      ? cleanEmailLookupList(patch.orderLookupEmails, [nextEmail])
      : cleanEmailLookupList(current.orderLookupEmails, [nextEmail]);
  const nextOrderLookupPhones =
    patch.orderLookupPhones !== undefined
      ? cleanPhoneLookupList(patch.orderLookupPhones)
      : cleanPhoneLookupList(current.orderLookupPhones);

  const next = {
    ...current,
    displayName:
      patch.displayName !== undefined
        ? cleanDisplayName(patch.displayName)
        : current.displayName,
    email: nextEmail,
    role:
      forcedAdminRole
        ? "admin"
        : patch.role !== undefined
          ? cleanMemberRole(patch.role, current.role)
          : cleanMemberRole(current.role, "member"),
    membershipTier:
      patch.membershipTier !== undefined
        ? cleanMembershipTier(patch.membershipTier, current.membershipTier)
        : cleanMembershipTier(current.membershipTier, "none"),
    orderLookupEmails: nextOrderLookupEmails,
    orderLookupPhones: nextOrderLookupPhones,
    passwordHash:
      patch.passwordHash !== undefined
        ? cleanHash(patch.passwordHash, "Password hash")
        : current.passwordHash,
    passwordSalt:
      patch.passwordSalt !== undefined
        ? cleanHash(patch.passwordSalt, "Password salt")
        : current.passwordSalt,
    authTokenHash:
      patch.authTokenHash !== undefined
        ? cleanOptionalTokenHash(patch.authTokenHash)
        : current.authTokenHash,
    authTokenIssuedAt:
      patch.authTokenIssuedAt !== undefined
        ? cleanIsoTimestamp(patch.authTokenIssuedAt)
        : current.authTokenIssuedAt,
    lastLoginAt:
      patch.lastLoginAt !== undefined
        ? cleanIsoTimestamp(patch.lastLoginAt)
        : current.lastLoginAt,
    stripeCustomerId:
      patch.stripeCustomerId !== undefined
        ? cleanOptionalStripeId(patch.stripeCustomerId)
        : current.stripeCustomerId,
    stripeSubscriptionId:
      patch.stripeSubscriptionId !== undefined
        ? cleanOptionalStripeId(patch.stripeSubscriptionId)
        : current.stripeSubscriptionId,
    subscriptionStatus:
      patch.subscriptionStatus !== undefined
        ? cleanSubscriptionStatus(patch.subscriptionStatus)
        : current.subscriptionStatus,
    subscriptionCurrentPeriodEnd:
      patch.subscriptionCurrentPeriodEnd !== undefined
        ? cleanIsoTimestamp(patch.subscriptionCurrentPeriodEnd)
        : current.subscriptionCurrentPeriodEnd,
    subscriptionCancelAtPeriodEnd:
      patch.subscriptionCancelAtPeriodEnd !== undefined
        ? cleanBoolean(patch.subscriptionCancelAtPeriodEnd, current.subscriptionCancelAtPeriodEnd)
        : current.subscriptionCancelAtPeriodEnd,
    phone:
      patch.phone !== undefined
        ? cleanOptionalPhone(patch.phone)
        : cleanOptionalPhone(current.phone),
    state:
      patch.state !== undefined
        ? cleanOptionalStateCode(patch.state)
        : cleanOptionalStateCode(current.state),
    bio:
      patch.bio !== undefined
        ? cleanOptionalText(patch.bio, 1200)
        : cleanOptionalText(current.bio, 1200),
    shippingName:
      patch.shippingName !== undefined
        ? cleanOptionalText(patch.shippingName, 120)
        : cleanOptionalText(current.shippingName, 120),
    shippingAddressLine1:
      patch.shippingAddressLine1 !== undefined
        ? cleanOptionalText(patch.shippingAddressLine1, 220)
        : cleanOptionalText(current.shippingAddressLine1, 220),
    shippingAddressLine2:
      patch.shippingAddressLine2 !== undefined
        ? cleanOptionalText(patch.shippingAddressLine2, 220)
        : cleanOptionalText(current.shippingAddressLine2, 220),
    shippingCity:
      patch.shippingCity !== undefined
        ? cleanOptionalText(patch.shippingCity, 120)
        : cleanOptionalText(current.shippingCity, 120),
    shippingState:
      patch.shippingState !== undefined
        ? cleanOptionalStateCode(patch.shippingState)
        : cleanOptionalStateCode(current.shippingState),
    shippingPostalCode:
      patch.shippingPostalCode !== undefined
        ? cleanOptionalPostalCode(patch.shippingPostalCode, 20)
        : cleanOptionalPostalCode(current.shippingPostalCode, 20),
    shippingCountry:
      patch.shippingCountry !== undefined
        ? cleanOptionalCountryCode(patch.shippingCountry, "US")
        : cleanOptionalCountryCode(current.shippingCountry, "US"),
    updatedAt: new Date().toISOString()
  };

  members[index] = next;
  await persistMembers();
  return cloneMember(next);
}
