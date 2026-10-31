# AG-website

The Annoying Goods studio website — the pages, the menu, the spider and the search.

The whole public site is dependency-free HTML and CSS, with no framework anywhere in what a
visitor downloads. A small amount of TypeScript provides the interactive pieces, and a Rust
WASM module is used where the site needs it. Node.js is used **only** as a development/build
tool and never ships to production.

## Stack

- **HTML + CSS** — the primary build.
- **TypeScript** — for logic, compiled to plain JavaScript.
- **Rust + WASM** — for the one module that needs it (`wasm/`).
- **Node.js** — build and local tooling only, never part of the public site.

## Building

```text
npm install
npm run build            # compile the TypeScript, build the site, build the admin tool
npm run build:release    # build and pack the deployable dist/ folder
npm run lint             # type-check the whole repository + the pixel-unit gate
npm test                 # the Playwright suite (runs against the built site)
npm run serve            # serve the built site locally
```

`npm run build:release` writes the deployable `dist/` folder and gives the bundles their
content-digest names.

## Layout

```
index.html 404.html robots.txt sitemap.xml search-index.json .htaccess
about/ blog/ contact/ labs/ products/ support/ words/ playground/
assets/  styles/  scripts/          served assets, stylesheets, compiled scripts
src/                                the TypeScript sources
content/                            the Markdown the pages are built from
api/                                the small PHP endpoints
wasm/                               the Rust/WASM module
tools/                              the build and local-admin tooling
types/                              the hand-written type declarations
```

## Deployment

The site is served on IONOS, bound to the `/annoyinggoods` folder of the hosting space
(`/home/www/annoyinggoods`). The deployable output is `dist/`.

## Licence

Released under the Annoying Goods Open Source License with Ethical Restrictions — see
[`LICENSE`](LICENSE).
