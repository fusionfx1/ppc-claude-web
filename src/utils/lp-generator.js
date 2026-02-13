import { COLORS, FONTS, RADIUS, LOAN_TYPES } from "../constants";

function esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return '#';
  const trimmed = url.trim();
  // Only allow http, https, and anchor protocols
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('#') || trimmed.startsWith('/')) {
    return esc(trimmed);
  }
  return '#';
}

function validGtmId(id) {
  return /^GTM-[A-Z0-9]+$/i.test(id);
}

export function generateLP(site) {
  const c = COLORS.find(x => x.id === site.colorId) || COLORS[0];
  const f = FONTS.find(x => x.id === site.fontId) || FONTS[0];
  const r = RADIUS.find(x => x.id === site.radius) || RADIUS[2];
  const brand = esc(site.brand || "LoanBridge");
  const loanLabel = LOAN_TYPES.find(l => l.id === site.loanType)?.label || "Personal Loans";
  const h1 = esc(site.h1 || `Fast ${loanLabel} Up To $${(site.amountMax || 5000).toLocaleString()}`);
  const badge = esc(site.badge || "Trusted by 15,000+ borrowers");
  const cta = esc(site.cta || "Check Your Rate");
  const sub = esc(site.sub || "Get approved in minutes. Funds as fast as next business day.");
  const midAmount = Math.round(((site.amountMin || 100) + (site.amountMax || 5000)) / 2);

  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${brand} – ${loanLabel} | Fast Approval</title>
<meta name="description" content="${sub}">
<meta name="theme-color" content="hsl(${c.p[0]},${c.p[1]}%,${c.p[2]}%)">
<meta name="color-scheme" content="light">
<link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=${f.import}&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
<noscript><link href="https://fonts.googleapis.com/css2?family=${f.import}&display=swap" rel="stylesheet"></noscript>
${site.gtmId && validGtmId(site.gtmId) ? `<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${site.gtmId}');</script>` : ""}
${site.voluumId ? `<script>!function(e,a,t,n,c,o,s){e.V_ID=n,e[n]=e[n]||function(){(e[n].q=e[n].q||[]).push(arguments)},o=a.createElement(t),s=a.getElementsByTagName(t)[0],o.async=1,o.src="https://"+c+"/track.js?id="+n,s.parentNode.insertBefore(o,s)}(window,document,"script","voluum","${site.voluumDomain || 'trk.scratchpethelp.com'}");</script>` : ""}
<style>
:root{--p:${c.p[0]} ${c.p[1]}% ${c.p[2]}%;--s:${c.s[0]} ${c.s[1]}% ${c.s[2]}%;--a:${c.a[0]} ${c.a[1]}% ${c.a[2]}%;--bg:${c.bg[0]} ${c.bg[1]}% ${c.bg[2]}%;--fg:${c.fg[0]} ${c.fg[1]}% ${c.fg[2]}%;--radius:${r.v}}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%;text-size-adjust:100%}
body{font-family:${f.family},system-ui,-apple-system,sans-serif;background:hsl(var(--bg));color:hsl(var(--fg));-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;font-size:1rem;line-height:1.5}
img,svg{display:block;max-width:100%;height:auto}
a{color:inherit;text-decoration:none}
a:focus-visible,.btn:focus-visible,input:focus-visible{outline:3px solid hsl(var(--p));outline-offset:2px;border-radius:4px}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.container{width:100%;max-width:1120px;margin:0 auto;padding:0 20px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 24px;border-radius:var(--radius);font-weight:700;font-size:1rem;border:none;cursor:pointer;transition:transform .2s,box-shadow .2s;text-decoration:none;min-height:48px;min-width:48px;line-height:1.2}
.btn-cta{background:linear-gradient(135deg,hsl(var(--a)),hsl(var(--a)/.85));color:#fff;box-shadow:0 4px 16px hsl(var(--a)/.3)}
.btn-cta:hover,.btn-cta:focus-visible{transform:translateY(-1px);box-shadow:0 6px 24px hsl(var(--a)/.4)}
.btn-cta:active{transform:translateY(0)}
.card{background:#fff;border:1px solid hsl(var(--fg)/.08);border-radius:var(--radius);padding:20px}
header{position:fixed;top:0;left:0;right:0;z-index:50;background:rgba(255,255,255,.92);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);border-bottom:1px solid hsl(var(--fg)/.06)}
header nav{display:flex;align-items:center;justify-content:space-between;height:60px}
.hero{padding:80px 0 40px;background:linear-gradient(135deg,hsl(var(--p)),hsl(var(--p)/.7));color:#fff;position:relative;overflow:hidden;text-align:center}
.hero .grid{display:grid;grid-template-columns:1fr;gap:32px;align-items:center}
.badge{display:inline-flex;align-items:center;gap:6px;padding:6px 16px;border-radius:999px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);font-size:.8125rem;color:rgba(255,255,255,.95);margin-bottom:16px}
.badge .dot{width:8px;height:8px;border-radius:50%;background:hsl(var(--s));animation:pulse 2s infinite}
@media(prefers-reduced-motion:reduce){.badge .dot{animation:none}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
h1{font-size:clamp(1.75rem,8vw,3.25rem);font-weight:800;line-height:1.1;margin-bottom:16px;text-wrap:balance}
h1 .accent{color:hsl(var(--a))}
.hero p{font-size:1rem;color:rgba(255,255,255,.8);margin:0 auto 24px;max-width:480px;text-wrap:pretty}
.form-card{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:var(--radius);padding:24px;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);text-align:left}
.form-card h2{font-size:1.125rem;font-weight:700;margin-bottom:4px}
.form-card .sub-text{font-size:.8125rem;color:rgba(255,255,255,.7);margin-bottom:20px}
.slider-wrap{margin-bottom:20px}
.slider-label{display:flex;justify-content:space-between;font-size:.8125rem;margin-bottom:8px}
.slider-amount{font-size:1.625rem;font-weight:800;color:hsl(var(--a))}
input[type=range]{width:100%;height:8px;-webkit-appearance:none;appearance:none;background:rgba(255,255,255,.15);border-radius:4px;outline:none;cursor:pointer}
input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:28px;height:28px;border-radius:50%;background:hsl(var(--a));cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.3);border:2px solid #fff}
input[type=range]::-moz-range-thumb{width:28px;height:28px;border-radius:50%;background:hsl(var(--a));cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.3);border:2px solid #fff}
input[type=range]:focus-visible{outline:3px solid hsl(var(--a));outline-offset:2px}
.checks{display:flex;flex-direction:column;gap:12px;margin-bottom:20px;align-items:center}
.checks li{display:flex;align-items:center;gap:6px;font-size:.8125rem;color:rgba(255,255,255,.8);list-style:none}
.check-icon{width:20px;height:20px;border-radius:50%;background:hsl(var(--s));display:flex;align-items:center;justify-content:center;color:#fff;font-size:.625rem;flex-shrink:0}
.check-icon svg{width:12px;height:12px;stroke:#fff;stroke-width:3;fill:none}
section{padding:48px 0}
.section-title{text-align:center;margin-bottom:32px;padding:0 20px}
.section-title .tag{display:inline-block;padding:4px 12px;border-radius:999px;font-size:.6875rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;background:hsl(var(--p)/.08);color:hsl(var(--p));margin-bottom:12px}
.section-title h2{font-size:1.625rem;font-weight:800;text-wrap:balance}
.section-title p{color:hsl(var(--fg)/.6);margin:8px auto 0;font-size:.875rem}
.steps,.benefits{display:grid;grid-template-columns:1fr;gap:20px}
.step,.benefit{text-align:center}
.step .icon{width:56px;height:56px;margin:0 auto 12px;border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;background:hsl(var(--p)/.08)}
.step .num{width:28px;height:28px;margin:-14px auto 8px;border-radius:50%;background:hsl(var(--p));color:#fff;font-size:.75rem;font-weight:800;display:flex;align-items:center;justify-content:center}
.benefit .emoji{font-size:2rem;margin-bottom:12px}
.cta-section{background:linear-gradient(135deg,hsl(var(--p)),hsl(var(--p)/.8));color:#fff;text-align:center;padding:40px 20px;border-radius:var(--radius);margin:0 20px}
footer{background:hsl(var(--fg)/.03);border-top:1px solid hsl(var(--fg)/.06);padding:40px 0 24px}
footer a{display:block;padding:4px 0;font-size:.8125rem;color:hsl(var(--fg)/.5);transition:color .15s}
footer a:hover{color:hsl(var(--p))}
footer h4{font-size:.875rem;font-weight:700;margin-bottom:8px}
.footer-grid{display:grid;grid-template-columns:1fr;gap:32px;margin-bottom:32px}
.compliance{border-top:1px solid hsl(var(--fg)/.06);padding-top:24px;font-size:.6875rem;color:hsl(var(--fg)/.4);line-height:1.7}
.trust-bar{background:#fff;border-bottom:1px solid hsl(var(--fg)/.06)}
.trust-bar .inner{display:flex;justify-content:center;gap:32px;flex-wrap:wrap;align-items:center;padding:16px 20px}
.trust-bar span{font-size:.8125rem;color:hsl(var(--fg)/.5)}
.trust-bar b{color:hsl(var(--fg))}

@media(min-width:768px){
  .btn{padding:14px 32px}
  header nav{height:64px}
  .hero{padding:120px 0 80px;text-align:left}
  .hero .grid{grid-template-columns:1fr 1fr;gap:48px}
  .hero p{margin:0 0 28px}
  .checks{flex-direction:row;align-items:center;gap:16px}
  .section-title h2{font-size:2.25rem}
  .steps{grid-template-columns:repeat(3,1fr);max-width:960px;margin:0 auto}
  .benefits{grid-template-columns:repeat(2,1fr);max-width:960px;margin:0 auto}
  .footer-grid{grid-template-columns:2fr 1fr 1fr 1fr}
  .cta-section{padding:60px;margin:0 auto;max-width:1120px}
}
</style>
</head>
<body>
${site.gtmId && validGtmId(site.gtmId) ? `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${site.gtmId}" height="0" width="0" style="display:none;visibility:hidden" title="GTM"></iframe></noscript>` : ""}

<a href="#main-content" class="sr-only" style="position:fixed;top:0;left:0;z-index:100;background:hsl(var(--p));color:#fff;padding:12px 24px;font-size:1rem;font-weight:700;clip:auto;width:auto;height:auto" onfocus="this.style.clip='auto';this.style.width='auto';this.style.height='auto'" onblur="this.className='sr-only'">Skip to main content</a>

<header role="banner"><div class="container"><nav aria-label="Main navigation">
  <a href="/" aria-label="${brand} homepage" style="display:flex;align-items:center;gap:8px">
    <div style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,hsl(var(--p)),hsl(var(--a)));display:flex;align-items:center;justify-content:center" aria-hidden="true">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" aria-hidden="true"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
    </div>
    <span style="font-size:1rem;font-weight:700">${brand}</span>
  </a>
  <a href="#apply" class="btn btn-cta" style="padding:10px 20px;font-size:.875rem">${cta}</a>
</nav></div></header>

<main id="main-content">

<section class="hero" id="apply" aria-labelledby="hero-heading"><div class="container"><div class="grid">
  <div>
    <p class="badge" aria-label="Trust indicator"><span class="dot" aria-hidden="true"></span> ${badge}</p>
    <h1 id="hero-heading">${h1.replace(/(\$[\d,]+)/g, '<span class="accent">$1</span>')}</h1>
    <p>${sub}</p>
    <ul class="checks" aria-label="Key benefits" role="list">
      <li><span class="check-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg></span> All Credit Welcome</li>
      <li><span class="check-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg></span> 2-Min Application</li>
      <li><span class="check-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg></span> No Hidden Fees</li>
    </ul>
  </div>
  <div class="form-card" role="form" aria-labelledby="form-heading">
    <h2 id="form-heading">How much do you need?</h2>
    <p class="sub-text">Check your rate in 2 minutes — won't affect credit score</p>
    <div class="slider-wrap">
      <div class="slider-label"><label for="loan-amount">Amount</label></div>
      <output id="amount-display" class="slider-amount" for="loan-amount" aria-live="polite">$${midAmount.toLocaleString()}</output>
      <input type="range" id="loan-amount" name="amount" min="${site.amountMin}" max="${site.amountMax}" value="${midAmount}" step="100"
        aria-label="Loan amount from $${(site.amountMin || 100).toLocaleString()} to $${(site.amountMax || 5000).toLocaleString()}"
        aria-valuemin="${site.amountMin}" aria-valuemax="${site.amountMax}" aria-valuenow="${midAmount}"
        aria-valuetext="$${midAmount.toLocaleString()}">
    </div>
    <a href="${sanitizeUrl(site.redirectUrl)}" class="btn btn-cta" style="width:100%;font-size:1.0625rem" role="button"
      aria-label="${cta} — check your loan rate">${cta}</a>
    <p style="text-align:center;margin-top:12px;font-size:.6875rem;color:rgba(255,255,255,.5)">
      <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" style="vertical-align:middle;margin-right:3px" aria-hidden="true"><path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/></svg>
      256-bit SSL Encryption &bull; Won't affect credit score
    </p>
  </div>
</div></div></section>

<section class="trust-bar" aria-label="Trust indicators"><div class="container"><div class="inner">
  <span><b>15,000+</b> loans funded</span>
  <span aria-label="4.8 out of 5 star rating"><svg width="14" height="14" viewBox="0 0 20 20" fill="hsl(45,93%,47%)" style="vertical-align:middle" aria-hidden="true"><path d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.33L10 13.27l-4.77 2.51.91-5.33L2.27 6.68l5.34-.78z"/></svg> <b>4.8/5</b></span>
  <span><svg width="14" height="14" viewBox="0 0 20 20" fill="hsl(var(--p))" style="vertical-align:middle" aria-hidden="true"><path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/></svg> <b>256-bit</b> encryption</span>
</div></div></section>

<section id="how-it-works" aria-labelledby="steps-heading"><div class="container">
  <div class="section-title">
    <span class="tag">How It Works</span>
    <h2 id="steps-heading">Get Funded in 3 Simple Steps</h2>
    <p>No paperwork. No waiting. Everything happens online.</p>
  </div>
  <ol class="steps" role="list" style="list-style:none">
    <li class="step card"><div class="icon" aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--p))" stroke-width="2"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></div><div class="num" aria-hidden="true">1</div><h3>Apply Online</h3><p>Fill out our simple 2-minute form. No impact on your credit score.</p></li>
    <li class="step card"><div class="icon" aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--p))" stroke-width="2"><path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg></div><div class="num" aria-hidden="true">2</div><h3>Get Matched</h3><p>Our network of lenders competes to offer you the best rate.</p></li>
    <li class="step card"><div class="icon" aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--p))" stroke-width="2"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div><div class="num" aria-hidden="true">3</div><h3>Get Funded</h3><p>Accept your offer and receive funds as fast as next business day.</p></li>
  </ol>
</div></section>

<section style="background:#fff" aria-labelledby="benefits-heading"><div class="container">
  <div class="section-title">
    <span class="tag">Why ${brand}</span>
    <h2 id="benefits-heading">Built for Real People</h2>
    <p>We make borrowing simple, transparent, and stress-free.</p>
  </div>
  <ul class="benefits" role="list" style="list-style:none">
    ${[
      ["M13 10V3L4 14h7v7l9-11h-7z", "Fast Approval", "Get a decision in minutes, not days. Our streamlined process respects your time."],
      ["M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z", "Bank-Level Security", "Your data is protected with 256-bit encryption. We never sell your information."],
      ["M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", "Transparent Terms", "No hidden fees, no surprises. See your exact rate before you commit."],
      ["M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z", "All Credit Welcome", `Whether your credit is excellent or needs work, ${brand} has options for you.`],
    ].map(([path, t, d]) => `<li class="card benefit"><div aria-hidden="true" style="margin-bottom:12px"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--p))" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg></div><h3>${t}</h3><p>${d}</p></li>`).join("")}
  </ul>
</div></section>

<section aria-labelledby="cta-heading"><div class="container">
  <div class="cta-section">
    <h2 id="cta-heading">Ready to Get Started?</h2>
    <p>Join thousands who've found a smarter way to borrow.</p>
    <a href="#apply" class="btn btn-cta" style="font-size:1.125rem;padding:16px 40px">${cta}</a>
  </div>
</div></section>

</main>

<footer role="contentinfo"><div class="container">
  <div class="footer-grid">
    <div>
      <a href="/" style="display:flex;align-items:center;gap:8px;margin-bottom:12px" aria-label="${brand} homepage">
        <div style="width:28px;height:28px;border-radius:7px;background:linear-gradient(135deg,hsl(var(--p)),hsl(var(--a)));display:flex;align-items:center;justify-content:center" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" aria-hidden="true"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
        </div>
        <span style="font-weight:700">${brand}</span>
      </a>
      <p style="font-size:.8125rem;color:hsl(var(--fg)/.5);line-height:1.6">Connecting you with trusted lenders for ${loanLabel.toLowerCase()} up to $${(site.amountMax || 5000).toLocaleString()}.</p>
    </div>
    <nav aria-label="Company links"><h4>Company</h4><a href="#how-it-works">How It Works</a><a href="#apply">Apply Now</a></nav>
    <nav aria-label="Legal links"><h4>Legal</h4><a href="/privacy">Privacy Policy</a><a href="/terms">Terms of Service</a><a href="/disclosures">Disclosures</a></nav>
    <div><h4>Support</h4><a href="mailto:${esc(site.email || "support@" + (site.domain || "example.com"))}">${esc(site.email || "Contact Us")}</a></div>
  </div>
  <div class="compliance" role="note" aria-label="Legal disclosures">
    <p><strong>Representative Example:</strong> A $1,000 loan repaid over 12 monthly installments at ${site.aprMin || 5.99}% APR would result in 12 payments of $90.26. Total payable: $1,083.12.</p>
    <p><strong>APR Disclosure:</strong> Annual Percentage Rate (APR) ranges from ${site.aprMin || 5.99}% to ${site.aprMax || 35.99}%. APR depends on credit score, loan amount, and term.</p>
    <p>${brand} is NOT a lender and does not make loan or credit decisions. ${brand} connects interested persons with a lender from its network of approved lenders.</p>
    <p style="margin-top:16px"><small>&copy; ${new Date().getFullYear()} ${brand}. All rights reserved.</small></p>
  </div>
</div></footer>

<script>
(function(){
  // Slider a11y + tracking
  var s=document.getElementById('loan-amount'),o=document.getElementById('amount-display');
  if(s&&o){s.addEventListener('input',function(){var v='$'+Number(this.value).toLocaleString();o.textContent=v;this.setAttribute('aria-valuenow',this.value);this.setAttribute('aria-valuetext',v);if(window.dataLayer)dataLayer.push({event:'slider_interact'})});}

  // CTA tracking
  var cta=document.querySelector('.form-card .btn-cta');
  if(cta){cta.addEventListener('click',function(){if(window.dataLayer){dataLayer.push({event:'cta_click'});dataLayer.push({event:'generate_lead_start'});}if(window.voluum)voluum('track','click');});}

  // GTM data + micro-conversions
  if(window.dataLayer){
    dataLayer.push({'brand_name':'${brand}','loan_type':'${loanLabel}','amount_min':${site.amountMin},'amount_max':${site.amountMax}});
    dataLayer.push({event:'page_view'});
    var st=[25,50,75,90],tracked=[];
    window.addEventListener('scroll',function(){var h=document.documentElement.scrollHeight-window.innerHeight;if(h<=0)return;var p=Math.round(window.scrollY/h*100);st.forEach(function(t){if(p>=t&&tracked.indexOf(t)===-1){dataLayer.push({event:'scroll_'+t});tracked.push(t);}});},{passive:true});
    [15,30,60,120].forEach(function(t){setTimeout(function(){dataLayer.push({event:'time_on_page_'+t+'s'});},t*1000);});
    if(s){s.addEventListener('focus',function(){dataLayer.push({event:'form_start'});},{once:true});}
  }
})();
</script>
</body></html>`;
}

// Minimal ZIP creator (single HTML file)
export async function htmlToZip(html) {
  const encoder = new TextEncoder();
  const data = encoder.encode(html);
  const name = encoder.encode("index.html");

  const crc32 = (buf) => {
    let c = 0xFFFFFFFF;
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let x = n; for (let k = 0; k < 8; k++) x = x & 1 ? 0xEDB88320 ^ (x >>> 1) : x >>> 1; t[n] = x; }
    for (let i = 0; i < buf.length; i++) c = t[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  };

  const crc = crc32(data);
  const now = new Date();
  const time = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xFFFF;
  const date = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xFFFF;

  const localHeader = new Uint8Array(30 + name.length);
  const dv = new DataView(localHeader.buffer);
  dv.setUint32(0, 0x04034b50, true);
  dv.setUint16(4, 20, true);
  dv.setUint16(8, 0, true);
  dv.setUint16(10, time, true);
  dv.setUint16(12, date, true);
  dv.setUint32(14, crc, true);
  dv.setUint32(18, data.length, true);
  dv.setUint32(22, data.length, true);
  dv.setUint16(26, name.length, true);
  localHeader.set(name, 30);

  const centralOffset = localHeader.length + data.length;
  const centralDir = new Uint8Array(46 + name.length);
  const cdv = new DataView(centralDir.buffer);
  cdv.setUint32(0, 0x02014b50, true);
  cdv.setUint16(4, 20, true);
  cdv.setUint16(6, 20, true);
  cdv.setUint16(12, time, true);
  cdv.setUint16(14, date, true);
  cdv.setUint32(16, crc, true);
  cdv.setUint32(20, data.length, true);
  cdv.setUint32(24, data.length, true);
  cdv.setUint16(28, name.length, true);
  cdv.setUint32(42, 0, true);
  centralDir.set(name, 46);

  const endRecord = new Uint8Array(22);
  const ev = new DataView(endRecord.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, 1, true);
  ev.setUint16(10, 1, true);
  ev.setUint32(12, centralDir.length, true);
  ev.setUint32(16, centralOffset, true);

  const zip = new Uint8Array(localHeader.length + data.length + centralDir.length + endRecord.length);
  let off = 0;
  zip.set(localHeader, off); off += localHeader.length;
  zip.set(data, off); off += data.length;
  zip.set(centralDir, off); off += centralDir.length;
  zip.set(endRecord, off);

  return new Blob([zip], { type: "application/zip" });
}

/**
 * Multi-file ZIP creator for Astro project.
 * Takes a file map { [filepath]: content } and returns a Blob.
 */
export async function astroProjectToZip(files) {
  const encoder = new TextEncoder();

  const crc32 = (buf) => {
    let c = 0xFFFFFFFF;
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let x = n; for (let k = 0; k < 8; k++) x = x & 1 ? 0xEDB88320 ^ (x >>> 1) : x >>> 1; t[n] = x; }
    for (let i = 0; i < buf.length; i++) c = t[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  };

  const now = new Date();
  const time = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xFFFF;
  const date = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xFFFF;

  const entries = Object.entries(files);
  const localHeaders = [];
  const fileDataParts = [];
  const centralDirs = [];
  let offset = 0;

  for (const [filepath, content] of entries) {
    const nameBytes = encoder.encode(filepath);
    const dataBytes = encoder.encode(content);
    const crc = crc32(dataBytes);

    // Local file header
    const lh = new Uint8Array(30 + nameBytes.length);
    const ldv = new DataView(lh.buffer);
    ldv.setUint32(0, 0x04034b50, true);
    ldv.setUint16(4, 20, true);
    ldv.setUint16(8, 0, true);   // compression: store
    ldv.setUint16(10, time, true);
    ldv.setUint16(12, date, true);
    ldv.setUint32(14, crc, true);
    ldv.setUint32(18, dataBytes.length, true);
    ldv.setUint32(22, dataBytes.length, true);
    ldv.setUint16(26, nameBytes.length, true);
    ldv.setUint16(28, 0, true);  // extra field length
    lh.set(nameBytes, 30);

    // Central directory entry
    const cd = new Uint8Array(46 + nameBytes.length);
    const cdv = new DataView(cd.buffer);
    cdv.setUint32(0, 0x02014b50, true);
    cdv.setUint16(4, 20, true);
    cdv.setUint16(6, 20, true);
    cdv.setUint16(12, time, true);
    cdv.setUint16(14, date, true);
    cdv.setUint32(16, crc, true);
    cdv.setUint32(20, dataBytes.length, true);
    cdv.setUint32(24, dataBytes.length, true);
    cdv.setUint16(28, nameBytes.length, true);
    cdv.setUint32(42, offset, true); // relative offset of local header
    cd.set(nameBytes, 46);

    localHeaders.push(lh);
    fileDataParts.push(dataBytes);
    centralDirs.push(cd);
    offset += lh.length + dataBytes.length;
  }

  const centralDirOffset = offset;
  const centralDirSize = centralDirs.reduce((s, cd) => s + cd.length, 0);

  // End of central directory
  const endRecord = new Uint8Array(22);
  const ev = new DataView(endRecord.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralDirSize, true);
  ev.setUint32(16, centralDirOffset, true);

  // Assemble
  const totalSize = centralDirOffset + centralDirSize + endRecord.length;
  const zip = new Uint8Array(totalSize);
  let pos = 0;
  for (let i = 0; i < entries.length; i++) {
    zip.set(localHeaders[i], pos); pos += localHeaders[i].length;
    zip.set(fileDataParts[i], pos); pos += fileDataParts[i].length;
  }
  for (const cd of centralDirs) {
    zip.set(cd, pos); pos += cd.length;
  }
  zip.set(endRecord, pos);

  return new Blob([zip], { type: "application/zip" });
}

export function makeThemeJson(site) {
  const c = COLORS.find(x => x.id === site.colorId) || COLORS[0];
  const f = FONTS.find(x => x.id === site.fontId) || FONTS[0];
  const r = RADIUS.find(x => x.id === site.radius) || RADIUS[2];
  return {
    variantId: site.id, domain: site.domain, gtmId: site.gtmId || "",
    colors: {
      primary: `${c.p[0]} ${c.p[1]}% ${c.p[2]}% `, secondary: `${c.s[0]} ${c.s[1]}% ${c.s[2]}% `,
      accent: `${c.a[0]} ${c.a[1]}% ${c.a[2]}% `, background: `${c.bg[0]} ${c.bg[1]}% ${c.bg[2]}% `,
      foreground: `${c.fg[0]} ${c.fg[1]}% ${c.fg[2]}% `,
      card: "0 0% 100%", "card-foreground": `${c.fg[0]} ${c.fg[1]}% ${c.fg[2]}% `,
      muted: `${c.bg[0]} ${c.bg[1]}% ${Math.max(c.bg[2] - 2, 90)}% `,
      "muted-foreground": "215 16% 47%", border: "214 32% 91%",
      input: "214 32% 91%", ring: `${c.p[0]} ${c.p[1]}% ${c.p[2]}% `,
      "primary-foreground": "0 0% 100%", "secondary-foreground": "0 0% 100%",
      "accent-foreground": "0 0% 100%",
    },
    radius: r.v,
    font: { id: f.id, family: f.family, googleImport: f.import },
    layout: { hero: site.layout === "hero-left" ? "form-right" : site.layout === "hero-center" ? "form-below" : "form-overlap" },
    copy: {
      brand: site.brand, tagline: site.tagline || "", h1: site.h1 || "",
      h1span: "", badge: site.badge || "", cta: site.cta || "",
      sub: site.sub || "", complianceEmail: site.email || "",
    },
    loanProduct: { type: site.loanType, amountMin: site.amountMin, amountMax: site.amountMax, aprMin: site.aprMin, aprMax: site.aprMax },
    tracking: { gtmId: site.gtmId, network: site.network, redirectUrl: site.redirectUrl, conversionId: site.conversionId, conversionLabel: site.conversionLabel },
  };
}
