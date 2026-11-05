# Wolf Medallion Messenger — GitHub Pages

Static React, Vite, and TypeScript build of the Lovable project. The app mounts the experience directly as a single-page product site, so it can run on GitHub Pages without a server runtime.

## Local development

```sh
pnpm install
pnpm dev
```

Create a production build with `pnpm build`.

## GitHub Pages

The workflow at `.github/workflows/pages.yml` builds on pushes to `main` and deploys the `dist` folder. In repository **Settings → Pages**, choose **GitHub Actions** as the publishing source once for the repository.

The Vite base path is relative, so the site works at a GitHub Pages project URL. `/public/models/witcher-bag.glb` is optional; the procedural bag appears when the model is absent. The non-WebGL poster is an SVG fallback created for this export because Lovable's file reader could not preserve the original binary poster.

This is a deployment copy of Lovable commit `4e77bafa105e91f765cec023db3116814aced23e`. It includes the two reported strict-check fixes in the liquid emblem and particle animation. No production build has been run yet in this environment.

