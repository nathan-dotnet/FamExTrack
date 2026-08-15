# Family Ledger

Family Ledger is a family budgeting and expense-tracking application designed for parents and sons. Parents can approve monthly budgets, review spending, manage categories, and audit every decision, while sons can submit budgets, log expenses with receipts, and request additional money.

## Overview

This project combines:

- Monthly budget planning and review flows
- Expense tracking with receipt support and required reasons for missing receipts or overspending
- Parent/son role-based experiences and navigation
- Notifications, money requests, transfers, and audit activity
- Dashboard and analytics summaries for monthly spending and budget health

## Key features

- Parent dashboard with overview of family spending and pending actions
- Son budget submissions by month and category
- Expense logging with receipt uploads and status tracking
- Budget approval/reduction workflow with notes and review history
- Category management and analytics views
- Notifications and audit trail for actions across the app
- Authentication and authorization through Supabase

## Tech stack

- React 19
- TypeScript
- Vite
- TanStack Start + TanStack Router
- TanStack Query
- Tailwind CSS
- Supabase for auth and database
- Radix UI primitives

## Project structure

```text
src/
  components/       UI and shared dashboard components
  hooks/            custom hooks
  integrations/     Supabase client setup and auth middleware
  lib/              domain logic, queries, formatting, and helpers
  routes/           file-based app routes for each screen
  styles.css        app styling and theme tokens
supabase/
  migrations/       database schema migrations
```

## Prerequisites

- Node.js 20 or newer
- npm
- A Supabase project

## Local setup

1. Clone the repository

```bash
git clone <your-repository-url>
cd FamExTrack
```

2. Install dependencies

```bash
npm install
```

3. Configure environment variables

Create a `.env.local` file in the project root with your Supabase values:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
SUPABASE_URL=your_supabase_project_url
SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

> These variables are used by the app and server-side clients for Supabase authentication and database access.

4. Start the app

```bash
npm run dev
```

Open the local URL shown in the terminal, usually `http://localhost:3000` or the Vite dev server URL.

## Available scripts

```bash
npm run dev        # start the local development server
npm run build      # create a production build
npm run preview    # preview the production build locally
npm run lint       # run ESLint
npm run format     # format the codebase with Prettier
```

## Database and backend

The project includes Supabase migrations under `supabase/migrations/` and uses generated database typing from the Supabase schema in `src/integrations/supabase/types.ts`.

For a fresh setup, apply the migration files in the Supabase SQL editor or project migration workflow before using the app.

## Related routes

The app is organized around role-based pages such as:

- `/dashboard`
- `/budget`
- `/budgets`
- `/expenses`
- `/family`
- `/analytics`
- `/notifications`
- `/profile`
- `/auth`

## Notes

This repository is a full-stack web app using a local front-end workflow and Supabase as the backend/data layer. The app is designed around family finance coordination rather than a generic personal finance app, with stronger guarding around approvals, overspending, and receipts.
