jasne ze wygeneruje ci opis twojej aplikacji
"
# RevTrust

RevTrust is a modern review management dashboard built with Next.js, Prisma, and Supabase. The application allows users to collect, store, and review feedback from different sources in one place, while keeping authentication and secure access flow in a clean, scalable structure.

## Overview

This project is designed for managing customer reviews and reputation signals across different channels such as:

- Google reviews
- Trustpilot
- contact form submissions
- manual review entries

The goal is to help teams centralize review data, monitor ratings, and organize customer feedback in a clear dashboard experience.

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Prisma ORM
- PostgreSQL
- Supabase Authentication
- Tailwind CSS

## Project Structure

```bash
revtrust/
├── prisma/
│   └── schema.prisma
├── public/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── reviews/
│   │   │       └── route.ts
│   │   ├── dashboard/
│   │   ├── login/
│   │   ├── register/
│   │   └── page.tsx
│   ├── actions.ts
│   ├── lib/
│   │   ├── prisma.ts
│   │   └── supabase.ts
│   └── generated/
│       └── prisma/
├── package.json
├── prisma.config.ts
├── tsconfig.json
├── next.config.ts
└── README.md
```

## Features

- secure authentication via Supabase
- review creation with access token validation
- Prisma-powered database layer
- PostgreSQL storage for users and reviews
- dashboard overview with lists and summary metrics
- API routes for review CRUD operations
- responsive UI for dashboard views

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env.local` file in the project root and add your values:

```bash
DATABASE_URL=your_postgresql_connection_string
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 3. Generate Prisma client

```bash
npx prisma generate
```

### 4. Run the app

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Database

The project uses Prisma with PostgreSQL. The database schema currently includes:

- `User`
- `Review`

The Prisma schema is located in:

- [prisma/schema.prisma](prisma/schema.prisma)

## API

The app exposes review endpoints under the API route structure.

Example:

- `GET /api/reviews` — fetch saved reviews
- `POST /api/reviews` — create a new review

## Dashboard

The dashboard provides a central place to monitor review activity, view existing records, and manage incoming public feedback.

## Why this project matters

RevTrust combines product thinking, operational clarity, and technically solid backend architecture. It is a practical example of a modern full-stack application built to support customer trust, reputation monitoring, and review-driven business decisions.

> **Engineering Impact:** This project serves as a comprehensive demonstration of production-ready architecture, strong TypeScript typing, and clean state management. It showcases a **strong fit for modern full-stack development roles**, emphasizing scalability, security best practices, and maintainable code patterns.

---


"
Taki opis pasuje?