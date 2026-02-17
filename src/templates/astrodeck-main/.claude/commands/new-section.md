---
description: Create a new reusable section component
---

# Create New Section

Create a new section component following AstroDeck patterns from `@AGENTS.md`.

## Gather Information

Ask the user for:
1. **Section name** (PascalCase, e.g., "TeamGrid", "PricingTable")
2. **Purpose** - What content will it display?
3. **Variants needed** - default | centered | wide | compact

## Template

```astro
---
// src/components/sections/[Name].astro
interface Props {
  title?: string;
  subtitle?: string;
  variant?: 'default' | 'centered' | 'wide';
}

const { 
  title = "Default Title",
  subtitle,
  variant = 'default'
} = Astro.props;

const variantClasses = {
  default: 'max-w-7xl',
  centered: 'max-w-4xl text-center',
  wide: 'max-w-none'
};
---

<section class="py-20 px-6">
  <div class={`mx-auto ${variantClasses[variant]}`}>
    {title && (
      <div class="mb-12">
        <h2 class="text-4xl font-bold mb-4">{title}</h2>
        {subtitle && (
          <p class="text-lg text-muted-foreground">{subtitle}</p>
        )}
      </div>
    )}
    <slot />
  </div>
</section>
```

## Checklist Before Done

- [ ] File created in `src/components/sections/[Name].astro`
- [ ] Props interface with TypeScript types
- [ ] CSS variables for colors (no hardcoded values)
- [ ] Responsive classes (mobile-first)
- [ ] Supports light and dark mode
- [ ] Uses `<slot />` for flexible content
