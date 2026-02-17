# AstroDeck v1.4.0 Release Notes

**Release Date:** December 27, 2025

## 🚀 Astro v6 Compatibility

This release migrates AstroDeck from the legacy Content Collections API to the new **Content Layer API**, ensuring full compatibility with the upcoming Astro v6.

### Breaking Changes

This is a **non-breaking upgrade for end users**. All existing content and configurations continue to work seamlessly. The changes are internal API updates that prepare the theme for Astro v6.

---

## ✨ What's New

### Content Layer API Migration

The theme now uses Astro's modern Content Layer API introduced in Astro v5, which will be mandatory in Astro v6.

**Before (Legacy API):**
```typescript
// src/content/config.ts
const blog = defineCollection({
  type: 'content',
  schema: z.object({...})
});
```

**After (Content Layer API):**
```typescript
// src/content.config.ts
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({...})
});
```

### Benefits of Content Layer API

- **Better Performance**: Up to 5x faster builds for content-heavy sites
- **Reduced Memory Usage**: 25-50% less memory consumption
- **Future-Proof**: Ready for Astro v6 and beyond
- **Flexible Loaders**: Foundation for loading content from any source (CMS, APIs, etc.)

---

## 📝 Technical Changes

| Change | Description |
|--------|-------------|
| Config file location | `src/content/config.ts` → `src/content.config.ts` |
| Collection definition | `type: 'content'` → `loader: glob({...})` |
| Entry identifier | `post.slug` → `post.id` |
| Render function | `post.render()` → `render(post)` |
| TypeScript config | Added `include` and `exclude` for Astro v5+ |

### Files Modified

- `src/content.config.ts` (new location)
- `src/pages/blog/[...slug].astro`
- `src/pages/blog/[...page].astro`
- `src/pages/blog/archive.astro`
- `src/pages/tags/[tag].astro`
- `src/pages/rss.xml.ts`
- `tsconfig.json`

---

## 🔄 Upgrade Guide

### For Existing AstroDeck Users

If you're upgrading from v1.3.x:

1. **Pull the latest changes:**
   ```bash
   git pull origin main
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Test your site:**
   ```bash
   npm run dev
   ```

Your existing blog posts and content will work without any changes.

### For Custom Implementations

If you've customized the blog functionality:

- Replace `post.slug` with `post.id` in your templates
- Update `post.render()` to use `render(post)` from `astro:content`
- Move any custom collection configs to `src/content.config.ts`

---

## 🛠️ Requirements

- **Node.js**: 18.14.1 or higher
- **Astro**: 5.x (compatible with upcoming 6.x)

---

## 🙏 Acknowledgments

This update was prompted by feedback from the Astro Theme Directory review process, ensuring AstroDeck meets the latest standards for official theme listings.

---

## 📚 Resources

- [Astro Content Layer Documentation](https://docs.astro.build/en/guides/content-collections/)
- [Astro v5 Upgrade Guide](https://docs.astro.build/en/guides/upgrade-to/v5/)
- [Astro v6 Upgrade Guide (Draft)](https://v6.docs.astro.build/en/guides/upgrade-to/v6/)

---

**Full Changelog**: [v1.3.0...v1.4.0](https://github.com/holger1411/astrodeck/compare/v1.3.0...v1.4.0)
