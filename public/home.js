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
      (product) => `<article class="coming-soon-card">
        <div class="coming-soon-cover-wrap">
          <img class="coming-soon-cover" src="${getPrimaryProductImage(product)}" alt="${product.title} preview cover" loading="lazy" />
        </div>
        <div class="coming-soon-body">
          <h3 class="product-title">${product.title}</h3>
          <p class="product-subtitle">${product.subtitle || "New title arriving soon."}</p>
          <div class="row-between">
            <span class="price">${formatMoney(product.priceCents || 0)}</span>
            <span class="coming-soon-pill">Coming Soon</span>
          </div>
        </div>
      </article>`
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

loadSiteSettings().catch(() => {});
loadProducts().catch(() => {
  if (comingSoonGrid) {
    comingSoonGrid.innerHTML = `<p class="cart-item-sub">Could not load previews. Refresh and try again.</p>`;
  }
});
