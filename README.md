# study-app

The bot stays untouched. This folder adds the app next to it.

## 1. app-api (Cloudflare Worker)
1. Open `app-api/wrangler.toml` and paste your D1 `database_id` (same one the bot uses).
2. `npm install`
3. Add secrets (copy the values from the bot):
   ```
   npx wrangler secret put TELEGRAM_BOT_TOKEN
   npx wrangler secret put NEON_URL
   npx wrangler secret put GEMINI_API_KEY
   npx wrangler secret put GEMINI_API_KEY_2
   npx wrangler secret put OPENROUTER_API_KEY
   npx wrangler secret put HF_TOKEN
   npx wrangler secret put JWT_SECRET      # new: any long random string
   ```
4. `npx wrangler deploy` and note the `https://study-app-api.<you>.workers.dev` URL.

## 2. web (Next.js PWA on Vercel)
1. In Vercel set `NEXT_PUBLIC_API_URL` to the Worker URL from step 1.
2. Import the `web/` folder as a Vercel project and deploy.
3. Add your Vercel URL to `ALLOWED_ORIGINS` in `wrangler.toml`
   (comma separated, e.g. `"http://localhost:3000,https://your-app.vercel.app"`) and redeploy the Worker.

## 3. PWABuilder
Paste the Vercel URL into pwabuilder.com and package it.

## New D1 tables (created automatically, bot tables untouched)
- `app_otps`: login codes
- `app_quiz_sessions`: open app quizzes
