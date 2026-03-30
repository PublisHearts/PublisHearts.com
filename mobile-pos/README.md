# PublisHearts Mobile POS

This folder is the separate mobile POS app for in-person sales and Tap to Pay.

## Why this app exists

The current web POS can build sales, but true Tap to Pay requires a native mobile app and Stripe Terminal. Stripe's official docs support Terminal on React Native, and the Terminal React Native SDK package is `@stripe/stripe-terminal-react-native`.

This scaffold is intentionally separate from the existing web app so the mobile checkout flow can evolve without breaking `/pos`.

## Current state

Implemented:

- Expo / React Native app scaffold
- real EAS build profiles for downloadable installs
- admin login using the existing `/api/admin/login`
- saved server URL settings so the phone app can point at local, Render, or a future production host
- product loading from `/api/admin/products`
- basic mobile cart UI
- cash-sale call into the existing `/api/admin/pos/create-cash-sale`
- Tap to Pay connection token / payment intent / finalize flow through the existing backend
- browser checkout fallback when Terminal is not enabled on the server
- native-safe-area layout and separate mobile register shell

Still not implemented:

- shipping form in mobile
- receipt print / email UI
- custom app icons and splash assets

## Files

- `src/App.js`: current mobile POS scaffold
- `src/api.js`: API client for existing backend routes
- `src/config.js`: base URL config
- `src/theme.js`: shared app colors

## Configure before running

Edit `mobile-pos/app.json`:

- `expo.extra.apiBaseUrl`
  Set this to the reachable backend URL for your phone or simulator.
  Example local LAN URL: `http://192.168.1.10:4242`

You can also override the server URL inside the app from the new `Settings` screen, which is useful when switching between local testing and Render.

Important:

- the app saves any server URL override on the phone
- if the phone still points to `http://192.168.x.x:4242`, it will only work while your computer is running the backend
- use the in-app `Settings` screen and tap `Use Bundled Default` to switch back to `https://publishearts.com`

## Install

From the `mobile-pos` folder:

```bash
npm.cmd install
```

## Put it on your phone

For cash or browser-checkout testing, you can still use Expo Go:

1. Edit `mobile-pos/app.json`
2. Set `expo.extra.apiBaseUrl`
   For live use, this can be your hosted site URL such as `https://publishearts.com`
3. Install dependencies:
   ```bash
   npm.cmd install
   ```
4. Start the app:
   ```powershell
   npm.cmd run start:tunnel
   ```
5. Install Expo Go on your phone
6. Scan the QR code to open the mobile POS

For a real downloadable app install, use EAS builds instead of Expo Go.

## Build Downloadable Installs

From the `mobile-pos` folder:

1. First-time EAS setup:
   ```powershell
   npm.cmd run eas:login
   ```
2. Configure EAS for the project:
   ```powershell
   npm.cmd run build:configure
   ```
3. Build a downloadable Android APK:
   ```powershell
   npm.cmd run build:android:downloadable
   ```
4. Build downloadable installs for both platforms:
   ```powershell
   npm.cmd run build:all:downloadable
   ```

What these profiles do:

- `preview` creates an internal-distribution build
- Android `preview` produces an `.apk`, which is directly downloadable and installable
- iPhone `preview` produces an internal iOS build, which still requires Apple provisioning and device registration

If PowerShell blocks `npm` or `npx` on your PC, use `npm.cmd` or `npx.cmd` exactly as shown above.

EAS account requirement:

- you must log into an Expo account before the build commands will work
- if you automate builds later, you can use `EXPO_TOKEN` instead of interactive login

## Build Store Packages

When you want release packages for the app stores:

Android Play Store:

```powershell
npm.cmd run build:android:store
```

iPhone App Store:

```powershell
npm.cmd run build:ios:store
```

The `production` profile creates store-ready output:

- Android `production` builds an `.aab` for Google Play
- iPhone `production` builds a release `.ipa` for App Store Connect

## Native Tap To Pay Builds

Tap to Pay requires a native install, not Expo Go. You can use either:

- a downloadable `preview` build from EAS
- a store-installed production build
- a local dev build created with `npm.cmd run android` or `npm.cmd run ios`

For local native testing on your own machine:

1. Install dependencies:
   ```powershell
   npm.cmd install
   ```
2. Generate native project changes:
   ```powershell
   npm.cmd run prebuild
   ```
3. Build to a connected Android phone:
   ```powershell
   npm.cmd run android
   ```
   Or build a preview/dev package with EAS and install that on the phone.

## Native build later for Tap to Pay

Tap to Pay requires a native build:

- Expo Go will not work for card-present payments
- use `npm.cmd run android`, `npm.cmd run ios`, or a downloadable EAS build instead
- the backend must also have `STRIPE_TERMINAL_LOCATION_ID` set

## Local native device testing

Android with USB debugging:

```bash
npm.cmd run android
```

iPhone with Xcode on a Mac:

```bash
npm.cmd run ios
```

If you change native config later, run:

```bash
npm.cmd run prebuild
```

## Backend requirements

The mobile app now expects these admin routes on your Node server:

- `POST /api/admin/terminal/connection-token`
- `POST /api/admin/terminal/create-payment-intent`
- `POST /api/admin/terminal/cancel-payment-intent`
- `POST /api/admin/terminal/finalize-payment-intent`

The live server must also set:

- `STRIPE_TERMINAL_LOCATION_ID`

## What is usable right now

- log in with the same admin password as the web app
- point the app at the correct backend URL
- build a cart from live products
- record cash sales against the real backend
- take Tap to Pay card payments on a downloadable native build when Terminal is enabled
- fall back to browser-based Stripe checkout if Terminal is not enabled on the server

That means the app is now set up to ship as a real downloadable mobile register for cash and in-person card sales, as long as the phone is running a native build with Stripe Terminal support.

## Stripe docs used

- Terminal React Native setup: https://docs.stripe.com/terminal/payments/setup-integration?terminal-sdk-platform=react-native
- Terminal overview: https://docs.stripe.com/terminal/overview
