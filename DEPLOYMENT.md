# Deploying PulseBoard

This is the exact path I'd take. **Backend on Render, frontend on Vercel.** The whole thing takes about 15 minutes if your repo is already on GitHub.

> **Why split?** Vercel is serverless — it kills long-lived processes. PulseBoard's scheduler, Socket.IO gateway, and Redis lock all need a real Node process, which is what Render gives you. Vercel is perfect for the static frontend.

---

## Before you start

1. **Code is on GitHub** (or GitLab/Bitbucket — Render and Vercel support all three).
2. **Accounts**: [render.com](https://render.com) and [vercel.com](https://vercel.com) — free signup, no card needed for the free tiers.
3. The repo already includes:
   - `render.yaml` — backend blueprint (DB + Redis + service)
   - `vercel.json` — frontend config with SPA rewrites
   - `.env.example` — every env var documented

---

## Part 1 — Backend on Render (10 minutes)

You have two options. **Option A** is one click. **Option B** if you want manual control.

### Option A: Blueprint (recommended)

1. **Render dashboard → New → Blueprint**.
2. Connect your GitHub account, pick the `pulse-board` repo.
3. Render reads [`render.yaml`](render.yaml) and shows you exactly what it'll create:
   - **`pulseboard-db`** — PostgreSQL 16 (free tier)
   - **`pulseboard-redis`** — Redis (free tier)
   - **`pulseboard-api`** — Node web service (Starter, $7/mo)
4. Click **Apply**. Render provisions everything in parallel; takes 5–8 minutes.
5. While it's building, click into the **`pulseboard-api`** service → **Environment** tab and set:
   - `CORS_ORIGINS` — leave blank for now, you'll add the Vercel URL after Part 2
   - `SMTP_*` and `SLACK_WEBHOOK_URL` — only if you want email/Slack alerts
6. The first deploy will run migrations automatically (`prisma migrate deploy` is in the build command).

### Option B: Manual

If the blueprint isn't your thing:

1. **New → PostgreSQL** → name `pulseboard-db`, free plan, create. Copy the **Internal Database URL**.
2. **New → Key Value (Redis)** → name `pulseboard-redis`, free plan. Copy the **Internal Redis URL**.
3. **New → Web Service** → connect GitHub repo. Settings:

   | Field | Value |
   |---|---|
   | Runtime | Node |
   | Build command | `npm install && npm -w @pulseboard/api exec prisma generate && npm -w @pulseboard/api run build && npm -w @pulseboard/api exec prisma migrate deploy` |
   | Start command | `npm -w @pulseboard/api run start:prod` |
   | Health check path | `/api/health` |
   | Plan | Starter ($7/mo) — see "Free vs Starter" below |

4. **Environment** tab — paste these (Render injects `PORT` automatically, don't override it):

   | Var | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `JWT_SECRET` | Click "Generate" or use `openssl rand -hex 48` |
   | `DATABASE_URL` | from step 1 |
   | `REDIS_URL` | from step 2 |
   | `JWT_EXPIRES_IN` | `7d` |
   | `JWT_REFRESH_EXPIRES_IN` | `30d` |
   | `CORS_ORIGINS` | leave blank for now |

5. **Create Web Service**. First build takes 5–8 minutes.

### After deploy: seed demo data (optional, one-time)

If you want the demo workspace and `demo@pulseboard.dev` account in production, open the Render **Shell** tab on `pulseboard-api` and run:

```bash
npm -w @pulseboard/api run db:seed
```

> **Don't do this** if real users are going to sign up — it creates a `demo` workspace owned by a fixed email.

### Verify

```bash
curl https://<your-render-app>.onrender.com/api/health
# {"status":"ok"}

curl -X POST -H "Content-Type: application/json" \
  -d '{"email":"demo@pulseboard.dev","password":"demo1234"}' \
  https://<your-render-app>.onrender.com/api/auth/login
# {"accessToken":"...", "refreshToken":"...", "user":{...}}
```

Note the URL — you'll need it for Vercel.

---

## Part 2 — Frontend on Vercel (5 minutes)

1. **Vercel dashboard → Add New → Project** → import the same repo.
2. Vercel detects `vercel.json` and pre-fills the config. Confirm:

   | Field | Value |
   |---|---|
   | Framework preset | Other (the `vercel.json` overrides it anyway) |
   | Build command | `npm install && npm -w @pulseboard/web run build` |
   | Output directory | `apps/web/dist` |
   | Root directory | `./` (repo root, not `apps/web`) |

3. **Environment variables** — add these:

   | Var | Value |
   |---|---|
   | `VITE_API_URL` | `https://<your-render-app>.onrender.com/api` |
   | `VITE_SOCKET_URL` | `https://<your-render-app>.onrender.com` |

4. Click **Deploy**. Build takes 1–2 minutes.
5. Vercel gives you a URL like `https://pulseboard-xxx.vercel.app`. Copy it.

---

## Part 3 — Connect them (2 minutes)

1. **Render → `pulseboard-api` → Environment**.
2. Set `CORS_ORIGINS` to your Vercel URL: `https://pulseboard-xxx.vercel.app`
3. **Save Changes**. Render auto-redeploys (takes ~2 min).
4. Done. Open the Vercel URL, log in.

---

## Sanity checks

After it's live, verify each piece:

| What | How |
|---|---|
| Login works | Sign in with your account on the Vercel URL |
| Stats load | Dashboard shows real numbers, not zeros |
| Realtime works | Top bar says "Live" with a green pulsing dot |
| Scheduler runs | Add an HTTP monitor; it should run within ~30s and show check results |
| Public status page | If you published one, visit `/status/<slug>` |
| API key | Settings → API keys → Create. Use it: `curl -H "Authorization: Bearer pb_…" https://<render>.onrender.com/api/workspaces/<slug>/monitors` |

---

## Free vs Starter (Render)

The free Web Service tier on Render **spins down after 15 minutes idle** and takes ~30 seconds to wake up. For PulseBoard that's a problem because:

- The scheduler stops running while the service is asleep — your monitors won't fire.
- The first request after sleep takes 30+ seconds.

**For a real deployment, use the Starter plan ($7/mo)**. It's always-on. The free tier is fine for kicking the tires.

---

## Database options

The blueprint provisions **Render Postgres** (free, 1GB, deleted after 90 days of inactivity). For something you actually depend on, swap it for one of:

| Provider | Free tier | Notes |
|---|---|---|
| **Supabase** | 500 MB, no expiry | Use the **direct** URL (port 5432), not the pooler — the scheduler holds long-lived connections |
| **Neon** | 0.5 GB, branches included | Append `?sslmode=require` to the URL |
| **Render Postgres (paid)** | $7/mo | If you want everything on one provider |
| **Railway** | $5/mo trial | Easy if you'd rather host the API there too |

Just replace `DATABASE_URL` in your Render service env vars and redeploy. No migration needed if the schema is the same.

---

## Custom domains

### Vercel (frontend)

1. Vercel project → **Settings → Domains** → add your domain.
2. Add the CNAME / A record Vercel shows you.
3. SSL is automatic.

### Render (backend)

1. Render service → **Settings → Custom Domains** → add `api.yourdomain.com`.
2. Add the CNAME record Render shows you.
3. After it verifies, update Vercel's `VITE_API_URL` and `VITE_SOCKET_URL` to use the custom subdomain, and Render's `CORS_ORIGINS` to use the apex domain.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| **CORS error in browser console** | `CORS_ORIGINS` on Render doesn't match your Vercel URL exactly. No trailing slash. |
| **"Live" indicator stays gray** | WebSocket isn't connecting. Confirm `VITE_SOCKET_URL` points at the API origin (no `/api` suffix). |
| **Login returns 401 immediately on production** | `JWT_SECRET` was rotated and old tokens are invalid. Clear localStorage on the frontend or sign in fresh. |
| **`prisma migrate deploy` fails** | Postgres URL is wrong or unreachable. Render Internal URL only works from Render — use External URL for local testing. |
| **Build runs forever** | Free Render plan is slow on cold builds. First deploy can take 8+ min. Subsequent deploys are faster (~2 min) due to layer caching. |
| **API returns 502 after deploy** | Your service is still starting. Render's health check polls `/api/health` — give it 30s. |
| **Scheduler "Could not acquire scheduler lock"** | Normal in single-instance mode. Means Redis is connected and the lock fell back gracefully. |
| **`Account already exists`** | You ran the seed twice. It's idempotent for the demo user but `demo` workspace slug is unique. |

---

## CI/CD

Once connected, both Render and Vercel **auto-deploy on push to `main`** by default. You don't need GitHub Actions for basic deploys — just push.

If you want PR previews:
- **Vercel** does this automatically — every PR gets a preview URL.
- **Render** does it on the Pro plan only.

---

## Cost summary

| Tier | Cost | Includes |
|---|---|---|
| **Free** | $0 | Vercel frontend + Render free DB + Render free Redis. **Backend sleeps after 15 min — not viable for real monitoring.** |
| **Starter** | **$7/mo** | Same as free, but Render Web Service is always-on. **This is the minimum I'd run in production.** |
| **Production-ish** | ~$15/mo | Add a paid Render Postgres or external Supabase Pro for backups and larger storage |
| **Self-hosted VPS** | $5/mo | Hetzner/DigitalOcean — install Node, Postgres, Redis. Full nginx config in [`README.md`](README.md#deployment) |

---

## What's next after deployment

- **Add monitors for your real services.** The HTTP monitor with `expectedJsonPath` is the easiest start.
- **Configure an alert channel.** Slack incoming webhooks are the fastest setup.
- **Publish a status page.** Pin your services as components, set a slug, hit publish, share the URL.
- **Generate an API key.** Settings → API keys → Create. Use it from your CI to file synthetic incidents on deploy failures.
- **Set up custom domains** for both Vercel and Render so users see `app.yourdomain.com` and `api.yourdomain.com`.
