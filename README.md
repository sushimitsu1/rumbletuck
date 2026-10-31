# Rumbletuck — free sample site

Live at https://rumbletuck.com/ (GitHub Pages, custom domain via `CNAME`). Static site, no build step: 10 free sample stories with narration.

## Turn on the waitlist (Kit)
Create a free Kit form, then paste its URL `https://app.kit.com/forms/FORM_ID/subscriptions` into `waitlist.endpoint` in `config.js` (provider is already `kit`). With no endpoint the page shows a polite "Sign-ups open very soon" note.

## Lights-off mode
`lightsoff.js` + the `.lo-*` styles: on any story, the "Lights off" (moon) button plays every page's narration in order on a near-black screen, with a sleep timer (Off / end of story / 15 / 30 min, gentle fade), an optional "play the next story" toggle, Media Session lock-screen controls and a Wake Lock while playing. Preferences are kept in localStorage on the device only.

## Run locally
    python3 -m http.server 8080   # then open http://localhost:8080

After changing files, bump `VERSION` in `sw.js` so returning visitors get the update.

## Search pages (SEO)
`python3 tools/build_seo.py` regenerates, from `stories.js`: one crawlable page per story at `story/<slug>/` (full text, cover, Open Graph, schema.org Book), share images in `og/`, `sitemap.xml`, `robots.txt`, and the prerendered story grid, story links and JSON-LD between the `<!-- SEO:... -->` markers in `index.html`. Re-run it whenever a story changes, then bump `VERSION` in `sw.js`. (Story pages live under `story/`, not `stories/`, because the service worker serves `stories/` cache-first.)
