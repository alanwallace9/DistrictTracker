# DistrictTracker Monorepo - Getting Started

## Current Status

### ✅ Completed Tasks

#### 1. Monorepo Migration
- Moved TrespassTracker into `modules/TrespassTracker/`
- Moved shared code to root level:
  - `app/` - Next.js app router pages
  - `components/` - Shared UI components (organized by module)
  - `contexts/` - React contexts
  - `hooks/` - Custom React hooks
  - `lib/` - Utility libraries
- Cleaned up git artifacts from TrespassTracker module:
  - Removed `.git/` folder
  - Removed `.gitignore` (using root-level)
  - Removed `.vercel/` folder
  - Removed `.claudeignore` (using root-level)
  - Removed `tsconfig.tsbuildinfo` build artifact
- Moved config files to root:
  - `components.json` (shadcn/ui config)
  - `vercel.json` (cron job for demo reset)
  - `.eslintrc.json` (ESLint config)
  - `.npmrc` (NPM config)

#### 2. Git Repository
- **Repository:** https://github.com/alanwallace9/DistrictTracker
- **Branches:**
  - `main` - Production branch
  - `staging` - Development/staging branch
- **Status:** Both branches active and tracking remotes

#### 3. MCP Servers Configured
> **Note:** Restart Claude Code session to activate these!

- **GitHub MCP** - Repository management, PRs, issues
- **Supabase MCP** - Database operations
- **Vercel MCP** - Deployment management

**Configuration location:** `~/.claude.json`

#### 4. Vercel Deployment ✅ COMPLETE
- **Status:** ✅ Live and deployed
- **Connected Repo:** alanwallace9/DistrictTracker
- **Production Branch:** `main` → districttracker.com
- **Preview Branches:** `staging` and feature branches auto-deploy
- **Environment Variables:** All configured (Supabase, Clerk, Redis, etc.)
- **Build Status:** Passing ✅
- **Auto-Deploy:** Every push to GitHub triggers deployment

#### 5. Monorepo Build Configuration
- Fixed 20+ component import paths for monorepo structure:
  - TrespassTracker components: `@/components/trespass/*`
  - Shared feedback components: `@/components/shared/feedback/*`
  - Admin components: `@/components/trespass/admin/*`
- Updated `tsconfig.json` to exclude `Website/` and `Zips/` folders
- Verified production build succeeds locally and on Vercel

---

## Next Steps

### Immediate Tasks
1. **Test Staging Deployments** - Push to `staging` to verify preview URLs work
2. **DAEP Module Development** - Build DAEP Dashboard in `modules/DAEPManagement/`
3. **GitHub Branch Protection** (Optional) - Protect `main` branch with PR requirements

### Future Enhancements
- GitHub Actions for automated testing
- Supabase branching for development databases
- Enhanced monitoring and error tracking

---

## Important File Locations

### Configuration Files
- Root `.gitignore` - Excludes Website/, Zips/, docs/, node_modules/
- Root `.claudeignore` - Claude Code ignore patterns
- Root `vercel.json` - Cron jobs for demo reset
- Root `components.json` - shadcn/ui configuration
- Root `.eslintrc.json` - ESLint configuration
- Root `.npmrc` - NPM configuration
- Root `tsconfig.json` - TypeScript config (excludes Website/, Zips/)

### Environment Files
- `.env` - Production environment variables
- `.env.local` - Local development variables
- `.env.production` - Vercel-generated production vars

### Project Structure
```
DistrictTracker/
├── .github/          # GitHub workflows (if needed)
├── app/              # Next.js app router (shared)
├── components/       # Shared UI components
│   ├── daep/         # DAEP-specific components
│   ├── shared/       # Shared across modules
│   │   └── feedback/ # Feedback system components
│   ├── trespass/     # TrespassTracker components
│   │   └── admin/    # Admin-specific components
│   └── ui/           # shadcn/ui components
├── contexts/         # React contexts (shared)
├── hooks/            # Custom hooks (shared)
├── lib/              # Utility libraries (shared)
├── modules/
│   ├── DAEPManagement/     # DAEP Dashboard module
│   └── TrespassTracker/    # TrespassTracker module
│       ├── docs/
│       ├── scripts/
│       ├── .eslintrc.json
│       └── .npmrc
├── public/           # Static assets
├── styles/           # Global styles
├── supabase/         # Supabase migrations/config
├── docs/             # Private documentation (gitignored)
├── package.json      # Root dependencies
├── next.config.js    # Next.js configuration
└── tsconfig.json     # TypeScript configuration
```

---

## Key Information

### Repository Details
- **GitHub URL:** https://github.com/alanwallace9/DistrictTracker
- **Owner:** alanwallace9
- **Current Branch:** main

### Deployment Info
- **Platform:** Vercel
- **Project:** trespass-tracker
- **Framework:** Next.js 15.5.4
- **Database:** Supabase
- **Auth:** Clerk
- **Production URL:** https://districttracker.com
- **Vercel Dashboard:** https://vercel.com/alanwallace9-5200s-projects/trespass-tracker

### MCP Access Tokens
- **GitHub MCP:** OAuth authenticated
- **Vercel Access Token:** `3YmmNlQsQo0sFQoPumLrN2d3` (expires Nov 24, 2025)
- **Supabase:** HTTP-based MCP (no token needed)

---

## Notes

### Folders Excluded from Git
- `Website/` - Old marketing site (archived)
- `Zips/` - Archived code (not for build)
- `docs/` - Private project documentation
- `node_modules/` - NPM dependencies
- `.next/` - Next.js build output

### Module-Specific Files Kept
The TrespassTracker module retains:
- `.eslintrc.json` - Module-specific linting rules
- `.npmrc` - Module-specific NPM settings
- `.vscode/` - VS Code workspace settings
- `.agents/`, `.claude/` - AI assistant configs

### Vercel Cron Job
The `vercel.json` file includes a cron job:
- **Path:** `/api/cron/reset-demo`
- **Schedule:** `0 6 * * *` (6 AM daily)
- **Purpose:** Reset demo data

### Component Organization
- **Shared components:** `components/shared/` - Used across multiple modules
- **Module components:** `components/[module]/` - Module-specific UI
- **UI components:** `components/ui/` - shadcn/ui base components

---

## Quick Commands

### Git Operations
```bash
# Check current status
git status

# Switch branches
git checkout staging
git checkout main

# Pull latest changes
git pull origin main

# Push changes
git push origin staging
```

### Development
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Type check
npm run typecheck
```

### Vercel Deployment
```bash
# Deployments are automatic on git push
git push origin main          # Deploys to production
git push origin staging       # Creates preview deployment

# Manual deployment (if needed)
vercel deploy                 # Preview
vercel deploy --prod          # Production
```

---

## Deployment Workflow

### Production Deployment (main branch)
1. Make changes in feature branch or staging
2. Test thoroughly
3. Merge to `main` branch
4. Push to GitHub: `git push origin main`
5. Vercel automatically builds and deploys to production
6. Verify at https://districttracker.com

### Preview Deployment (staging or feature branches)
1. Push to `staging` or any feature branch
2. Vercel creates unique preview URL
3. Test changes on preview URL
4. Merge to main when ready

---

## Contact & Resources

- **GitHub Repo:** https://github.com/alanwallace9/DistrictTracker
- **Vercel Dashboard:** https://vercel.com/alanwallace9-5200s-projects/trespass-tracker
- **Claude Code MCP Docs:** https://docs.claude.com/en/docs/claude-code/mcp
- **Next.js 15 Docs:** https://nextjs.org/docs
- **Vercel Docs:** https://vercel.com/docs
