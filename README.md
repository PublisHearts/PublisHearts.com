# PublisHearts Store

A free, production-style bookstore storefront with:

- polished frontend storefront
- card payments through Stripe Checkout
- customer receipt email after purchase
- owner notification email with customer + shipping details

## 1. Install

```bash
npm install
```

## 2. Configure environment

Create a `.env` file from `.env.example` and fill in:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `OWNER_EMAIL`
- SMTP settings (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `FROM_EMAIL`)

## 3. Run locally

```bash
npm run dev
```

App runs on `http://localhost:4242` by default.

## 4. Connect Stripe webhook (required for emails)

Install Stripe CLI, then run:

```bash
stripe listen --forward-to localhost:4242/api/webhooks/stripe
```

Copy the printed `whsec_...` value into `STRIPE_WEBHOOK_SECRET`.

## 5. Test card payment

Use Stripe test card:

- `4242 4242 4242 4242`
- any future date
- any CVC
- any ZIP

## Customize books

Edit product catalog in:

- `src/data/products.js`

Each product has:

- `id`
- `title`
- `subtitle`
- `priceCents`
- `imageUrl`

## Deploy for free

You can deploy this app on free tiers such as:

- Render (Web Service)
- Railway
- Fly.io

Set the same environment variables in your hosting dashboard and set `APP_URL` to your live domain.
