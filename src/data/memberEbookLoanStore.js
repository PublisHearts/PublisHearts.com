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

const memberEbookLoansFilePath =
  (process.env.MEMBER_EBOOK_LOANS_FILE || "").trim() ||
  path.join(process.cwd(), "data", "member-ebook-loans.json");
const memberEbookLoansStoreKey = "member-ebook-loans";

let loaded = false;
let loans = [];
let writeQueue = Promise.resolve();

export class MemberEbookLoanValidationError extends Error {}

function cleanMemberId(value) {
  const text = String(value || "").trim();
  if (!text) {
    throw new MemberEbookLoanValidationError("Member ID is required.");
  }
  if (text.length > 120) {
    throw new MemberEbookLoanValidationError("Member ID is too long.");
  }
  return text;
}

function cleanMonthKey(value) {
  const text = String(value || "").trim();
  if (!/^\d{4}-\d{2}$/.test(text)) {
    throw new MemberEbookLoanValidationError("Month key must use YYYY-MM format.");
  }
  return text;
}

function cleanEbookIds(value) {
  const ids = Array.isArray(value) ? value : [];
  const unique = [];
  const seen = new Set();
  for (const entry of ids) {
    const id = String(entry || "").trim();
    if (!id) {
      continue;
    }
    if (id.length > 120) {
      throw new MemberEbookLoanValidationError("Ebook ID is too long.");
    }
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    unique.push(id);
  }
  return unique;
}

function cleanIsoTimestamp(value) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    throw new MemberEbookLoanValidationError("Timestamp value is invalid.");
  }
  return date.toISOString();
}

function normalizeStoredLoan(raw = {}) {
  const createdAt = cleanIsoTimestamp(raw.createdAt) || new Date().toISOString();
  const updatedAt = cleanIsoTimestamp(raw.updatedAt) || createdAt;
  return {
    id: String(raw.id || "").trim() || randomUUID(),
    memberId: cleanMemberId(raw.memberId),
    monthKey: cleanMonthKey(raw.monthKey),
    ebookIds: cleanEbookIds(raw.ebookIds),
    createdAt,
    updatedAt
  };
}

function cloneLoan(loan) {
  return {
    ...loan,
    ebookIds: Array.isArray(loan.ebookIds) ? [...loan.ebookIds] : []
  };
}

async function persistLoans() {
  writeQueue = writeQueue.then(async () => {
    if (isPostgresJsonStoreEnabled()) {
      await writePostgresJsonStore(memberEbookLoansStoreKey, loans);
      return;
    }
    const directory = path.dirname(memberEbookLoansFilePath);
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(memberEbookLoansFilePath, `${JSON.stringify(loans, null, 2)}\n`, "utf8");
  });
  return writeQueue;
}

function normalizeLoansArray(parsed) {
  if (!Array.isArray(parsed)) {
    throw new MemberEbookLoanValidationError("Member ebook loans file must contain an array.");
  }
  return parsed.map((entry) => normalizeStoredLoan(entry));
}

async function readLoansFromDiskArray() {
  try {
    const raw = await fs.readFile(memberEbookLoansFilePath, "utf8");
    return normalizeLoansArray(JSON.parse(raw));
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
    return [];
  }
}

async function loadLoans() {
  if (isPostgresJsonStoreEnabled()) {
    const stored = await readPostgresJsonStore(memberEbookLoansStoreKey);
    if (stored.found) {
      loans = normalizeLoansArray(stored.value);
      loaded = true;
      return;
    }
    loans = await readLoansFromDiskArray();
    await persistLoans();
    loaded = true;
    return;
  }

  try {
    const raw = await fs.readFile(memberEbookLoansFilePath, "utf8");
    loans = normalizeLoansArray(JSON.parse(raw));
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
    loans = [];
    await persistLoans();
  }
  loaded = true;
}

async function ensureLoaded() {
  if (!loaded) {
    await loadLoans();
  }
}

export async function ensureMemberEbookLoanStore() {
  await ensureLoaded();
}

export async function findMemberEbookLoan(memberId, monthKey) {
  await ensureLoaded();
  const cleanMember = cleanMemberId(memberId);
  const cleanMonth = cleanMonthKey(monthKey);
  const found = loans.find((entry) => entry.memberId === cleanMember && entry.monthKey === cleanMonth);
  return found ? cloneLoan(found) : null;
}

export async function upsertMemberEbookLoan({ memberId, monthKey, ebookIds }) {
  await ensureLoaded();
  const cleanMember = cleanMemberId(memberId);
  const cleanMonth = cleanMonthKey(monthKey);
  const cleanIds = cleanEbookIds(ebookIds);
  const now = new Date().toISOString();
  const index = loans.findIndex((entry) => entry.memberId === cleanMember && entry.monthKey === cleanMonth);

  if (index === -1) {
    const created = {
      id: randomUUID(),
      memberId: cleanMember,
      monthKey: cleanMonth,
      ebookIds: cleanIds,
      createdAt: now,
      updatedAt: now
    };
    loans.unshift(created);
    await persistLoans();
    return cloneLoan(created);
  }

  loans[index] = {
    ...loans[index],
    ebookIds: cleanIds,
    updatedAt: now
  };
  await persistLoans();
  return cloneLoan(loans[index]);
}
