# SnapFlow Desktop - AI Coding Agent Instructions

## Project Overview

SnapFlow is an Electron-based desktop app for screenshot/screen recording with issue tracking and external platform sync (GitHub, Zoho). Built with **Nextron** (Next.js + Electron), TypeScript, Tailwind CSS, Zustand, and **Prisma + PostgreSQL**.

## Architecture

### Three-Layer Structure

1. **Main Process** (`main/`) - Electron backend, IPC handlers, system integrations
2. **Renderer Process** (`renderer/`) - Next.js frontend, React components, UI
3. **Preload Bridge** (`main/preload.ts`) - Secure IPC communication layer

### Critical Data Flow

- **User Auth**: PostgreSQL database via Prisma ORM + bcrypt for password hashing
- **Session Management**: In-memory session store (`main/utils/session.ts`) for current user
- **Storage**: Files organized by date: `~/SnapFlow/Captures/{year}/{month}/{day}/{issueId}/`
- **IPC Pattern**: Renderer → `window.api.*` → Preload → Main Process handlers → Services

## Development Commands

```bash
npm run dev              # Start development (Nextron hot-reload)
npm run build            # Production build (creates distributable)
npm run postinstall      # Rebuild native modules + generate Prisma Client
npm run prisma:migrate   # Create and apply database migrations (dev)
npm run prisma:push      # Push schema to database (production)
npm run prisma:studio    # Open Prisma Studio (database GUI)
```

**Port Note**: Dev server uses dynamic port passed as `process.argv[2]` to main process.

## Key Conventions

### Database & Prisma Patterns

- **Schema Location**: `prisma/schema.prisma` - single source of truth
- **Client Singleton**: `main/utils/prisma.ts` - prevents multiple instances
- **Migrations**: Use `npm run prisma:migrate` for schema changes in development
- **Connection Config**: Managed by `main/services/config.ts` - supports both env vars and runtime config
- **Session State**: `sessionManager` stores current logged-in user in memory

### IPC Communication Pattern

- **Main Process**: Define handlers with `ipcMain.handle('channel:action', async (_event, args) => {})`
- **Preload**: Expose methods via `contextBridge` as `window.api.*`
- **Renderer**: Call `await window.api.methodName(args)` (returns `{success: boolean, data?, error?}`)
- **Example**: User login flows through `renderer/pages/auth.tsx` → `window.api.loginUser()` → `main/preload.ts` → `ipcMain.handle('user:login')` → `main/services/auth.ts` → Prisma query

### Service Layer Pattern

All business logic lives in `main/services/`:

- `auth.ts` - User management with Prisma (CRUD operations, password handling)
- `config.ts` - Database configuration management
- `capture.ts` - Screenshot/recording using `desktopCapturer` + `sharp`
- `connectors.ts` - External platform sync (GitHub/Zoho APIs)
- `issues.ts` - Issue CRUD operations

Each service uses Prisma for database queries or `electron-store` for app settings.

### State Management

- **Frontend**: Zustand store (`renderer/store/useStore.ts`) for UI state
- **Backend**: Prisma + PostgreSQL for persistent data
- **Session**: `sessionManager` for current user (cleared on logout)
- **Never** store sensitive data in renderer - use IPC to access from main process

### UI Component System

- Radix UI primitives + custom styling (dark mode only)
- Variants with `class-variance-authority` (see `renderer/components/ui/Button.tsx`)
- Tailwind classes: Prefer composition over @apply
- Toast notifications: `sonner` library (`toast.success()`, `toast.error()`)

### Window Management

- Main window uses `main/helpers/create-window.ts` for position persistence
- Hide instead of close (minimize to tray): `window.on('close', event.preventDefault())`
- System tray always present with quick actions menu

## File Organization Patterns

### Adding New Database Models

1. Define model in `prisma/schema.prisma` with proper relations
2. Run `npm run prisma:migrate` and provide descriptive migration name
3. Prisma Client auto-regenerates with new types
4. Use `prisma.*` from `main/utils/prisma.ts` in services

### Adding New IPC Channels

1. Define in `renderer/types/index.ts` as `IPCChannel` union member
2. Add handler in `main/background.ts` with `ipcMain.handle('namespace:action')`
3. Expose in `main/preload.ts` via `window.api` object
4. TypeScript types auto-exported from preload

### Adding New Pages

- Create in `renderer/pages/*.tsx`
- Use `useRouter` from `next/router` for navigation
- Load user state in `useEffect` and redirect to `/auth` if missing
- All pages assume dark theme (no light mode toggle)

### Adding New Services

- Create class in `main/services/*.ts`
- Import `prisma` from `main/utils/prisma.ts` for database queries
- Export singleton instance: `export const myService = new MyService()`
- Import and use in `main/background.ts` IPC handlers

## Critical Quirks

### Prisma in Electron

- Use singleton pattern to prevent multiple Prisma instances during hot-reload
- Call `disconnectPrisma()` on `app.on('before-quit')` for graceful shutdown
- Prisma Client output: `node_modules/.prisma/client` (standard location)
- Connection string priority: env variable > stored config > default

### Next.js Static Export

- Config uses `output: 'export'` (no server-side features)
- Dev mode: `distDir: '.next'`, Production: `distDir: '../app'`
- Images must be `unoptimized: true` for Electron compatibility

### Screenshot Flow

1. Capture via `desktopCapturer` → raw buffer
2. Process with `sharp` for thumbnails/cropping
3. Send base64 dataURL to renderer for annotation
4. Save processed buffer to disk after user confirms

### Connector Sync

- GitHub: Creates issue with base64-embedded image in markdown body
- Zoho: Uses their upload API, attaches as file
- Each issue tracks sync status: `'local' | 'synced' | 'syncing' | 'failed'`

## Type Safety

- Shared types in `renderer/types/index.ts` (keep in sync with Prisma models)
- Prisma generates TypeScript types automatically from schema
- IPC responses always shaped as `{success: boolean, data?: T, error?: string}`
- Use discriminated unions for multi-type captures: `type: 'screenshot' | 'recording'`

## Database Workflows

### Creating Migrations (Development)

```bash
# 1. Modify prisma/schema.prisma
# 2. Create and apply migration
npm run prisma:migrate
# 3. Enter descriptive name (e.g., "add_user_roles")
```

### Updating Schema (Production)

```bash
# Push schema changes without creating migration files
npm run prisma:push
```

### Inspecting Database

```bash
# Open visual database editor
npm run prisma:studio
```

## Testing Approach

- Main focus: Manual E2E testing in dev mode
- No formal test suite currently (future addition)
- Use DevTools in dev: `mainWindow.webContents.openDevTools()` auto-enabled
- Test database connection: `await window.api.testDatabaseConnection()`

## Common Tasks

### Adding External Platform Connector

1. Add type to `Connector['type']` union in `renderer/types/index.ts`
2. Create sync method in `main/services/connectors.ts` (follow `syncToGitHub` pattern)
3. Add UI in `renderer/pages/settings.tsx` for OAuth/config
4. Handle in `ipcMain.handle('sync:issue')` switch statement

### Adding User Profile Fields

1. Update `User` model in `prisma/schema.prisma`
2. Run `npm run prisma:migrate` to create migration
3. Update `renderer/types/index.ts` User interface to match
4. Update `main/services/auth.ts` methods to handle new fields
5. Update UI components in `renderer/pages/` as needed

### Debugging Issues

- **IPC**: Check `main/background.ts` console (terminal) and renderer DevTools
- **Database**: Check connection with `await prisma.$queryRaw\`SELECT 1\``
- **Prisma Logs**: Set `log: ['query', 'error']` in `main/utils/prisma.ts`
- **Verify preload**: `console.log(window.api)` in renderer

## Database Setup

See `docs/DATABASE_SETUP.md` for detailed PostgreSQL configuration, migration workflows, and troubleshooting guides.
