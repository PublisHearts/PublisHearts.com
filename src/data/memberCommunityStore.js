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

const memberCommunityPostsFilePath =
  (process.env.MEMBER_COMMUNITY_POSTS_FILE || "").trim() ||
  path.join(process.cwd(), "data", "member-community-posts.json");
const memberCommunityPostsStoreKey = "member-community-posts";

let loaded = false;
let posts = [];
let writeQueue = Promise.resolve();

export class MemberCommunityValidationError extends Error {}

function cleanText(value, label, maxLength, { required = true } = {}) {
  const text = String(value || "").trim();
  if (!text) {
    if (required) {
      throw new MemberCommunityValidationError(`${label} is required.`);
    }
    return "";
  }
  if (text.length > maxLength) {
    throw new MemberCommunityValidationError(`${label} must be ${maxLength} characters or less.`);
  }
  return text;
}

function cleanOptionalImageUrl(value) {
  const text = cleanText(value, "Image URL", 800, { required: false });
  if (!text) {
    return "";
  }
  if (text.startsWith("/uploads/") || /^https?:\/\//i.test(text)) {
    return text;
  }
  throw new MemberCommunityValidationError("Image URL must start with https://, http://, or /uploads/.");
}

function cleanIsoTimestamp(value) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    throw new MemberCommunityValidationError("Post timestamp is invalid.");
  }
  return date.toISOString();
}

function normalizeStoredPost(raw = {}) {
  const createdAt = cleanIsoTimestamp(raw.createdAt) || new Date().toISOString();
  const updatedAt = cleanIsoTimestamp(raw.updatedAt) || createdAt;
  return {
    id: cleanText(raw.id || randomUUID(), "Post ID", 120),
    memberId: cleanText(raw.memberId, "Member ID", 120),
    authorName: cleanText(raw.authorName, "Author name", 80),
    body: cleanText(raw.body, "Post text", 1800),
    imageUrl: cleanOptionalImageUrl(raw.imageUrl),
    createdAt,
    updatedAt
  };
}

function clonePost(post) {
  return {
    ...post
  };
}

async function persistPosts() {
  writeQueue = writeQueue.then(async () => {
    if (isPostgresJsonStoreEnabled()) {
      await writePostgresJsonStore(memberCommunityPostsStoreKey, posts);
      return;
    }
    const directory = path.dirname(memberCommunityPostsFilePath);
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(memberCommunityPostsFilePath, `${JSON.stringify(posts, null, 2)}\n`, "utf8");
  });
  return writeQueue;
}

function normalizePostsArray(parsed) {
  if (!Array.isArray(parsed)) {
    throw new MemberCommunityValidationError("Community posts file must contain an array.");
  }
  return parsed.map((entry) => normalizeStoredPost(entry));
}

async function readPostsFromDiskArray() {
  try {
    const raw = await fs.readFile(memberCommunityPostsFilePath, "utf8");
    return normalizePostsArray(JSON.parse(raw));
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
    return [];
  }
}

async function loadPosts() {
  if (isPostgresJsonStoreEnabled()) {
    const stored = await readPostgresJsonStore(memberCommunityPostsStoreKey);
    if (stored.found) {
      posts = normalizePostsArray(stored.value);
      loaded = true;
      return;
    }
    posts = await readPostsFromDiskArray();
    await persistPosts();
    loaded = true;
    return;
  }

  try {
    const raw = await fs.readFile(memberCommunityPostsFilePath, "utf8");
    posts = normalizePostsArray(JSON.parse(raw));
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
    posts = [];
    await persistPosts();
  }

  loaded = true;
}

async function ensureLoaded() {
  if (!loaded) {
    await loadPosts();
  }
}

export async function ensureMemberCommunityStore() {
  await ensureLoaded();
}

export async function listMemberCommunityPosts({ limit = 100 } = {}) {
  await ensureLoaded();
  const max = Number.isFinite(limit) ? Math.max(1, Math.min(300, Math.round(limit))) : 100;
  return posts.slice(0, max).map(clonePost);
}

export async function createMemberCommunityPost({ memberId, authorName, body, imageUrl = "" }) {
  await ensureLoaded();
  const now = new Date().toISOString();
  const created = {
    id: randomUUID(),
    memberId: cleanText(memberId, "Member ID", 120),
    authorName: cleanText(authorName, "Author name", 80),
    body: cleanText(body, "Post text", 1800),
    imageUrl: cleanOptionalImageUrl(imageUrl),
    createdAt: now,
    updatedAt: now
  };
  posts.unshift(created);
  await persistPosts();
  return clonePost(created);
}
