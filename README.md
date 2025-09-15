# AdminJS Marketing Starter (fixed deps)

## Quickstart
1) Edit `.env` with your Postgres URL.
2) Install deps:
   npm i
3) Create tables from prisma schema:
   npx prisma db push
   npx prisma generate
4) Run:
   npm run dev
Open http://localhost:3000/admin

If npm install complains about peer deps on Windows:
   npm i --legacy-peer-deps
