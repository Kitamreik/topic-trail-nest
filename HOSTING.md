# Hosting

This is a Vite + React SPA. `npm run build` produces a fully static `dist/` directory that can be served from any static host. Every host needs the same two things:

1. **Serve `dist/` as the web root.**
2. **SPA fallback** — every unknown path should serve `index.html` so React Router can handle the route on the client.

Below are ready-to-use configs for the most common platforms. Configs in this repo (`vercel.json`, `netlify.toml`, `Dockerfile`, `nginx.conf`, `render.yaml`) are real and tested patterns — not placeholders.

---

## Render

Render can host this project in two equally supported ways. Use **Static Site** for the simplest setup; use **Web Service (Docker)** if you want full control over the runtime.

### Option A — Static Site (recommended)

1. Push the repo to GitHub / GitLab / Bitbucket.
2. In the Render dashboard: **New +** → **Static Site** → connect the repo.
3. Fill in the form:
   - **Name**: anything (e.g. `academic-stream`)
   - **Branch**: `main`
   - **Root Directory**: leave blank
   - **Build Command**: `npm ci && npm run build`
   - **Publish Directory**: `dist`
4. Open **Redirects/Rewrites** and add a single rule:
   - **Source**: `/*`
   - **Destination**: `/index.html`
   - **Action**: `Rewrite` (status 200) — **not** Redirect
   This is the SPA fallback. Without it, refreshing `/dashboard` returns 404.
5. (Optional) **Headers** → add for `path: /assets/*`:
   - `Cache-Control: public, max-age=31536000, immutable`
6. Click **Create Static Site**. The first build takes 1–3 minutes.
7. Render assigns you `https://<name>.onrender.com`. Add this origin to **Authorized JavaScript origins** in your Google OAuth client before using the Classroom importer.

The repo already includes `render.yaml`, so if you click **New +** → **Blueprint** and point at the repo, Render reads it and pre-fills all of the above automatically.

### Option B — Web Service from the Dockerfile

Use this if you want logs, autoscaling, private networking, or to keep the same image you would run locally.

1. **New +** → **Web Service** → connect the repo.
2. **Runtime**: `Docker`
3. **Dockerfile path**: `./Dockerfile`
4. **Plan**: pick any (the free plan works).
5. **Port**: leave Render to auto-detect; the bundled `nginx.conf` listens on `80`, which Render maps to its public 443.
6. Deploy. No SPA-rewrite rule is needed because `nginx.conf` already runs `try_files $uri $uri/ /index.html`.

### Troubleshooting Render

- **404 on refresh** → the `/* → /index.html` rewrite is missing or set as a Redirect instead of a Rewrite. Fix in dashboard → Redirects/Rewrites.
- **`Cannot find module` during build** → switch the build command to `npm ci && npm run build` so the lockfile is honored.
- **Google sign-in popup says "redirect_uri_mismatch"** → add the exact `https://<name>.onrender.com` origin (no trailing slash, no path) to **Authorized JavaScript origins** in Google Cloud Console for the OAuth client used by the importer.
- **Old build still showing** → Render caches aggressively. Click **Manual Deploy → Clear build cache & deploy**.
- **Docker build OOM on free plan** → switch to **Static Site** (Option A); the static build runs in Render's build environment, not the runtime container.

---

## Vercel

`vercel.json` (already in repo) sets the build command, output directory, SPA rewrite, and long-cache headers for hashed assets. Just import the repo in the Vercel dashboard, or run:

```bash
npm i -g vercel
vercel        # follow prompts, defaults are correct
vercel --prod
```

## Netlify

`netlify.toml` (already in repo) configures the build and the `/* -> /index.html 200` redirect required for client-side routing.

```bash
npm i -g netlify-cli
netlify deploy --build           # preview
netlify deploy --build --prod    # production
```

## Cloudflare Pages

1. Connect the repo in the Cloudflare Pages dashboard.
2. Build command: `npm run build`
3. Build output directory: `dist`
4. SPA fallback is provided by `public/_redirects` (already in repo): `/* /index.html 200`.

## GitHub Pages

GitHub Pages does not natively support SPA rewrites, so we use the `404.html` trick.

1. In `vite.config.ts`, set `base: '/<your-repo-name>/'` if publishing to `username.github.io/<repo>` (skip for a custom domain or user/org pages root).
2. Build and copy index.html as the 404 fallback:
   ```bash
   npm run build
   cp dist/index.html dist/404.html
   ```
3. Publish `dist/` to the `gh-pages` branch (e.g. with the `gh-pages` npm package) or via a GitHub Actions Pages workflow.

## Docker / self-hosted (nginx)

`Dockerfile` builds the app and serves it with nginx using `nginx.conf` (SPA fallback + asset caching + gzip already configured).

```bash
docker build -t academic-stream .
docker run --rm -p 8080:80 academic-stream
# open http://localhost:8080
```

## AWS S3 + CloudFront

1. `npm run build`
2. `aws s3 sync dist/ s3://<bucket>/ --delete`
3. In CloudFront, add **custom error responses** for HTTP 403 and 404 that return `/index.html` with status 200 — that is the SPA fallback.
4. Set long cache TTLs for `/assets/*` and short TTL (or no-cache) for `index.html`.

## Firebase Hosting

```bash
npm i -g firebase-tools
firebase init hosting   # public dir: dist, single-page app: Yes
npm run build
firebase deploy
```

## Railway / Fly.io / any container host

Use the included `Dockerfile`. These platforms detect it automatically; point them at the repo and they will build and run on port 80.

---

## Environment & runtime notes

- **No backend required.** All data is persisted client-side in `localStorage`. There are no server env vars to set for the app itself.
- **Google Classroom import** uses Google Identity Services with an OAuth Client ID that the webmaster pastes into the UI at runtime. When deploying to a new origin, add that origin to **Authorized JavaScript origins** in the same OAuth client in Google Cloud Console.
- **HTTPS** is required for Google OAuth, the Vibration API, and reliable `localStorage` across browsers — all platforms above provide it by default.
- **SPA fallback** is mandatory. If you see a 404 when refreshing a deep link (e.g. `/dashboard`), the fallback is not configured.
