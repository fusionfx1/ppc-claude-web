/**
 * Astro LP Project Generator
 * Generates a complete Astro project file map from a site config.
 * Each key is a file path, each value is the file content string.
 */

import { COLORS, FONTS, RADIUS, LOAN_TYPES } from "../constants/index.js";

function esc(str) {
  return String(str || "").replace(/`/g, "\\`").replace(/\$/g, "\\$");
}

function hslStr(arr) {
  return `hsl(${arr[0]}, ${arr[1]}%, ${arr[2]}%)`;
}

/**
 * Generate a complete Astro project as { [filepath]: content }
 */
export function generateAstroProject(site) {
  const c = COLORS.find(x => x.id === site.colorId) || COLORS[0];
  const f = FONTS.find(x => x.id === site.fontId) || FONTS[0];
  const r = RADIUS.find(x => x.id === site.radius) || RADIUS[2];
  const brand = site.brand || "LoanBridge";
  const loanLabel = LOAN_TYPES.find(l => l.id === site.loanType)?.label || "Personal Loans";
  const h1 = site.h1 || `Fast ${loanLabel} Up To $${(site.amountMax || 5000).toLocaleString()}`;
  const badge = site.badge || "Trusted by 15,000+ borrowers";
  const cta = site.cta || "Check Your Rate";
  const sub = site.sub || "Get approved in minutes. Funds as fast as next business day.";
  const companyName = brand;
  const domain = site.domain || "example.com";

  const files = {};

  // ─── package.json ───────────────────────────────────────────
  files["package.json"] = JSON.stringify({
    name: brand.toLowerCase().replace(/[^a-z0-9]/g, "-") + "-lp",
    private: true,
    version: "1.0.0",
    type: "module",
    scripts: {
      dev: "astro dev",
      build: "astro build",
      preview: "astro preview",
    },
    dependencies: {
      astro: "^5.2.0",
      "@astrojs/sitemap": "^3.2.0",
      "astro-compress": "^2.3.0",
    },
    devDependencies: {
      "@tailwindcss/vite": "^4.0.0",
      tailwindcss: "^4.0.0",
      typescript: "^5.7.0",
    },
  }, null, 2);

  // ─── astro.config.mjs ──────────────────────────────────────
  files["astro.config.mjs"] = `import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import compress from 'astro-compress';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  output: 'static',
  site: process.env.SITE_URL || 'https://${domain}',
  vite: {
    plugins: [tailwindcss()],
    build: { rollupOptions: { output: { manualChunks: undefined } } },
  },
  integrations: [
    sitemap(),
    compress({ CSS: true, HTML: { removeAttributeQuotes: false, removeComments: true }, Image: false, JavaScript: true, SVG: true }),
  ],
  prefetch: false,
});
`;

  // ─── tsconfig.json ─────────────────────────────────────────
  files["tsconfig.json"] = JSON.stringify({
    extends: "astro/tsconfigs/strict",
    compilerOptions: { baseUrl: ".", paths: { "@/*": ["src/*"] } },
  }, null, 2);

  // ─── .env ──────────────────────────────────────────────────
  files[".env"] = `SITE_URL=https://${domain}
PUBLIC_SITE_NAME=${brand}
PUBLIC_COMPANY_NAME=${companyName}
PUBLIC_ACCOUNT_ID=${site.accountId || ""}
PUBLIC_TRACK_URL=${site.trackUrl || "/track"}
PUBLIC_VOLUUM_DOMAIN=${site.voluumDomain || ""}
PUBLIC_LEADSGATE_FORM_ID=${site.leadsGateFormId || site.redirectUrl || ""}
`;

  // ─── src/styles/global.css ─────────────────────────────────
  files["src/styles/global.css"] = `@import "tailwindcss";

:root {
  --color-primary: ${hslStr(c.p)};
  --color-primary-hover: ${hslStr([c.p[0], c.p[1], Math.max(c.p[2] - 5, 10)])};
  --color-secondary: ${hslStr(c.s)};
  --color-accent: ${hslStr(c.a)};
  --color-surface: ${hslStr(c.bg)};
  --color-surface-alt: ${hslStr([c.bg[0], c.bg[1], Math.max(c.bg[2] - 2, 90)])};
  --color-text: ${hslStr(c.fg)};
  --color-text-muted: ${hslStr([c.fg[0], Math.max(c.fg[1] - 20, 10), Math.min(c.fg[2] + 30, 60)])};
  --color-border: ${hslStr([c.bg[0], Math.min(c.bg[1] + 10, 40), Math.max(c.bg[2] - 7, 85)])};
  --color-danger: hsl(0, 84%, 60%);
  --font-sans: ${f.family}, system-ui, -apple-system, sans-serif;
  --radius-sm: 0.375rem;
  --radius-md: ${r.v};
  --radius-lg: 0.75rem;
  color-scheme: light;
}

html {
  font-family: var(--font-sans);
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
  scroll-behavior: smooth;
}

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

body {
  color: var(--color-text);
  background: var(--color-surface);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  line-height: 1.5;
}

img, svg { display: block; max-width: 100%; height: auto; }

/* Screen-reader only utility */
.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;
}

/* Skip-to-content link */
.skip-link {
  position: fixed; top: 0; left: 0; z-index: 100;
  background: var(--color-primary); color: #fff;
  padding: 0.75rem 1.5rem; font-size: 1rem; font-weight: 700;
  transform: translateY(-100%); transition: transform 0.2s;
}
.skip-link:focus { transform: translateY(0); outline: 3px solid var(--color-accent); outline-offset: 2px; }

/* Global focus-visible styles */
a:focus-visible,
button:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible,
[tabindex]:focus-visible {
  outline: 3px solid var(--color-primary);
  outline-offset: 2px;
  border-radius: 4px;
}

input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: var(--color-border);
  outline: none;
  cursor: pointer;
}
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--color-primary);
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}
input[type="range"]::-moz-range-thumb {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--color-primary);
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}
input[type="range"]:focus-visible {
  outline: 3px solid var(--color-primary);
  outline-offset: 2px;
}
`;

  // ─── src/layouts/BaseLayout.astro ──────────────────────────
  files["src/layouts/BaseLayout.astro"] = `---
interface Props {
  title: string;
  description: string;
  canonical?: string;
  accountId?: string;
  trackUrl?: string;
  voluumDomain?: string;
  noindex?: boolean;
}

const {
  title,
  description,
  canonical,
  accountId = '',
  trackUrl = '/track',
  voluumDomain = '',
  noindex = false,
} = Astro.props;

const canonicalUrl = canonical || Astro.url.href;
---

<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content={description} />
  <meta name="theme-color" content="${hslStr(c.p)}" />
  <meta name="color-scheme" content="light" />
  <title>{title}</title>
  <link rel="canonical" href={canonicalUrl} />
  {noindex && <meta name="robots" content="noindex, nofollow" />}

  <!-- Non-blocking font loading -->
  <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=${f.import}&display=swap" rel="stylesheet" media="print" onload="this.media='all'" />
  <noscript><link href="https://fonts.googleapis.com/css2?family=${f.import}&display=swap" rel="stylesheet" /></noscript>

  <style is:global>
    @import '../styles/global.css';
  </style>

  {voluumDomain && (
    <script is:inline define:vars={{ voluumDomain }}>
      (function(){ var i = new Image(1,1); i.src = 'https://' + voluumDomain + '/impression?'; })();
    </script>
  )}
</head>
<body class="min-h-screen bg-[var(--color-surface)]">
  <a href="#main-content" class="skip-link">Skip to main content</a>

  <script is:inline define:vars={{ accountId, trackUrl }}>
    window.__ACCOUNT_ID__ = accountId;
    window.__TRACK_URL__ = trackUrl;
  </script>

  <slot />

  <script is:inline>
    (function() {
      var params = new URLSearchParams(window.location.search);
      var keys = ['click_id', 'cid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid'];
      for (var i = 0; i < keys.length; i++) {
        var val = params.get(keys[i]);
        if (val) {
          var storeKey = keys[i] === 'cid' ? 'click_id' : keys[i];
          sessionStorage.setItem(storeKey, val);
        }
      }
      if (typeof navigator.sendBeacon === 'function') {
        var clickId = sessionStorage.getItem('click_id') || '';
        var payload = JSON.stringify({
          event: 'page_view', click_id: clickId,
          account_id: window.__ACCOUNT_ID__ || '',
          page: window.location.pathname,
          referrer: document.referrer || '',
          timestamp: new Date().toISOString()
        });
        try { navigator.sendBeacon(window.__TRACK_URL__ || '/track', new Blob([payload], { type: 'application/json' })); } catch(e) {}
      }
    })();
  </script>
</body>
</html>
`;

  // ─── src/components/AmountSlider.astro ─────────────────────
  files["src/components/AmountSlider.astro"] = `---
interface Props {
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: number;
  id?: string;
}
const {
  label = 'How much do you need?',
  min = ${site.amountMin || 500},
  max = ${site.amountMax || 35000},
  step = 500,
  defaultValue = ${Math.round(((site.amountMin || 500) + (site.amountMax || 35000)) / 2)},
  id = 'amount-slider',
} = Astro.props;
---

<div class="w-full max-w-md mx-auto" role="group" aria-labelledby={\`\${id}-label\`}>
  {label && <label id={\`\${id}-label\`} for={id} class="block text-sm font-semibold text-gray-700 mb-2">{label}</label>}
  <div class="text-center mb-4">
    <output id={\`\${id}-display\`} for={id} class="text-3xl font-bold text-[var(--color-primary)]" aria-live="polite">
      \${defaultValue.toLocaleString()}
    </output>
  </div>
  <input type="range" id={id} name="amount" min={min} max={max} step={step} value={defaultValue}
    class="w-full h-2 rounded-lg cursor-pointer"
    aria-label={\`Loan amount from $\${min.toLocaleString()} to $\${max.toLocaleString()}\`}
    aria-valuemin={min} aria-valuemax={max} aria-valuenow={defaultValue}
    aria-valuetext={\`$\${defaultValue.toLocaleString()}\`} />
  <div class="flex justify-between text-xs text-gray-500 mt-1" aria-hidden="true">
    <span>\${min.toLocaleString()}</span>
    <span>\${max.toLocaleString()}</span>
  </div>
</div>

<script define:vars={{ id, defaultValue }}>
  (function() {
    const slider = document.getElementById(id);
    const display = document.getElementById(id + '-display');
    if (!slider || !display) return;
    function formatAmount(val) { return '$' + Number(val).toLocaleString(); }
    function update(val) {
      display.textContent = formatAmount(val);
      slider.setAttribute('aria-valuenow', val);
      slider.setAttribute('aria-valuetext', formatAmount(val));
      sessionStorage.setItem('amount', val.toString());
    }
    slider.addEventListener('input', function(e) { update(e.target.value); });
    const stored = sessionStorage.getItem('amount');
    if (stored) { slider.value = stored; update(stored); }
    else { update(defaultValue); }
  })();
</script>
`;

  // ─── src/components/ZipInput.astro ─────────────────────────
  files["src/components/ZipInput.astro"] = `---
interface Props {
  label?: string;
  placeholder?: string;
  id?: string;
}
const { label = 'Enter your ZIP code', placeholder = '00000', id = 'zip-input' } = Astro.props;
---

<div class="w-full max-w-sm mx-auto">
  {label && <label for={id} class="block text-sm font-semibold text-gray-700 mb-2">{label}</label>}
  <input type="text" id={id} name="zip" inputmode="numeric" pattern="[0-9]{5}" maxlength="5"
    autocomplete="postal-code" placeholder={placeholder} required
    class="w-full px-4 py-3 text-lg text-center tracking-widest border-2 border-gray-300 rounded-lg
           focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20
           focus:outline-none transition-colors duration-150"
    aria-label="5-digit ZIP code" />
  <p id={\`\${id}-error\`} class="mt-1 text-sm text-red-600 hidden" role="alert">Please enter a valid 5-digit ZIP code</p>
</div>

<script define:vars={{ id }}>
  (function() {
    const input = document.getElementById(id);
    const error = document.getElementById(id + '-error');
    if (!input) return;
    input.addEventListener('input', function(e) {
      e.target.value = e.target.value.replace(/\\D/g, '').slice(0, 5);
      if (e.target.value.length === 5) { error.classList.add('hidden'); sessionStorage.setItem('zip', e.target.value); }
      else { sessionStorage.removeItem('zip'); }
    });
    input.addEventListener('blur', function(e) {
      if (e.target.value.length > 0 && e.target.value.length !== 5) error.classList.remove('hidden');
      else error.classList.add('hidden');
    });
    const stored = sessionStorage.getItem('zip');
    if (stored && stored.length === 5) input.value = stored;
  })();
</script>
`;

  // ─── src/components/CTAButton.astro ────────────────────────
  files["src/components/CTAButton.astro"] = `---
interface Props {
  text?: string;
  leadsGateFormId: string;
  leadsGateApiUrl?: string;
  id?: string;
}
const {
  text = '${cta}',
  leadsGateFormId,
  leadsGateApiUrl = 'https://form.leadsgate.com',
  id = 'cta-button',
} = Astro.props;
---

<div class="w-full max-w-sm mx-auto">
  <button id={id} type="button"
    class="w-full py-4 px-6 text-lg font-bold text-white rounded-lg
           bg-[var(--color-secondary)] hover:bg-[var(--color-secondary)]/90
           active:scale-[0.98] transition-all duration-150
           focus:outline-none focus:ring-4 focus:ring-[var(--color-secondary)]/30
           disabled:opacity-50 disabled:cursor-not-allowed"
    aria-label={text}>{text}</button>
  <p id={\`\${id}-error\`} class="mt-2 text-sm text-center text-red-600 hidden" role="alert">Please enter a valid ZIP code first</p>
  <div id="leadsgate-container" class="mt-4 hidden"></div>
</div>

<script define:vars={{ id, leadsGateFormId, leadsGateApiUrl }}>
  (function() {
    const btn = document.getElementById(id);
    const error = document.getElementById(id + '-error');
    const container = document.getElementById('leadsgate-container');
    if (!btn) return;
    let loaded = false;
    btn.addEventListener('click', function() {
      const zip = sessionStorage.getItem('zip');
      if (!zip || zip.length !== 5) {
        error.classList.remove('hidden');
        var zi = document.getElementById('zip-input'); if (zi) zi.focus();
        return;
      }
      error.classList.add('hidden');
      const clickId = sessionStorage.getItem('click_id') || '';
      const amount = sessionStorage.getItem('amount') || '';
      if (typeof navigator.sendBeacon === 'function') {
        var payload = JSON.stringify({ event: 'cta_click', click_id: clickId, account_id: window.__ACCOUNT_ID__ || '', zip: zip, amount: amount, timestamp: new Date().toISOString() });
        try { navigator.sendBeacon(window.__TRACK_URL__ || '/track', new Blob([payload], { type: 'application/json' })); } catch(e) {}
      }
      btn.disabled = true; btn.textContent = 'Loading...';
      if (!loaded) loadLG(zip, amount, clickId);
    });
    function loadLG(zip, amount, clickId) {
      loaded = true; container.classList.remove('hidden');
      window.LGFormConfig = {
        formId: leadsGateFormId, containerId: 'leadsgate-container',
        prefill: { zip_code: zip, loan_amount: amount },
        tracking: { click_id: clickId, sub_id: sessionStorage.getItem('utm_source') || '', sub_id2: sessionStorage.getItem('utm_campaign') || '', sub_id3: sessionStorage.getItem('utm_medium') || '', sub_id4: sessionStorage.getItem('gclid') || '' },
        onComplete: function() {
          if (typeof navigator.sendBeacon === 'function') {
            var p = JSON.stringify({ event: 'form_complete', click_id: clickId, account_id: window.__ACCOUNT_ID__ || '', timestamp: new Date().toISOString() });
            try { navigator.sendBeacon(window.__TRACK_URL__ || '/track', new Blob([p], { type: 'application/json' })); } catch(e) {}
          }
        }
      };
      var s = document.createElement('script');
      s.src = leadsGateApiUrl + '/embed/' + leadsGateFormId + '.js'; s.async = true;
      s.onerror = function() { btn.disabled = false; btn.textContent = '${cta}'; loaded = false; container.classList.add('hidden'); error.textContent = 'Failed to load. Please try again.'; error.classList.remove('hidden'); };
      document.body.appendChild(s);
    }
  })();
</script>
`;

  // ─── src/components/Modal.astro ────────────────────────────
  files["src/components/Modal.astro"] = `---
interface Props {
  id: string;
  title: string;
}
const { id, title } = Astro.props;
---

<dialog id={id} class="modal-dialog p-0 rounded-xl border-none shadow-2xl backdrop:bg-gray-900/60 transition-all fixed inset-0 m-auto max-w-2xl w-[95%] max-h-[85vh] overflow-hidden">
  <div class="flex flex-col h-full bg-white">
    <header class="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
      <h3 class="text-lg font-bold text-gray-900 tracking-tight">{title}</h3>
      <button onclick="this.closest('dialog').close()" class="p-2 -mr-2 rounded-full hover:bg-gray-200 transition-colors text-gray-500 hover:text-gray-900 focus:outline-none" aria-label="Close modal">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    </header>
    <div class="flex-1 overflow-y-auto px-6 py-6 text-sm text-gray-600 leading-relaxed compliance-content">
      <slot />
    </div>
    <footer class="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
      <button onclick="this.closest('dialog').close()" class="bg-[var(--color-primary)] text-white px-5 py-2 rounded-lg font-semibold hover:bg-[var(--color-primary-hover)] transition-colors focus:ring-4 focus:ring-[var(--color-primary)]/20 shadow-sm">
        Close
      </button>
    </footer>
  </div>
</dialog>

<style is:global>
  .modal-dialog::backdrop { opacity: 0; transition: opacity 0.3s ease; }
  .modal-dialog[open]::backdrop { opacity: 1; }
  .modal-dialog[open] { animation: modal-zoom 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
  @keyframes modal-zoom { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
  .compliance-content h4 { font-weight: 700; color: #111827; margin-top: 1.5rem; margin-bottom: 0.5rem; font-size: 1rem; }
  .compliance-content h4:first-child { margin-top: 0; }
  .compliance-content p { margin-bottom: 1rem; }
  .compliance-content ul { margin-bottom: 1rem; list-style-type: disc; padding-left: 1.25rem; }
  .compliance-content li { margin-bottom: 0.5rem; }
</style>
`;

  // ─── src/components/LegalPopups.astro ──────────────────────
  files["src/components/LegalPopups.astro"] = `---
import Modal from './Modal.astro';
const brand = '${brand}';
const aprMin = ${site.aprMin || 5.99};
const aprMax = ${site.aprMax || 35.99};
---

<Modal id="modal-how-it-works" title="How It Works">
  <div class="space-y-6">
    <div class="flex gap-4">
      <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600 shrink-0">1</div>
      <div>
        <h4>Request Your Loan</h4>
        <p>Complete our secure online form with basic information. It takes less than 2 minutes and won't affect your credit score.</p>
      </div>
    </div>
    <div class="flex gap-4">
      <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600 shrink-0">2</div>
      <div>
        <h4>Get Instant Matches</h4>
        <p>Our platform connects you with lenders in real-time. If matched, you'll see loan offers with rates and terms customized for you.</p>
      </div>
    </div>
    <div class="flex gap-4">
      <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600 shrink-0">3</div>
      <div>
        <h4>Choose & Fund</h4>
        <p>Review your offers, select the best one, and finalize the application on the lender's secure site. Funds are often deposited as soon as the next business day.</p>
      </div>
    </div>
  </div>
</Modal>

<Modal id="modal-privacy" title="Privacy Policy">
  <p class="text-xs text-gray-400">Last Updated: \${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
  <h4>1. Information We Collect</h4>
  <p>We collect information you provide directly to us via our online form, including name, contact info, zip code, and loan preferences.</p>
  <h4>2. How We Use Information</h4>
  <p>We use your information to operate our platform, connect you with lenders, improve our services, and send marketing communications if opted-in.</p>
  <h4>3. Sharing of Information</h4>
  <p>We share your data with participating lenders and 3rd party service providers to facilitate your loan request. We do not sell your personal data to unrelated 3rd parties without your consent.</p>
  <h4>4. Your Privacy Rights</h4>
  <p>You may request to access, update, or delete your information at any time. You can opt-out of marketing communications by following the unsubscribe link in any email.</p>
</Modal>

<Modal id="modal-terms" title="Terms of Service">
  <h4>1. Acceptance of Terms</h4>
  <p>By using this website, you agree to be bound by these Terms of Service. If you do not agree, please do not use our site.</p>
  <h4>2. Description of Service</h4>
  <p>\${brand} is a lead generation platform, not a lender. We provide a connection service between consumers and potential loan providers.</p>
  <h4>3. Eligibility</h4>
  <p>You must be at least 18 years old and a legal resident of the United States to use our services.</p>
  <h4>4. Disclaimers</h4>
  <p>We do not guarantee that you will be approved for a loan or that any loan offer will have specific terms or rates.</p>
</Modal>

<Modal id="modal-disclosures" title="Legal Disclosures">
  <h4>APR Disclosure</h4>
  <p>Participating lenders may offer loans with Annual Percentage Rates (APRs) ranging from {aprMin}% to {aprMax}%. The actual rate depends on your creditworthiness, loan amount, and term. Borrows with excellent credit may receive better rates.</p>
  <h4>Loan Repayment Periods</h4>
  <p>Lenders on our platform generally offer repayment terms ranging from 61 days to 72 months. Availability of terms varies by lender and state.</p>
  <h4>Representative Example</h4>
  <p>If you borrow $5,000 over a 36-month term at an APR of 18.9%, you would pay $182.99 per month. Total repayment would be $6,587.64, with a total interest cost of $1,587.64.</p>
  <h4>Google Ads Compliance</h4>
  <p>Our service complies with Google Financial Services policies by providing clear disclosures on APR ranges, repayment terms, and privacy practices.</p>
</Modal>
`;

  // ─── src/components/ComplianceBlock.astro ───────────────────
  files["src/components/ComplianceBlock.astro"] = `---
interface Props {
  companyName?: string;
}
const { companyName = '${companyName}' } = Astro.props;
---

<footer class="w-full max-w-2xl mx-auto mt-12 px-4 pb-12" role="contentinfo" aria-label="Legal disclosures">
  <div class="border-t border-gray-200 pt-8">
    <div class="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
      <button onclick="document.getElementById('modal-privacy').showModal()" class="hover:text-[var(--color-primary)] transition-colors cursor-pointer">Privacy Policy</button>
      <button onclick="document.getElementById('modal-terms').showModal()" class="hover:text-[var(--color-primary)] transition-colors cursor-pointer">Terms of Service</button>
      <button onclick="document.getElementById('modal-disclosures').showModal()" class="hover:text-[var(--color-primary)] transition-colors cursor-pointer">Disclosures</button>
    </div>

    <div class="text-[10px] sm:text-xs text-gray-400 leading-relaxed text-center space-y-4" role="note">
      <p><strong>Safe & Secure:</strong> We use industry-standard 256-bit SSL encryption to protect your data. Checking your rate will not affect your credit score.</p>
      <p><strong>Not a Lender:</strong> \${companyName} is a lead generator, not a lender or loan broker. We provide a connection service. Any loan terms, rates, and fees are provided by the individual lender and are subject to credit approval and verification.</p>
      <p><strong>APR & Terms:</strong> APR ranges and repayment terms vary by lender and state. Representative examples for a $5,000 loan over 36 months at 18.9% APR would result in 36 monthly payments of $182.99 ($6,587.64 total repayment).</p>
      <p class="pt-4 text-[9px]">&copy; \${new Date().getFullYear()} \${companyName}. All rights reserved.</p>
    </div>
  </div>
</footer>
`;

  // ─── src/lib/tracking.ts ───────────────────────────────────
  files["src/lib/tracking.ts"] = `const STORAGE_KEYS = ['zip', 'amount', 'click_id', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid'] as const;
type StorageKey = typeof STORAGE_KEYS[number];

export function initTracking(): void {
  const params = new URLSearchParams(window.location.search);
  const clickId = params.get('click_id') || params.get('cid') || '';
  if (clickId) sessionStorage.setItem('click_id', clickId);
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as StorageKey[]) {
    const v = params.get(key); if (v) sessionStorage.setItem(key, v);
  }
  const gclid = params.get('gclid'); if (gclid) sessionStorage.setItem('gclid', gclid);
}
export function setTrackingValue(key: StorageKey, value: string): void { sessionStorage.setItem(key, value); }
export function getTrackingValue(key: StorageKey): string { return sessionStorage.getItem(key) || ''; }
export function getTrackingData(): Record<string, string> {
  const data: Record<string, string> = {};
  for (const key of STORAGE_KEYS) { const v = sessionStorage.getItem(key); if (v) data[key] = v; }
  return data;
}
export function sendBeacon(event: string, extra?: Record<string, string>): void {
  const url = (window as any).__TRACK_URL__ || '/track';
  const payload = { event, timestamp: new Date().toISOString(), click_id: getTrackingValue('click_id'), account_id: (window as any).__ACCOUNT_ID__ || '', page: window.location.pathname, ...extra };
  try { const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' }); navigator.sendBeacon(url, blob); } catch { }
}
`;

  // ─── src/pages/index.astro ─────────────────────────────────
  files["src/pages/index.astro"] = `---
import BaseLayout from '../layouts/BaseLayout.astro';
import ZipInput from '../components/ZipInput.astro';
import AmountSlider from '../components/AmountSlider.astro';
import CTAButton from '../components/CTAButton.astro';
import ComplianceBlock from '../components/ComplianceBlock.astro';
import LegalPopups from '../components/LegalPopups.astro';

const accountId = import.meta.env.PUBLIC_ACCOUNT_ID || '';
const trackUrl = import.meta.env.PUBLIC_TRACK_URL || '/track';
const voluumDomain = import.meta.env.PUBLIC_VOLUUM_DOMAIN || '';
const leadsGateFormId = import.meta.env.PUBLIC_LEADSGATE_FORM_ID || '';
const companyName = import.meta.env.PUBLIC_COMPANY_NAME || '${companyName}';
const siteName = import.meta.env.PUBLIC_SITE_NAME || '${brand}';
---

<BaseLayout
  title={\`\${siteName} — ${loanLabel}\`}
  description="${sub}"
  accountId={accountId}
  trackUrl={trackUrl}
  voluumDomain={voluumDomain}
  noindex={true}
>
  <nav class="w-full bg-white/80 backdrop-blur-md h-16 sticky top-0 z-50 shadow-sm border-b border-gray-100">
    <div class="max-w-5xl mx-auto px-4 h-full flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-hover)] flex items-center justify-center text-white font-black shadow-lg shadow-[var(--color-primary)]/20 uppercase">
          {siteName[0]}
        </div>
        <span class="font-bold text-gray-900 tracking-tight text-lg">{siteName}</span>
      </div>
      <div class="hidden sm:flex items-center gap-8">
        <button onclick="document.getElementById('modal-how-it-works').showModal()" class="text-xs font-bold text-gray-500 hover:text-[var(--color-primary)] transition-colors uppercase tracking-widest cursor-pointer">How It Works</button>
        <button onclick="document.getElementById('modal-disclosures').showModal()" class="text-xs font-bold text-gray-500 hover:text-[var(--color-primary)] transition-colors uppercase tracking-widest cursor-pointer">Legal</button>
        <button onclick="document.getElementById('hero-heading').scrollIntoView({ behavior: 'smooth' })" class="bg-[var(--color-primary)] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-95">Apply Now</button>
      </div>
    </div>
  </nav>

  <main id="main-content" class="flex flex-col items-center px-4 py-8 sm:py-20 bg-gray-50/30">

    <!-- Hero -->
    <section class="max-w-2xl w-full text-center mb-12" aria-labelledby="hero-heading">
      <h1 id="hero-heading" class="text-4xl sm:text-5xl font-black text-gray-900 mb-6 leading-tight tracking-tight" style="text-wrap:balance">
        ${h1}
      </h1>
      <p class="text-lg sm:text-xl text-gray-500 leading-relaxed font-medium max-w-lg mx-auto" style="text-wrap:pretty">
        ${sub}
      </p>
    </section>

    <!-- Form -->
    <section class="w-full max-w-md bg-white rounded-[2rem] shadow-2xl border border-gray-100 p-8 sm:p-12 mb-16 relative" aria-labelledby="form-heading" role="form">
      <h2 id="form-heading" class="sr-only">Loan Application Form</h2>
      <div class="space-y-10">
        <div><AmountSlider /></div>
        <div><ZipInput /></div>
        <div><CTAButton leadsGateFormId={leadsGateFormId} /></div>
      </div>
    </section>

    <ComplianceBlock companyName={companyName} />
  </main>
  
  <LegalPopups />
</BaseLayout>
`;

  // ─── README.md ─────────────────────────────────────────────
  files["README.md"] = `# ${brand} — Landing Page

Astro static landing page for ${loanLabel}.

## Quick Start

\`\`\`bash
npm install
npm run dev      # Dev server at localhost:4321
npm run build    # Build to dist/
npm run preview  # Preview built site
\`\`\`

## Configuration

Edit \`.env\` to configure tracking and API keys:

\`\`\`
SITE_URL=https://${domain}
PUBLIC_SITE_NAME=${brand}
PUBLIC_COMPANY_NAME=${companyName}
PUBLIC_LEADSGATE_FORM_ID=your-form-id
PUBLIC_VOLUUM_DOMAIN=trk.yourdomain.com
PUBLIC_ACCOUNT_ID=your-account-id
PUBLIC_TRACK_URL=/track
\`\`\`

## Deploy

\`\`\`bash
# Cloudflare Pages
npx wrangler pages deploy dist/

# Netlify
npx netlify deploy --prod --dir=dist

# Any static host
# Upload the contents of dist/ folder
\`\`\`
`;

  return files;
}
