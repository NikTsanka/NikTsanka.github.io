# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Static website for **DM** (დანადგარების მონტაჟი — Equipment Installation), a Georgian company offering electrical installation, fire safety, and security systems. No build tools, bundlers, or package managers — open HTML files directly in a browser to develop.

## Architecture

### Pages
Each page is a self-contained HTML file. Service detail pages (`electricity.html`, `fire-safety.html`, `alarm.html`) follow the same structure: page-banner → work-process steps → gallery → CTA → footer. The script load order at the bottom of each page matters:

```html
<script src="js/i18n.js"></script>       <!-- must be first -->
<script src="js/products-data.js"></script> <!-- products.html only -->
<script src="js/main.js"></script>
<script src="js/products.js"></script>   <!-- products.html only -->
```

### Internationalisation (`js/i18n.js`)
All translated strings (Georgian/English/Russian) live in a single `T` object keyed by `ka`, `en`, `ru`. Language is persisted in `localStorage` as `dm_lang`. Three HTML attributes drive translations:
- `data-i18n="key"` → sets `textContent`
- `data-i18n-html="key"` → sets `innerHTML` (used where spans appear inside translated text)
- `data-i18n-ph="key"` → sets `placeholder`

The global accessor `window.i18nT(key)` is available to JavaScript after `i18n.js` loads. A `dm:lang` custom event fires on `document` whenever the language changes — `products.js` listens for it to re-render the product grid.

### Products (`js/products-data.js` + `js/products.js`)
`products-data.js` exports a single `PRODUCTS` array — this is the only file to edit when adding/removing products. Each entry has `id`, `name`, `description`, `price`, `category`, and `image` (relative path; leave empty string `""` if no image). `products.js` reads `PRODUCTS`, builds category filter buttons dynamically, renders cards, and handles the lightbox (only opens when `image` is non-empty).

### Contact form (`js/main.js`)
Uses the [web3forms.com](https://web3forms.com) API. The hidden `access_key` input in `contact.html` is required for submissions to route correctly.

### CSS (`css/styles.css`)
Single stylesheet. CSS custom properties (`--primary`, `--text`, `--text-light`, etc.) are defined at `:root` — use these rather than hard-coded colours. Scroll-reveal animations use the `.fade-up` class + `IntersectionObserver` in `main.js`; adding `class="fade-up"` to any element makes it animate in on scroll.
