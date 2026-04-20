import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";

dotenv.config();

const memberPerkFulfillmentFilePath =
  (process.env.MEMBER_PERK_FULFILLMENT_FILE || "").trim() ||
  path.join(process.cwd(), "data", "member-perk-fulfillment.json");

let loaded = false;
let records = [];
let writeQueue = Promise.resolve();

export class MemberPerkFulfillmentValidationError extends Error {}

function cloneRecord(record) {
  return {
    ...record
  };
}

function cleanMemberId(value) {
  const memberId = String(value || "").trim();
  if (!memberId) {
    throw new MemberPerkFulfillmentValidationError("Member ID is required.");
  }
  if (memberId.length > 120) {
    throw new MemberPerkFulfillmentValidationError("Member ID is too long.");
  }
  return memberId;
}

function cleanMonthKey(value) {
  const monthKey = String(value || "").trim();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey)) {
    throw new MemberPerkFulfillmentValidationError("Month key must use YYYY-MM format.");
  }
  return monthKey;
}

function cleanIsoTimestamp(value) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    throw new MemberPerkFulfillmentValidationError("Timestamp value is invalid.");
  }
  return date.toISOString();
}

function cleanOptionalText(value, maxLength = 500) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }
  return text.slice(0, maxLength);
}

function normalizeRecord(raw = {}) {
  const createdAt = cleanIsoTimestamp(raw.createdAt) || new Date().toISOString();
  const updatedAt = cleanIsoTimestamp(raw.updatedAt) || createdAt;
  return {
    memberId: cleanMemberId(raw.memberId),
    monthKey: cleanMonthKey(raw.monthKey),
    stickersFulfilledAt: cleanIsoTimestamp(raw.stickersFulfilledAt),
    stickersTrackingNumber: cleanOptionalText(raw.stickersTrackingNumber, 140),
    stickersNote: cleanOptionalText(raw.stickersNote, 500),
    paperbackFulfilledAt: cleanIsoTimestamp(raw.paperbackFulfilledAt),
    paperbackTrackingNumber: cleanOptionalText(raw.paperbackTrackingNumber, 140),
    paperbackNote: cleanOptionalText(raw.paperbackNote, 500),
    createdAt,
    updatedAt
  };
}

async function persistRecords() {
  writeQueue = writeQueue.then(async () => {
    const directory = path.dirname(memberPerkFulfillmentFilePath);
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(memberPerkFulfillmentFilePath, `${JSON.stringify(records, null, 2)}\n`, "utf8");
  });
  return writeQueue;
}

async function loadRecordsFromDisk() {
  try {
    const raw = await fs.readFile(memberPerkFulfillmentFilePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new MemberPerkFulfillmentValidationError("Member perk fulfillment file must contain an array.");
    }
    const seenKeys = new Set();
    records = parsed.map((entry) => {
      const normalized = normalizeRecord(entry);
      const key = `${normalized.memberId}:${normalized.monthKey}`;
      if (seenKeys.has(key)) {
        throw new MemberPerkFulfillmentValidationError(
          `Duplicate member perk fulfillment record found for ${normalized.memberId} ${normalized.monthKey}.`
        );
      }
      seenKeys.add(key);
      return normalized;
    });
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
    records = [];
    await persistRecords();
  }

  loaded = true;
}

async function ensureLoaded() {
  if (!loaded) {
    await loadRecordsFromDisk();
  }
}

export async function ensureMemberPerkFulfillmentStore() {
  await ensureLoaded();
}

export async function listMemberPerkFulfillmentRecords({ monthKey = "" } = {}) {
  await ensureLoaded();
  const cleanMonth = monthKey ? cleanMonthKey(monthKey) : "";
  const filtered = cleanMonth ? records.filter((entry) => entry.monthKey === cleanMonth) : records;
  return filtered.map((entry) => cloneRecord(entry));
}

export async function findMemberPerkFulfillmentRecord(memberId, monthKey) {
  await ensureLoaded();
  const cleanMember = cleanMemberId(memberId);
  const cleanMonth = cleanMonthKey(monthKey);
  const found = records.find((entry) => entry.memberId === cleanMember && entry.monthKey === cleanMonth);
  return found ? cloneRecord(found) : null;
}

export async function upsertMemberPerkFulfillmentRecord({
  memberId,
  monthKey,
  stickersFulfilledAt,
  stickersTrackingNumber,
  stickersNote,
  paperbackFulfilledAt,
  paperbackTrackingNumber,
  paperbackNote
}) {
  await ensureLoaded();
  const cleanMember = cleanMemberId(memberId);
  const cleanMonth = cleanMonthKey(monthKey);
  const nowIso = new Date().toISOString();

  const index = records.findIndex((entry) => entry.memberId === cleanMember && entry.monthKey === cleanMonth);
  const current = index >= 0 ? records[index] : null;
  const nextRaw = {
    ...(current || {
      memberId: cleanMember,
      monthKey: cleanMonth,
      stickersFulfilledAt: "",
      stickersTrackingNumber: "",
      stickersNote: "",
      paperbackFulfilledAt: "",
      paperbackTrackingNumber: "",
      paperbackNote: "",
      createdAt: nowIso
    }),
    memberId: cleanMember,
    monthKey: cleanMonth,
    ...(stickersFulfilledAt !== undefined ? { stickersFulfilledAt } : {}),
    ...(stickersTrackingNumber !== undefined ? { stickersTrackingNumber } : {}),
    ...(stickersNote !== undefined ? { stickersNote } : {}),
    ...(paperbackFulfilledAt !== undefined ? { paperbackFulfilledAt } : {}),
    ...(paperbackTrackingNumber !== undefined ? { paperbackTrackingNumber } : {}),
    ...(paperbackNote !== undefined ? { paperbackNote } : {}),
    updatedAt: nowIso
  };

  const normalized = normalizeRecord(nextRaw);
  if (index === -1) {
    records.unshift(normalized);
  } else {
    records[index] = normalized;
  }
  await persistRecords();
  return cloneRecord(normalized);
}
