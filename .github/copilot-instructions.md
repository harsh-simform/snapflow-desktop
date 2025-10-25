# SnapFlow Desktop - AI Coding Agent Instructions

## Project Overview

SnapFlow is an Electron-based desktop app for screenshot/screen recording with issue tracking and cloud sync (GitHub integration + Supabase). Built with **Nextron** (Next.js + Electron), TypeScript, Tailwind CSS, Zustand, and **Supabase** (PostgreSQL + Auth + Storage).

## Architecture

### Three-Layer Structure

1. **Main Process** (`main/`) - Electron backend, IPC handlers, system integrations
2. **Renderer Process** (`renderer/`) - Next.js frontend, React components, UI
3. **Preload Bridge** (`main/preload.ts`) - Secure IPC communication layer via `contextBridge`

### Critical Data Flow

- **User Auth**: Supabase Auth (`@supabase/supabase-js`) with JWT tokens and automatic refresh
- **Session Management**: In-memory + persistent storage via `electron-store` (`main/utils/session.ts`)
- **Local Storage**: Files in user-specific folders: `~/SnapFlow/Users/{userId}/Captures/{year}/{month}/{day}/{issueId}/`
- **Cloud Storage**: Supabase Storage bucket (`snapflow-public-bucket`) for file sync
- **Database**: Supabase PostgreSQL with Row-Level Security (RLS) policies
- **IPC Pattern**: Renderer → `window.api.*` → Preload → Main Process handlers → Services

## Development Commands

```bash
npm run dev              # Start development (Nextron hot-reload on dynamic port)
npm run build            # Production build (creates distributable)
npm run postinstall      # Rebuild native Electron dependencies
npm run format           # Format code with Prettier
npm run lint             # Lint code with ESLint v9
npm run type-check       # TypeScript type checking
```

**Critical Notes**:

- Dev server uses dynamic port passed as `process.argv[2]` to main process
- Environment variables loaded via `dotenv` from `.env` file (see `.env.example`)
- Requires `SUPABASE_URL` and `SUPABASE_ANON_KEY` env vars

## Key Conventions

### Supabase Integration Patterns

- **Client Singleton**: `main/utils/supabase.ts` - lazy initialization with custom `electron-store` adapter
- **Auth Flow**: Sign up/in returns JWT token, stored in session, auto-refresh enabled
- **Session Persistence**: `electron-store` (named `snapflow-session`) stores user + Supabase session
- **Row-Level Security**: All database tables use RLS policies (`user_id = auth.uid()`)
- **Schema Management**: SQL schema in `supabase-schema.sql` (run manually in Supabase Dashboard)
- **Storage Bucket**: `snapflow-public-bucket` (public, 50MB limit) - stores screenshots and thumbnails

### IPC Communication Pattern

- **Main Process**: Define handlers with `ipcMain.handle('channel:action', async (_event, args) => {})`
- **Preload**: Expose methods via `contextBridge` as `window.api.*`
- **Renderer**: Call `await window.api.methodName(args)` (returns `{success: boolean, data?, error?}`)
- **Example**: User login flows through `renderer/pages/auth.tsx` → `window.api.loginUser()` → `main/preload.ts` → `ipcMain.handle('user:login')` → `main/services/auth.ts` → Supabase Auth
- **Channel Naming**: Use `namespace:action` format (e.g., `user:login`, `capture:screenshot`, `sync:issue`)

### Service Layer Pattern

All business logic lives in `main/services/`:

- `auth.ts` - Supabase Auth (signup, login, logout, session management)
- `capture.ts` - Screenshot/recording using `desktopCapturer` + Electron `nativeImage`
- `connectors.ts` - GitHub integration (issue creation with embedded images)
- `issues.ts` - Issue CRUD with local + Supabase storage
- `sync.ts` - Cloud sync service (Supabase Storage uploads/downloads)
- `updater.ts` - Auto-update via `electron-updater` (GitHub releases)

Each service uses Supabase Client for database/storage or `electron-store` for local app settings.

### State Management

- **Frontend**: Zustand store (`renderer/store/useStore.ts`) for UI state
- **Backend**: Supabase (PostgreSQL) for persistent data
- **Session**: `sessionManager` for current user (cleared on logout)
- **Never** store sensitive data in renderer - use IPC to access from main process

### UI Component System

- Radix UI primitives + custom styling (dark mode only)
- Variants with `class-variance-authority` (see `renderer/components/ui/Button.tsx`)
- Tailwind classes: Prefer composition over @apply
- Toast notifications: `sonner` library (`toast.success()`, `toast.error()`)
- Canvas: Konva.js + React-Konva for screenshot annotation (loaded dynamically to avoid SSR issues)

### Window Management

- Main window uses `main/helpers/create-window.ts` for position persistence
- Hide instead of close (minimize to tray): `window.on('close', event.preventDefault())`
- System tray always present with quick actions menu
- **Multi-window types**: Main, window capture overlay, recording control, area selector

## File Organization Patterns

### Adding New Database Tables

1. Add SQL to `supabase-schema.sql` with proper RLS policies
2. Run SQL in Supabase Dashboard SQL Editor
3. Update TypeScript interfaces in `renderer/types/index.ts`
4. Update service methods to query new table

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
- Import `getSupabase()` from `main/utils/supabase.ts` for database/storage operations
- Export singleton instance: `export const myService = new MyService()`
- Import and use in `main/background.ts` IPC handlers

## Critical Quirks

### Supabase in Electron

- Custom storage adapter uses `electron-store` to persist Supabase session
- Session auto-refresh handled by Supabase SDK with `autoRefreshToken: true`
- Check `getSupabase()` returns non-null before using (warns if env vars missing)
- RLS policies enforce `auth.uid() = user_id` on all queries

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

- Shared types in `renderer/types/index.ts` (keep in sync with Supabase tables)
- Supabase types match SQL schema in `supabase-schema.sql`
- IPC responses always shaped as `{success: boolean, data?: T, error?: string}`
- Use discriminated unions for multi-type captures: `type: 'screenshot' | 'recording'`

## Database Workflows

### Setting Up Supabase

1. Create Supabase project at [supabase.com](https://supabase.com)
2. Copy `SUPABASE_URL` and `SUPABASE_ANON_KEY` to `.env`
3. Run SQL from `supabase-schema.sql` in Supabase Dashboard SQL Editor
4. Create storage bucket `snapflow-public-bucket` (public, 50MB limit, image/video MIME types)
5. Storage policies auto-created by schema

### Updating Schema

```bash
# 1. Edit supabase-schema.sql
# 2. Run new SQL in Supabase Dashboard SQL Editor
# 3. Update TypeScript types in renderer/types/index.ts
```

### Inspecting Database

- Use Supabase Dashboard Table Editor to view data
- SQL Editor for ad-hoc queries
- Authentication section for user management

## Testing Approach

- Main focus: Manual E2E testing in dev mode
- No formal test suite currently (future addition)
- Use DevTools in dev: `mainWindow.webContents.openDevTools()` auto-enabled
- Test database connection: Check Supabase Dashboard or verify session after login

## Common Tasks

### Adding External Platform Connector

1. Add type to `Connector['type']` union in `renderer/types/index.ts`
2. Create sync method in `main/services/connectors.ts` (follow `syncToGitHub` pattern)
3. Add UI in `renderer/pages/settings.tsx` for OAuth/config
4. Handle in `ipcMain.handle('sync:issue')` switch statement
5. Add new Supabase table for connector storage with RLS policies

### Adding User Profile Fields

1. Update SQL schema in `supabase-schema.sql` (alter `auth.users` metadata)
2. Run SQL in Supabase Dashboard
3. Update `renderer/types/index.ts` User interface to match
4. Update `main/services/auth.ts` methods to handle new fields
5. Update UI components in `renderer/pages/` as needed

### Debugging Issues

- **IPC**: Check `main/background.ts` console (terminal) and renderer DevTools
- **Database**: Check Supabase Dashboard Table Editor or SQL Editor
- **Supabase Auth**: Check Authentication section in Supabase Dashboard
- **Session**: `console.log(sessionManager.getUser())` in main process
- **Verify preload**: `console.log(window.api)` in renderer

## Environment Setup

### Required Environment Variables

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

### Supabase Setup Checklist

1. ✅ Create Supabase project
2. ✅ Copy credentials to `.env`
3. ✅ Run `supabase-schema.sql` in SQL Editor
4. ✅ Create storage bucket `snapflow-public-bucket`
5. ✅ Configure bucket: Public, 50MB limit, image/video MIME types
6. ✅ Test connection: Run app and sign up

### Build Configuration

- **electron-builder.yml**: Includes `.env` file in production build
- **Production env loading**: Checks multiple paths (app.asar, resources, app directory)
- **Development**: Loads `.env` from project root via `dotenv.config()`
- **Native modules**: Uses `electron-builder` to rebuild for Electron
