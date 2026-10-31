# Rumbletuck — free sample site

Live at https://rumbletuck.com/ (GitHub Pages, custom domain via `CNAME`). Static site, no build step: 10 free sample stories with narration.

## Turn on the waitlist (Kit)
Create a free Kit form, then paste its URL `https://app.kit.com/forms/FORM_ID/subscriptions` into `waitlist.endpoint` in `config.js` (provider is already `kit`). With no endpoint the page shows a polite "Sign-ups open very soon" note.

## Run locally
    python3 -m http.server 8080   # then open http://localhost:8080

After changing files, bump `VERSION` in `sw.js` so returning visitors get the update.
