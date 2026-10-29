# psychedigital.com static mirror

Front-end-only copy of the live site (captured 2026-10-29). 70 HTML pages, forms/Stripe/analytics/cookie banner removed.
Serve from this folder: `python3 -m http.server` then open http://localhost:8000/

Links are page-relative (`../about/index.html`), so it also works opened from disk or in a subfolder.
Re-capture with `python3 _tools/mirror.py <file-of-urls>` (uses curl; the sitemap URLs are discovered, redirects followed).
Excluded: /internal-payment/. Old category links (/digital-marketing/ etc.) 404 on the live site too and are left pointing there.
