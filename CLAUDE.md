# Project: Falcon Homes

Static marketing site for Falcon Homes, a house-and-lot builder in the Falcon Ridge community. Brand phrase / tagline: "Falcon Speed". Plain HTML + CSS + vanilla JS, no build step. Lives in `D:\1 ARCA\WEEK 1`. Preview with `python -m http.server 8000`, then open http://localhost:8000.

## Pages
- `index.html` — homepage: header, hero (fixed background video), property search bar, 6 numbered home listings, interactive "Find Your Lot" SVG site map, browse-by-style, About Falcon Homes section, callout to the About page, footer/contact.
- `aboutfalco.html` — About Falcon Homes page (story, the community, values as a 2x2 grid, a how-it-works step sequence, why-choose-us, CTA).
- `inquire.html` — customer info-gathering form (personal details + home preferences). Auto-fills preferred home/phase/beds/budget from `?lot=N`, which each listing's "Inquire about this home" button passes.

## Always
- Invoke the frontend-design skill before writing any front-end code.
- Reference `brand_assets/` for logo, colors, fonts, map, video (`brand.md`, `logo.png`, `MAP.png`, `VIDEO.mp4`). Never modify files in `brand_assets/`.
- Keep the design clean and modern, never "AI vibe coded".

## Design system
- **Color:** white-dominant in light mode; green is the ONLY accent — `--primary #1F7A52` (`--primary-bright #2A9460`, `--primary-dark #155C3E`). NO blue anywhere in CSS (the blue falcon only exists inside `logo.png`).
- **Dark mode:** light/dark toggle (`data-theme` on `<html>`, persisted to `localStorage` key `fh-theme`, set before paint). Dark = neutral near-black grounds + near-white text + a softened sage-green accent (`#2E8A63` / `#5CA585`), not pure green.
- **Type:** Poppins (headings, `--font-head`) + Inter (body, `--font-body`). Section headings (`.section-head h2`, `.about h2`) use Fraunces (`--font-display`). The brand phrase "Falcon Speed" uses Fraunces italic via the `.fs` class (capitalized; ~1.12em, 1.2em in hero). Brand wordmark "Falcon Homes" = Marcellus ("Falcon") + Outfit ("Homes", larger) via `.wordmark` / `.wm-falcon` / `.wm-homes`.
- **Header brand:** logo icon (cropped from `logo.png`, glowing square, no white chip) + the text wordmark; wordmark hides on small screens.
- **Buttons:** subtle green "prestige" glow (box-shadow). 44px min tap targets. Accessible `:focus-visible` everywhere; `prefers-reduced-motion` respected. Responsive (no horizontal scroll at 320px; content capped at 1140px).
- **Hero video:** `brand_assets/VIDEO.mp4`, `autoplay muted loop playsinline`. FIXED to the viewport (`position: fixed`) behind the whole homepage; sections are transparent so it shows top-to-bottom; cards/boxes are opaque panels that scroll over it; on-section text is light for legibility. EXCEPTION: the footer/contact section keeps its solid dark-green background. `html` fallback background is `--green-deep`.
- **Lot map (light mode):** yellow-green grass `#D8EAB6`, yellow-green trees `#8DC153` (~32), gray road `#C6CAC6` with yellow center stripes `#F2C232`. Lots are clickable (hover glow) and bidirectionally linked to listing cards via `data-lot`.

## Stack
- HTML, CSS, vanilla JavaScript. No framework.
- kie.ai API available via `KIE_API_KEY` in `.env` (server-side only — never expose in client JS; a static site needs a serverless proxy for live calls, or generate assets via tooling). `.env` is git-ignored.
- Intended deploy: Vercel via GitHub auto-deploy.

## Conventions
- No em-dashes (—) in copy. Use commas/periods/colons, or "·" as a separator (e.g. "Falcon Ridge · Phase 1", "The Aspen · Modern Minimalist").
- Brand phrase is always written "Falcon Speed" (capitalized) in the `.fs` display font.
- No Lorem Ipsum; no fake stats.
- Preview on localhost. Do NOT push to GitHub or Vercel without an explicit command — local only so far; nothing published.
