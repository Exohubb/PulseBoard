# Changelog

All notable changes to PulseBoard will be documented in this file.

## [0.1.0] - 2026-05-12

### Added

#### Foundation
- Monorepo structure with npm workspaces
- Docker Compose for local development (Redis)
- Environment configuration system
- Shared types and utilities packages
- Root package.json with all scripts

#### Documentation
- README.md with project overview and deployment guide
- BUILD_CONTEXT.md for AI resume/handoff
- UPDATE.md for progress tracking
- CHANGELOG.md for version history

### Planned

#### Backend Features
- Authentication (JWT, password hashing, refresh tokens)
- Multi-workspace architecture
- Service management
- HTTP monitoring
- WebSocket monitoring
- WebSocket security scanner
- Incident management
- Alert channels and policies
- Public status pages
- Audit logging
- Real-time Socket.IO gateway
- Scheduler with Redis lock

#### Frontend Features
- Landing page with product education
- Authentication flows
- Dashboard with live updates
- Service and monitor management
- Incident command center
- Alert configuration
- Public status page generator
- Scanner reports
- Settings and team management
- Onboarding wizard

#### DevOps
- Full Docker Compose setup
- Database migrations (Prisma)
- Seed data for demo
- CI/CD configuration
- Vercel/Railway deployment guides