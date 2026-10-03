# Client site template

One JSON file per client in `clients/` produces a static site in `dist/<slug>/`.

```
node build.mjs
```

To add a client: copy `clients/sample-plumber.json`, fill it in (real photos/reviews,
a Formspree endpoint for `formEndpoint`), run the build, deploy `dist/<slug>` to
Cloudflare Pages (or any static host).
