#!/usr/bin/env python3
"""Build the search-friendly parts of rumbletuck.com from stories.js.

Run from the repo root after any change to stories.js:
    python3 tools/build_seo.py

It (re)writes:
  story/<slug>/index.html   one crawlable landing page per story (full text, cover, links)
  og/<id>.jpg               1200x630 share images cropped from each cover
  sitemap.xml, robots.txt
  index.html                the blocks between the <!-- SEO:... --> markers
                            (static story grid, story links, JSON-LD)
Then bump VERSION in sw.js so returning visitors get the new files.
"""
import datetime, html, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = 'https://rumbletuck.com'
NAME = 'Rumbletuck'
TODAY = datetime.date.today().isoformat()
# Pages that must stay out of search. This script never writes them and never lists them in the sitemap;
# it only reads them to check the noindex tag is still there.
NOINDEX_PAGES = ['confirmed.html']  # waitlist thank-you page
esc = lambda s: html.escape(s, quote=True)

def load_stories():
    src = open(os.path.join(ROOT, 'stories.js'), encoding='utf-8').read()
    m = re.search(r'window\.STORIES\s*=\s*(\[.*\])\s*;?\s*$', src, re.S)
    return json.loads(m.group(1))

def slugify(title):
    return re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')

def seo_desc(s):
    v = s['vehicle'].lower()
    return f"{s['description']} A calm, narrated {v} bedtime story for toddlers and preschoolers ages 2–6. Read or listen free."

def book_ld(s, url):
    return {
        '@type': 'Book', '@id': url + '#book', 'name': s['title'], 'url': url,
        'description': seo_desc(s), 'image': f"{SITE}/stories/{s['id']}/cover.webp",
        'inLanguage': 'en', 'genre': ['Bedtime story', "Children's picture book"],
        'bookFormat': 'https://schema.org/EBook', 'numberOfPages': s['pages'],
        'isAccessibleForFree': True, 'typicalAgeRange': '2-6',
        'audience': {'@type': 'PeopleAudience', 'suggestedMinAge': 2, 'suggestedMaxAge': 6},
        'about': s['vehicle'],
        'author': {'@id': SITE + '/#org'}, 'publisher': {'@id': SITE + '/#org'},
    }

ORG = {'@type': 'Organization', '@id': SITE + '/#org', 'name': NAME, 'url': SITE + '/',
       'logo': SITE + '/icons/icon-512.png', 'email': 'hello@rumbletuck.com',
       'sameAs': ['https://www.youtube.com/@rumbletuckstories']}
WEBSITE = {'@type': 'WebSite', '@id': SITE + '/#website', 'name': NAME, 'url': SITE + '/',
           'description': 'Free illustrated, narrated bedtime stories about trucks, trains, boats and other big vehicles for toddlers ages 2–6.',
           'inLanguage': 'en', 'publisher': {'@id': SITE + '/#org'}}

def ld_script(obj):
    return '<script type="application/ld+json">' + json.dumps(obj, ensure_ascii=False).replace('</', '<\\/') + '</script>'

def make_og(s):
    from PIL import Image
    out = os.path.join(ROOT, 'og', s['id'] + '.jpg')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    im = Image.open(os.path.join(ROOT, 'stories', s['id'], 'cover.webp')).convert('RGB')
    w, h = im.size; th = round(w * 630 / 1200); top = max(0, (h - th) // 2)
    im.crop((0, top, w, top + th)).resize((1200, 630), Image.LANCZOS).save(out, 'JPEG', quality=84, optimize=True)

def card(s, href):
    return (f'<a class="card" href="{href}">'
            f'<img src="/stories/{s["id"]}/thumb.webp" width="640" height="480" loading="lazy" alt="Cover of {esc(s["title"])}">'
            f'<div class="body"><span class="tag">{esc(s["vehicle"])}</span><h3>{esc(s["title"])}</h3><p>{esc(s["description"])}</p></div></a>')

def story_page(s, stories, slugs):
    sid, slug = s['id'], slugs[s['id']]
    url = f'{SITE}/story/{slug}/'
    title = f"{s['title']} – Free Bedtime Story for Toddlers | {NAME}"
    desc = seo_desc(s)
    reader = f'/read.html?s={sid}'
    og = f'{SITE}/og/{sid}.jpg'
    first = s['text'][0]
    alt = f"Cover of {s['title']}, an illustrated bedtime story about a {s['vehicle'].lower()} for toddlers"
    paras = '\n'.join(f'      <p>{esc(t)}</p>' for t in s['text'])
    others = '\n'.join('      ' + card(o, f'/story/{slugs[o["id"]]}/') for o in stories if o['id'] != sid)
    ld = {'@context': 'https://schema.org', '@graph': [
        book_ld(s, url), ORG,
        {'@type': 'BreadcrumbList', 'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': NAME, 'item': SITE + '/'},
            {'@type': 'ListItem', 'position': 2, 'name': 'Bedtime stories', 'item': SITE + '/#stories'},
            {'@type': 'ListItem', 'position': 3, 'name': s['title'], 'item': url}]}]}
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{url}">
<meta name="theme-color" content="#1d2453">
<meta property="og:site_name" content="{NAME}">
<meta property="og:type" content="book">
<meta property="og:title" content="{esc(s['title'])} – free bedtime story">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{og}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{esc(alt)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{esc(s['title'])} – free bedtime story">
<meta name="twitter:description" content="{esc(desc)}">
<meta name="twitter:image" content="{og}">
<meta name="twitter:image:alt" content="{esc(alt)}">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" href="/icons/icon-192.png" type="image/png">
<link rel="apple-touch-icon" href="/icons/icon-192.png">
<link rel="stylesheet" href="/styles.css">
{ld_script(ld)}
</head>
<body class="story-page">
<header class="hero">
  <div class="wrap">
    <div class="topbar">
      <a class="brand" href="/">{NAME}<span class="badge">Free sample</span></a>
      <a class="btn btn-ghost" href="/#waitlist" style="min-height:40px;padding:0 14px;font-size:.9rem">Join waitlist</a>
    </div>
    <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> › <a href="/#stories">Bedtime stories</a> › <span>{esc(s['title'])}</span></nav>
    <div class="hero-grid">
      <div>
        <span class="tag story-tag">{esc(s['vehicle'])} story · Ages 2–6</span>
        <h1>{esc(s['title'])}</h1>
        <p class="lead">{esc(s['description'])} A gentle, {s['pages']}-page picture book with a calm narrator, about 2 minutes long and made for winding down at bedtime.</p>
        <div class="cta-row">
          <a class="btn btn-primary" href="{reader}">▶ Listen / Read now</a>
          <a class="btn btn-ghost" href="#story-text">Read the text</a>
        </div>
        <p class="story-note">Free, no sign-up. In the reader, tap the moon for lights-off listening: the screen goes dark and the narrator reads the whole story.</p>
      </div>
      <div class="art"><a href="{reader}"><img src="/stories/{sid}/cover.webp" width="1200" height="900" alt="{esc(alt)}" fetchpriority="high"></a></div>
    </div>
  </div>
</header>

<main class="wrap">
  <article class="story-text" id="story-text">
    <h2>The story</h2>
{paras}
    <p class="story-end">The End. Sweet dreams! 🌙</p>
    <div class="cta-row"><a class="btn btn-primary" href="{reader}">▶ Hear it read aloud</a><a class="btn btn-ghost" href="/#waitlist">Get the full library</a></div>
  </article>

  <section>
    <h2>More free bedtime stories</h2>
    <p class="sub">Calm picture books about trucks, trains, boats, planes and other big vehicles, for little ones ages 2–6.</p>
    <div class="grid">
{others}
    </div>
  </section>
</main>

<footer class="wrap">
  <p><a href="/">All free stories</a> · <a href="/privacy.html">Privacy note</a></p>
  <p>© {datetime.date.today().year} {NAME}. All stories and illustrations are original.</p>
</footer>
<script>if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(()=>{{}});</script>
</body>
</html>
'''

def replace_block(src, key, content):
    pat = re.compile(rf'(<!-- SEO:{key} -->).*?(<!-- /SEO:{key} -->)', re.S)
    if not pat.search(src): sys.exit(f'index.html is missing the SEO:{key} markers')
    return pat.sub(lambda m: m.group(1) + '\n' + content + '\n' + m.group(2), src)

def main():
    stories = load_stories()
    slugs = {s['id']: slugify(s['title']) for s in stories}
    for s in stories:
        d = os.path.join(ROOT, 'story', slugs[s['id']]); os.makedirs(d, exist_ok=True)
        open(os.path.join(d, 'index.html'), 'w', encoding='utf-8').write(story_page(s, stories, slugs))
        make_og(s)

    # Home page blocks
    p = os.path.join(ROOT, 'index.html'); src = open(p, encoding='utf-8').read()
    grid = '\n'.join('      ' + card(s, f'read.html?s={s["id"]}').replace('src="/stories/', 'src="stories/') for s in stories)
    links = '\n'.join(f'      <li><a href="/story/{slugs[s["id"]]}/">{esc(s["title"])}</a> <span>· {esc(s["vehicle"].lower())} bedtime story</span></li>' for s in stories)
    home_ld = {'@context': 'https://schema.org', '@graph': [WEBSITE, ORG,
        {'@type': 'ItemList', 'name': 'Free bedtime stories about big vehicles', 'itemListElement': [
            {'@type': 'ListItem', 'position': i + 1, 'url': f'{SITE}/story/{slugs[s["id"]]}/', 'item': book_ld(s, f'{SITE}/story/{slugs[s["id"]]}/')}
            for i, s in enumerate(stories)]}]}
    src = replace_block(src, 'GRID', grid)
    src = replace_block(src, 'LINKS', links)
    src = replace_block(src, 'JSONLD', ld_script(home_ld))
    open(p, 'w', encoding='utf-8').write(src)

    urls = [(SITE + '/', '1.0')] + [(f'{SITE}/story/{slugs[s["id"]]}/', '0.8') for s in stories] + [(SITE + '/privacy.html', '0.2')]
    sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    sm += [f'  <url><loc>{u}</loc><lastmod>{TODAY}</lastmod><priority>{pr}</priority></url>' for u, pr in urls]
    sm.append('</urlset>')
    open(os.path.join(ROOT, 'sitemap.xml'), 'w').write('\n'.join(sm) + '\n')
    open(os.path.join(ROOT, 'robots.txt'), 'w').write(f'User-agent: *\nAllow: /\n\nSitemap: {SITE}/sitemap.xml\n')
    for u, _ in urls: print(u)
    for f in NOINDEX_PAGES:
        if 'content="noindex"' not in open(os.path.join(ROOT, f), encoding='utf-8').read():
            print(f'WARNING: {f} has lost its noindex tag; put it back by hand.', file=sys.stderr)

if __name__ == '__main__':
    main()
