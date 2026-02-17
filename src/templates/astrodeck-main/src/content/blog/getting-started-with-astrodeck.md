---
title: "Getting Started with AstroDeck"
description: "Learn how to install, configure, and customize AstroDeck - the AI-ready Astro.js starter kit with pre-built components."
pubDate: 2025-12-26
author: "AstroDeck Team"
tags: ["tutorial", "getting-started", "astro"]
---

# Getting Started with AstroDeck

Welcome to AstroDeck! This guide will walk you through setting up your new project and making your first customizations.

## Prerequisites

Before you begin, make sure you have:

- **Node.js** 18.14.1 or higher
- **npm**, **pnpm**, or **yarn** package manager
- A code editor (we recommend VS Code)

## Installation

### Option 1: Clone from GitHub

```bash
git clone https://github.com/holger1411/astrodeck.git my-project
cd my-project
npm install
npm run dev
```

### Option 2: Use degit (recommended)

```bash
npx degit holger1411/astrodeck my-project
cd my-project
npm install
npm run dev
```

Your site is now running at `http://localhost:4321`!

## Project Structure

Here's what you'll find in your new AstroDeck project:

```
astrodeck/
├── public/              # Static assets (images, fonts, favicon)
├── src/
│   ├── components/      # Reusable components
│   │   ├── sections/    # Pre-built page sections
│   │   └── ui/          # shadcn/ui components
│   ├── content/         # Blog posts and content collections
│   ├── layouts/         # Page layouts
│   ├── pages/           # File-based routing
│   └── styles/          # Global styles and CSS variables
├── AGENTS.md            # AI assistant documentation
├── PROJECT.md           # Your project customization file
└── astro.config.mjs     # Astro configuration
```

## Key Files to Know

### `src/styles/globals.css`

This is where all your design tokens live. Colors, fonts, spacing - everything is customizable using CSS variables with OKLCH color format:

```css
:root {
  --primary: oklch(55% 0.2 250);
  --background: oklch(100% 0 0);
  --foreground: oklch(10% 0 0);
}
```

### `PROJECT.md`

Your project-specific documentation. Update this file with your brand colors, design decisions, and project requirements. AI assistants will read this file to understand your project context.

### `AGENTS.md`

Comprehensive documentation for AI-assisted development. This file helps tools like Claude Code, GitHub Copilot, and Cursor understand how to work with your project.

## Your First Customization

Let's change the primary color to make the site your own:

1. Open `src/styles/globals.css`
2. Find the `:root` section
3. Change `--primary` to your brand color:

```css
:root {
  --primary: oklch(60% 0.15 145);  /* A nice green */
}
```

4. Save the file and watch your site update instantly!

## Adding a New Page

Creating pages in Astro is simple - just add a file to `src/pages/`:

```astro
---
// src/pages/about.astro
import BaseLayout from "@/layouts/BaseLayout.astro";
---

<BaseLayout title="About Us" description="Learn more about our company">
  <div class="container max-w-3xl py-12 px-4">
    <h1 class="text-4xl font-bold mb-4">About Us</h1>
    <p class="text-muted-foreground">
      Your company description here...
    </p>
  </div>
</BaseLayout>
```

Visit `http://localhost:4321/about` to see your new page!

## Using Pre-built Sections

AstroDeck includes ready-to-use sections. Check them out at `/sections` on your local site, then import them:

```astro
---
import Hero from "@/components/sections/Hero.astro";
import Features from "@/components/sections/Features.astro";
import CTA from "@/components/sections/CTA.astro";
---

<Hero />
<Features />
<CTA />
```

## Next Steps

Now that you're up and running:

1. **Customize colors** - Update `globals.css` with your brand colors
2. **Edit content** - Modify the homepage in `src/pages/index.astro`
3. **Add blog posts** - Create new `.md` files in `src/content/blog/`
4. **Deploy** - Push to GitHub and deploy to Vercel, Netlify, or Cloudflare

## Getting Help

- **Documentation**: Check `AGENTS.md` for detailed component docs
- **Issues**: Report bugs on [GitHub](https://github.com/holger1411/astrodeck/issues)
- **AI Assistance**: Use Claude Code or Cursor with the included AI documentation

Happy building! 🚀
