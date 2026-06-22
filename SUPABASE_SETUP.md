# Supabase Setup

Supabase is installed in the app, but live persistence is not enabled until the project credentials and database schema are added.

## Environment Variables

Add these in `.env.local` for local development and in Vercel Project Settings > Environment Variables for production:

```txt
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

Use the publishable key for browser/client code. Do not expose a secret key or service role key in `NEXT_PUBLIC_*` variables.

## Added Files

- `src/lib/supabase/client.ts` creates the browser Supabase client for Client Components.
- `src/lib/supabase/server.ts` creates the cookie-aware server Supabase client for Server Components, Server Actions, and Route Handlers.
- `src/lib/supabase/types.ts` is a placeholder for generated database types once the schema exists.

## Next Safe Stage

Create the database schema for dashboard state, projects, tasks, approvals, and notifications with Row Level Security enabled. New Supabase projects may require explicit `GRANT` statements before tables are available through the Data API.
