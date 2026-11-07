# Distill

Summaries you can check. Paste a text and Distill writes a short summary where every point links to the sentences it
came from, and every number is checked against your text.

**Status: in development.** The screens are built as real components with invented sample data; the database, sign-in
and the Claude call come next. The live link, screenshots and the full write-up land here when it ships.

Built by Jerome Badour.

## Run it locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000. Sample screens: `/`, `/saved`, `/profile`, `/login`, `/admin`, and the public read-only
admin demo at `/demo/admin`.

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4. Next: PostgreSQL, own auth, Claude API.
