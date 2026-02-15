# LP Factory V2 — System Inventory

> Auto-generated system function inventory for Notion import
> Last updated: 2026-02-14

---

## 1. Main Pages (7 Pages)

| # | Page | Icon | Description |
|---|------|------|-------------|
| 1 | Dashboard | 📊 | Overview, metrics, real-time health check status for all APIs |
| 2 | My Sites | 🌐 | LP list, deploy, download, preview |
| 3 | Create LP | ➕ | 6-step wizard to create new landing pages |
| 4 | Variant Studio | 🎨 | Design variants, batch generation, AI assets |
| 5 | Ops Center | ⚙️ | Domain, account, profile, payment, and risk management |
| 6 | Deploys | 🚀 | Full deployment history |
| 7 | Settings | 🔧 | API keys and service configuration |

---

## 2. Ops Center Tabs (9 Tabs)

| Tab | Icon | Description |
|-----|------|-------------|
| Overview | 📋 | Summary dashboard |
| Domains | 🌍 | Domain management + Cloudflare zone linking |
| Ads Accounts | 📱 | Ad account tracking with card/profile linking |
| CF Accounts | ☁️ | Multi Cloudflare account management |
| Registrars | 🐷 | Registrar account management (Porkbun, Internet.bs) |
| Profiles | 👤 | Multilogin browser profiles |
| Payment Methods | 💳 | LeadingCards card management |
| Risks | 🛡️ | Risk detection engine (correlation analysis) |
| Audit Logs | 📜 | Activity logs |

---

## 3. Create LP Wizard (6 Steps)

| Step | Name | Details |
|------|------|---------|
| 1 | Brand Info | Brand name, domain, logo |
| 2 | Loan Product | Loan type, amount range, terms |
| 3 | Design | 8 color palettes, 8 fonts, 3 layouts, 4 border radius options |
| 4 | Copy & CTA | Content text, AI copy generation via Gemini |
| 5 | Tracking | GTM, Voluum, affiliate network config |
| 6 | Review & Build | Preview and generate LP |

### Design Options

**Color Palettes (8):** Ocean Trust, Forest Green, Midnight Indigo, Ruby Finance, Slate Modern, Coral Warm, Teal Pro, Plum Finance

**Fonts (8):** DM Sans, Plus Jakarta Sans, Outfit, Manrope, Sora, Figtree, Inter, Space Grotesk

**Layouts (3):** Hero Left + Form Right, Hero Center + Form Below, Full Width Hero

**Border Radius (4):** Sharp, Subtle, Rounded, Pill

---

## 4. Deploy Targets (5 Targets)

| Priority | Target | Use Case | Notes |
|----------|--------|----------|-------|
| P1 | Cloudflare Pages | Main deploy for active LP | Fast, free, CF Worker integration |
| P2 | Netlify | Backup / diversify footprint | Different provider, reduce ban risk |
| P3 | ZIP Download | Manual deploy, shared hosting | Most flexible |
| P4 | Cloudflare Workers Sites | High-performance edge logic | A/B test, geo-redirect, cloaking |
| P5 | S3 + CloudFront | US-focused LP, low latency | AWS footprint diversification |
| P6 | VPS via SSH/rsync | Self-managed server | Full control, custom domain |

---

## 5. Domain Registrar APIs (3 Providers)

| Provider | Icon | Features |
|----------|------|----------|
| Porkbun | 🐷 | Ping, pricing, check, register, update NS, list domains, auto-renew |
| Internet.bs | 🌐 | Ping, pricing, check, register, update NS, get NS, list, domain info |
| Cloudflare Registrar | ☁️ | List, get, update, ping |

---

## 6. Cloudflare Zone Management

| Function | Description |
|----------|-------------|
| `checkZoneExists` | Check if zone already exists |
| `createZone` | Create new zone |
| `getZone` | Get zone details |
| `deleteZone` | Delete zone |
| `applyLpPreset` | Apply LP-optimized settings (SSL, minify, cache, security headers) |
| `listDnsRecords` | List all DNS records |
| `createDnsRecord` | Create DNS record |
| `updateDnsRecord` | Update DNS record |
| `deleteDnsRecord` | Delete DNS record |
| `autoCreatePagesDns` | Auto-create CNAME for Cloudflare Pages |
| `testAccount` | Test CF account connectivity |

---

## 7. External API Integrations (7 Services)

| Service | Functions |
|---------|-----------|
| **Cloudflare** | Pages deploy, Workers deploy, Zone/DNS management, Registrar |
| **Netlify** | Site creation, file deployment |
| **AWS S3 + CloudFront** | PutObject (SigV4 signing), cache invalidation |
| **LeadingCards** | Cards CRUD, BINs, billing addresses, transactions, tags, teams |
| **Multilogin X** | Signin, profiles CRUD, start/stop, clone, folders, launcher check |
| **Porkbun** | Domain registration, nameserver management |
| **Internet.bs** | Domain registration, nameserver management |

---

## 8. LP Generation Output Formats (4 Formats)

| Format | Description |
|--------|-------------|
| Static HTML | Single file with inline CSS, responsive, accessible, compliance-safe |
| Astro Project | Full project structure (TypeScript, Tailwind, sitemap, compression) |
| Theme JSON | Export design theme as JSON |
| GTM Container JSON | Export GTM config for import |

---

## 9. AI Features

| Feature | Provider | Description |
|---------|----------|-------------|
| AI Copy Generation | Gemini API | Generate LP content (headlines, body, CTA) |
| AI Asset Generation | Gemini API | Generate logos, hero images |

---

## 10. Risk Detection Engine

Automatic correlation risk detection:

| Risk Type | Description |
|-----------|-------------|
| Shared Payment ID | Same payment used across multiple accounts |
| Duplicate Card UUID | Same card linked to multiple accounts |
| Duplicate Proxy IP | Same proxy IP used by multiple profiles |
| Domain Overload | More than 5 domains per account |
| Registrar Concentration | More than 10 domains at same registrar |
| LC Duplicate Payment | LeadingCards duplicate payment_id |

---

## 11. Health Check System

Real-time status monitoring for:

| Service | Check Method |
|---------|-------------|
| Worker / D1 Database | API ping |
| Neon Postgres | Connection test |
| Cloudflare API | Token verification |
| Netlify API | Token verification |
| LeadingCards API | Cards endpoint test |
| Multilogin API | Signin + token refresh |
| AWS S3 | ListBuckets test |
| VPS | SSH connectivity test |

---

## 12. D1 Database Schema (12 Tables)

### Core Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `sites` | LP configurations | id, brand, domain, design, tracking |
| `deploys` | Deployment history | id, site_id, brand, url, type, deployed_by |
| `variants` | Design variants | id, color_id, font_id, layout, radius |
| `settings` | Key-value settings | key (PK), value, updated_at |

### Operations Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `ops_domains` | Domain tracking | id, domain, registrar, zone_id, cf_status, registrar_account_id |
| `ops_accounts` | Ad accounts | id, label, email, payment_id, card_uuid, profile_id |
| `ops_profiles` | Browser profiles | id, name, proxy_ip, ml_profile_id, fingerprint_os |
| `ops_payments` | Payment methods | id, label, type, last4, lc_card_uuid, card_limit |
| `ops_logs` | Audit logs | id, msg, created_at |

### Account Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `cf_accounts` | Cloudflare accounts | id, email, api_token, account_id, label |
| `registrar_accounts` | Registrar accounts | id, provider, api_key, secret_key, label |
| `vps_deploys` | Temp HTML storage | id, html, host, created_at |

---

## 13. API Endpoints (~60+ Endpoints)

### Sites (3)
- `GET /api/sites` — List all sites
- `POST /api/sites` — Create site
- `DELETE /api/sites/:id` — Delete site

### Deploys (3)
- `GET /api/deploys` — List deploys (last 100)
- `POST /api/deploys` — Create deploy record
- `DELETE /api/deploys/:id` — Delete deploy

### Variants (4)
- `GET /api/variants` — List variants
- `POST /api/variants` — Create variant
- `POST /api/variants/batch` — Batch create variants
- `DELETE /api/variants/:id` — Delete variant

### Ops CRUD (17)
- `GET/POST/PUT/DELETE /api/ops/domains`
- `GET/POST/PUT/DELETE /api/ops/accounts`
- `GET/POST/PUT/DELETE /api/ops/profiles`
- `GET/POST/PUT/DELETE /api/ops/payments`
- `GET /api/ops/logs`

### Settings (2)
- `GET /api/settings` — Get settings (redacted)
- `POST /api/settings` — Save settings

### AI Generation (2)
- `POST /api/ai/generate-copy` — Generate LP copy
- `POST /api/ai/generate-assets` — Generate logo/hero

### Cloudflare Accounts (5)
- `GET /api/cf-accounts` — List CF accounts
- `POST /api/cf-accounts` — Add CF account
- `PUT /api/cf-accounts/:id` — Update CF account
- `GET /api/cf-accounts/:id/token` — Get unredacted token
- `DELETE /api/cf-accounts/:id` — Delete CF account

### Registrar Accounts (4)
- `GET /api/registrar-accounts` — List registrar accounts
- `POST /api/registrar-accounts` — Add registrar account
- `PUT /api/registrar-accounts/:id` — Update registrar account
- `DELETE /api/registrar-accounts/:id` — Delete registrar account

### Stats & Init (2)
- `GET /api/stats` — Computed statistics
- `GET /api/init` — Bulk load all data

### LeadingCards Proxy (10)
- `GET /api/lc/cards` — List cards
- `POST /api/lc/cards` — Create card
- `PUT /api/lc/cards/:uuid/block` — Block card
- `PUT /api/lc/cards/:uuid/activate` — Activate card
- `PUT /api/lc/cards/:uuid/change_limit` — Change limit
- `GET /api/lc/bins` — List BINs
- `GET /api/lc/billing` — List billing addresses
- `POST /api/lc/billing` — Create billing address
- `GET /api/lc/tags` — List tags
- `GET /api/lc/transactions` — List transactions

### Multilogin Proxy (7)
- `POST /api/ml/signin` — Sign in
- `POST /api/ml/refresh-token` — Refresh token
- `GET /api/ml/profiles` — List profiles
- `POST /api/ml/profiles` — Create profile
- `POST /api/ml/profiles/:id/start` — Start profile
- `POST /api/ml/profiles/:id/stop` — Stop profile
- `POST /api/ml/profiles/:id/clone` — Clone profile

### CORS Proxy Routes (6)
- `/api/proxy/cf/*` → Cloudflare API
- `/api/proxy/mlx/*` → Multilogin API
- `/api/proxy/netlify/*` → Netlify API
- `/api/proxy/porkbun/*` → Porkbun API
- `/api/proxy/internetbs/*` → Internet.bs API
- `/api/proxy/pass?url=...` → Generic HTTPS pass-through

### VPS Deploy (2)
- `POST /api/deploy/vps` — Store HTML + return download URL
- `GET /api/deploy/vps/download/:id` — Download stored HTML

---

## 14. Utility Modules

| Module | Functions |
|--------|-----------|
| `src/utils/index.js` | LS, uid, now, hsl, similarity, maxSim, pick |
| `src/utils/lp-generator.js` | generateLP, htmlToZip, astroProjectToZip, makeThemeJson |
| `src/utils/astro-generator.js` | generateAstroProject, tracking helpers |
| `src/utils/deployers/index.js` | deployTo, getAvailableTargets, DEPLOY_TARGETS |
| `src/utils/registrar.js` | getAdapter, resolveRegistrarCreds, registerAndSetup |
| `src/utils/cf-zone.js` | Zone CRUD, DNS CRUD, applyLpPreset, testAccount |
| `src/utils/health-check.js` | checkWorker, checkNeon, checkCloudflare, checkAll |
| `src/utils/risk-engine.js` | detectRisks, RISK_ICONS, RISK_COLORS |
| `src/utils/api-proxy.js` | getCfApiBase, getMlxApiBase, getPorkbunApiBase, getInternetBsApiBase |
| `src/utils/gtm-exporter.js` | generateGtmJson, downloadGtmJson |

---

## 15. Service Modules

| Module | Functions |
|--------|-----------|
| `src/services/api.js` | get, post, put, del, patch, delBody |
| `src/services/neon.js` | initNeon, ping, loadSettings, saveSettings, loadSites, saveSite, deleteSite, loadDeploys, saveDeploy, syncFromLocal |
| `src/services/multilogin.js` | signin, refreshToken, getProfiles, createProfile, startProfile, stopProfile, cloneProfile, getFolders, syncProfiles |
| `src/services/leadingCards.js` | getCards, createCard, blockCard, activateCard, changeLimit, getBins, getBillingAddresses, createBillingAddress, getTags, getTransactions, getTeams |

---

## 16. Data Persistence Layers

| Layer | Purpose | Status |
|-------|---------|--------|
| Neon Postgres | Primary persistent storage | Active |
| Cloudflare D1 | Worker-side storage & API proxy | Active |
| localStorage | Offline fallback | Active |

---

## 17. Affiliate Networks Supported

| Network | Integration |
|---------|-------------|
| LeadsGate | Callback handler + Voluum S2S postback |
| ZeroParallel | Tracking config |
| LeadStack | Tracking config |
| ClickDealer | Tracking config |
| Everflow | Tracking config |
| Custom | Custom endpoint config |

---

## 18. Compliance & Security

| Feature | Implementation |
|---------|----------------|
| No PII Storage | sessionStorage only on LP |
| Dedup | SHA-256(click_id + lead_id) |
| Retry-safe Workers | Idempotent callback processing |
| Multi-account isolation | Account-scoped tokens and data |
| No GA4/GTM on LP | Only Voluum + sendBeacon |
| API key redaction | Tokens shown as hints in UI |

---

## 19. Performance Targets

| Metric | Target |
|--------|--------|
| Lighthouse Mobile | >= 96 |
| Custom JS size | < 15kb |
| No blocking JS | Deferred loading |
| No animation libraries | CSS only |
| Image format | WebP only |
| Fonts | Self-hosted only |
