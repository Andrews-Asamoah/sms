# 🏫 School Management System (SMS)

A comprehensive, multi-tenant School Management System built with modern web technologies. Manage multiple schools from a single platform with role-based access control.

[![Next.js](https://img.shields.io/badge/Next.js-16.1.1-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-Latest-2D3748)](https://www.prisma.io/)
[![BetterAuth](https://img.shields.io/badge/BetterAuth-1.4.9-purple)](https://www.better-auth.com/)

---

## ✨ Features

### 🏢 Multi-Tenancy

- Multiple schools on single platform
- Subdomain-based routing (e.g., `school1.yourdomain.com`)
- Complete data isolation between schools
- System admin dashboard for managing all schools

### 👥 Role-Based Access Control

- **System Admin**: Manage all schools, billing, and analytics
- **School Admin**: Manage school operations (no finance access)
- **Accountant**: Full finance management (fees, payments, payroll)
- **Teacher**: Classes, attendance, grading, assignments
- **Parent**: View children's grades, attendance, fees, communications
- **Student**: View classes, assignments, grades, timetable

### 📚 Core Modules

- **Student Management**: Enrollment, profiles, bulk upload
- **Teacher Management**: Assignment, schedules, performance
- **Class Management**: Organization, student assignment
- **Attendance System**: Daily tracking, reports, notifications
- **Grading System**: Flexible grading scales, report cards, transcripts
- **Finance Module**: Fee structure, payments, expenses, payroll
- **Assignment System**: Create, submit, grade assignments
- **Timetable Management**: Schedule creation and management
- **Communications**: Announcements, messaging, notifications

### 🔧 Additional Features

- **Library Management**: Book catalog, borrowing, fines
- **Transport Management**: Routes, vehicles, assignments
- **Hostel Management**: Room allocation, visitor logs
- **Inventory Management**: Asset tracking, stock management

---

## 🛠️ Tech Stack

### Frontend

- **Framework**: Next.js 16.1.1 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **State Management**: React Hooks + Server Components
- **Forms**: React Hook Form + Zod validation

### Backend

- **API**: Next.js API Routes + Server Actions
- **Authentication**: BetterAuth 1.4.9
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Email**: React Email (for templates)

### DevOps

- **Hosting**: Vercel / Railway / AWS
- **Database Hosting**: Neon / Supabase / Railway
- **Domain Management**: Subdomain routing
- **Monitoring**: Sentry (error tracking)

---

## 📁 Project Structure

```
project-root/
├── app/
│   ├── (system)/          # System admin portal
│   ├── (auth)/            # Authentication pages
│   └── (school)/          # School portals (tenant-scoped)
│       └── [schoolSlug]/  # Dynamic school routes
│           ├── admin/     # School administrator
│           ├── accountant/# Finance management
│           ├── teacher/   # Teacher portal
│           ├── parent/    # Parent portal
│           └── student/   # Student portal
│
├── features/              # Domain business logic
│   ├── students/
│   ├── teachers/
│   ├── attendance/
│   ├── grades/
│   ├── finance/
│   └── ...
│
├── components/
│   ├── ui/               # shadcn/ui components
│   ├── layout/           # Navigation, sidebar
│   ├── auth/             # Auth components
│   └── shared/           # Reusable components
│
├── lib/
│   ├── auth/             # Authentication utilities
│   ├── tenant/           # Multi-tenant logic
│   ├── permissions/      # RBAC system
│   └── db/               # Database client
│
└── prisma/
    ├── schema.prisma     # Database schema
    └── migrations/       # Database migrations
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or higher
- PostgreSQL database
- pnpm/npm/yarn package manager

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/sms.git
   cd sms
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   # or
   npm install
   ```

3. **Setup environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` and add:

   ```env
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/sms"

   # BetterAuth
   BETTER_AUTH_SECRET="your-secret-key-here"
   BETTER_AUTH_URL="http://localhost:3000"

   # Email (Optional)
   SMTP_HOST="smtp.gmail.com"
   SMTP_PORT="587"
   SMTP_USER="your-email@gmail.com"
   SMTP_PASSWORD="your-app-password"

   # App
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   ```

4. **Setup database**

   ```bash
   # Generate Prisma client
   pnpm prisma generate

   # Run migrations
   pnpm prisma migrate dev

   # Seed database (optional)
   pnpm prisma db seed
   ```

5. **Run development server**

   ```bash
   pnpm dev
   ```

6. **Open your browser**
   - System Admin: `http://admin.localhost:3000`
   - School Portal: `http://school1.localhost:3000`

### Local Development with Subdomains

To test subdomain routing locally:

1. **Edit your hosts file** (`/etc/hosts` on Mac/Linux, `C:\Windows\System32\drivers\etc\hosts` on Windows):

   ```
   127.0.0.1  admin.localhost
   127.0.0.1  school1.localhost
   127.0.0.1  school2.localhost
   ```

2. **Access via subdomains**:
   - `http://admin.localhost:3000` - System admin
   - `http://school1.localhost:3000` - School 1 portal

---

## 📚 Documentation

### Key Concepts

#### Multi-Tenancy

Each school operates as an isolated tenant with:

- Unique subdomain (e.g., `greenwood.yourdomain.com`)
- Separate user base
- Isolated data
- Custom branding

#### Role Switching

Users can have multiple roles (e.g., Teacher + Parent):

- Active role stored in session
- Switch roles via `/[schoolSlug]/select-role`
- UI adapts based on active role

#### Permission System

Capability-based permissions (not role-based):

- Roles → Capabilities mapping
- Check capabilities, not roles
- Easy to add new permissions
- Granular access control

### API Routes

All API routes are domain-based:

```
/api/students          # Student operations
/api/attendance        # Attendance management
/api/grades            # Grade operations
/api/finance/fees      # Fee management
```

### Server Actions

For mutations, prefer server actions:

```typescript
// features/students/server/create-student.ts
"use server";

export async function createStudent(data: StudentFormData) {
  // Validation, permission checks, database operations
}
```

---

## 🧪 Testing

### Run Tests

```bash
pnpm test
```

### Run E2E Tests

```bash
pnpm test:e2e
```

### Check Types

```bash
pnpm type-check
```

---

## 📦 Database

### Run Migrations

```bash
pnpm prisma migrate dev
```

### Reset Database

```bash
pnpm prisma migrate reset
```

### Open Prisma Studio

```bash
pnpm prisma studio
```

### Seed Database

```bash
pnpm prisma db seed
```

---

## 🚢 Deployment

### Environment Variables

Ensure all production environment variables are set:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `SMTP_*` (for emails)

### Deploy to Vercel

1. **Connect repository** to Vercel
2. **Configure environment variables**
3. **Setup custom domain** with wildcard subdomain (`*.yourdomain.com`)
4. **Deploy**

### Database Migration in Production

```bash
pnpm prisma migrate deploy
```

---

## 📖 Development Roadmap

See [ROADMAP.md](./ROADMAP.md) for detailed development phases and timelines.

Current Status: **Phase 0 - Foundation Setup**

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [Prisma](https://www.prisma.io/) - Database ORM
- [BetterAuth](https://www.better-auth.com/) - Authentication
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Tailwind CSS](https://tailwindcss.com/) - Styling

---

## 📧 Contact

**Project Maintainer**: Your Name  
**Email**: your.email@example.com  
**GitHub**: [@yourusername](https://github.com/yourusername)

---

## 📊 Project Stats

- **Lines of Code**: TBD
- **Components**: TBD
- **API Routes**: TBD
- **Database Models**: 25+
- **Supported Roles**: 6

---

**Built with ❤️ for better school management**
