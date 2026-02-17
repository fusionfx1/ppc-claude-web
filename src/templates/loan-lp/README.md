# Loan LP Template

A conversion-optimized personal loan landing page built with **Astro 5**, **Tailwind CSS v4**, and the **shadcn/ui** design token system. Includes Module 2 tracking architecture (zero-GTM, zero-GA4).

## Features

- **Conversion-focused design** — Hero → Trust → Form → How It Works → FAQ → Compliance
- **Module 2 Tracking** — gtag.js (Google Ads only) + first-party pixel (sendBeacon) + Voluum
- **LeadsGate integration** — Form embed with `onFormLoad`, `onStepChange`, `onSubmit`, `onSuccess` callbacks
- **Fast** — Static output, no JS frameworks, self-hosted Inter font, minimal dependencies
- **Accessible** — Semantic HTML, ARIA labels, skip navigation, keyboard-friendly
- **PPC-ready** — `noindex`, click ID capture, session-based dedup

## Quick Start

```bash
cp .env.example .env
# Edit .env with your tracking IDs
npm install
npm run dev      # localhost:4321
npm run build    # dist/
```

## Configuration

All configuration is via `.env`:

| Variable | Description | Example |
|---|---|---|
| `SITE_URL` | Canonical URL | `https://bearloannow.com` |
| `PUBLIC_SITE_NAME` | Brand name | `BearLoanNow` |
| `PUBLIC_COMPANY_NAME` | Legal entity | `Bear Loan Now LLC` |
| `PUBLIC_CONVERSION_ID` | Google Ads ID | `AW-123456789` |
| `PUBLIC_FORM_START_LABEL` | form_start label | `AbCdEfGhIjK` |
| `PUBLIC_FORM_SUBMIT_LABEL` | form_submit label | `XyZaBcDeFgH` |
| `PUBLIC_AID` | LeadsGate AID | `14881` |
| `PUBLIC_VOLUUM_DOMAIN` | Voluum tracking domain | `trk.bearloannow.com` |

## Deploy

```bash
# Cloudflare Pages
npx wrangler pages deploy dist/

# Netlify
npx netlify deploy --prod --dir=dist

# Any static host — upload dist/
```

## DNS Setup for Pixel

Add CNAME: `t.yourdomain.com` → `lp-factory-pixel.{account}.workers.dev`

## Customization

- **Colors**: Edit `src/styles/globals.css` `@theme` block (oklch values)
- **Content**: Edit component props in `src/pages/index.astro`
- **FAQ**: Pass custom `items` array to `<FAQ>` component
- **Font**: Replace `/public/fonts/InterVariable.woff2` and update `globals.css`
