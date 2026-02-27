# PublisHearts Store

Bookstore web app with:

- storefront + cart
- Stripe card checkout
- customer receipt email
- owner order email with customer/shipping info
- admin dashboard for product CRUD + cover image uploads
- admin storefront design editor (logo, customer text, colors)
- product stock control (in stock / sold out)
- drag-and-drop product ordering
- homepage hero banner uploader
- per-product shipping toggle + shipping fee

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
- `UPLOADS_DIR` (defaults to `public/uploads`)
- `DEFAULT_SHIPPING_FEE` (defaults to `5.00`, in USD)

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
- drag product cards to reorder storefront display
- edit/delete existing products

## Data storage

- Product data is saved to `data/products.json` by default.
- Storefront settings are saved to `data/site-settings.json` by default.
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
