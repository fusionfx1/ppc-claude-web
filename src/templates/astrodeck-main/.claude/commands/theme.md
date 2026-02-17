---
description: Customize the AstroDeck theme colors and design tokens
---

# Customize Theme

Modify the design system in `src/styles/globals.css`.

## Current Theme Location

All design tokens are in `src/styles/globals.css` under:
- `:root` - Light mode colors
- `.dark` - Dark mode colors

## Available Tokens

```css
/* Core */
--background      /* Page background */
--foreground      /* Primary text */

/* Primary (buttons, links) */
--primary
--primary-foreground

/* Secondary */
--secondary
--secondary-foreground

/* Muted (subtle backgrounds, secondary text) */
--muted
--muted-foreground

/* Accent (highlights) */
--accent
--accent-foreground

/* Cards & Borders */
--card
--card-foreground
--border
--input
--ring
```

## How to Customize

1. **Read current values** from `src/styles/globals.css`
2. **Ask user** for new colors (hex, HSL, or color name)
3. **Convert to HSL** format: `H S% L%` (without commas)
4. **Update both** `:root` and `.dark` sections

## Example Transformation

User wants: "Make primary color forest green"

```css
/* Before */
--primary: 221 83% 53%;

/* After */
--primary: 142 76% 36%;  /* Forest green */
```

## Important Rules

- **Always use HSL format** without `hsl()` wrapper
- **Update both themes** (light and dark)
- **Test contrast** - primary-foreground must be readable on primary
- **Never edit Tailwind config** for colors - only globals.css

## Checklist

- [ ] Colors in correct HSL format
- [ ] Light mode updated (`:root`)
- [ ] Dark mode updated (`.dark`)
- [ ] Contrast ratio checked (4.5:1 minimum)
- [ ] Tested in browser
