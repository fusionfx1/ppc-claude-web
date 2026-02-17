---
description: Run a comprehensive quality audit on the project
---

# Project Audit

Perform a comprehensive quality check of the AstroDeck project.

## Audit Categories

### 1. Code Quality
```bash
npm run lint
npm run format:check
```

Check for:
- [ ] ESLint errors/warnings
- [ ] Prettier formatting issues
- [ ] TypeScript errors (`npx tsc --noEmit`)

### 2. Import Consistency
Search for relative imports that should use `@/` alias:
```bash
grep -r "from ['\"]\.\./" src/ --include="*.astro" --include="*.ts" --include="*.tsx"
```

### 3. Hardcoded Colors
Search for hardcoded Tailwind colors instead of CSS variables:
```bash
grep -rE "bg-(red|blue|green|yellow|purple|pink|gray|slate|zinc)-[0-9]+" src/ --include="*.astro"
grep -rE "text-(red|blue|green|yellow|purple|pink|gray|slate|zinc)-[0-9]+" src/ --include="*.astro"
```

### 4. Accessibility
Check for:
- [ ] Images without alt text: `grep -r "<img" src/ | grep -v "alt="`
- [ ] Buttons without labels
- [ ] Missing ARIA attributes on interactive elements

### 5. SEO
Verify each page has:
- [ ] Unique title tag
- [ ] Meta description (150-160 chars)
- [ ] OpenGraph tags
- [ ] Proper heading hierarchy (h1 → h2 → h3)

### 6. Performance
- [ ] Run `npm run build` - check bundle size
- [ ] Verify images use `<Image />` component
- [ ] Check for unnecessary `client:load` directives

## Output Format

```markdown
## Audit Results

### ✅ Passed
- [List of passed checks]

### ⚠️ Warnings
- [List of warnings with file locations]

### ❌ Issues
- [List of issues that need fixing]

### Recommendations
- [Suggested improvements]
```
