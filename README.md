# Winter Olympics Medal Pool

This project hosts a shared medal pool app with a public leaderboard and an
admin lock/deadline.

## Run locally

```bash
npm install
ADMIN_TOKEN=your-secret-token npm start
```

Then open <http://localhost:3000>.

## Pages

- **Entry page:** `/index.html` — members create or edit entries.
- **Public leaderboard:** `/leaderboard.html` — read-only standings view.

## Admin lock

1. Set `ADMIN_TOKEN` when starting the server.
2. Enter the token in the **Admin controls** section.
3. Set a deadline (optional) and/or toggle **Lock immediately**.
4. Click **Update lock settings**.

If the deadline passes, the server automatically locks entries. Use the
**Unlock & clear deadline** button to open entries again.

## Deploy to Render

This repo includes a `render.yaml` blueprint.

1. Push this repo to GitHub (already done).
2. In Render, click **New** → **Blueprint** and select the repo.
3. Render will create a web service with:
   - Build command: `npm install`
   - Start command: `npm start`
   - Persistent disk mounted at `/var/data`
   - `ADMIN_TOKEN` auto-generated (visible in Render env vars)
4. After deploy, open the Render URL and use `/index.html` for entries and
   `/leaderboard.html` for the public leaderboard.

To rotate the admin token, update the `ADMIN_TOKEN` environment variable in
Render and redeploy.

## Custom domain on Render

1. In Render, open your service → **Settings** → **Custom Domains**.
2. Click **Add Custom Domain** and enter your domain (e.g. `pool.example.com`).
3. Render will show DNS records to add at your DNS provider.
   - **Subdomain** (recommended): create a **CNAME** pointing to the
     `onrender.com` hostname shown by Render.
   - **Apex/root domain**: use the **A/ALIAS** records Render provides.
4. Wait for DNS to propagate. Render will issue TLS automatically.

## Force HTTPS on Render

This app enforces HTTPS when `FORCE_HTTPS=true` (enabled in `render.yaml`).
If you need to disable it locally, unset the env var:

```bash
FORCE_HTTPS=false npm start
```

## Medal data

The server fetches medal totals from Wikipedia once per hour and caches the
results. Update the medal source URL in `server.js` when 2026 standings become
available.
