<!-- BEGIN:project-rules -->
# ClinicOS — Vite + React + TailwindCSS v4 + Supabase

This is a **standalone Vite SPA** (not Next.js, not a monorepo).

## Key conventions
- All source code lives in `src/` — no `apps/` or `packages/`
- Files use `.jsx` / `.js` extensions (no `.tsx` / `.ts` in source)
- Path alias `@/` maps to `src/`
- TailwindCSS v4 via `@import "tailwindcss"` in `src/styles/globals.css`
- Supabase env vars use `NEXT_PUBLIC_` prefix (mapped in `vite.config.ts`)
- Run `npm run dev` from root (port 3000)
## Database operations
- Use the service_role key (not anon) for admin DB operations that need RLS bypass
- Service role key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoc3F0ZG1qZmdibmhyZm9iaWxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTA2NjkwOSwiZXhwIjoyMDk2NjQyOTA5fQ.4wqWT5ds3-Z4FwgYlzDAUN18kLw6qFDR_18AeiH6C8Y` (never commit to .env.local)
- For SQL migrations: write `.sql` file in `supabase/migrations/`, then apply via Supabase dashboard SQL Editor or CLI (using service_role key directly)

## Architecture blueprint
See `CLINICOS-BLUEPRINT.md` for the full page-by-page behavior specification.
Every page must answer exactly ONE question. Build workflow machines, not database UIs.
<!-- END:project-rules -->
