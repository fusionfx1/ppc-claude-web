# Release Notes v1.5.1

**Release Date:** January 27, 2025

## Summary

This patch release focuses on improving dark mode accessibility and fixing theme persistence across page navigations.

## Bug Fixes

### Dark Mode Contrast Improvements
- **Increased `muted-foreground` contrast** in dark mode from `oklch(60% 0 0)` to `oklch(71% 0 0)` for better text readability
- **Improved border visibility** in dark mode by increasing `--color-border` from `oklch(12% 0 0)` to `oklch(25% 0 0)`
- Added explicit dark mode styles for headings (h1-h6), paragraphs, lists, tables, and blockquotes
- Added Tailwind Typography plugin prose variables for dark mode

### Theme Persistence Fix
- **Fixed theme not persisting across page navigations** when using View Transitions
- Theme selection now properly overrides system preferences when explicitly set by user
- Added `astro:after-swap` event listener to reapply theme after View Transitions navigation
- Applied fix to all layout files: `BaseLayout.astro`, `FullWidthLayout.astro`, `AuthLayout.astro`, `MinimalLayout.astro`

## Technical Details

### CSS Changes (`src/styles/globals.css`)
```css
/* Dark mode border now visible */
--color-border: oklch(25% 0 0);  /* was 12% */
--color-input: oklch(25% 0 0);   /* was 12% */

/* Dark mode muted text more readable */
--color-muted-foreground: oklch(71% 0 0);  /* was 60% */

/* New: Explicit dark mode text styles */
.dark h1, .dark h2, ... { color: var(--color-foreground); }
.dark p, .dark li, ... { color: var(--color-foreground); }
.dark .prose { /* Tailwind Typography variables */ }
```

### Theme Script Changes (all layouts)
```javascript
// Now respects explicit "light" choice over system preference
if (theme === "dark") {
  document.documentElement.classList.add("dark");
} else if (theme === "light") {
  document.documentElement.classList.remove("dark");
} else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
  document.documentElement.classList.add("dark");
}

// Re-apply after View Transitions
document.addEventListener("astro:after-swap", function() { ... });
```

## Upgrade Guide

This is a patch release with no breaking changes. Simply update your AstroDeck installation:

```bash
# If using git
git pull origin main

# Or download the new release
wget https://github.com/holger1411/astrodeck/archive/refs/tags/v1.5.1.zip
```

## Files Changed

- `package.json` - Version bump
- `src/styles/globals.css` - Dark mode contrast improvements
- `src/layouts/BaseLayout.astro` - Theme persistence fix
- `src/layouts/FullWidthLayout.astro` - Theme persistence fix
- `src/layouts/AuthLayout.astro` - Theme persistence fix
- `src/layouts/MinimalLayout.astro` - Theme persistence fix
- `src/components/sections/Hero.astro` - Version badge update
- `src/pages/index.astro` - Download link update
- `README.md` - Version badge update
