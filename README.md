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

## Medal data

The server fetches medal totals from Wikipedia once per hour and caches the
results. Update the medal source URL in `server.js` when 2026 standings become
available.
