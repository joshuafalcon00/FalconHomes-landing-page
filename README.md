# Falcon Homes — Landing Page

A clean, single-page landing site for **Falcon Homes**, a modern housing business in the **Falcon Ridge** community. Built as a static `index.html` with no build step.

## About

Falcon Homes builds and sells quality homes for families — six distinct house styles within one trusted community, delivered "at falcon speed."

## Design

- **Theme:** dark-green, premium real-estate aesthetic with a gold accent and mint-green pricing
- **Type:** Space Grotesk (headings) + Inter (body), via Google Fonts
- **Brand colors:** primary green `#1F7A52`, deepened greens for dark sections, gold `#C8A24A`
- **Sections:** sticky header · hero + property search bar · featured home styles · browse by house style · about · footer

Brand assets (logo, colors, reference) live in [`brand_assets/`](brand_assets/).

## Run locally

It's a static page — open `index.html` directly, or serve the folder:

```bash
python -m http.server 8000
# then visit http://localhost:8000
```

## Notes

Property listings, prices, counts, and contact details are placeholders. The property card images use CSS/SVG placeholders and can be swapped for real photos.
