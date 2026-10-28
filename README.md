# VibeLabQuantHackathon

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Supabase setup

1. Apply the database schema in your Supabase project.
2. Run [`supabase/policies.sql`](./supabase/policies.sql) in the Supabase SQL Editor. It adds the authenticated team and submission policies, configures the private algorithm storage bucket, and exposes the public leaderboard safely.
3. Copy [`.env.example`](./.env.example) to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to your project's URL and public anon/publishable key.
4. Enable email/password authentication in Supabase Auth, then restart the dev server.

The app supports account registration and sign-in, team creation/joining, private Python algorithm uploads, submission status, market-data summaries, completed run performance, and the public leaderboard. Never put a Supabase service-role key in a `VITE_` variable.

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS
