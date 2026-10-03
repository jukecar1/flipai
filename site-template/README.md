# Client site template

One JSON file per client in `clients/` produces a static site in `dist/<slug>/`.

```
node build.mjs
```

To add a client: copy `clients/sample-plumber.json`, fill it in (real photos/reviews,
a Formspree endpoint for `formEndpoint`), run the build, deploy `dist/<slug>` to
Cloudflare Pages (or any static host).

## Templates

- Default (trades / local business): `clients/sample-plumber.json`
- Dark product landing page: add `"template": "saas"` — see `clients/sample-saas.json`
- Dark trades page: `"template": "trades-dark"` — see `clients/sample-plumber-dark.json`
