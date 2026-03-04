import { setupStateGate } from "./stateGate.js";

const siteMetaDescription = document.getElementById("site-meta-description");
const brandNameHeader = document.getElementById("brand-name-header");
const brandMarkText = document.getElementById("brand-mark-text");
const brandMarkImage = document.getElementById("brand-mark-image");
const heroBannerWrap = document.getElementById("hero-banner-wrap");
const heroBannerImage = document.getElementById("hero-banner-image");
const heroEyebrow = document.getElementById("hero-eyebrow");
const heroTitle = document.getElementById("hero-title");
const heroCopy = document.getElementById("hero-copy");
const heroCta = document.getElementById("hero-cta");
const featuredTitle = document.getElementById("featured-title");
const featuredCopy = document.getElementById("featured-copy");
const promise1Title = document.getElementById("promise-1-title");
const promise1Copy = document.getElementById("promise-1-copy");
const promise2Title = document.getElementById("promise-2-title");
const promise2Copy = document.getElementById("promise-2-copy");
const promise3Title = document.getElementById("promise-3-title");
const promise3Copy = document.getElementById("promise-3-copy");
const footerLeft = document.getElementById("footer-left");
const footerRight = document.getElementById("footer-right");
const comingSoonGrid = document.getElementById("coming-soon-grid");
const homeSoldCounter = document.getElementById("home-sold-counter");
const homeSoldCounterPrefix = document.getElementById("home-sold-counter-prefix");
const homeSoldCounterValue = document.getElementById("home-sold-counter-value");
const homeSoldCounterSuffix = document.getElementById("home-sold-counter-suffix");
const homeSoldCounterBreakdown = document.getElementById("home-sold-counter-breakdown");

let homeSoldCurrentValue = 0;
let homeSoldAnimationFrame = 0;
let homeSoldCurrentEdition = 1;

const COPIES_PER_EDITION = 50;

function setText(el, value) {
  const text = String(value || "").trim();
  if (!el || !text) {
    return;
  }
  el.textContent = text;
}

function setHexVar(name, value) {
  const hex = String(value || "").trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
    return;
  }
  document.documentElement.style.setProperty(name, hex);
}

function formatMoney(amountCents = 0) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(amountCents / 100);
}

function formatWholeNumber(value) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0
  }).format(Math.max(0, Math.round(Number(value) || 0)));
}

function formatEditionOrdinal(value) {
  const edition = Math.max(1, Math.round(Number(value) || 1));
  const mod100 = edition % 100;
  const mod10 = edition % 10;
  let suffix = "th";
  if (mod100 < 11 || mod100 > 13) {
    if (mod10 === 1) {
      suffix = "st";
    } else if (mod10 === 2) {
      suffix = "nd";
    } else if (mod10 === 3) {
      suffix = "rd";
    }
  }
  return `${edition}${suffix}`;
}

function getEditionProgress(totalCopies) {
  const total = Math.max(0, Math.round(Number(totalCopies) || 0));
  const completedEditions = Math.floor(total / COPIES_PER_EDITION);
  const currentEdition = completedEditions + 1;
  const copiesInCurrentEdition = total % COPIES_PER_EDITION;
  const milestoneReached = total > 0 && copiesInCurrentEdition === 0;
  return {
    total,
    completedEditions,
    currentEdition,
    copiesInCurrentEdition,
    milestoneReached
  };
}

function buildEditionBreakdown(totalCopies, maxSegments = 5) {
  const progress = getEditionProgress(totalCopies);
  const totalEditions = progress.currentEdition;
  const startEdition = Math.max(1, totalEditions - maxSegments + 1);
  const parts = [];

  for (let edition = startEdition; edition <= totalEditions; edition += 1) {
    const soldInEdition =
      edition <= progress.completedEditions ? COPIES_PER_EDITION : progress.copiesInCurrentEdition;
    parts.push(`${formatEditionOrdinal(edition)}: ${formatWholeNumber(soldInEdition)}/${COPIES_PER_EDITION}`);
  }

  if (startEdition > 1) {
    return `Earlier editions complete | ${parts.join(" | ")}`;
  }
  return parts.join(" | ");
}

function setHomeSoldCounterValue(value) {
  if (!homeSoldCounterValue) {
    return;
  }
  homeSoldCounterValue.textContent = formatWholeNumber(value);
}

function animateHomeSoldCounter(targetValue) {
  const target = Math.max(0, Math.round(Number(targetValue) || 0));
  if (!homeSoldCounter || !homeSoldCounterValue) {
    homeSoldCurrentValue = target;
    return;
  }

  if (homeSoldAnimationFrame) {
    window.cancelAnimationFrame(homeSoldAnimationFrame);
    homeSoldAnimationFrame = 0;
  }

  const start = Math.max(0, Math.round(Number(homeSoldCurrentValue) || 0));
  if (start === target) {
    setHomeSoldCounterValue(target);
    homeSoldCounter.classList.remove("is-animating");
    return;
  }

  const distance = Math.abs(target - start);
  const durationMs = Math.min(1500, 450 + distance * 16);
  const startedAt = performance.now();
  homeSoldCounter.classList.add("is-animating");

  const tick = (now) => {
    const progress = Math.min(1, (now - startedAt) / durationMs);
    const eased = 1 - Math.pow(1 - progress, 3);
    const nextValue = Math.round(start + (target - start) * eased);
    homeSoldCurrentValue = nextValue;
    setHomeSoldCounterValue(nextValue);

    if (progress < 1) {
      homeSoldAnimationFrame = window.requestAnimationFrame(tick);
      return;
    }

    homeSoldAnimationFrame = 0;
    homeSoldCurrentValue = target;
    setHomeSoldCounterValue(target);
    homeSoldCounter.classList.remove("is-animating");
  };

  homeSoldAnimationFrame = window.requestAnimationFrame(tick);
}

function isComingSoon(product) {
  if (!product) {
    return false;
  }
  if (product.isComingSoon === true) {
    return true;
  }
  if (product.isComingSoon === false) {
    return false;
  }
  const text = String(product.isComingSoon || "")
    .trim()
    .toLowerCase();
  return ["true", "1", "yes", "on", "comingsoon", "coming-soon"].includes(text);
}

function isPreorderEnabled(product) {
  if (!product) {
    return false;
  }
  if (product.allowPreorder === true) {
    return true;
  }
  if (product.allowPreorder === false) {
    return false;
  }
  const text = String(product.allowPreorder || "")
    .trim()
    .toLowerCase();
  return ["true", "1", "yes", "on", "preorder", "pre-order", "enabled"].includes(text);
}

function getPrimaryProductImage(product) {
  const candidates = [
    String(product?.imageUrl || "").trim(),
    ...(Array.isArray(product?.productImageUrls)
      ? product.productImageUrls.map((entry) => String(entry || "").trim())
      : [])
  ].filter(Boolean);
  return candidates[0] || "https://placehold.co/600x800/f2ece1/35211f?text=Coming+Soon";
}

function setStripeLinkedText(el, value) {
  const text = String(value || "").trim();
  if (!el || !text) {
    return;
  }

  const privacyToken = "[[PRIVACY_LINK]]";
  const securityToken = "[[SECURITY_LINK]]";
  const decoratedText = text
    .replace(/Privacy Policy\s*[\u2014-]\s*https:\/\/stripe\.com\/privacy/gi, privacyToken)
    .replace(/Security Overview\s*[\u2014-]\s*https:\/\/stripe\.com\/docs\/security/gi, securityToken);

  el.replaceChildren();
  const tokenOrUrlMatches = Array.from(
    decoratedText.matchAll(/\[\[PRIVACY_LINK\]\]|\[\[SECURITY_LINK\]\]|https?:\/\/[^\s]+/gi)
  );

  if (tokenOrUrlMatches.length === 0) {
    el.textContent = text;
    return;
  }

  let cursor = 0;
  tokenOrUrlMatches.forEach((match) => {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    if (start > cursor) {
      el.append(document.createTextNode(decoratedText.slice(cursor, start)));
    }

    const link = document.createElement("a");
    if (match[0] === privacyToken) {
      link.href = "https://stripe.com/privacy";
      link.textContent = "Privacy Policy";
    } else if (match[0] === securityToken) {
      link.href = "https://stripe.com/docs/security";
      link.textContent = "Security Overview";
    } else {
      link.href = match[0];
      link.textContent = match[0];
    }
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = "inline-link";
    el.append(link);

    cursor = end;
  });

  if (cursor < decoratedText.length) {
    el.append(document.createTextNode(decoratedText.slice(cursor)));
  }
}

function applySiteSettings(settings) {
  if (!settings || typeof settings !== "object") {
    return;
  }

  setText(brandNameHeader, settings.brandName);
  setText(brandMarkText, settings.brandMark);
  setText(heroEyebrow, settings.heroEyebrow);
  setText(heroTitle, settings.heroTitle);
  setText(heroCopy, settings.heroCopy);
  setText(heroCta, settings.heroCtaLabel);
  setText(featuredTitle, "Coming Soon Previews");
  setText(featuredCopy, "Sneak peeks of upcoming releases. Visit the shop page to place active orders.");
  setText(promise1Title, settings.promise1Title);
  setStripeLinkedText(promise1Copy, settings.promise1Copy);
  setText(promise2Title, settings.promise2Title);
  setText(promise2Copy, settings.promise2Copy);
  setText(promise3Title, settings.promise3Title);
  setText(promise3Copy, settings.promise3Copy);
  setText(footerLeft, settings.footerLeft);
  setText(footerRight, settings.footerRight);
  setHexVar("--accent", settings.themeAccent);
  setHexVar("--accent-strong", settings.themeAccentStrong);
  setHexVar("--bg", settings.themeBackground);
  setHexVar("--ink", settings.themeInk);

  const pageTitle = String(settings.pageTitle || "").trim();
  if (pageTitle) {
    document.title = pageTitle;
  }

  const description = String(settings.pageDescription || "").trim();
  if (siteMetaDescription && description) {
    siteMetaDescription.setAttribute("content", description);
  }

  const logoUrl = String(settings.logoImageUrl || "").trim();
  if (brandMarkImage && brandMarkText) {
    if (logoUrl) {
      brandMarkImage.src = logoUrl;
      brandMarkImage.classList.remove("hidden");
      brandMarkText.classList.add("hidden");
    } else {
      brandMarkImage.removeAttribute("src");
      brandMarkImage.classList.add("hidden");
      brandMarkText.classList.remove("hidden");
    }
  }

  const bannerUrl = String(settings.heroBannerImageUrl || "").trim();
  if (heroBannerWrap && heroBannerImage) {
    if (bannerUrl) {
      heroBannerImage.src = bannerUrl;
      heroBannerImage.alt = `${settings.brandName || "Store"} banner`;
      heroBannerWrap.classList.remove("hidden");
    } else {
      heroBannerImage.removeAttribute("src");
      heroBannerImage.alt = "";
      heroBannerWrap.classList.add("hidden");
    }
  }
}

function renderComingSoon(products) {
  if (!comingSoonGrid) {
    return;
  }

  const comingSoonItems = (Array.isArray(products) ? products : []).filter((product) =>
    isComingSoon(product)
  );

  if (comingSoonItems.length === 0) {
    comingSoonGrid.innerHTML = `<p class="cart-item-sub">No coming soon previews right now.</p>`;
    return;
  }

  comingSoonGrid.innerHTML = comingSoonItems
    .map(
      (product) => {
        const preorderOpen = isPreorderEnabled(product);
        const preorderHref = preorderOpen
          ? `/shop.html?preorder=${encodeURIComponent(product.id)}#books`
          : "/shop.html#books";
        return `<a class="coming-soon-card" href="${preorderHref}" aria-label="${preorderOpen ? `Preorder ${product.title}` : `View ${product.title} in shop`}">
        <div class="coming-soon-cover-wrap">
          <img class="coming-soon-cover" src="${getPrimaryProductImage(product)}" alt="${product.title} preview cover" loading="lazy" />
        </div>
        <div class="coming-soon-body">
          <h3 class="product-title">${product.title}</h3>
          <p class="product-subtitle">${product.subtitle || "New title arriving soon."}</p>
          <div class="row-between">
            <span class="price">${formatMoney(product.priceCents || 0)}</span>
            <span class="coming-soon-pill ${preorderOpen ? "preorder-open" : ""}">${preorderOpen ? "Preorder Open" : "Coming Soon"}</span>
          </div>
          <span class="ghost-btn coming-soon-cta">${preorderOpen ? "Preorder" : "View in Shop"}</span>
        </div>
      </a>`;
      }
    )
    .join("");
}

async function loadSiteSettings() {
  const response = await fetch("/api/site-settings");
  if (!response.ok) {
    throw new Error("Could not load site settings");
  }
  const settings = await response.json();
  applySiteSettings(settings);
}

async function loadProducts() {
  const response = await fetch("/api/products");
  if (!response.ok) {
    throw new Error("Could not load products");
  }
  const products = await response.json();
  renderComingSoon(products);
}

async function loadSoldCopies() {
  const response = await fetch("/api/stats/sold-copies", {
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error("Could not load sold copies");
  }
  const payload = await response.json();
  const soldCopies = Math.max(0, Math.round(Number(payload?.soldCopies) || 0));
  const editionProgress = getEditionProgress(soldCopies);
  if (editionProgress.currentEdition !== homeSoldCurrentEdition) {
    homeSoldCurrentEdition = editionProgress.currentEdition;
    homeSoldCurrentValue = 0;
    setHomeSoldCounterValue(0);
  }

  homeSoldCounter?.classList.remove("hidden");
  homeSoldCounter?.classList.toggle("is-empty", soldCopies <= 0);
  homeSoldCounter?.classList.toggle("edition-milestone", editionProgress.milestoneReached);
  if (homeSoldCounterPrefix) {
    homeSoldCounterPrefix.textContent = editionProgress.milestoneReached
      ? `${formatEditionOrdinal(editionProgress.completedEditions)} edition complete`
      : "Live edition counter";
  }
  if (homeSoldCounterSuffix) {
    homeSoldCounterSuffix.textContent = `of ${COPIES_PER_EDITION} copies in ${formatEditionOrdinal(
      editionProgress.currentEdition
    )} edition`;
  }
  if (homeSoldCounterBreakdown) {
    homeSoldCounterBreakdown.textContent = `Editions: ${buildEditionBreakdown(soldCopies)} | Total sold: ${formatWholeNumber(
      soldCopies
    )}`;
  }
  animateHomeSoldCounter(editionProgress.copiesInCurrentEdition);
}

loadSiteSettings().catch(() => {});
loadProducts().catch(() => {
  if (comingSoonGrid) {
    comingSoonGrid.innerHTML = `<p class="cart-item-sub">Could not load previews. Refresh and try again.</p>`;
  }
});
loadSoldCopies().catch(() => {
  if (!homeSoldCounter) {
    return;
  }
  homeSoldCounter.classList.remove("hidden");
  homeSoldCounter.classList.add("is-empty");
  setHomeSoldCounterValue(0);
});

setupStateGate();
