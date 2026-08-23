# Airrand.ca Redesign

Static, SEO-focused website redesign for Airrand Corp.

## Commands

```bash
npm run build
npm run serve
npm run validate
npm run audit
```

The production build is written to `dist/`.

## Notes

- Existing Airrand.ca logo, navigation content, contact details, hours, Instagram link, and Airrand-hosted visual assets were reused.
- No customer reviews, ratings, awards, licenses, certifications, manufacturer partnerships, financing offers, or street address were invented.
- The reviews component is intentionally marked as development-ready until verified Google review content is connected.
- The contact form posts to the Vercel `/api/quote` function and sends quote requests to `info@airrand.ca` through Resend.

## Vercel Email Environment Variables

Set these in Vercel before relying on production form submissions:

```bash
RESEND_API_KEY=your_resend_api_key
QUOTE_TO_EMAIL=info@airrand.ca
QUOTE_FROM_EMAIL=Airrand Website <quotes@airrand.ca>
```

`QUOTE_FROM_EMAIL` must use a sender domain verified in Resend.
