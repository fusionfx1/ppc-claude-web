---
description: Create a new AstroDeck page with proper layout and SEO
---

# Create New Page

Create a new page following AstroDeck conventions from `@AGENTS.md`.

## Gather Information

Ask the user for:
1. **Page name** (e.g., "about", "pricing", "contact")
2. **Layout type** - BaseLayout | FullWidthLayout | MinimalLayout | AuthLayout
3. **Sections needed** - List from available: Hero, Features, CTA, Pricing, FAQ, Testimonials, Contact

## Template

```astro
---
import [Layout] from "@/layouts/[Layout].astro";
import [Sections] from "@/components/sections/[Section].astro";

const title = "[Page Title] - AstroDeck";
const description = "[SEO description, 150-160 chars]";
---

<[Layout] title={title} description={description}>
  <!-- Sections -->
</[Layout]>
```

## Checklist Before Done

- [ ] File created in `src/pages/[name].astro`
- [ ] Proper layout imported with `@/` alias
- [ ] Title and description set for SEO
- [ ] All sections imported and configured
- [ ] Responsive design verified
