    ╔════════════════════════════════╗
    ║      PARAGONIUSZ RECEIPT       ║
    ║   Smart Expense Tracking App   ║
    ╠════════════════════════════════╣
    ║ AI-Powered Receipt Scanner     ║
    ║ Mobile-First Design            ║
    ║ Real-Time Budget Insights      ║
    ╠════════════════════════════════╣
    ║ TOTAL:        Your Finances    ║
    ║               Under Control    ║
    ╚════════════════════════════════╝

````

# Paragoniusz

![CI/CD Pipeline](https://github.com/yourusername/paragoniusz/actions/workflows/master.yaml/badge.svg)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-22.14.0-green.svg)](.nvmrc)

**Paragoniusz** is a mobile-first responsive web application designed to simplify personal expense tracking. The app's standout feature is an AI-powered receipt scanner that automatically reads, categorizes, and aggregates expenses from receipt photos, eliminating the tedious manual data entry that often leads to abandoned budgeting efforts.

## 🎯 Problem Statement

Traditional expense tracking is time-consuming and monotonous. Users want to control their finances and understand their spending patterns, but manually entering every receipt becomes an overwhelming chore. Paragoniusz solves this by automating the data entry process while maintaining full control and transparency.

## ✨ Key Features

### Core Functionality
- **AI Receipt Scanner**: Upload receipt photos and let AI automatically extract items, suggest categories, and aggregate amounts
- **Manual Expense Entry**: Quick and easy manual entry with amount, category, and date
- **Smart Dashboard**: Monthly expense summary with pie chart visualization (top 5 categories + "Other")
- **Expense Management**: Edit and delete expenses with full CRUD operations
- **Secure Authentication**: Email/password registration and login with session management

### User Experience
- **Mobile-First Design**: Optimized for smartphones with responsive desktop support
- **Real-Time Updates**: Instant dashboard refresh after expense modifications
- **Error Handling**: Clear, user-friendly error messages for all operations
- **Privacy-Focused**: Receipt images are processed and immediately deleted (not stored)

### MVP Scope
The current MVP intentionally excludes:
- Password recovery functionality
- Social features (shared budgets, groups)
- Advanced budgeting tools (category limits)
- Custom date range filtering
- In-app camera integration
- User-defined custom categories
- Multi-step onboarding flow

## 🛠️ Tech Stack

### Frontend
- **[Astro 5](https://astro.build/)** - Ultra-fast static site generation with partial hydration
- **[React 19](https://react.dev/)** - Interactive UI components ("islands architecture")
- **[TypeScript 5](https://www.typescriptlang.org/)** - Type-safe development
- **[Tailwind CSS 4](https://tailwindcss.com/)** - Utility-first styling framework
- **[Shadcn/ui](https://ui.shadcn.com/)** - Accessible, customizable component library

### Backend (BaaS)
- **[Supabase](https://supabase.com/)** - Complete backend solution
  - **Authentication**: User management and session handling
  - **PostgreSQL Database**: Expense and category data with Row Level Security (RLS)
  - **Storage**: Temporary receipt image storage
  - **Edge Functions**: Serverless functions (Deno runtime)

### AI Integration
- **[OpenRouter.ai](https://openrouter.ai/)** - LLM gateway providing access to multiple AI models (OpenAI, Anthropic, Google) for optimal receipt processing

### Infrastructure
- **[GitHub Actions](https://github.com/features/actions)** - CI/CD pipeline
- **[Docker](https://www.docker.com/)** - Application containerization
- **[DigitalOcean](https://www.digitalocean.com/)** - Production hosting

### Testing
- **[Vitest](https://vitest.dev/)** - Unit testing framework
- **[React Testing Library](https://testing-library.com/react)** - Component testing
- **[Playwright](https://playwright.dev/)** - End-to-end testing across browsers
- **[Deno Test](https://deno.land/manual/testing)** - Edge Functions testing
- **[MSW](https://mswjs.io/)** - API mocking for tests

## 🚀 Getting Started Locally

### Prerequisites

- **Node.js**: Version 22.14.0 (specified in `.nvmrc`)
  ```bash
  # Using nvm (recommended)
  nvm use

  # Or install specific version
  nvm install 22.14.0
````

- **Package Manager**: npm (comes with Node.js) or pnpm
- **Supabase Account**: [Sign up for free](https://supabase.com/)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/paragoniusz.git
   cd paragoniusz
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Environment Setup**

   Create a `.env` file in the root directory (use `.env.example` as template):

   ```env
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_KEY=your_supabase_anon_key
   OPENROUTER_API_KEY=your_openrouter_api_key
   ```

   **Getting Supabase Credentials:**
   - Create a new project at [supabase.com](https://supabase.com/)
   - Navigate to Project Settings → API
   - Copy the `Project URL` and `anon/public` key

   **Getting OpenRouter API Key:**
   - Sign up at [openrouter.ai](https://openrouter.ai/)
   - Navigate to API Keys section
   - Generate a new API key

4. **Database Setup**

   Run Supabase migrations (if available):

   ```bash
   # Initialize Supabase locally (optional)
   npx supabase init

   # Link to your project
   npx supabase link --project-ref your-project-ref

   # Apply migrations
   npx supabase db push
   ```

5. **Start Development Server**

   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:4321`

## 📜 Available Scripts

### Development

| Script             | Description                              |
| ------------------ | ---------------------------------------- |
| `npm run dev`      | Start development server with hot reload |
| `npm run dev:e2e`  | Start development server in test mode    |
| `npm run build`    | Build production-ready static site       |
| `npm run preview`  | Preview production build locally         |
| `npm run astro`    | Run Astro CLI commands                   |
| `npm run lint`     | Check code for linting errors            |
| `npm run lint:fix` | Automatically fix linting errors         |
| `npm run format`   | Format code with Prettier                |

### Testing

| Script                           | Description                              |
| -------------------------------- | ---------------------------------------- |
| `npm run test`                   | Run tests in watch mode                  |
| `npm run test:unit`              | Run unit tests once                      |
| `npm run test:watch`             | Run unit tests in watch mode             |
| `npm run test:ui`                | Open Vitest UI for unit tests            |
| `npm run test:coverage`          | Generate unit test coverage report       |
| `npm run test:e2e`               | Run end-to-end tests with Playwright     |
| `npm run test:e2e:ui`            | Run E2E tests in interactive UI mode     |
| `npm run test:e2e:headed`        | Run E2E tests in headed browser mode     |
| `npm run test:e2e:mobile`        | Run E2E tests on mobile emulator         |
| `npm run test:e2e:critical`      | Run critical E2E scenarios only          |
| `npm run test:all`               | Run all tests (unit + e2e)               |

### Pre-commit Hooks

The project uses **Husky** and **lint-staged** to ensure code quality:

- TypeScript/TSX/Astro files: Auto-fixed with ESLint
- JSON/CSS/Markdown files: Auto-formatted with Prettier

## 🧪 Testing Strategy

The project follows a two-tier testing approach:

### Unit Tests (80% coverage target)

- **Framework**: Vitest with Happy-DOM
- **Scope**: Business logic, services, utilities, components, API endpoints
- **Location**: `test/unit/**/*.test.ts`
- **Run**: `npm run test:unit`

### E2E Tests (20% coverage target)

- **Framework**: Playwright
- **Scope**: Complete user flows, cross-browser testing, database integration
- **Location**: `e2e/**/*.spec.ts`
- **Run**: `npm run test:e2e`

**Quality Metrics:**

- Overall coverage: 70% (lines, functions, branches, statements)
- Critical paths: 100% (validation, security, financial data)
- Flaky tests: <5%
- AI accuracy: >95% on test receipts
- User corrections: <20%

See [Testing Documentation](TESTING.md) for detailed guidelines.

## 🚀 CI/CD Pipeline

The project uses GitHub Actions for continuous integration and deployment:

### Pipeline Jobs

1. **Lint & Type Check** (~2 min) - Code quality verification
2. **Unit Tests** (~3 min) - Fast business logic and API tests
3. **Production Build** (~4 min) - Build verification

### Triggers

- ✅ Push to `master`/`main` branch
- ✅ Pull requests to `master`/`main`
- ✅ Manual workflow dispatch

### Status & Artifacts

- Pipeline duration: ~6-7 minutes
- Coverage reports retained for 7 days
- Build artifacts available for deployment

See [CI/CD Documentation](.ai/ci-cd-setup.md) for detailed information.

## 📋 Project Scope

### MVP Features (Current Development)

#### Authentication & Account Management

- User registration with email and password
- Secure login with "Remember me" option
- Session management and logout
- Password change functionality
- Account deletion with data removal

#### Dashboard

- Monthly expense summary (current month)
- Pie chart visualization (top 5 categories + "Other")
- Chronological list of recent expenses
- Empty state for new users

#### Expense Management

- Manual expense entry (amount, category, date)
- Edit existing expenses
- Delete expenses with confirmation
- Predefined, server-managed categories

#### AI Receipt Processing

- Upload receipt photos from device gallery
- Automatic item recognition and categorization
- Category-based expense aggregation
- User verification and correction before saving
- 20-second processing timeout
- Privacy consent on first use
- Immediate image deletion after processing

### Success Metrics

1. **Functional Goal**: 100% of core user paths fully functional and tested
2. **Technical Goal**: <20% correction rate for AI-suggested fields on typical grocery receipts
3. **Adoption Goal**: >40% of expenses added via AI scanner within 3 months post-launch
4. **Timeline Goal**: MVP delivery within 6 weeks from development start

## 📊 Project Status

**Current Phase**: MVP Development

**Timeline**: 6-week development cycle

**Architecture**: JAMstack with serverless elements

**Key Milestones**:

- ✅ Project setup and tech stack configuration
- 🔄 Authentication system implementation
- 🔄 Dashboard and expense management
- ⏳ AI receipt processing integration
- ⏳ Testing and optimization
- ⏳ Production deployment

## 📄 License

This project is currently under development. License information will be added upon initial release.

---

**Note**: This project is built from the `10x-astro-starter` template and is being actively developed as an MVP. Contributions, issues, and feature requests are welcome as the project evolves.

## 🔗 Related Documentation

### Project Documentation

- [Product Requirements Document](.ai/project-prd.md) - Detailed feature specifications and user stories
- [Technical Stack Document](.ai/tech-stack.md) - In-depth architecture and technology choices
- [CI/CD Setup](.ai/ci-cd-setup.md) - Pipeline configuration and workflows
- [Testing Guide](TESTING.md) - Testing strategy and best practices

### External Resources

- [Astro Documentation](https://docs.astro.build/)
- [Supabase Documentation](https://supabase.com/docs)
- [React Documentation](https://react.dev/)
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
