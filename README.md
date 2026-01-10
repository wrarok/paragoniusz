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

### Infrastructure & Deployment
- **[GitHub Actions](https://github.com/features/actions)** - CI/CD pipeline automation
- **[Docker](https://www.docker.com/)** - Application containerization for production

**Recommended Hosting Platforms:**
- **[Cloudflare Pages](https://pages.cloudflare.com/)** ⭐ Primary recommendation - Unlimited bandwidth on free tier, edge computing, native Astro SSR support
- **[Railway](https://railway.app/)** - Container-based alternative with automatic PR environments
- **[Vercel](https://vercel.com/)** - Premium zero-config option (requires paid plan for commercial use)
- **[Fly.io](https://fly.io/)** - Full Linux containers with global deployment
- **[Netlify](https://netlify.com/)** - JAMstack platform with commercial-friendly free tier

See [Hosting Analysis](#-hosting--deployment-strategy) for detailed comparison and recommendations.

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

## ☁️ Cloudflare Pages Deployment

### Environment Variables Configuration

After deploying to Cloudflare Pages, the application requires runtime environment variables to function properly. Unlike local development where variables are read from `.env` at build time, Cloudflare Pages needs variables configured in the dashboard for runtime access.

#### Required Environment Variables

Configure these variables in your Cloudflare Pages project:

1. **Navigate to Cloudflare Dashboard**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - Select **Workers & Pages**
   - Find your project **paragoniusz**
   - Click **Settings** → **Environment Variables**

2. **Add Production Environment Variables**

   | Variable | Value | Description |
   |----------|-------|-------------|
   | `SUPABASE_URL` | `https://your-project.supabase.co` | Supabase project URL |
   | `SUPABASE_ANON_KEY` | `eyJhbG...` | Supabase anon/public key |
   | `OPENROUTER_API_KEY` | `sk-or-v1-...` | OpenRouter API key (optional) |
   | `OPENROUTER_MODEL` | `google/gemini-2.0-flash-exp:free` | AI model for receipt scanning (optional) |
   | `ENV_NAME` | `prod` | Environment name for feature flags |

3. **Get Supabase Credentials**
   - Login to [Supabase Dashboard](https://supabase.com/dashboard)
   - Select your project
   - Go to **Settings** → **API**
   - Copy **Project URL** → `SUPABASE_URL`
   - Copy **anon/public** key → `SUPABASE_ANON_KEY`
   
   ⚠️ **Important**: Never use `service_role` key in production environment variables

4. **Redeploy Application**
   - After adding variables, trigger a redeploy:
   - Go to **Deployments** tab
   - Click **...** on latest deployment
   - Select **Retry deployment**

#### Architecture Notes

The application automatically detects the runtime environment:
- **Locally**: Uses `import.meta.env` from `.env` file
- **Cloudflare Pages**: Uses `context.locals.runtime.env` from dashboard configuration

This ensures backward compatibility with local development while enabling proper authentication flow on Cloudflare Pages.

#### Troubleshooting

**Problem: "Missing Supabase environment variables" error**
- Verify variables are added in Cloudflare Dashboard
- Ensure environment is set to **Production**
- Redeploy the application
- Check deployment logs for errors

**Problem: Redirect loop or authentication not working**
- Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correct
- Check browser console (F12) for error messages
- Ensure Supabase project is accessible from Cloudflare network

**Problem: Local development stopped working**
- Verify `.env` file exists and contains correct variables
- Restart development server: `npm run dev`
- Check that `.env` has both `SUPABASE_URL` and `SUPABASE_ANON_KEY`

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

## 🌐 Hosting & Deployment Strategy

This section provides a comprehensive analysis of hosting platforms suitable for Paragoniusz, considering its evolution from a free side project to a potential commercial startup.

### Framework Requirements

**Astro 5 with Server-Side Rendering (SSR)** is the application's core framework, requiring:
- Node.js runtime environment capable of executing server-side code for each HTTP request
- Dynamic page rendering with middleware support (JWT authentication via Supabase)
- Session and cookie management capabilities
- Real-time database communication
- Either long-running Node.js processes or containerization support

### Recommended Hosting Platforms

#### 🥇 Cloudflare Pages (Score: 9/10) - **Primary Recommendation**

**Why This is Our Top Choice:**
Cloudflare Pages offers the most generous free tier without commercial restrictions, featuring unlimited bandwidth and requests, the fastest global edge network (300+ locations), and excellent Astro SSR support with automatic preview environments.

**Deployment Complexity:** ⭐⭐⭐⭐⭐
- Excellent Astro SSR integration via official adapter
- Automatic deployments from GitHub
- Built-in analytics at no extra cost
- Global edge network ensures fastest TTFB (Time To First Byte)

**Stack Compatibility:** ⭐⭐⭐⭐
- Full Astro SSR support in Cloudflare Workers runtime
- **Consideration:** Workers use V8 isolate (not full Node.js), but most npm packages work fine
- Supabase SDK confirmed compatible with Workers runtime
- Future-proof: Cloudflare D1 (SQLite) and KV storage available as alternatives

**Multi-Environment Support:** ⭐⭐⭐⭐⭐
- Automatic preview deployments for all PRs
- Separate production and preview environments with isolated variables
- Unlimited preview deployments
- Branch-specific deployments

**Pricing & Limitations:**
- **Free Tier:** Unlimited requests, unlimited bandwidth, 500 builds/month
- **Pro ($20/month):** 5,000 builds/month, advanced analytics
- ✅ **No commercial usage restrictions on free tier**
- Serverless execution: 50ms CPU time per request (sufficient for most SSR scenarios)
- **Note:** CPU time ≠ wall time; complex operations may hit limits on free tier
- Automatic scaling with zero additional costs

**Verdict:** Ideal for starting as a free project with seamless transition to commercial use. Unlimited free tier eliminates budget concerns during MVP phase while maintaining production-grade infrastructure.

---

#### 🥈 Railway (Score: 8/10) - **Best Container Alternative**

**Why Consider Railway:**
Railway combines serverless simplicity with Docker flexibility, offering automatic PR environments, intuitive interface, zero runtime restrictions, and predictable usage-based pricing.

**Deployment Complexity:** ⭐⭐⭐⭐⭐
- Automatic Dockerfile detection
- Nixpacks buildpack (deploy without Dockerfile)
- GitHub integration with auto-deployments
- Most intuitive platform among container services

**Stack Compatibility:** ⭐⭐⭐⭐⭐
- Full Node.js environment without restrictions
- Native Docker Compose support (can add Redis, Postgres locally)
- Can host self-managed Supabase in same project (advanced scenario)
- Zero runtime surprises

**Multi-Environment Support:** ⭐⭐⭐⭐⭐
- **Automatic PR environments** (ephemeral, auto-cleanup after merge)
- Dedicated production and staging environments
- Best environment support among container platforms

**Pricing & Limitations:**
- **Hobby (Free):** $5 credit/month (~100 compute hours, 512MB RAM, 1 vCPU)
- **Developer ($5/month):** Additional $5 credit/month, 5GB RAM, priority support
- Free tier suitable for hobby projects (~15-20 days uptime)
- ⚠️ Free tier insufficient for 24/7 production traffic
- Usage-based: $0.000231/GB RAM/minute (~$10/GB RAM/month)
- ✅ No commercial usage restrictions

**Verdict:** Best choice for teams wanting full control without complexity. Free tier works for development; production requires ~$10-20/month for small app.

---

#### 🥉 Vercel (Score: 8/10) - **Premium Zero-Config Option**

**Why Consider Vercel:**
Vercel provides the simplest Astro deployment with automatic configuration, excellent developer tools, and reliable infrastructure, but requires paid plan for commercial use.

**Deployment Complexity:** ⭐⭐⭐⭐⭐
- Automatic Astro SSR detection and configuration
- Zero-config deployment from GitHub
- Automatic HTTPS and preview domains for PRs
- **Trade-off:** Vendor lock-in with Vercel Edge Runtime

**Stack Compatibility:** ⭐⭐⭐⭐
- Full Astro 5 SSR and middleware support
- Supabase compatible via environment variables
- **Limitation:** Edge Runtime lacks full Node.js API (may affect some libraries)
- Supabase Edge Functions run independently (Deno), no conflicts

**Multi-Environment Support:** ⭐⭐⭐⭐⭐
- Automatic preview environments for every PR
- Dedicated production, preview, and development environments
- Easy environment variable management per environment

**Pricing & Limitations:**
- **Hobby (Free):** 100GB bandwidth/month, 6,000 build minutes/month
- **Pro ($20/month):** 1TB bandwidth, unlimited builds
- ⚠️ **Free tier prohibits commercial use** - Pro plan required for startup
- Serverless execution time: 10s (Hobby), 60s (Pro)
- Automatic scaling included in plan price

**Verdict:** Premium option for teams with budget for $20/month from start. Excellent DX (developer experience) but commercial restriction makes free tier unsuitable for MVP-to-startup transition.

---

#### Fly.io (Score: 7.5/10) - **Maximum Flexibility**

**Deployment Complexity:** ⭐⭐⭐
- Requires Dockerfile and `fly.toml` configuration
- Powerful CLI with steep learning curve
- More configuration work than serverless platforms
- Full control over Node.js environment

**Stack Compatibility:** ⭐⭐⭐⭐⭐
- Full Node.js in Linux containers (100% compatibility)
- No runtime restrictions
- Can run Supabase locally in same region (ultra-low latency)
- True container environment

**Multi-Environment Support:** ⭐⭐⭐
- Manual configuration of multiple apps required
- Possible via Fly.io organizations
- ⚠️ No native PR preview environments
- **Workaround:** GitHub Actions + Fly CLI for temporary apps

**Pricing & Limitations:**
- **Hobby (Free):** $5 credit/month (~1 shared-cpu VM 24/7 + 3GB storage)
- **Pay-as-you-go:** ~$6/month for small VM
- ⚠️ Free tier insufficient for 24/7 production
- Predictable costs (VM hours, not requests)
- Excellent pricing for larger apps ($0.01/GB RAM/month)
- ✅ No commercial restrictions

**Verdict:** Best for DevOps-experienced teams needing specific configurations. Higher complexity, no free 24/7 production, but maximum control.

---

#### Netlify (Score: 7/10) - **JAMstack Veteran**

**Deployment Complexity:** ⭐⭐⭐⭐
- Good Astro SSR support via adapter
- Automatic builds from GitHub
- **Requires** `@astrojs/netlify` adapter configuration
- Build plugin may conflict with Astro pipeline

**Stack Compatibility:** ⭐⭐⭐⭐
- Adapter supports SSR, routing may need extra config
- Netlify Functions (AWS Lambda) vs Edge Functions - choose runtime carefully
- **Issue:** Lambda cold starts (~1-2s), Edge Functions have limitations
- Supabase works without issues

**Multi-Environment Support:** ⭐⭐⭐⭐⭐
- Branch deploys for all branches
- Deploy previews for PRs
- Context-specific environment variables
- Easy rollbacks

**Pricing & Limitations:**
- **Starter (Free):** 100GB bandwidth, 300 build minutes/month
- **Pro ($19/month):** 1TB bandwidth, unlimited builds
- ✅ **Commercial use allowed on free tier** (within limits)
- Function execution time: 10s (Starter), 26s (Pro)
- Additional bandwidth: $55/100GB

**Verdict:** Mature platform with commercial-friendly free tier, but Lambda cold starts and execution time limits make it suboptimal for Astro SSR compared to edge-native alternatives.

---

### Platform Comparison Summary

| Platform | Score | Free Commercial Use | Bandwidth (Free) | Best For | Monthly Cost (Startup) |
|----------|-------|---------------------|------------------|----------|------------------------|
| **Cloudflare Pages** | 9/10 | ✅ Yes | Unlimited | MVP to startup transition | $0 (free tier sufficient) |
| **Railway** | 8/10 | ✅ Yes | Usage-based | Full control + simplicity | $10-20 |
| **Vercel** | 8/10 | ❌ No | 100GB | Premium DX with budget | $20 (required) |
| **Fly.io** | 7.5/10 | ✅ Yes | Usage-based | DevOps experts | $6-12 |
| **Netlify** | 7/10 | ✅ Yes (limited) | 100GB | Existing Netlify users | $0-19 |

### Final Recommendation

**For Paragoniusz specifically:**

1. **Start with Cloudflare Pages** for zero-cost MVP with commercial potential
   - Unlimited bandwidth eliminates cost surprises
   - Global edge network ensures best performance
   - No migration needed when transitioning to startup

2. **Railway as backup** if Cloudflare Workers runtime causes compatibility issues
   - Full Node.js compatibility
   - Simple migration path from development to production
   - Expect $10-20/month for production traffic

3. **Avoid Netlify** for Astro SSR (better alternatives exist)

4. **Consider Vercel only if** budget allows $20/month from day one

**Migration Strategy:** Start with Cloudflare Pages. If runtime limitations appear (rare), containerize with Docker and move to Railway. This approach minimizes initial costs while maintaining flexibility.

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
