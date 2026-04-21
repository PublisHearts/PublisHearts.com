# PublisHearts Store

Bookstore web app with:

- storefront + cart
- Stripe card checkout
- Stripe automatic sales tax at checkout
- customer receipt email
- owner order email with customer/shipping info
- admin dashboard for product CRUD + cover image uploads
- admin storefront design editor (logo, customer text, colors)
- admin health panel (Stripe/email/tax/deploy commit)
- admin orders + customer history view (from Stripe paid sessions)
- order fulfillment actions (mark shipped, resend shipment email, mark pending)
- USPS label creation from Admin orders (with tracking + saved label links)
- admin shipping address book (auto-saved from order label flow)
- required customer state selection gate before storefront access
- shipping address state mismatch protection (orders are held if checkout-selected state != Stripe shipping state)
- product stock control (in stock / sold out)
- drag-and-drop product ordering
- homepage hero banner uploader
- per-product shipping toggle + USPS Ground Advantage weight-based shipping estimate
- premium membership accounts (email/password login)
- 3-tier Stripe subscriptions (`$10.99`, `$11.99`, `$20.99`)
- monthly ebook borrowing limits by tier (2, 4, or all-access) with monthly reset
- premium ebook library access restricted to active subscribers
- private premium member community posting feed
- member profile order history + tracking details
- member-admin role controls for promoting member accounts
- admin membership fulfillment tracker (monthly stickers/paperback owed vs sent)

## Run local

```bash
npm install
# Windows (PowerShell)
Copy-Item .env.example .env
# macOS/Linux
# cp .env.example .env
npm run dev
```

Default URL: `http://localhost:4242`

## Environment variables

Required:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `OWNER_EMAIL`
- `SMTP_HOST`
- `SMTP_USER`
- `SMTP_PASS`
- `FROM_EMAIL`
- `ADMIN_PASSWORD`

Optional:

- `STRIPE_TIER_STANDARD_PRICE_ID` (`$10.99` tier, 2 ebooks/month)
- `STRIPE_TIER_PLUS_PRICE_ID` (`$11.99` tier, 4 ebooks/month)
- `STRIPE_TIER_PREMIUM_PRICE_ID` (`$20.99` tier, all ebooks + random paperback)
- `MEMBER_PORTAL_RETURN_PATH` (defaults to `/membership.html`)
- `PREMIUM_EBOOK_TOKEN_SECRET` (recommended; signs member-only ebook download links)
- `PREMIUM_EBOOK_TOKEN_TTL_SECONDS` (defaults to `900`)
- `MEMBER_ADMIN_EMAILS` (comma-separated emails that always stay `admin` role in member accounts)
- `DATABASE_URL` (optional Postgres connection string; when set, member + membership data stores persist in Postgres)
- `DATABASE_DISABLE_SSL` (optional; set `true` only if your database endpoint does not support TLS)
- `CLOUDINARY_CLOUD_NAME` (optional; when set with key/secret, image uploads are stored in Cloudinary)
- `CLOUDINARY_API_KEY` (optional Cloudinary API key)
- `CLOUDINARY_API_SECRET` (optional Cloudinary API secret)
- `CLOUDINARY_UPLOAD_FOLDER` (optional Cloudinary folder prefix, defaults to `publishearts/uploads`)
- `PRODUCTS_FILE` (defaults to `data/products.json`)
- `SITE_SETTINGS_FILE` (defaults to `data/site-settings.json`)
- `ADDRESS_BOOK_FILE` (defaults to `data/address-book.json`)
- `MEMBER_ACCOUNTS_FILE` (defaults to `data/member-accounts.json`)
- `PREMIUM_LIBRARY_FILE` (defaults to `data/premium-library.json`)
- `MEMBER_EBOOK_LOANS_FILE` (defaults to `data/member-ebook-loans.json`)
- `MEMBER_COMMUNITY_POSTS_FILE` (defaults to `data/member-community-posts.json`)
- `MEMBER_PERK_FULFILLMENT_FILE` (defaults to `data/member-perk-fulfillment.json`)
- `UPLOADS_DIR` (defaults to `public/uploads`)
- `DEFAULT_SHIPPING_FEE` (defaults to `5.00`, in USD)
- `STRIPE_AUTOMATIC_TAX` (defaults to `true`)
- `MANUAL_SALES_TAX_RATE` (defaults to `0`; set percent like `7.25` for manual tax line item)
- `MANUAL_SALES_TAX_APPLY_TO_SHIPPING` (`true` or `false`, defaults to `false`)
- `MANUAL_NON_TAX_STATES` (defaults to `AK,DE,MT,NH,OR`; manual tax skipped for these states)
- `SHIPPING_MIN_FEE` (defaults to `10.00`; checkout shipping is never below `$10.00`)
- `SOLD_COUNTER_EXCLUDED_KEYWORDS` (defaults to `mineral kit`; comma-separated product title keywords excluded from sold-copy counters)
- `SHIPPING_BASE_WEIGHT_LBS` (defaults to `1.5`, first shippable unit)
- `SHIPPING_ADDITIONAL_WEIGHT_PER_UNIT_LBS` (defaults to `1.0`, each extra unit after first)
- `USPS_GROUND_ADVANTAGE_RATE_TABLE` (comma-separated `lbs:dollars` "Weight Not Over" tiers)
- `USPS_DEFAULT_ZONE` (defaults to `8`, used when a state has no explicit mapping)
- `USPS_GROUND_ADVANTAGE_ZONE_SCALE` (comma-separated `zone:multiplier` scaling, e.g. `1:0.7424,...,8:1`)
- `USPS_STATE_ZONE_MAP` (comma-separated `STATE:ZONE`, used to map destination state to zone)
- `GITHUB_PUSH_TOKEN` (enables Admin -> Publish Live Changes)
- `GITHUB_REPO` (format: `owner/repo`, for Admin publish)
- `GITHUB_BRANCH` (defaults to `main`)
- `GITHUB_AUTHOR_NAME` (defaults to `PublisHearts Admin Bot`)
- `GITHUB_AUTHOR_EMAIL` (defaults to `admin@publishearts.com`)
- USPS labels:
- `USPS_API_BASE_URL` (`https://apis-tem.usps.com` for USPS test, `https://apis.usps.com` for prod)
- `USPS_CLIENT_ID`, `USPS_CLIENT_SECRET`
- `USPS_CRID`, `USPS_MID`, `USPS_MANIFEST_MID`
- `USPS_ACCOUNT_TYPE` (default `EPS`), `USPS_ACCOUNT_NUMBER`
- `USPS_FROM_NAME`, `USPS_FROM_ADDRESS1`, `USPS_FROM_CITY`, `USPS_FROM_STATE`, `USPS_FROM_ZIP5`
- Optional USPS overrides/defaults:
- `USPS_OAUTH_URL`, `USPS_PAYMENT_AUTH_URL`, `USPS_LABEL_URL`
- `USPS_FROM_COMPANY`, `USPS_FROM_ADDRESS2`, `USPS_FROM_ZIP4`
- `USPS_DEFAULT_MAIL_CLASS`, `USPS_DEFAULT_RATE_INDICATOR`, `USPS_DEFAULT_PROCESSING_CATEGORY`
- `USPS_DEFAULT_PKG_LENGTH_IN`, `USPS_DEFAULT_PKG_WIDTH_IN`, `USPS_DEFAULT_PKG_HEIGHT_IN`
- `USPS_LABEL_IMAGE_TYPE`, `USPS_LABEL_TYPE`

## Admin dashboard (products + storefront design)

Open:

- `http://localhost:4242/admin.html`

Login using `ADMIN_PASSWORD`.

From the dashboard you can:

- edit storefront design text and colors
- upload a logo or set a logo URL
- upload or remove a homepage hero banner image
- add books
- upload cover image files (`jpg`, `png`, `webp`, `gif`, max `6MB`)
- set title, description, what's included, price, in-stock status, and shipping fee toggle
- shipping is calculated at checkout/cart using USPS Ground Advantage "Weight Not Over" tiers
- default weight model: first unit `1.5 lb`, then `+1.0 lb` per additional unit
- destination state selection drives zone scaling for shipping estimates
- open orders, create USPS labels, and save ship-to addresses into the admin address book
- drag product cards to reorder storefront display
- edit/delete existing products
- publish current live admin content back to GitHub with one button

## Data storage

- Product data is saved to `data/products.json` by default.
- Storefront settings are saved to `data/site-settings.json` by default.
- Address book entries are saved to `data/address-book.json` by default.
- Refunded/hidden order exclusions are saved to `data/order-exclusions.json` by default.
- Member account records are saved to `data/member-accounts.json` by default.
- Premium ebook library records are saved to `data/premium-library.json` by default.
- Member monthly ebook selections are saved to `data/member-ebook-loans.json` by default.
- Premium community posts are saved to `data/member-community-posts.json` by default.
- Member monthly perk fulfillment records are saved to `data/member-perk-fulfillment.json` by default.
- Uploaded files are saved to `public/uploads` by default.
- If Cloudinary env vars are configured, admin-uploaded files are stored in Cloudinary (site settings images, product images, premium cover images, premium ebook PDFs, USPS label files).
- Premium ebook downloads stay protected behind signed member-only links whether the PDF is stored locally (`/uploads/premium-ebooks/...`) or in Cloudinary.

If `DATABASE_URL` is set, these stores use Postgres (Neon compatible) instead of local files:

- site settings
- member accounts
- premium ebook library
- member monthly ebook selections (credits/picks)
- member community posts
- member monthly perk fulfillment records

For production, use persistent storage paths if your host supports disks:

- `PRODUCTS_FILE=/var/data/products.json`
- `SITE_SETTINGS_FILE=/var/data/site-settings.json`
- `ADDRESS_BOOK_FILE=/var/data/address-book.json`
- `ORDER_EXCLUSIONS_FILE=/var/data/order-exclusions.json`
- `MEMBER_ACCOUNTS_FILE=/var/data/member-accounts.json`
- `PREMIUM_LIBRARY_FILE=/var/data/premium-library.json`
- `MEMBER_EBOOK_LOANS_FILE=/var/data/member-ebook-loans.json`
- `MEMBER_COMMUNITY_POSTS_FILE=/var/data/member-community-posts.json`
- `MEMBER_PERK_FULFILLMENT_FILE=/var/data/member-perk-fulfillment.json`
- `UPLOADS_DIR=/var/data/uploads`

## Premium membership setup

1. Create recurring Stripe prices in your Stripe dashboard:
   - Standard `$10.99/month`
   - Plus `$11.99/month`
   - Premium `$20.99/month`
2. Set the corresponding IDs in `.env`:
   - `STRIPE_TIER_STANDARD_PRICE_ID`
   - `STRIPE_TIER_PLUS_PRICE_ID`
   - `STRIPE_TIER_PREMIUM_PRICE_ID`
3. Keep `STRIPE_WEBHOOK_SECRET` configured so subscription lifecycle events can update member access.
4. Open `/membership.html`:
   - users create an account or sign in
   - free accounts can track their orders by saved email/phone contacts already linked to their order history
   - users pick a tier and start Stripe subscription checkout
   - active subscribers can access premium ebooks and private community posts
   - limited tiers choose monthly ebook picks, and picks reset next month
   - members can view current + previous orders with tracking on profile
5. Open `/admin.html` -> Member Admin:
   - promote a member account by email to `Member Admin`
   - view member account role + premium status
   - open "Membership Fulfillment" to track monthly sticker/book owed/sent status
6. Add/edit premium library items monthly from Admin. Uploaded PDFs are protected by signed member-only download links (local or Cloudinary storage).

## Stripe webhook

Set endpoint to:

- `https://your-domain.com/api/webhooks/stripe`

Subscribe to events:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

Then set returned signing secret as `STRIPE_WEBHOOK_SECRET`.

For sales tax, prefer Stripe Tax with `STRIPE_AUTOMATIC_TAX=true`.
If Stripe Tax is not configured yet, you can set `MANUAL_SALES_TAX_RATE` to add a checkout "Sales Tax" line item and show tax on receipts.
