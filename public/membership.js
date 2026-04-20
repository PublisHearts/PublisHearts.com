const memberTokenStorageKey = "publishearts_member_token_v1";

const pageMessageEl = document.getElementById("membership-page-message");
const authCardEl = document.getElementById("membership-auth-card");
const accountCardEl = document.getElementById("membership-account-card");
const authMessageEl = document.getElementById("membership-auth-message");
const accountMessageEl = document.getElementById("membership-account-message");
const communityMessageEl = document.getElementById("membership-community-message");
const libraryMessageEl = document.getElementById("membership-library-message");
const ordersMessageEl = document.getElementById("membership-orders-message");
const accountNameEl = document.getElementById("membership-account-name");
const accountEmailEl = document.getElementById("membership-account-email");
const accountRoleEl = document.getElementById("membership-account-role");
const tierSummaryEl = document.getElementById("membership-tier-summary");
const tierPerksEl = document.getElementById("membership-tier-perks");
const statusPillEl = document.getElementById("membership-status-pill");
const periodEndEl = document.getElementById("membership-period-end");
const subscribeBtn = document.getElementById("membership-subscribe-btn");
const billingBtn = document.getElementById("membership-billing-btn");
const logoutBtn = document.getElementById("membership-logout-btn");
const registerForm = document.getElementById("membership-register-form");
const loginForm = document.getElementById("membership-login-form");
const libraryListEl = document.getElementById("membership-library-list");
const libraryMetaEl = document.getElementById("membership-library-meta");
const savePicksBtn = document.getElementById("membership-save-picks-btn");
const communityListEl = document.getElementById("membership-community-list");
const communityPostForm = document.getElementById("membership-post-form");
const postBodyEl = document.getElementById("membership-post-body");
const postImageUrlEl = document.getElementById("membership-post-image-url");
const libraryLockEl = document.getElementById("membership-library-lock");
const communityLockEl = document.getElementById("membership-community-lock");
const planGridEl = document.getElementById("membership-plan-grid");
const ordersListEl = document.getElementById("membership-orders-list");
const refreshOrdersBtn = document.getElementById("membership-refresh-orders-btn");
const orderAccessForm = document.getElementById("membership-order-access-form");
const orderAccessEmailsEl = document.getElementById("membership-order-access-emails");
const orderAccessPhonesEl = document.getElementById("membership-order-access-phones");
const orderAccessMessageEl = document.getElementById("membership-order-access-message");
const saveOrderAccessBtn = document.getElementById("membership-save-order-access-btn");

const state = {
  token: window.sessionStorage.getItem(memberTokenStorageKey) || window.localStorage.getItem(memberTokenStorageKey) || "",
  member: null,
  plans: [],
  selectedTierKey: "standard",
  library: {
    monthKey: "",
    selectionLimit: null,
    allEbooksAccess: false,
    selectedEbookIds: [],
    availableEbooks: [],
    monthlyRandomPaperback: null
  },
  draftEbookIds: new Set(),
  posts: [],
  orders: [],
  busy: false
};

if (!window.sessionStorage.getItem(memberTokenStorageKey) && window.localStorage.getItem(memberTokenStorageKey)) {
  window.sessionStorage.setItem(memberTokenStorageKey, state.token);
}
window.localStorage.removeItem(memberTokenStorageKey);

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(date);
}

function formatMoney(amountCents = 0, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: String(currency || "usd").toUpperCase()
  }).format((Number(amountCents) || 0) / 100);
}

function parseContactTextInput(value) {
  return String(value || "")
    .split(/[\n,]/g)
    .map((entry) => String(entry || "").trim())
    .filter(Boolean);
}

function setMessage(target, message = "", isError = false) {
  if (!target) {
    return;
  }
  target.textContent = message || "";
  target.classList.toggle("error", Boolean(isError));
}

function setToken(token) {
  const normalized = String(token || "").trim();
  state.token = normalized;
  if (!normalized) {
    window.sessionStorage.removeItem(memberTokenStorageKey);
    window.localStorage.removeItem(memberTokenStorageKey);
    return;
  }
  window.sessionStorage.setItem(memberTokenStorageKey, normalized);
  window.localStorage.removeItem(memberTokenStorageKey);
}

function getSubscriptionStatus(member) {
  return String(member?.subscriptionStatus || "inactive")
    .trim()
    .toLowerCase();
}

function isPremiumActive(member) {
  const status = getSubscriptionStatus(member);
  return status === "active" || status === "trialing";
}

function prettyStatusLabel(member) {
  const status = getSubscriptionStatus(member);
  if (!status) {
    return "Inactive";
  }
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

async function apiRequest(url, { method = "GET", body, auth = true } = {}) {
  const headers = {};
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (auth && state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = String(payload?.error || "").trim() || `Request failed (${response.status})`;
    throw new Error(message);
  }

  return payload;
}

function planSortValue(planKey) {
  if (planKey === "standard") {
    return 1;
  }
  if (planKey === "plus") {
    return 2;
  }
  if (planKey === "premium") {
    return 3;
  }
  return 99;
}

function getPlanByKey(planKey) {
  return (Array.isArray(state.plans) ? state.plans : []).find((plan) => String(plan?.key || "").trim() === planKey) || null;
}

function renderPlans() {
  if (!planGridEl) {
    return;
  }

  const plans = [...(Array.isArray(state.plans) ? state.plans : [])].sort(
    (left, right) => planSortValue(left?.key) - planSortValue(right?.key)
  );

  if (plans.length === 0) {
    planGridEl.innerHTML = '<p class="cart-item-sub">Membership tiers are loading.</p>';
    return;
  }

  planGridEl.innerHTML = plans
    .map((plan) => {
      const key = String(plan?.key || "").trim();
      const configured = plan?.configured === true;
      const selected = key === state.selectedTierKey;
      const selectedClass = selected ? "is-selected" : "";
      const perks = [];
      if (plan?.allEbooksAccess) {
        perks.push("All ebooks every month");
      } else {
        perks.push(`${Number(plan?.ebookMonthlyLimit) || 0} ebooks per month`);
      }
      perks.push("Monthly sticker sheet");
      if (plan?.includesRandomPaperback) {
        perks.push("Random paperback each month");
      }

      return `<article class="membership-plan-card ${selectedClass}">
        <div class="row-between">
          <h3>${escapeHtml(plan?.label || "Plan")}</h3>
          <span class="membership-plan-price">${escapeHtml(plan?.monthlyPriceLabel || "")}</span>
        </div>
        <ul>
          ${perks.map((perk) => `<li>${escapeHtml(perk)}</li>`).join("")}
        </ul>
        <div class="membership-account-actions">
          <button class="ghost-btn" type="button" data-plan-action="select" data-tier="${escapeHtml(key)}">${
            selected ? "Selected" : "Select Tier"
          }</button>
          <button class="primary-btn" type="button" data-plan-action="checkout" data-tier="${escapeHtml(key)}" ${
            configured ? "" : "disabled"
          }>${configured ? "Start Tier" : "Not Configured"}</button>
        </div>
      </article>`;
    })
    .join("");
}

function renderOrders() {
  if (!ordersListEl) {
    return;
  }

  if (!state.member) {
    ordersListEl.innerHTML = '<p class="cart-item-sub">Sign in to view your order history.</p>';
    return;
  }

  if (!Array.isArray(state.orders) || state.orders.length === 0) {
    ordersListEl.innerHTML = '<p class="cart-item-sub">No orders found for your saved order tracking contacts yet.</p>';
    return;
  }

  const currentOrders = state.orders.filter((order) => {
    const status = String(order?.fulfillmentStatus || "").trim().toLowerCase();
    return status !== "shipped";
  });
  const pastOrders = state.orders.filter((order) => String(order?.fulfillmentStatus || "").trim().toLowerCase() === "shipped");

  const renderOrderCards = (orders) =>
    orders
      .map((order) => {
        const orderId = escapeHtml(order?.id || "Order");
        const amountTotal = formatMoney(order?.amountTotal || 0, order?.currency || "usd");
        const createdAt = formatDate(order?.createdAt);
        const status = escapeHtml(String(order?.fulfillmentStatus || "pending").toUpperCase());
        const trackingUrl = String(order?.trackingUrl || "").trim();
        const trackingNumber = String(order?.trackingNumber || "").trim();
        const trackingLine = trackingUrl
          ? `<a class="inline-link" href="${escapeHtml(trackingUrl)}" target="_blank" rel="noopener noreferrer">${
              trackingNumber ? escapeHtml(trackingNumber) : "Track Shipment"
            }</a>`
          : trackingNumber
            ? `<span>${escapeHtml(trackingNumber)}</span>`
            : "<span>Not shipped yet</span>";
        const items = Array.isArray(order?.lineItems) ? order.lineItems : [];
        return `<article class="membership-order-card">
          <div class="row-between">
            <h3>${orderId}</h3>
            <strong>${escapeHtml(amountTotal)}</strong>
          </div>
          <p class="cart-item-sub">Placed: ${escapeHtml(createdAt || "Unknown")} | Status: ${status}</p>
          <p class="cart-item-sub">Tracking: ${trackingLine}</p>
          <ul>
            ${items
              .map((item) => `<li>${escapeHtml(item?.name || "Item")} x${escapeHtml(String(item?.quantity || 1))}</li>`)
              .join("")}
          </ul>
        </article>`;
      })
      .join("");

  ordersListEl.innerHTML = `
    <div class="membership-orders-columns">
      <section>
        <h3>Current Orders</h3>
        ${currentOrders.length > 0 ? renderOrderCards(currentOrders) : '<p class="cart-item-sub">No current orders.</p>'}
      </section>
      <section>
        <h3>Previous Orders</h3>
        ${pastOrders.length > 0 ? renderOrderCards(pastOrders) : '<p class="cart-item-sub">No previous shipped orders.</p>'}
      </section>
    </div>
  `;
}

function renderLibrary() {
  const member = state.member;
  const premium = isPremiumActive(member);

  libraryLockEl.textContent = premium ? "Unlocked" : "Locked";
  libraryLockEl.classList.toggle("is-open", premium);

  if (!premium) {
    libraryMetaEl.textContent = "";
    libraryListEl.innerHTML = '<p class="cart-item-sub">Subscribe to unlock monthly ebook borrowing.</p>';
    savePicksBtn.classList.add("hidden");
    return;
  }

  const allEbooksAccess = state.library?.allEbooksAccess === true;
  const selectionLimit = Number(state.library?.selectionLimit);
  const monthKey = String(state.library?.monthKey || "").trim();
  const selectedCount = state.draftEbookIds.size;

  if (allEbooksAccess) {
    libraryMetaEl.textContent = `${monthKey || "This month"}: all ebooks unlocked on this tier.`;
    savePicksBtn.classList.add("hidden");
  } else {
    const limitValue = Number.isFinite(selectionLimit) ? Math.max(0, selectionLimit) : 0;
    libraryMetaEl.textContent = `${monthKey || "This month"}: ${selectedCount}/${limitValue} ebook picks selected. Picks reset next month.`;
    savePicksBtn.classList.remove("hidden");
    savePicksBtn.disabled = state.busy || selectedCount === 0 || selectedCount > limitValue;
  }

  const monthlyRandomPaperback =
    state.library?.monthlyRandomPaperback ||
    state.member?.monthlyRandomPaperback ||
    null;

  const books = Array.isArray(state.library?.availableEbooks) ? state.library.availableEbooks : [];
  if (books.length === 0) {
    libraryListEl.innerHTML = '<p class="cart-item-sub">No ebooks available yet.</p>';
    return;
  }

  libraryListEl.innerHTML = [
    monthlyRandomPaperback
      ? `<article class="membership-paperback-card">
          <h3>Monthly Paperback Pick</h3>
          <p><strong>${escapeHtml(monthlyRandomPaperback.title || "PublisHearts paperback")}</strong></p>
          <p class="cart-item-sub">Included this month with your Premium tier.</p>
        </article>`
      : "",
    ...books.map((item) => {
      const title = escapeHtml(item?.title || "Premium Ebook");
      const monthLabel = escapeHtml(item?.monthLabel || "Upcoming");
      const description = escapeHtml(item?.description || "Premium member ebook.");
      const coverImageUrl = String(item?.coverImageUrl || "").trim();
      const hasAccess = item?.hasAccess === true;
      const isBorrowed = state.draftEbookIds.has(String(item?.id || ""));
      const fileUrl = String(item?.fileUrl || "").trim();
      const coverMarkup = coverImageUrl
        ? `<img class="membership-ebook-cover" src="${escapeHtml(coverImageUrl)}" alt="${title} cover" loading="lazy" />`
        : "";
      const accessMarkup = hasAccess
        ? fileUrl
          ? `<a class="ghost-btn ghost-link" href="${escapeHtml(fileUrl)}" target="_blank" rel="noopener noreferrer">Open Ebook</a>`
          : '<span class="cart-item-sub">File link pending upload</span>'
        : '<span class="cart-item-sub">Locked until selected for this month</span>';
      const pickerMarkup = allEbooksAccess
        ? ""
        : `<label class="membership-pick-label">
             <input type="checkbox" data-ebook-pick="${escapeHtml(item?.id || "")}" ${isBorrowed ? "checked" : ""} />
             Pick for this month
           </label>`;

      return `<article class="membership-ebook-card ${hasAccess ? "is-access" : ""}">
        ${coverMarkup}
        <div class="membership-ebook-body">
          <p class="membership-ebook-month">${monthLabel}</p>
          <h3>${title}</h3>
          <p>${description}</p>
          ${pickerMarkup}
          ${accessMarkup}
        </div>
      </article>`;
    })
  ]
    .filter(Boolean)
    .join("");
}

function renderCommunity() {
  const member = state.member;
  const premium = isPremiumActive(member);

  communityLockEl.textContent = premium ? "Unlocked" : "Locked";
  communityLockEl.classList.toggle("is-open", premium);
  communityPostForm.classList.toggle("hidden", !premium);

  if (!premium) {
    communityListEl.innerHTML = '<p class="cart-item-sub">Premium members can read and create community posts here.</p>';
    return;
  }

  if (!Array.isArray(state.posts) || state.posts.length === 0) {
    communityListEl.innerHTML = '<p class="cart-item-sub">No posts yet. Be the first member to post.</p>';
    return;
  }

  communityListEl.innerHTML = state.posts
    .map((post) => {
      const authorName = escapeHtml(post?.authorName || "Member");
      const createdAt = formatDate(post?.createdAt);
      const body = escapeHtml(post?.body || "").replaceAll("\n", "<br />");
      const imageUrl = String(post?.imageUrl || "").trim();
      const imageMarkup = imageUrl
        ? `<img class="membership-post-image" src="${escapeHtml(imageUrl)}" alt="Community post image by ${authorName}" loading="lazy" />`
        : "";
      const dateMarkup = createdAt ? `<span>${escapeHtml(createdAt)}</span>` : "";
      return `<article class="membership-post-card">
        <div class="membership-post-head">
          <strong>${authorName}</strong>
          ${dateMarkup}
        </div>
        <p>${body}</p>
        ${imageMarkup}
      </article>`;
    })
    .join("");
}

function renderAccount() {
  const member = state.member;
  const authenticated = Boolean(member);
  const premium = isPremiumActive(member);
  const selectedPlan = getPlanByKey(state.selectedTierKey);

  authCardEl.classList.toggle("hidden", authenticated);
  accountCardEl.classList.toggle("hidden", !authenticated);
  subscribeBtn.disabled = state.busy;
  billingBtn.disabled = state.busy;
  logoutBtn.disabled = state.busy;
  refreshOrdersBtn.disabled = state.busy;
  saveOrderAccessBtn.disabled = state.busy;

  if (!authenticated) {
    accountNameEl.textContent = "";
    accountEmailEl.textContent = "";
    accountRoleEl.textContent = "";
    tierSummaryEl.textContent = "";
    tierPerksEl.textContent = "";
    statusPillEl.textContent = "Inactive";
    statusPillEl.classList.remove("is-active");
    periodEndEl.textContent = "";
    setMessage(orderAccessMessageEl, "");
    if (orderAccessEmailsEl) {
      orderAccessEmailsEl.value = "";
    }
    if (orderAccessPhonesEl) {
      orderAccessPhonesEl.value = "";
    }
    renderLibrary();
    renderCommunity();
    renderOrders();
    renderPlans();
    return;
  }

  accountNameEl.textContent = member.displayName || "Premium Member";
  accountEmailEl.textContent = member.email || "";
  accountRoleEl.textContent =
    String(member.role || "member").trim().toLowerCase() === "admin"
      ? "Account role: Member Admin"
      : "Account role: Member";
  if (orderAccessEmailsEl && document.activeElement !== orderAccessEmailsEl) {
    const emails = Array.isArray(member.orderLookupEmails) ? member.orderLookupEmails : member.email ? [member.email] : [];
    orderAccessEmailsEl.value = emails.join("\n");
  }
  if (orderAccessPhonesEl && document.activeElement !== orderAccessPhonesEl) {
    const phones = Array.isArray(member.orderLookupPhones) ? member.orderLookupPhones : [];
    orderAccessPhonesEl.value = phones.join("\n");
  }
  const activeTierPlan = getPlanByKey(String(member.membershipTier || "").trim().toLowerCase());
  const activeTierPriceLabel = String(activeTierPlan?.monthlyPriceLabel || member.monthlyPriceLabel || "").trim();
  tierSummaryEl.textContent = `Tier: ${member.membershipTierLabel || "Free"} ${activeTierPriceLabel ? `(${activeTierPriceLabel})` : ""}`;

  const perkBits = [];
  if (member.allEbooksAccess) {
    perkBits.push("All ebooks unlocked");
  } else if (Number(member.ebookMonthlyLimit) > 0) {
    perkBits.push(`${Number(member.ebookMonthlyLimit)} ebook picks each month`);
  }
  if (member.includesRandomPaperback) {
    perkBits.push("Random paperback monthly");
  }
  if (member.includesStickers) {
    perkBits.push("Monthly sticker sheet");
  }
  tierPerksEl.textContent = perkBits.length > 0 ? `Perks: ${perkBits.join(" | ")}` : "Perks: None yet";

  statusPillEl.textContent = prettyStatusLabel(member);
  statusPillEl.classList.toggle("is-active", premium);
  subscribeBtn.textContent = selectedPlan
    ? `Start ${selectedPlan.label} (${selectedPlan.monthlyPriceLabel})`
    : "Start Selected Tier";
  subscribeBtn.disabled = state.busy || !selectedPlan || !selectedPlan.configured;
  billingBtn.classList.toggle("hidden", !member.stripeCustomerId);
  periodEndEl.textContent = member.subscriptionCurrentPeriodEnd
    ? `Current period ends: ${formatDate(member.subscriptionCurrentPeriodEnd)}`
    : "No active billing period yet.";

  renderLibrary();
  renderCommunity();
  renderOrders();
  renderPlans();
}

async function loadPlans() {
  try {
    const payload = await apiRequest("/api/members/plans", { auth: false });
    state.plans = Array.isArray(payload?.plans) ? payload.plans : [];
    const firstConfigured = state.plans.find((plan) => plan?.configured === true);
    if (!getPlanByKey(state.selectedTierKey) && firstConfigured) {
      state.selectedTierKey = firstConfigured.key;
    }
  } catch {
    state.plans = [];
  }
  renderPlans();
}

async function loadPremiumContent() {
  if (!isPremiumActive(state.member)) {
    state.library = {
      monthKey: "",
      selectionLimit: null,
      allEbooksAccess: false,
      selectedEbookIds: [],
      availableEbooks: [],
      monthlyRandomPaperback: null
    };
    state.draftEbookIds = new Set();
    state.posts = [];
    renderLibrary();
    renderCommunity();
    return;
  }

  try {
    const [libraryPayload, posts] = await Promise.all([
      apiRequest("/api/members/premium/ebooks", { auth: true }),
      apiRequest("/api/members/premium/community/posts?limit=100", { auth: true })
    ]);

    state.library = {
      monthKey: String(libraryPayload?.monthKey || "").trim(),
      selectionLimit: libraryPayload?.selectionLimit,
      allEbooksAccess: libraryPayload?.allEbooksAccess === true,
      selectedEbookIds: Array.isArray(libraryPayload?.selectedEbookIds) ? libraryPayload.selectedEbookIds : [],
      availableEbooks: Array.isArray(libraryPayload?.availableEbooks) ? libraryPayload.availableEbooks : [],
      monthlyRandomPaperback: libraryPayload?.monthlyRandomPaperback || null
    };
    state.draftEbookIds = new Set(state.library.selectedEbookIds);
    state.posts = Array.isArray(posts) ? posts : [];
    renderLibrary();
    renderCommunity();
  } catch (error) {
    setMessage(libraryMessageEl, error.message || "Could not load premium content.", true);
    setMessage(communityMessageEl, error.message || "Could not load community posts.", true);
  }
}

async function loadOrders() {
  if (!state.member) {
    state.orders = [];
    renderOrders();
    return;
  }

  try {
    const payload = await apiRequest("/api/members/orders?limit=120", { auth: true });
    state.orders = Array.isArray(payload?.orders) ? payload.orders : [];
    if (state.member) {
      if (Array.isArray(payload?.orderLookupEmails)) {
        state.member.orderLookupEmails = payload.orderLookupEmails;
      }
      if (Array.isArray(payload?.orderLookupPhones)) {
        state.member.orderLookupPhones = payload.orderLookupPhones;
      }
    }
    renderOrders();
  } catch (error) {
    setMessage(ordersMessageEl, error.message || "Could not load order history.", true);
  }
}

async function refreshMember() {
  try {
    const profile = await apiRequest("/api/members/me", { auth: true });
    if (profile?.authenticated && profile?.member) {
      state.member = profile.member;
    } else {
      state.member = null;
      state.library = {
        monthKey: "",
        selectionLimit: null,
        allEbooksAccess: false,
        selectedEbookIds: [],
        availableEbooks: [],
        monthlyRandomPaperback: null
      };
      state.draftEbookIds = new Set();
      state.posts = [];
      state.orders = [];
      if (state.token) {
        setToken("");
      }
    }
    renderAccount();
    await Promise.all([loadPremiumContent(), loadOrders()]);
  } catch {
    state.member = null;
    state.orders = [];
    renderAccount();
  }
}

async function startCheckoutForTier(tierKey) {
  setMessage(accountMessageEl, "");
  if (!state.member) {
    setMessage(authMessageEl, "Create an account or sign in first.", true);
    return;
  }
  try {
    state.busy = true;
    renderAccount();
    const result = await apiRequest("/api/members/create-subscription-checkout", {
      method: "POST",
      auth: true,
      body: {
        tier: tierKey
      }
    });
    const url = String(result?.url || "").trim();
    if (!url) {
      throw new Error("Stripe checkout URL is missing.");
    }
    window.location.assign(url);
  } catch (error) {
    setMessage(accountMessageEl, error.message || "Could not start membership checkout.", true);
  } finally {
    state.busy = false;
    renderAccount();
  }
}

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage(authMessageEl, "");
  setMessage(accountMessageEl, "");
  const displayName = document.getElementById("register-display-name").value.trim();
  const email = document.getElementById("register-email").value.trim();
  const password = document.getElementById("register-password").value;
  const phone = document.getElementById("register-phone").value.trim();

  try {
    state.busy = true;
    renderAccount();
    const result = await apiRequest("/api/members/register", {
      method: "POST",
      auth: false,
      body: { displayName, email, password, phone }
    });
    setToken(result?.token || "");
    state.member = result?.member || null;
    registerForm.reset();
    setMessage(authMessageEl, "Account created. Pick a tier and start checkout.");
    renderAccount();
    await Promise.all([loadPremiumContent(), loadOrders()]);
  } catch (error) {
    setMessage(authMessageEl, error.message || "Could not create account.", true);
  } finally {
    state.busy = false;
    renderAccount();
  }
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage(authMessageEl, "");
  setMessage(accountMessageEl, "");
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  try {
    state.busy = true;
    renderAccount();
    const result = await apiRequest("/api/members/login", {
      method: "POST",
      auth: false,
      body: { email, password }
    });
    setToken(result?.token || "");
    state.member = result?.member || null;
    loginForm.reset();
    setMessage(authMessageEl, "Signed in.");
    renderAccount();
    await Promise.all([loadPremiumContent(), loadOrders()]);
  } catch (error) {
    setMessage(authMessageEl, error.message || "Could not sign in.", true);
  } finally {
    state.busy = false;
    renderAccount();
  }
});

logoutBtn.addEventListener("click", async () => {
  setMessage(accountMessageEl, "");
  try {
    state.busy = true;
    renderAccount();
    await apiRequest("/api/members/logout", {
      method: "POST",
      auth: true
    });
    setToken("");
    state.member = null;
    state.library = {
      monthKey: "",
      selectionLimit: null,
      allEbooksAccess: false,
      selectedEbookIds: [],
      availableEbooks: [],
      monthlyRandomPaperback: null
    };
    state.draftEbookIds = new Set();
    state.posts = [];
    state.orders = [];
    setMessage(pageMessageEl, "Signed out.");
  } catch (error) {
    setMessage(accountMessageEl, error.message || "Could not sign out.", true);
  } finally {
    state.busy = false;
    renderAccount();
  }
});

subscribeBtn.addEventListener("click", async () => {
  await startCheckoutForTier(state.selectedTierKey);
});

billingBtn.addEventListener("click", async () => {
  setMessage(accountMessageEl, "");
  try {
    state.busy = true;
    renderAccount();
    const result = await apiRequest("/api/members/create-billing-portal", {
      method: "POST",
      auth: true
    });
    const url = String(result?.url || "").trim();
    if (!url) {
      throw new Error("Billing portal URL is missing.");
    }
    window.location.assign(url);
  } catch (error) {
    setMessage(accountMessageEl, error.message || "Could not open billing portal.", true);
  } finally {
    state.busy = false;
    renderAccount();
  }
});

savePicksBtn.addEventListener("click", async () => {
  setMessage(libraryMessageEl, "");
  try {
    state.busy = true;
    renderAccount();
    const ebookIds = Array.from(state.draftEbookIds);
    await apiRequest("/api/members/premium/ebooks/borrow", {
      method: "POST",
      auth: true,
      body: { ebookIds }
    });
    setMessage(libraryMessageEl, "Monthly ebook picks saved.");
    await loadPremiumContent();
  } catch (error) {
    setMessage(libraryMessageEl, error.message || "Could not save ebook picks.", true);
  } finally {
    state.busy = false;
    renderAccount();
  }
});

libraryListEl.addEventListener("change", (event) => {
  const input = event.target.closest("input[data-ebook-pick]");
  if (!input) {
    return;
  }
  const ebookId = String(input.getAttribute("data-ebook-pick") || "").trim();
  if (!ebookId) {
    return;
  }
  if (input.checked) {
    state.draftEbookIds.add(ebookId);
  } else {
    state.draftEbookIds.delete(ebookId);
  }

  const selectionLimit = Number(state.library?.selectionLimit);
  if (Number.isFinite(selectionLimit) && selectionLimit >= 0 && state.draftEbookIds.size > selectionLimit) {
    state.draftEbookIds.delete(ebookId);
    input.checked = false;
    setMessage(libraryMessageEl, `You can only pick ${selectionLimit} ebook(s) on this tier.`, true);
  } else {
    setMessage(libraryMessageEl, "");
  }
  renderLibrary();
});

planGridEl.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-plan-action]");
  if (!button) {
    return;
  }
  const action = String(button.getAttribute("data-plan-action") || "").trim().toLowerCase();
  const tierKey = String(button.getAttribute("data-tier") || "").trim();
  if (!tierKey) {
    return;
  }

  if (action === "select") {
    state.selectedTierKey = tierKey;
    renderAccount();
    return;
  }
  if (action === "checkout") {
    state.selectedTierKey = tierKey;
    renderAccount();
    await startCheckoutForTier(tierKey);
  }
});

refreshOrdersBtn.addEventListener("click", async () => {
  setMessage(ordersMessageEl, "");
  try {
    state.busy = true;
    renderAccount();
    await loadOrders();
    setMessage(ordersMessageEl, "Order history refreshed.");
  } catch (error) {
    setMessage(ordersMessageEl, error.message || "Could not refresh order history.", true);
  } finally {
    state.busy = false;
    renderAccount();
  }
});

orderAccessForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage(orderAccessMessageEl, "");
  if (!state.member) {
    setMessage(orderAccessMessageEl, "Sign in to manage order tracking contacts.", true);
    return;
  }

  const emails = parseContactTextInput(orderAccessEmailsEl?.value || "");
  const phones = parseContactTextInput(orderAccessPhonesEl?.value || "");
  try {
    state.busy = true;
    renderAccount();
    const result = await apiRequest("/api/members/order-access", {
      method: "PUT",
      auth: true,
      body: {
        emails,
        phones
      }
    });
    state.member = result?.member || state.member;
    setMessage(orderAccessMessageEl, "Order tracking contacts saved.");
    await loadOrders();
  } catch (error) {
    setMessage(orderAccessMessageEl, error.message || "Could not save order tracking contacts.", true);
  } finally {
    state.busy = false;
    renderAccount();
  }
});

communityPostForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage(communityMessageEl, "");
  const body = String(postBodyEl.value || "").trim();
  const imageUrl = String(postImageUrlEl.value || "").trim();
  if (!body) {
    setMessage(communityMessageEl, "Write something before posting.", true);
    return;
  }

  try {
    state.busy = true;
    renderAccount();
    await apiRequest("/api/members/premium/community/posts", {
      method: "POST",
      auth: true,
      body: { body, imageUrl }
    });
    postBodyEl.value = "";
    postImageUrlEl.value = "";
    setMessage(communityMessageEl, "Posted.");
    await loadPremiumContent();
  } catch (error) {
    setMessage(communityMessageEl, error.message || "Could not publish post.", true);
  } finally {
    state.busy = false;
    renderAccount();
  }
});

function getJoinQueryContext() {
  const params = new URLSearchParams(window.location.search);
  return {
    join: String(params.get("join") || "").trim().toLowerCase(),
    sessionId: String(params.get("session_id") || "").trim()
  };
}

function clearJoinQueryContext() {
  const url = new URL(window.location.href);
  let changed = false;
  if (url.searchParams.has("join")) {
    url.searchParams.delete("join");
    changed = true;
  }
  if (url.searchParams.has("session_id")) {
    url.searchParams.delete("session_id");
    changed = true;
  }
  if (!changed) {
    return;
  }
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
}

function applyJoinQueryMessage() {
  const context = getJoinQueryContext();
  const join = context.join;
  if (join === "success") {
    setMessage(pageMessageEl, "Subscription checkout completed. Refreshing access...");
  } else if (join === "cancel") {
    setMessage(pageMessageEl, "Checkout canceled. You can restart anytime.");
    clearJoinQueryContext();
  }
  return context;
}

async function confirmJoinSuccessAccess(joinContext) {
  const join = String(joinContext?.join || "").trim().toLowerCase();
  if (join !== "success") {
    return;
  }

  const sessionId = String(joinContext?.sessionId || "").trim();
  if (!sessionId) {
    setMessage(pageMessageEl, "Checkout completed. Waiting for subscription confirmation. Refresh in a moment.");
    return;
  }
  if (!state.token) {
    setMessage(pageMessageEl, "Checkout completed. Sign in to finish activating membership access.");
    return;
  }

  try {
    state.busy = true;
    renderAccount();
    setMessage(pageMessageEl, "Subscription checkout completed. Activating access...");
    const payload = await apiRequest("/api/members/confirm-subscription-checkout", {
      method: "POST",
      auth: true,
      body: { sessionId }
    });
    if (payload?.member) {
      state.member = payload.member;
    }
    await refreshMember();
    if (isPremiumActive(state.member)) {
      setMessage(pageMessageEl, "Membership access is now active.");
    } else {
      setMessage(pageMessageEl, "Checkout completed, but Stripe still reports your subscription as pending. Refresh in a moment.");
    }
  } catch (error) {
    setMessage(pageMessageEl, error.message || "Could not confirm premium checkout yet.", true);
  } finally {
    state.busy = false;
    renderAccount();
    clearJoinQueryContext();
  }
}

async function initializeMembershipPage() {
  const joinContext = applyJoinQueryMessage();
  renderAccount();
  await Promise.all([loadPlans(), refreshMember()]);
  await confirmJoinSuccessAccess(joinContext);
}

initializeMembershipPage().catch(() => {});
