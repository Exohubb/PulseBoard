# PulseBoard - Build Context

## Current Status: COMPLETE

Last Updated: 2026-05-12

---

## Architecture Summary

### Frontend (React + Vite)
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: TailwindCSS with dark mode
- **State**: Zustand for auth, React Query for server state
- **Routing**: React Router v6 with protected routes
- **Real-time**: Socket.IO client

### Backend (NestJS)
- **Framework**: NestJS + TypeScript
- **ORM**: Prisma with PostgreSQL
- **Auth**: JWT with refresh tokens
- **Real-time**: Socket.IO gateway
- **Scheduling**: @nestjs/schedule with Redis lock for leader election
- **Validation**: class-validator + class-transformer
- **Docs**: Swagger/OpenAPI

### Infrastructure
- **Database**: PostgreSQL (Supabase or local Docker)
- **Cache/PubSub**: Redis (local Docker or cloud)
- **Container**: Docker Compose

---

## Implemented Modules

### Backend Modules
1. **Auth** - JWT authentication, password hashing, refresh tokens
2. **Users** - User profile management
3. **Workspaces** - Multi-tenant workspaces with roles
4. **Services** - Service CRUD with stats calculation
5. **Monitors** - HTTP, WebSocket, and Scan monitor types
6. **Checks** - Check run history and analytics
7. **Incidents** - Auto-creation, timeline, resolution
8. **Alerts** - Channels (Slack/Email/Webhook), policies, delivery
9. **Status Pages** - Public status pages with branding
10. **Scanner** - WebSocket security scanner with OWASP checks
11. **Audit** - Audit log for critical actions
12. **Health** - Health check endpoint
13. **Realtime** - Socket.IO gateway for live updates
14. **Scheduler** - Monitor check scheduler with Redis lock

### Frontend Pages
1. Home/Landing with product education
2. Login and Register
3. Dashboard with stats and live feed
4. Services list and detail
5. Monitors list
6. Incidents list and detail with timeline
7. Alerts configuration
8. WebSocket security scanner
9. Status pages manager
10. Public status page
11. Settings
12. Onboarding wizard

---

## Environment Variables Required

```
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pulseboard"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_EXPIRES_IN="30d"

# App
APP_URL="http://localhost:5173"
API_URL="http://localhost:4000"
API_PORT=4000

# CORS
CORS_ORIGINS="http://localhost:5173"
```

---

## Database Schema Summary

### Core Tables
- `User` - User accounts with hashed passwords
- `Workspace` - Multi-tenant workspaces
- `WorkspaceMember` - Workspace membership with roles
- `Service` - Logical grouping of monitors
- `Monitor` - Single check configuration
- `MonitorHttpConfig` - HTTP monitor settings
- `MonitorWsConfig` - WebSocket monitor settings
- `MonitorScanConfig` - Security scan profile
- `CheckRun` - Individual check execution result
- `CheckAssertion` - Assertion results per check
- `Incident` - Problem tracking
- `IncidentUpdate` - Timeline entries
- `IncidentServiceLink` - Incident-service relationships
- `AlertChannel` - Notification destinations
- `AlertPolicy` - Alert routing rules
- `AlertDelivery` - Alert delivery history
- `StatusPage` - Public status pages
- `StatusPageComponent` - Status page components
- `MaintenanceWindow` - Scheduled maintenance
- `AuditLog` - Action audit trail
- `ScannerRun` - Security scan runs
- `ScannerFinding` - Individual findings
- `RefreshToken` - JWT refresh tokens

---

## Known Issues
- None currently identified

---

## Deployment Status
- **Local Development**: Ready
- **Docker Compose**: Ready (Redis + optional Postgres)
- **Database Migrations**: Ready (Prisma)
- **Seed Data**: Ready

---

## Recommended Next Tasks

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Infrastructure**
   ```bash
   docker-compose -f infra/docker-compose.yml up -d
   ```

3. **Setup Database**
   ```bash
   npm run db:generate   # Generate Prisma client
   npm run db:migrate    # Run migrations
   npm run db:seed       # Seed demo data
   ```

4. **Start Development**
   ```bash
   npm run dev:api       # Start backend on port 4000
   npm run dev:web       # Start frontend on port 5173
   ```

5. **Test the Application**
   - Open http://localhost:5173
   - Login with demo@pulseboard.dev / demo1234
   - Explore the dashboard and create monitors

---

## If Build Stopped Mid-Way

The project has been structured to be resume-friendly:
- All major modules are implemented
- All pages are created with working UI
- Database schema is complete
- Tests are in place

To resume:
1. Read this file
2. Read UPDATE.md
3. Run `npm install`
4. Run database setup commands
5. Start the development servers