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
   \`\`\`

3. **Set up environment variables**
   \`\`\`bash
   cp .env.example .env.local
   \`\`\`
   Fill in your Supabase credentials in `.env.local`

4. **Set up the database**
   
   Run the SQL scripts in order in your Supabase SQL editor:
   \`\`\`bash
   scripts/001_create_admin_users.sql
   scripts/002_create_users.sql
   scripts/003_create_ticket_pools.sql
   scripts/004_create_activity_history.sql
   scripts/005_seed_initial_data.sql
   scripts/006_create_functions.sql
   \`\`\`

5. **Start the development server**
   \`\`\`bash
   npm run dev
   # or
   pnpm dev
   \`\`\`

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Default Credentials

After running the seed script, you can log in with:

**Admin Account:**
- Email: `admin@company.com`
- Password: `admin123`

**Test User Account:**
- Email: `john.doe@company.com`
- Password: `user123`

## Project Structure

\`\`\`
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── admin/             # Admin dashboard
│   └── user/              # User dashboard
├── components/            # Reusable UI components
├── lib/                   # Utility functions and configurations
├── scripts/               # Database setup scripts
└── types/                 # TypeScript type definitions
\`\`\`

## API Endpoints

### Authentication
- `POST /api/auth/admin/login` - Admin login
- `POST /api/auth/user/login` - User login
- `GET /api/auth/admin/users` - Get all users (admin only)
- `POST /api/auth/admin/users` - Create user (admin only)
- `PUT /api/auth/admin/users/[id]` - Update user (admin only)
- `DELETE /api/auth/admin/users/[id]` - Delete user (admin only)

### Tickets
- `POST /api/tickets/generate` - Generate ticket code
- `POST /api/tickets/consume` - Consume ticket code
- `POST /api/tickets/append` - Add tickets to pool
- `POST /api/tickets/clear` - Clear user's tickets
- `GET /api/tickets/pools` - Get pool statistics

### History
- `GET /api/history` - Get activity history
- `GET /api/history/stats` - Get activity statistics

## Database Schema

### Tables
- `admin_users` - Administrator accounts
- `users` - Team member accounts with HSV/OSV types
- `ticket_pools` - Available ticket codes by account type
- `activity_history` - Audit trail of all actions

## Development

### Running Tests
\`\`\`bash
npm run test
# or
pnpm test
\`\`\`

### Building for Production
\`\`\`bash
npm run build
npm start
# or
pnpm build
pnpm start
\`\`\`

## Deployment

This project is optimized for deployment on Vercel with Supabase:

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
