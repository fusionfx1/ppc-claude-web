---
title: "Deploying AstroDeck to Production"
description: "Step-by-step guide to deploying your AstroDeck site to Vercel, Netlify, or Cloudflare Pages."
pubDate: 2025-12-24
author: "AstroDeck Team"
tags: ["tutorial", "deployment", "vercel", "netlify"]
---

# Deploying AstroDeck to Production

Ready to share your AstroDeck site with the world? This guide covers deploying to the most popular hosting platforms.

## Before You Deploy

### 1. Update Your Site URL

Open `astro.config.mjs` and set your production URL:

```js
export default defineConfig({
  site: 'https://your-domain.com',
  // ... other config
});
```

This URL is used for:
- Generating the sitemap
- Creating canonical URLs
- Building RSS feed links

### 2. Build Locally First

Always test your production build before deploying:

```bash
npm run build
npm run preview
```

Visit `http://localhost:4321` to preview exactly what will be deployed.

## Deploy to Vercel

Vercel is the recommended platform for Astro projects. It offers automatic deployments and excellent performance.

### Option 1: One-Click Deploy

Click the button on AstroDeck's GitHub page or use:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/holger1411/astrodeck)

### Option 2: Connect Your Repository

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and sign in
3. Click "New Project"
4. Import your GitHub repository
5. Vercel auto-detects Astro - just click "Deploy"

### Option 3: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy (follow prompts)
vercel

# Deploy to production
vercel --prod
```

### Vercel Configuration

Create `vercel.json` for advanced settings:

```json
{
  "framework": "astro",
  "buildCommand": "npm run build",
  "outputDirectory": "dist"
}
```

## Deploy to Netlify

Netlify is another excellent choice with generous free tier.

### Option 1: Connect Repository

1. Go to [netlify.com](https://netlify.com) and sign in
2. Click "New site from Git"
3. Select your repository
4. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Click "Deploy site"

### Option 2: Netlify CLI

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Login to Netlify
netlify login

# Initialize site
netlify init

# Deploy preview
netlify deploy

# Deploy to production
netlify deploy --prod
```

### Netlify Configuration

Create `netlify.toml` in your project root:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/404"
  status = 404
```

## Deploy to Cloudflare Pages

Cloudflare Pages offers excellent global performance and DDoS protection.

### Connect Repository

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to Pages > Create a project
3. Connect your GitHub account
4. Select your repository
5. Configure build settings:
   - Framework preset: Astro
   - Build command: `npm run build`
   - Build output directory: `dist`
6. Click "Save and Deploy"

### Wrangler CLI

```bash
# Install Wrangler
npm i -g wrangler

# Login to Cloudflare
wrangler login

# Deploy
npx wrangler pages deploy dist
```

## Environment Variables

### Setting Variables

Store sensitive data in environment variables, not in code:

**Vercel:**
Project Settings → Environment Variables

**Netlify:**
Site settings → Build & deploy → Environment

**Cloudflare:**
Settings → Environment variables

### Using Variables in Astro

Access variables in your code:

```astro
---
const apiKey = import.meta.env.PUBLIC_API_KEY;
const secretKey = import.meta.env.SECRET_KEY;
---
```

Note: Variables prefixed with `PUBLIC_` are exposed to the client.

## Custom Domains

### Vercel
1. Go to Project Settings → Domains
2. Add your domain
3. Configure DNS as instructed

### Netlify
1. Go to Site settings → Domain management
2. Add custom domain
3. Follow DNS configuration steps

### Cloudflare
1. Go to Pages project → Custom domains
2. Add domain (automatically configures if domain is on Cloudflare)

## Continuous Deployment

All three platforms automatically redeploy when you push to your main branch:

```bash
git add .
git commit -m "feat: add new feature"
git push origin main
# Site automatically rebuilds and deploys!
```

### Preview Deployments

Pull requests automatically get preview URLs:
- **Vercel**: `your-project-git-branch-username.vercel.app`
- **Netlify**: `deploy-preview-123--your-site.netlify.app`
- **Cloudflare**: `abc123.your-project.pages.dev`

## Performance Optimization

### Enable Caching

AstroDeck is configured for optimal caching. Verify your platform settings include:

- Static assets: 1 year cache
- HTML: No cache or short cache
- Immutable assets: Permanent cache

### Enable Compression

All platforms enable Brotli/Gzip compression by default.

### Use a CDN

All recommended platforms include global CDN distribution automatically.

## Troubleshooting

### Build Fails

1. Check Node.js version (18.14.1+ required)
2. Clear cache and rebuild
3. Check for TypeScript errors locally

### 404 Errors

Ensure your hosting platform is configured for static hosting, not serverless.

### Environment Variables Not Working

- Redeploy after adding variables
- Check variable names match exactly
- Remember `PUBLIC_` prefix for client-side variables

## Next Steps

After deploying:

1. Set up a custom domain
2. Configure analytics (Vercel Analytics included!)
3. Set up monitoring and alerts
4. Enable automatic security updates

Your AstroDeck site is now live! 🚀
