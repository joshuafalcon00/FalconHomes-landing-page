# Project: Falcon Homes

Static marketing site for Falcon Homes, a house-and-lot builder in the Falcon Ridge community. Brand phrase / tagline: "Falcon Speed". Plain HTML + CSS + vanilla JS, no build step. Lives in `D:\1 ARCA\WEEK 1`. Preview with `python -m http.server 8000`, then open http://localhost:8000.

## Pages
- `index.html` — homepage / product page: header, hero (fixed `VIDEO.mp4` background, autoplay+muted+loop+playsinline), working property search (filters the listings + scrolls), 6 numbered home listings with AI-generated house photos, interactive "Find Your Lot" SVG site map (lot thumbnails reuse the same photos), browse-by-style, About callout, footer/contact.
- `aboutfalco.html` — About page. Background is a fixed, scroll-scrubbed frame sequence of the **continuous house walkthrough** (`frames/`, 361 frames `frame_0001..0361.jpg`, `N=361` in the inline script); content scrolls over it and each section fades in/out. The canvas cover-crop is centered (`fx/fy = 0.5`, no portrait zoom) so the house/hallways stay aligned on mobile. Sections: story, community, values (2x2), how-it-works steps, why-choose-us, CTA.
- `inquire.html` — contact / inquiry page. Fixed `Family.mp4` background. Intake form (personal details + home preferences) that auto-fills home/phase/beds/budget from `?lot=N`, passed by each listing's "Inquire about this home" button.
- `signin.html` — sign-in page (hero + sign-in form + CTA back home). Front-end only; submitting shows an "accounts coming soon → send an inquiry" message.
- `before/before.html` — the original pre-Day-2 page, kept for reference (not linked).
- **Shared chrome:** every page has the same header + footer. On mobile (≤940px) the nav collapses into a hamburger dropdown with Home, Listings, Lot Map, About, Contact, Sign In (`#navToggle` / `#primaryMenu`).

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

## Stack & deploy
- HTML, CSS, vanilla JavaScript. No framework.
- kie.ai API via `KIE_API_KEY` in `.env` (server-side only — never expose in client JS; `.env` is git-ignored and never committed). Used via tooling to generate the house images, the seasonal video, and the walkthrough video.
- **Walkthrough video:** 15s, 16:9, single continuous POV take (no cuts) of the home, generated with kie.ai Kling 3.0 (`kling-3.0/video`, `multi_shots:false`, one `prompt`, `duration:15`, single anchor image = `brand_assets/Scene 2.jfif`, `mode:pro`). Saved to `brand_assets/Walkthrough.mp4` (heavy source, git-ignored). Frames for the About-page scroll background are extracted with ffmpeg (`-vf scale=1280:720 -q:v 3`, all 361 native frames) into `frames/`. Kling notes: `multi_shots` is required (true needs exactly one image; max 5 shots in `multi_prompt`, ≤15s total); moderation can flag prompts, so keep wording plain/neutral. The six `brand_assets/Scene N.jfif` stills are the walkthrough's visual reference.
- **Live:** https://falconhomes-landing-page.vercel.app
- **GitHub:** github.com/joshuafalcon00/FalconHomes-landing-page (branch `main`).
- **Deploy steps:** `git push origin main`, then `NODE_OPTIONS=--use-system-ca vercel deploy --prod --yes`. The `--use-system-ca` flag is required on this machine (SSL interception); use `curl -k` to test the live URL. Excludes (`.gitignore` + `.vercelignore`): the heavy source videos `day2_video/falcon_seasons.mp4` and `brand_assets/Walkthrough.mp4` (the site uses extracted frames, not the mp4s), `.agents/`, `.claude/`, scratch. The `frames/` folder IS committed/deployed (the About page needs it).

## Security rules (always)
1. Never put API keys in frontend code (kie.ai key stays server-side only).
2. Always create a `.gitignore` before the first commit.
3. Turn on RLS (row-level security) for every database table.
4. Never put security checks in the frontend.
5. Never give an AI agent write access to production.

## Conventions
- No em-dashes (—) in copy. Use commas/periods/colons, or "·" as a separator (e.g. "Falcon Ridge · Phase 1", "The Aspen · Modern Minimalist").
- Brand phrase is always written "Falcon Speed" (capitalized) in the `.fs` display font.
- No Lorem Ipsum; no fake stats.
- Preview on localhost. Publish (GitHub push + Vercel deploy) ONLY on explicit command.

## Progress (Day 2 — published live)
- [x] Landing page upgraded with the frontend-design skill
- [x] CLAUDE.md committed to the repo
- [x] Mobile layout: 44px tap targets, no horizontal scroll, hamburger nav
- [x] Product page video hero (autoplay + `playsinline`, works on phone)
- [x] AI-generated house images on listings + lot map
- [x] Scroll-animation page (About) deployed and working
- [x] `.env` git-ignored; kie.ai key never in GitHub history
- [x] Live audit: 0 dead-link placeholders; all pages return 200
- [x] Continuous POV walkthrough video generated (Kling 3.0, single take, 15s)
- [x] About-page scroll background swapped to the walkthrough (361 frames) + mobile center-crop fix
- [x] Published live (commit `a92a650`); home/about/frames all return 200 on production
- [ ] Final confirmation on a physical phone (user to verify)
