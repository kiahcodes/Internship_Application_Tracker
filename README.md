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

## Backend (Node.js + MySQL)

Data is stored in MySQL (XAMPP) behind an Express API in `backend/`.

1. Start MySQL from XAMPP (`sudo /opt/lampp/lampp startmysql`).
2. `cd backend && npm install && cp .env.example .env` (edit `.env` if your MySQL credentials differ).
3. `npm run db:init` creates the `internship_tracker` database, tables and seed internships.
4. `npm run dev` starts the API on http://localhost:5000.
5. In `frontend/`, `npm run dev` — Vite proxies `/api` to the backend.

Resumes are stored as BLOBs (max 4MB). XAMPP's default `max_allowed_packet` is 1MB;
`db:init` raises it until MySQL restarts. To make it permanent add
`max_allowed_packet=16M` under `[mysqld]` in `/opt/lampp/etc/my.cnf`.
