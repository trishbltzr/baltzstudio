# Supabase Setup

Supabase is installed in the app, and the live dashboard now has a database-backed state table for project/task persistence.

## Project

- Supabase project: `baltazarstudio`
- Project ref: `frzfmqvymrqasyaailkm`
- Project URL: `https://frzfmqvymrqasyaailkm.supabase.co`

## Environment Variables

Add these in `.env.local` for local development. They are already set in Vercel for production, preview, and development:

```txt
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

Use the publishable key for browser/client code. Do not expose a secret key or service role key in `NEXT_PUBLIC_*` variables.

## Added Files

- `src/lib/supabase/client.ts` creates the browser Supabase client for Client Components.
- `src/lib/supabase/server.ts` creates the cookie-aware server Supabase client for Server Components, Server Actions, and Route Handlers.
- `src/lib/supabase/types.ts` is a placeholder for generated database types once the schema exists.
- `app/api/dashboard-state/route.ts` reads and writes the dashboard state snapshot.

## Database

The `public.dashboard_state` table stores the current dashboard project state as JSON.

Current columns:

- `id`
- `projects`
- `selected_project_id`
- `updated_at`

RLS is enabled. The current policy allows the deployed dashboard to read/write the single `default` state row with the publishable key. This is enough for the current demo-style dashboard persistence, but the production-grade next step is Supabase Auth plus user-specific ownership policies.

## Next Safe Stage

Replace the demo login with Supabase Auth and split the JSON snapshot into normalized tables for projects, tasks, approvals, and notification records. Billing, AI automations, and automation behavior are intentionally not implemented yet.
