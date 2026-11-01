# Internship_Application_Tracker

Project Setup & UI Libraries

This project uses Tailwind CSS ans Bootstrap for different practical requirements.

UI Technologies Used

Bootstrap

Bootstrap is used for the Signup Page as required by the practical implementation.

Install Bootstrap with:

npm install bootstrap

React Bits — GooeyNav

The project uses the GooeyNav component from React Bits for navigation.

Add it using:

npx shadcn@latest add @react-bits/GooeyNav-JS-CSS

Installation

Clone the repository and install the dependencies:

npm install

Install Bootstrap:

npm install bootstrap

Add the React Bits GooeyNav component:

npx shadcn@latest add @react-bits/GooeyNav-JS-CSS

Tailwind CSS is already configured as part of the project setup and is used by the Login Page.

Running the Project

Start the development server using:

npm run dev

## Backend (Node.js + Supabase)

Data lives in Supabase (Postgres) behind an Express API in `backend/`; resumes and cover letters are files in a private Supabase Storage bucket.

1. Create a project at supabase.com.
2. `cd backend && npm install && cp .env.example .env`, then fill in `DATABASE_URL` (Session pooler string), `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (Project Settings -> API).
3. `npm run db:init` creates the tables, seed internships and the `resumes` storage bucket.
4. `npm run dev` starts the API on http://localhost:5000.
5. In `frontend/`, `npm run dev` - Vite proxies `/api` to the backend.

Every user has a unique, lowercase `username` (3-30 chars: a-z, 0-9, `_`), chosen at sign-up.

### Social sign-in (Google, GitHub, LinkedIn)

Handled by Supabase Auth; the API then issues its normal session. Setup:

1. Supabase dashboard -> *Authentication -> Providers*: enable **Google**, **GitHub** and **LinkedIn (OIDC)**, pasting each provider's client ID and secret. Each provider's "callback / redirect URL" is `https://<project-ref>.supabase.co/auth/v1/callback`.
2. *Authentication -> URL Configuration*: set Site URL to `http://localhost:5173` and add `http://localhost:5173/auth/callback` to Redirect URLs (plus your deployed URL later).
3. `cp frontend/.env.example frontend/.env` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

New social users pick a unique username on first sign-in; they are always created as students.
