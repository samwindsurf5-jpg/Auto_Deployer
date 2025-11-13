# AutoDeploy - Automated Deployment Platform

> Deploy from GitHub to Production in 3 Clicks

AutoDeploy is a comprehensive deployment automation platform that intelligently detects your framework, provisions infrastructure, and deploys applications with zero configuration. Built with Next.js 14, NestJS, PostgreSQL, and Redis.

## 🚀 Features

- **🤖 Intelligent Framework Detection** - Automatically detects 50+ frameworks and languages
- **☁️ Multi-Provider Support** - Deploy to Vercel, Render, Railway, Netlify automatically 
- **🗄️ Database Provisioning** - One-click PostgreSQL, MongoDB, Redis setup
- **🔐 Enterprise Security** - OAuth, encryption, audit logging, RBAC
- **📊 Real-time Monitoring** - Live deployment logs, metrics, health checks
- **👥 Team Collaboration** - Organizations, roles, member management
- **🔄 CI/CD Integration** - Automatic deployments on push, PR previews

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │───►│   Backend API   │───►│   Database      │
│   (Next.js 14)  │    │   (NestJS)      │    │   (PostgreSQL)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Provider APIs  │    │  Job Queue      │    │  File Storage   │
│  (GitHub, etc.) │    │  (Redis/Bull)   │    │  (S3/MinIO)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** with App Router
- **TypeScript** with strict mode
- **Tailwind CSS** + shadcn/ui components
- **React Query** for state management
- **Socket.io** for real-time updates

### Backend
- **NestJS** with TypeScript
- **Prisma** ORM with PostgreSQL
- **Redis** for caching and job queues
- **Bull** for background job processing
- **Passport** for authentication
- **Socket.io** for WebSockets

### Infrastructure
- **PostgreSQL 15** for primary database
- **Redis 7** for caching and sessions
- **Docker** for containerization
- **GitHub OAuth** for authentication

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Docker (optional)
- GitHub OAuth App

### Installation

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd autodeploy
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```env
   # Database
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/autodeploy"
   
   # GitHub OAuth (provided)
   GITHUB_CLIENT_ID="Ov23lig6TBXJE57ARFIf"
   GITHUB_CLIENT_SECRET="6eb03676e4ba5f80172bce4443588341d93c443f"
   
   # JWT Secret (change in production)
   JWT_SECRET="your-super-secret-jwt-key-change-in-production"
   
   # Encryption key (32 characters)
   MASTER_ENCRYPTION_KEY="your-master-encryption-key-32-chars"
   ```

4. **Start services with Docker**
   ```bash
   docker-compose up -d postgres redis
   ```

5. **Set up the database**
   ```bash
   cd apps/backend
   npx prisma migrate dev
   npx prisma generate
   ```

6. **Start the development servers**
   ```bash
   # Start both frontend and backend
   npm run dev
   
   # Or start individually:
   # Backend: http://localhost:3001
   cd apps/backend && npm run start:dev
   
   # Frontend: http://localhost:3000  
   cd apps/frontend && npm run dev
   ```

### Using Docker (Alternative)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 📁 Project Structure

```
autodeploy/
┣━━ apps/
┃   ┣━━ backend/           # NestJS API server
┃   ┃   ┣━━ src/
┃   ┃   ┃   ┣━━ auth/      # Authentication module
┃   ┃   ┃   ┣━━ users/     # User management
┃   ┃   ┃   ┣━━ projects/  # Project management
┃   ┃   ┃   ┣━━ deployments/ # Deployment engine
┃   ┃   ┃   ┣━━ providers/ # Cloud provider integrations
┃   ┃   ┃   └━━ common/    # Shared utilities
┃   ┃   ┣━━ prisma/        # Database schema & migrations
┃   ┃   └━━ package.json
┃   ┗━━ frontend/          # Next.js web application
┃       ┣━━ app/           # Next.js 14 app directory
┃       ┣━━ components/    # React components
┃       ┣━━ lib/           # Utility functions
┃       └━━ package.json
┣━━ packages/              # Shared packages (future)
┣━━ docker-compose.yml     # Local development setup
┣━━ turbo.json            # Monorepo configuration
└━━ package.json          # Root package.json
```

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev              # Start all apps in development mode
npm run build           # Build all apps for production
npm run test            # Run all tests
npm run lint            # Lint all packages

# Database
npm run db:generate     # Generate Prisma client
npm run db:migrate      # Run database migrations
npm run db:studio       # Open Prisma Studio

# Docker
npm run docker:build    # Build Docker images
npm run docker:up       # Start with Docker Compose
```

### API Documentation

When running in development mode, API documentation is available at:
- **Swagger UI**: http://localhost:3001/api/docs
- **API Base URL**: http://localhost:3001/api/v1

### Key API Endpoints

```
Authentication:
POST   /api/v1/auth/github/login    # GitHub OAuth login
POST   /api/v1/auth/refresh         # Refresh JWT token
GET    /api/v1/auth/me              # Get current user

Repositories:
GET    /api/v1/repositories         # List user repositories
POST   /api/v1/repositories/:id/analyze # Analyze repository

Projects:
GET    /api/v1/projects             # List projects
POST   /api/v1/projects             # Create project
GET    /api/v1/projects/:id         # Get project details

Deployments:
POST   /api/v1/projects/:id/deployments # Create deployment
GET    /api/v1/deployments/:id     # Get deployment status
WS     /api/v1/deployments/:id/logs # Live deployment logs
```

## 🔐 Security Features

- **OAuth 2.0** authentication with GitHub
- **JWT** tokens with refresh mechanism
- **AES-256-GCM** encryption for sensitive data
- **RBAC** (Role-Based Access Control)
- **Audit logging** for compliance
- **Rate limiting** and request throttling
- **Input validation** and sanitization
- **CORS** and security headers

## 📊 Monitoring & Observability

- **Real-time deployment logs** via WebSockets
- **Performance metrics** and health checks  
- **Error tracking** with detailed stack traces
- **Audit trails** for security compliance
- **Resource usage** monitoring
- **Uptime tracking** for deployed applications

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs.autodeploy.app](https://docs.autodeploy.app)
- **Issues**: [GitHub Issues](https://github.com/autodeploy/autodeploy/issues)
- **Discussions**: [GitHub Discussions](https://github.com/autodeploy/autodeploy/discussions)
- **Email**: support@autodeploy.app

## 🗺️ Roadmap

- [ ] **Phase 1**: Core deployment automation (✅ Complete)
- [ ] **Phase 2**: Advanced provider integrations
- [ ] **Phase 3**: Enterprise features (SSO, advanced RBAC)
- [ ] **Phase 4**: CLI and IDE plugins
- [ ] **Phase 5**: Advanced analytics and cost optimization

---

**Built with ❤️ by the AutoDeploy team**
