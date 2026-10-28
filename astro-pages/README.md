# Astro Pages for IKEA Home Design

Static site generation for improved performance. See [Astro Migration Guide](../docs/development/astro-migration.md) for complete details.

## Quick Start

```bash
cd astro-pages
npm install
npm run dev  # http://localhost:3000
```

## Features

-   **BaseLayout**: All pages use `BaseLayout` which provides ESI header/footer, SEO meta tags, common styles, and automatic tracking (Mixpanel + Sentry) and experiments (Optimizely) initialization
-   **FlagsManager**: Testing UI at bottom-left corner (dev/staging only). See [Testing](#testing)
-   **Code Sharing**: Reuses Gatsby components via path aliases (`@components`, `@hooks`, etc.)
-   **i18n**: 53 locales with translations embedded in HTML

## Adding a New Page

SEO metadata is stored in `locales/{locale}/translation.json` under `siteMetaData.{pageName}` and passed to `BaseLayout` as props.

**Example page structure:**

```astro
---
import BaseLayout from '@layouts/BaseLayout.astro'
import { generateLocaleStaticPaths, type LocalePageProps } from '@lib/static-paths-utils'
import { MyPageApp } from '@components/MyPageApp'
import { FlagsManager } from '@components/FlagsManager'

// Generate static pages for all 53 locales
// Pass list of translation JSON files needed: locales/{locale}/mypage.json, common.json, translation.json
export async function getStaticPaths() {
    return generateLocaleStaticPaths(['mypage', 'common', 'translation'])
}

const { locale, translations } = Astro.props as LocalePageProps
const { country, lang } = Astro.params
const market = `${country}/${lang}`

// Get SEO data from translations
const seo = translations.translation?.siteMetaData?.mypage
const title = seo?.title || 'My Page - IKEA Home Design'
const description = seo?.description || 'Page description'
const keywords = seo?.keywords
const canonical = `https://www.ikea.com/${market}/home-design/my-page/`
---

<BaseLayout
    locale={locale}
    market={market}
    title={title}
    description={description}
    keywords={keywords}
    canonical={canonical}
    allowSeo={true}
>
    <!-- Optional: Page-specific head content -->
    <Fragment slot="head">
        <style>
            /* Page-specific styles */
        </style>
    </Fragment>

    <!-- Main app with hydration -->
    <MyPageApp client:idle locale={locale} market={market} translations={translations} />

    <!-- Optional: FlagsManager for testing -->
    <FlagsManager client:load />
</BaseLayout>

<style is:global>
    /* Global page styles */
</style>
```

**Using experiments in React components:**

```tsx
import { useFlags } from '@hooks/useFlags'
import { useExperiments } from '@hooks/useExperiments'

function MyComponent() {
    const { flags } = useFlags()
    const { variations } = useExperiments()

    if (flags.Morpheus) return <NewFeature />
    if (variations.HowItWorks === 'videoHeader') return <VideoHeader />
}
```

## Testing

-   **FlagsManager UI**: Hover bottom-left corner (dev/staging only)
-   **URL Overrides**: `?_flags[Morpheus]=on&_experiments[HowItWorks]=videoHeader`
