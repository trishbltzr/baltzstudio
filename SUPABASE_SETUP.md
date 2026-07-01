# Supabase Setup

Supabase is installed in the app, and the live dashboard now has database-backed persistence for project/task state plus per-user project selection.

## Project

- Supabase project: `baltazarstudio`
- Project ref: `frzfmqvymrqasyaailkm`
- Project URL: `https://frzfmqvymrqasyaailkm.supabase.co`

## Environment Variables

Add these in `.env.local` for local development. They are already set in Vercel for production, preview, and development.

For the existing `baltazarstudio` Supabase project, the local file should look like this:

```txt
NEXT_PUBLIC_SUPABASE_URL=https://frzfmqvymrqasyaailkm.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

Use the publishable key for browser/client code. Do not expose a secret key or service role key in `NEXT_PUBLIC_*` variables.

To connect a fork or local branch to a new Supabase project instead, replace both values with the new project's Project URL and publishable key from Supabase Project Settings -> API. After creating the new project, apply the migration in `supabase/migrations/20260630093000_refactor_dashboard_state_scopes.sql` so the dashboard persistence tables exist.

## Added Files

- `src/lib/supabase/client.ts` creates the browser Supabase client for Client Components.
- `src/lib/supabase/server.ts` creates the cookie-aware server Supabase client for Server Components, Server Actions, and Route Handlers.
- `src/lib/supabase/types.ts` is a placeholder for generated database types once the schema exists.
- `app/api/dashboard-state/route.ts` reads and writes scoped dashboard persistence.
- `src/lib/dashboardPersistence.ts` keeps the scope helpers and merge logic aligned between the API and dashboard page.

## Database

The dashboard now uses two scoped tables:

- `public.dashboard_project_state`
  - `project_id`
  - `project`
  - `client_email`
  - `updated_at`

- `public.dashboard_user_state`
  - `user_email`
  - `selected_project_id`
  - `updated_at`

The legacy `public.dashboard_state` singleton row is left in place as a migration backup, but the dashboard route no longer reads or writes it.

RLS is enabled on the new tables. Because the current preview login is still a demo `sessionStorage` flow rather than Supabase Auth, the new policies intentionally preserve the existing anon-access preview behavior while the app scopes selection by user email and project state by workspace/project row. The production-grade next step is still Supabase Auth plus user-specific ownership policies.

## Next Safe Stage

Replace the demo login with Supabase Auth and split the JSON snapshot into normalized tables for projects, tasks, approvals, and notification records. Billing, AI automations, and automation behavior are intentionally not implemented yet.
