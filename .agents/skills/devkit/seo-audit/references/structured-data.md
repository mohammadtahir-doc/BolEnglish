# Structured Data (JSON-LD) Guide

## Rule

Add structured data **only** for content types that are **visible on the page**.
Use **JSON-LD** in a `<script type="application/ld+json">` block.
Never mark up content the user cannot see.

---

## Type-to-Page Mapping

| Page type | Schema @type | Required properties | Optional |
|-----------|-------------|---------------------|----------|
| Homepage | `Organization` + `WebSite` | name, url, logo | sameAs (social links), potentialAction (SearchAction) |
| Blog post | `Article` or `BlogPosting` | headline, author, datePublished, image | dateModified, publisher, description |
| Product | `Product` + `Offer` | name, image, offers.price, offers.priceCurrency, offers.availability | brand, sku, review, aggregateRating |
| FAQ | `FAQPage` | mainEntity[].name, mainEntity[].acceptedAnswer.text | ⚠️ Google removed FAQ rich results for most sites (Aug 2023). Markup is still valid schema.org but no longer generates search features except for well-known government and health sites. Add only if the content is genuinely FAQ-shaped. |
| How-to | `HowTo` | name, step[].name, step[].text | ⚠️ Google removed HowTo rich results (Sep 2023). Markup is still valid schema.org and may help AI assistants parse steps, but will not generate search features. |
| Breadcrumbs | `BreadcrumbList` | itemListElement[].name, itemListElement[].item | — |
| Local business | `LocalBusiness` | name, address, telephone | openingHours, geo, priceRange, image |
| Event | `Event` | name, startDate, location | endDate, performer, offers, image |
| Recipe | `Recipe` | name, image, recipeIngredient | cookTime, nutrition, recipeInstructions |

---

## Minimal Example

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Page title here",
  "author": { "@type": "Person", "name": "Author Name" },
  "datePublished": "2025-01-15",
  "image": "https://example.com/hero.jpg"
}
</script>
```

---

## Validation

1. **Schema Markup Validator** — https://validator.schema.org/
   - Primary tool. Checks schema.org compliance. Must show **zero errors**.
2. **Rich Results Test** — https://search.google.com/test/rich-results
   - Shows which Google rich result types are eligible. Note: Google is removing support for some types (FAQ, HowTo) — a "not eligible" result for those is expected, not a failure.

Report validation results in the state file. A schema.org-valid block that is not eligible for Google rich results is still correct — it helps AI assistants and other consumers.

---

## Common Mistakes

| Mistake | Why it fails |
|---------|-------------|
| Marking up invisible content | Violates Google guidelines, may trigger manual action |
| Wrong `@type` | No rich result, or wrong rich result shown |
| Missing required properties | Validation error, rich result not generated |
| Fake or unverifiable reviews | `AggregateRating` from real reviews only |
| Duplicate schemas on same page | Confuses parsers, pick one canonical block |
| Hardcoded dates that never update | `dateModified` must reflect actual last edit |

---

## Checklist for Agent

- [ ] Identify which page types exist in the project
- [ ] Add JSON-LD only for types with visible matching content
- [ ] Validate every block with Schema Markup Validator (zero errors)
- [ ] Check Rich Results Test for eligible types (FAQ and HowTo will show "not eligible" — this is expected)
- [ ] Record validation results in state file
