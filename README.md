# Ticket Management System

A full-stack Next.js application with Supabase backend for managing ticket pools with admin and user roles.

## Features

- **Dual Authentication**: Separate login for administrators and team members
- **User Management**: Admin can create, edit, and delete user accounts
- **Ticket Pool Management**: HSV and OSV ticket pools with automatic assignment
- **Activity History**: Complete audit trail of all user actions
- **Real-time Updates**: Live updates using Supabase real-time features

## Tech Stack

- **Frontend**: Next.js 14, React 19, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Authentication, Real-time)
- **UI Components**: Radix UI, shadcn/ui
- **Styling**: Tailwind CSS with custom theme

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or pnpm
- Supabase account

### Installation

1. **Clone the repository**
   \`\`\`bash
   git clone <your-repo-url>
   cd ticket-management-system
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   # or
   pnpm install

Create a `.env` file at the project root (same level as `package.json`):

```
MONGODB_URI=mongodb://127.0.0.1:27017/ekcode
# Optional
# MONGODB_DB=ekcode
```

### Development

In one terminal, start the API server:

```bash
pnpm dev:server
```

In another terminal, start the Vite dev server (frontend):

```bash
pnpm dev
```

- Frontend: http://localhost:8080
- API: http://localhost:3001
- Vite proxy forwards calls from `/api/*` to the API server.

### Build & Production

```bash
pnpm build
pnpm start
```

## Project Structure

```
client/                   # React SPA frontend
  pages/                  # Route components
  components/             # UI components
  global.css              # Tailwind styles
server/                   # Express API backend
  index.ts                # Express app + routes registration
  dev.ts                  # Dev entry (PORT 3001)
  db.ts                   # Mongoose connection
  models/                 # Mongoose models (User, Ticket)
  routes/                 # API handlers (users, tickets-db, demo, tickets)
shared/                   # Shared types across client & server
  api.ts
```

## API Endpoints

### Users
- `GET /api/users`
- `POST /api/users` — body: `{ teamName, email, password, type: "HSV" | "OSV" }`
- `PUT /api/users/:id` — body: partial update `{ teamName?, email?, password?, type? }`
- `DELETE /api/users/:id`
- `POST /api/admin/login` — body: `{ email, password }`

### Tickets (MongoDB-backed)
- `GET /api/db/tickets/available`
  - Response: `{ available: string[], counts: { HSV: number, OSV: number, Common: number } }`
- `POST /api/db/tickets/import`
  - Body: `{ items: [{ code: string, pool: "HSV" | "OSV" | "Common" }, ...] }`
  - Response: `{ inserted: number }`
- `POST /api/db/tickets/delete`
  - Body: `{ codes: string[] }`
  - Response: `{ deleted: number }`
- `POST /api/db/tickets/consume`
  - Body: `{ code: string, userId?: string }`
  - Response: `{ removed: boolean, availableCount: number, reason?: string }`
- `POST /api/db/tickets/append`
  - Body: `{ code: string }`
  - Response: `{ added: boolean, availableCount: number, reason?: string }`
- `POST /api/db/tickets/next`
  - Body: `{ userType: "HSV" | "OSV" | "Common", userId?: string }`
  - Response: `{ code: string, availableCount: number }`

### Legacy (in-memory demo)
- `GET /api/ping`
- `GET /api/demo`
- `GET /api/tickets/generate`
- `POST /api/tickets/consume`
- `POST /api/tickets/append`
- `GET /api/tickets/available`

## Notes

- The frontend currently uses localStorage for some flows. You can migrate UI calls to the MongoDB-backed endpoints above to make all data persistent and multi-user safe.
- The Vite dev proxy is configured in `vite.config.ts`.

## Scripts

```bash
pnpm dev        # Start Vite dev server (frontend)
pnpm dev:server # Start Express API server on :3001
pnpm build      # Build client and server
pnpm start      # Start production server
pnpm typecheck  # TypeScript validation
pnpm test       # Vitest
```

## License

MIT

This project is optimized for deployment on Vercel with MongoDB:

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add your environment variables in Vercel dashboard
4. Deploy!

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
