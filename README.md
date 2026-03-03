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

## Run local

```bash
npm install
cp .env.example .env
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

- `PRODUCTS_FILE` (defaults to `data/products.json`)
- `SITE_SETTINGS_FILE` (defaults to `data/site-settings.json`)
- `ADDRESS_BOOK_FILE` (defaults to `data/address-book.json`)
- `UPLOADS_DIR` (defaults to `public/uploads`)
- `DEFAULT_SHIPPING_FEE` (defaults to `5.00`, in USD)
- `STRIPE_AUTOMATIC_TAX` (defaults to `true`)
- `MANUAL_SALES_TAX_RATE` (defaults to `0`; set percent like `7.25` for manual tax line item)
- `MANUAL_SALES_TAX_APPLY_TO_SHIPPING` (`true` or `false`, defaults to `false`)
- `MANUAL_NON_TAX_STATES` (defaults to `AK,DE,MT,NH,OR`; manual tax skipped for these states)
- `SHIPPING_MIN_FEE` (defaults to `0.00`; set >0 for a checkout shipping floor)
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
- Uploaded files are saved to `public/uploads` by default.

For production, use persistent storage paths if your host supports disks:

- `PRODUCTS_FILE=/var/data/products.json`
- `SITE_SETTINGS_FILE=/var/data/site-settings.json`
- `UPLOADS_DIR=/var/data/uploads`

## Stripe webhook

Set endpoint to:

- `https://your-domain.com/api/webhooks/stripe`

Subscribe to event:

- `checkout.session.completed`

Then set returned signing secret as `STRIPE_WEBHOOK_SECRET`.

For sales tax, prefer Stripe Tax with `STRIPE_AUTOMATIC_TAX=true`.
If Stripe Tax is not configured yet, you can set `MANUAL_SALES_TAX_RATE` to add a checkout "Sales Tax" line item and show tax on receipts.
