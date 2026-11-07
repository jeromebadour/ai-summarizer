# Distill

Summaries you can check. Paste a text and Distill writes a short summary where every point links to the sentences it
came from, and every number is checked against your text.

**Status: in development.** The live link, screenshots and the full write-up land here when it ships.

Built by Jerome Badour.

## Run it locally

With Docker: make an env file with `POSTGRES_PASSWORD`, `DISTILL_APP_PASSWORD` (hex only) and `ANTHROPIC_API_KEY`, then

```bash
docker compose --env-file <your env file> up -d --build
```

and open http://localhost:3101. The public read-only admin demo is at `/demo/admin`.

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4. PostgreSQL 16 with row-level security, own accounts
(Argon2id), Claude API (Haiku 5.5). Runs in Docker Compose behind Nginx; every push runs the type check, lint, unit
tests, the database suites and the browser suites against the built container.

---

© 2026 Jerome Badour. All rights reserved. See [LICENSE](LICENSE).
