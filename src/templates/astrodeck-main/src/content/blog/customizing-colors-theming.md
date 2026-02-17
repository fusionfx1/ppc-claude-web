---
title: "Customizing AstroDeck Colors and Theming"
description: "Master the OKLCH color system in AstroDeck to create beautiful, accessible themes for your website."
pubDate: 2025-12-25
author: "AstroDeck Team"
tags: ["tutorial", "theming", "css", "tailwind"]
---

# Customizing AstroDeck Colors and Theming

AstroDeck uses the modern **OKLCH color format** for all its design tokens. This guide will teach you how to customize colors and create your own themes.

## Why OKLCH?

OKLCH (Oklahama Lightness Chroma Hue) offers several advantages over traditional color formats:

- **Perceptual uniformity**: Equal changes in values produce equal visual changes
- **Better for accessibility**: Easy to maintain contrast ratios
- **Intuitive adjustments**: Lightness, saturation, and hue are independent
- **Wide gamut support**: Access to colors outside sRGB

## Understanding the Format

```css
/* oklch(Lightness% Chroma Hue) */
--primary: oklch(55% 0.2 250);
```

| Component | Range | Description |
|-----------|-------|-------------|
| Lightness | 0-100% | How light or dark (0% = black, 100% = white) |
| Chroma | 0-0.4 | Color intensity (0 = gray, 0.4 = vivid) |
| Hue | 0-360 | Color wheel position (0=red, 120=green, 240=blue) |

## The Color System

Open `src/styles/globals.css` to find all color variables:

```css
:root {
  /* Base colors */
  --background: oklch(100% 0 0);
  --foreground: oklch(10% 0 0);

  /* Primary brand color */
  --primary: oklch(55% 0.2 250);
  --primary-foreground: oklch(100% 0 0);

  /* Secondary color */
  --secondary: oklch(95% 0.01 250);
  --secondary-foreground: oklch(20% 0.02 250);

  /* Accent color */
  --accent: oklch(95% 0.02 250);
  --accent-foreground: oklch(20% 0.02 250);

  /* Semantic colors */
  --destructive: oklch(55% 0.2 25);
  --muted: oklch(95% 0.01 250);
  --muted-foreground: oklch(45% 0.02 250);
}
```

## Creating a Custom Theme

### Step 1: Choose Your Primary Color

Pick a hue value (0-360) for your brand:

| Hue | Color |
|-----|-------|
| 0-30 | Red/Orange |
| 30-60 | Orange/Yellow |
| 60-120 | Yellow/Green |
| 120-180 | Green/Cyan |
| 180-240 | Cyan/Blue |
| 240-300 | Blue/Purple |
| 300-360 | Purple/Red |

### Step 2: Build Your Palette

Here's an example creating a green theme:

```css
:root {
  /* Green theme - Hue: 145 */
  --primary: oklch(50% 0.18 145);
  --primary-foreground: oklch(98% 0 0);

  --secondary: oklch(95% 0.02 145);
  --secondary-foreground: oklch(25% 0.05 145);

  --accent: oklch(92% 0.03 145);
  --accent-foreground: oklch(25% 0.05 145);

  --muted: oklch(96% 0.01 145);
  --muted-foreground: oklch(45% 0.03 145);
}
```

### Step 3: Dark Mode

AstroDeck includes automatic dark mode. Customize it in the `.dark` selector:

```css
.dark {
  --background: oklch(12% 0.02 250);
  --foreground: oklch(95% 0 0);

  --primary: oklch(65% 0.2 250);
  --primary-foreground: oklch(10% 0.02 250);

  /* ... other dark mode colors */
}
```

## Quick Theme Presets

Copy and paste these presets into your `globals.css`:

### Ocean Blue
```css
--primary: oklch(55% 0.18 230);
--secondary: oklch(95% 0.02 230);
--accent: oklch(92% 0.03 230);
```

### Forest Green
```css
--primary: oklch(45% 0.15 145);
--secondary: oklch(95% 0.02 145);
--accent: oklch(92% 0.03 145);
```

### Sunset Orange
```css
--primary: oklch(60% 0.2 35);
--secondary: oklch(95% 0.02 35);
--accent: oklch(92% 0.03 35);
```

### Royal Purple
```css
--primary: oklch(50% 0.2 290);
--secondary: oklch(95% 0.02 290);
--accent: oklch(92% 0.03 290);
```

## Maintaining Accessibility

When customizing colors, ensure sufficient contrast:

- **Text on background**: Minimum 4.5:1 ratio
- **Large text**: Minimum 3:1 ratio
- **Interactive elements**: Minimum 3:1 ratio

With OKLCH, you can easily adjust lightness while keeping the same hue:

```css
/* Higher contrast - increase lightness difference */
--primary: oklch(45% 0.2 250);           /* Darker */
--primary-foreground: oklch(98% 0 0);    /* Very light */
```

## Using Colors in Components

Access your color variables with Tailwind CSS:

```html
<!-- Background colors -->
<div class="bg-primary">Primary background</div>
<div class="bg-secondary">Secondary background</div>
<div class="bg-muted">Muted background</div>

<!-- Text colors -->
<p class="text-foreground">Main text</p>
<p class="text-muted-foreground">Subtle text</p>
<p class="text-primary">Accent text</p>

<!-- Borders -->
<div class="border border-border">Bordered element</div>
```

## Tips for Great Themes

1. **Start with one hue**: Build your entire palette from a single hue value
2. **Vary lightness**: Use lightness to create hierarchy
3. **Keep chroma low for UI**: Reserve high chroma for accents
4. **Test both modes**: Always check light and dark mode together
5. **Use browser DevTools**: Chrome and Firefox support OKLCH natively

## Next Steps

- Explore the [OKLCH Color Picker](https://oklch.com/) for visual color selection
- Check your contrast ratios with [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- Read about [color accessibility guidelines](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)

Happy theming! 🎨
