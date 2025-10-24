# SnapFlow Desktop

<p align="center">
  <strong>A powerful Electron-based screenshot capture and annotation tool with issue tracking and platform integrations</strong>
</p>

<p align="center">
  Capture, annotate, organize, and sync your screenshots to GitHub Issues and the cloud
</p>

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Quick Start](#-quick-start)
- [Configuration](#-configuration)
- [Usage Guide](#-usage-guide)
- [Project Structure](#-project-structure)
- [Available Scripts](#-available-scripts)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Features

> **Legend**: ✅ = Fully implemented | 🚧 = In development | 📋 = Planned

### Screenshot Capture (✅)

- 📸 **Full Screen Capture** - Capture entire display with multi-monitor support
- 🪟 **Window Capture** - Select and capture individual application windows
- ✂️ **Region Selection** - Draw custom rectangular area to capture with transparent overlay
- 📋 **Auto Clipboard Copy** - Screenshots automatically copied to clipboard for instant pasting
- 🖥️ **High-DPI Support** - Perfect pixel-accurate captures on Retina displays
- 🔐 **Permission Management** - Checks and guides macOS Screen Recording permissions

### Image Annotation (✅)

- ✏️ **Freehand Drawing** - Pen tool with customizable colors and stroke width
- 🔷 **Shape Tools** - Rectangles, circles with fill and stroke options
- ➡️ **Arrow Tool** - Directional arrows for pointing out specific areas
- 📝 **Text Tool** - Add and edit text labels with custom styling
- 🎨 **Color Picker** - 10+ predefined colors plus custom color selection
- ↩️ **Undo/Redo** - Complete action history management
- 🖱️ **Selection & Transform** - Select, move, and resize drawn elements

### Issue Tracking (✅)

- 📋 **Create Issues** - Save captures as issues with title, description, and tags
- 🏷️ **Tag Management** - Organize issues with custom tags
- 🔍 **Smart Filtering** - Filter by type, status, tags, and search
- 📊 **Sort Options** - Sort by date or name in ascending/descending order
- 🖼️ **Preview Mode** - Full-resolution image preview with details sidebar
- 💾 **Local Storage** - Organized file structure: `~/SnapFlow/Captures/YYYY/MM/DD/issueId/`

### Platform Integrations (✅)

- 🐙 **GitHub Integration** - Create GitHub issues with embedded screenshots
  - Upload screenshots directly to repository
  - Automatic issue creation with description and labels
  - Support for up to 5 repository connectors
  - Connector validation and error handling
- ☁️ **Cloud Sync** - Sync issues and screenshots to Supabase Storage
  - Automatic file and thumbnail uploads
  - Sync history tracking
  - Per-issue sync status (local/syncing/synced/failed)
- 🔗 **External Links** - Store and access issue URLs on external platforms

### Security & Authentication (✅)

- 🔒 **User Authentication** - Email-based signup and login via Supabase Auth
- 🛡️ **Secure Session Management** - JWT-based authentication with automatic token refresh
- 💾 **Session Persistence** - Stay logged in across app restarts
- 🗄️ **Supabase Backend** - Secure cloud database with real-time capabilities
- 🔐 **Context Isolation** - Electron security best practices with IPC bridge

### User Experience (✅)

- 🎨 **Dark Mode UI** - Beautiful dark theme interface with Radix UI components
- ⚡ **System Tray** - Quick access to capture from menu bar
- 🎬 **Smooth Animations** - Framer Motion transitions
- 🔔 **Toast Notifications** - User-friendly feedback with Sonner
- 💻 **Cross-Platform** - macOS support (Windows/Linux coming soon)
- 📱 **Responsive Design** - Adaptive layout for different screen sizes
- 📄 **Pagination** - Efficient browsing with customizable items per page (6, 12, 24, 48)

### Planned Features (📋)

- 🎥 **Screen Recording** - Record screen activity with audio (infrastructure in place)
- 🔄 **Additional Platform Integrations** - Jira, Linear, Asana, etc.
- 📤 **Export Options** - Export issues to PDF, ZIP archive
- 🌐 **Public Sharing** - Generate shareable links for issues
- 🔍 **Advanced Search** - Full-text search across descriptions
- 🏷️ **Smart Tags** - Auto-suggest tags based on content

---

## 🛠️ Tech Stack

### Frontend (Renderer Process)

- **Framework**: [Next.js](https://nextjs.org/) 14.2.4 with [React](https://react.dev/) 18.3.1
- **Language**: [TypeScript](https://www.typescriptlang.org/) 5.7.3
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) 3.4.3
- **UI Components**: [Radix UI](https://www.radix-ui.com/) v2 (Dialog, Select, Dropdown, Tooltip, etc.)
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/) 5.0.8
- **Canvas Library**: [Konva.js](https://konvajs.org/) 9.3.16 with [React-Konva](https://konvajs.org/docs/react/) 18.2.10
- **Animations**: [Framer Motion](https://www.framer.com/motion/) 12.23.24
- **Notifications**: [Sonner](https://sonner.emilkowal.ski/) 2.0.7
- **Date Utilities**: [date-fns](https://date-fns.org/) 3.3.1
- **Form Handling**: [React Hook Form](https://react-hook-form.com/) 7.65.0
- **Validation**: [Zod](https://zod.dev/) 4.1.12

### Backend (Main Process)

- **Runtime**: [Electron](https://www.electronjs.org/) 34.0.0
- **Framework**: [Nextron](https://github.com/saltyshiomix/nextron) 9.5.0 (Next.js + Electron)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL + Auth + Storage)
- **Capture**: Native Electron `desktopCapturer` API with `nativeImage.crop()`
- **Storage**:
  - Local: Electron Store for metadata + file system for captures
  - Cloud: Supabase Storage (`snapflow-public-bucket`)
- **HTTP Client**: [axios](https://axios-http.com/) 1.6.7 (GitHub API integration)
- **Logging**: [electron-log](https://www.npmjs.com/package/electron-log) 5.4.3
- **Auto-Updates**: [electron-updater](https://www.electron.build/auto-update) 6.6.2

### Development Tools

- **Build Tool**: [electron-builder](https://www.electron.build/) 24.13.3
- **Package Manager**: npm/yarn/pnpm
- **Code Quality**: [ESLint](https://eslint.org/) 9.38.0 with TypeScript support
- **Code Formatting**: [Prettier](https://prettier.io/) 3.6.2
- **Pre-commit Hooks**: [Husky](https://typicode.github.io/husky/) 9.1.7
- **Staged Files Linting**: [lint-staged](https://github.com/okonet/lint-staged) 16.2.4

---

## 📦 Prerequisites

- **Node.js**: 18.0.0 or higher
- **npm/yarn/pnpm**: Latest version
- **Supabase Account**: Free tier available at [supabase.com](https://supabase.com)
- **macOS**: 10.15+ (for Screen Recording permission)

---

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd snapflow-desktop
```

### 2. Install Dependencies

```bash
npm install
```

This will install all npm dependencies and prepare the app for development.

### 3. Setup Supabase

1. Create a Supabase project at [app.supabase.com](https://app.supabase.com)
2. Get your project credentials from **Settings** → **API**:
   - Project URL
   - anon/public key

3. Run the SQL schema to create database tables:
   - Go to **SQL Editor** in your Supabase Dashboard
   - Open [supabase-schema.sql](supabase-schema.sql) and copy the entire contents
   - Paste and run the SQL in the editor
   - This creates the `issues` and `sync_history` tables with RLS policies

4. Create a storage bucket for file uploads:
   - Go to **Storage** section in Supabase Dashboard
   - Click **New bucket**
   - Configure the bucket:
     - **Name**: `snapflow-public-bucket`
     - **Public**: Yes (checked)
     - **File size limit**: 52428800 (50MB)
     - **Allowed MIME types**: `image/png`, `image/jpeg`, `image/jpg`, `image/gif`, `image/webp`, `video/mp4`, `video/webm`, `video/quicktime`
   - Click **Create bucket**

5. Create a `.env` file in the project root:

   ```bash
   cp .env.example .env
   ```

6. Update `.env` with your Supabase credentials:

   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key-here
   NODE_ENV=development
   ```

7. **(Optional)** For development, disable email confirmation in Supabase:
   - Go to **Authentication** → **Providers** → **Email**
   - Toggle "Enable Email Confirmations" to **OFF**

📖 **Detailed setup guide**: See [SUPABASE_SETUP.md](SUPABASE_SETUP.md)

### 4. Run the Application

```bash
# Development mode with hot reload
npm run dev
```

### 5. First Run Setup

1. The app will open automatically
2. Create an account with your email and password
3. Grant Screen Recording permission when prompted (macOS)
4. Start capturing screenshots from the system tray icon!

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here

# Node environment
NODE_ENV="development"  # or "production"
```

### Supabase Setup

SnapFlow uses Supabase for:

- **Authentication**: Secure user signup/login with email/password
- **Session Management**: Automatic token refresh and persistence
- **Database**: Store issues and sync history with Row-Level Security
- **Storage**: Cloud file uploads with `snapflow-public-bucket`

**Required Setup:**

1. Create tables by running [supabase-schema.sql](supabase-schema.sql) in SQL Editor
2. Create storage bucket `snapflow-public-bucket` (see setup instructions above)
3. Storage RLS policies are included in the schema file

### Platform Connectors

#### GitHub Integration

1. Go to **Settings** → **Connectors** tab
2. Click **Add Connector**
3. Enter:
   - **Access Token**: Personal access token with `repo` scope
   - **Owner**: Repository owner username
   - **Repository**: Repository name
4. Click **Save** (connector will be validated automatically)
5. Supports up to 5 repository connectors

**Creating GitHub Token:**

1. Go to [GitHub Settings](https://github.com/settings/tokens) → Developer Settings → Personal Access Tokens
2. Click "Generate new token (classic)"
3. Select scopes:
   - `repo` - Full control of private repositories (required)
4. Generate and copy the token
5. Paste into SnapFlow connector form

**How it works:**

- Screenshots are uploaded to `.snapflow-screenshots/` folder in your repository
- Issue is created with screenshot embedded inline
- Tags are converted to GitHub labels
- Issue URL is stored for future reference

---

## 📖 Usage Guide

### Capturing Screenshots

#### From System Tray

1. Click the SnapFlow icon in your system tray
2. Select capture mode:
   - **Capture Full Screen** - Capture entire display
   - **Capture Area** - Draw selection rectangle with transparent overlay
3. Screenshot opens in annotation editor and is copied to clipboard

#### Area Selection

1. Semi-transparent overlay appears over your screen
2. Click and drag to select the area you want to capture
3. Release mouse to capture the selected region
4. Screenshot is automatically copied to clipboard
5. Press `ESC` to cancel

**Tips**:

- Screenshots are automatically copied to clipboard for instant pasting
- Perfect for sharing quickly in Slack, Discord, or any app (Cmd+V / Ctrl+V)
- High-DPI displays (Retina) are fully supported with pixel-perfect accuracy

### Annotating Screenshots

1. After capture, annotation editor opens automatically
2. Use tools from the left sidebar:
   - **Pen**: Freehand drawing
   - **Rectangle**: Draw rectangular shapes
   - **Circle**: Draw circular shapes
   - **Arrow**: Add directional arrows
   - **Text**: Add text labels
3. Customize colors and stroke width
4. Use **Undo/Redo** for mistakes
5. Click **Save** when done

### Managing Issues

#### Creating Issues

1. After annotation, fill in:
   - **Title**: Issue name
   - **Description**: Detailed description
   - **Tags**: Organize with custom tags
2. Click **Create Issue**
3. Issue appears in your dashboard

#### Viewing Issues

1. Open **Home** page
2. Use filters:
   - **Type**: All, Screenshots
   - **Status**: All, Local, Synced
   - **Tags**: Filter by tags
   - **Search**: Search by title or ID
3. Sort by date or name (ascending/descending)
4. Navigate pages and adjust items per page (6, 12, 24, or 48)
5. Click issue card to preview in full resolution

#### Syncing to GitHub

1. Make sure you have configured a GitHub connector in Settings
2. Open issue preview or click on an issue card
3. Click **Sync to GitHub** button
4. Select the connector/repository to sync to
5. Wait for sync to complete (toast notifications show progress)
6. View sync status badge and external link to GitHub issue

#### Cloud Sync

1. Issues are automatically synced to Supabase cloud storage
2. Files and thumbnails are uploaded to `snapflow-public-bucket`
3. Sync status is tracked per issue (local/syncing/synced/failed)
4. View sync history in Settings → Sync tab

#### Editing Issues

1. Click issue card to open preview dialog
2. Edit description by clicking **Edit** button
3. Add/remove tags using the chips input
4. Changes are saved automatically to local storage and Supabase

### Keyboard Shortcuts

- **ESC**: Cancel area/window selection or close dialog
- **Cmd/Ctrl + V**: Paste captured screenshot (auto-copied to clipboard)
- **Cmd/Ctrl + Z**: Undo (in annotation editor)
- **Cmd/Ctrl + Shift + Z**: Redo (in annotation editor)

---

## 📁 Project Structure

```
snapflow-desktop/
├── main/                          # Electron main process
│   ├── background.ts              # App lifecycle, IPC handlers, tray menu
│   ├── preload.ts                 # Context bridge API (window.ipc, window.api)
│   ├── services/                  # Business logic modules
│   │   ├── auth.ts                # Supabase authentication
│   │   ├── capture.ts             # Screenshot capture with nativeImage
│   │   ├── issues.ts              # Issue CRUD with local & cloud storage
│   │   ├── connectors.ts          # GitHub integration management
│   │   ├── sync.ts                # Supabase cloud sync service
│   │   └── updater.ts             # Auto-update service
│   ├── utils/                     # Utilities
│   │   ├── supabase.ts            # Supabase client singleton
│   │   ├── session.ts             # Local session management
│   │   ├── storage.ts             # Local file system storage
│   │   └── id-generator.ts        # Unique ID generation
│   └── helpers/
│       └── create-window.ts       # BrowserWindow creation utility
│
├── renderer/                      # Next.js frontend application
│   ├── pages/                     # React pages
│   │   ├── _app.tsx               # App wrapper with Zustand store
│   │   ├── home.tsx               # Dashboard with issue gallery
│   │   ├── auth.tsx               # Login/signup page
│   │   ├── annotate.tsx           # Image annotation editor (Konva.js)
│   │   ├── capture.tsx            # Capture mode selection
│   │   ├── window-capture.tsx     # Window capture with preview
│   │   ├── window-picker.tsx      # Window selection overlay
│   │   ├── area-capture.tsx       # Area selection mode
│   │   ├── area-selector.tsx      # Region selection tool
│   │   ├── settings.tsx           # Settings with 3 tabs
│   │   └── next.tsx               # Next.js info page
│   ├── components/
│   │   ├── ui/                    # Reusable UI components
│   │   │   ├── Button.tsx         # Custom button component
│   │   │   ├── Input.tsx          # Form input component
│   │   │   ├── Card.tsx           # Issue card component
│   │   │   ├── Badge.tsx          # Status badge component
│   │   │   ├── Dialog.tsx         # Radix UI dialog wrapper
│   │   │   ├── Select.tsx         # Custom select component
│   │   │   ├── ChipsInput.tsx     # Tag input component
│   │   │   ├── SearchInput.tsx    # Search input with icon
│   │   │   ├── FilterBar.tsx      # Filter controls
│   │   │   ├── Pagination.tsx     # Pagination with page size
│   │   │   ├── EmptyState.tsx     # Empty state component
│   │   │   ├── LoadingSpinner.tsx # Loading indicator
│   │   │   ├── LocalImage.tsx     # Local file image renderer
│   │   │   ├── FloatingActionButton.tsx # FAB component
│   │   │   ├── Tooltip.tsx        # Radix tooltip wrapper
│   │   │   └── index.ts           # Component exports
│   │   └── settings/              # Settings page components
│   │       ├── GitHubConnectorManager.tsx # GitHub config
│   │       ├── DisplaysSection.tsx # Display settings
│   │       ├── SyncIndicators.tsx  # Sync status display
│   │       ├── UpdatesSection.tsx  # Update settings
│   │       └── index.ts            # Component exports
│   ├── store/
│   │   └── useStore.ts            # Zustand state management
│   ├── types/
│   │   └── index.ts               # TypeScript type definitions
│   ├── styles/
│   │   └── globals.css            # Global styles
│   ├── public/                    # Static assets
│   ├── next.config.js             # Next.js configuration
│   ├── tailwind.config.js         # Tailwind CSS configuration
│   └── tsconfig.json              # TypeScript config
│
├── resources/                     # App resources
│   ├── icon.png                   # App icon (macOS dock/taskbar)
│   ├── icon.icns                  # macOS app icon
│   ├── icon.ico                   # Windows app icon
│   ├── tray-icon.png              # System tray icon
│   └── entitlements.mac.plist     # macOS app entitlements
│
├── .github/                       # GitHub configuration
│   └── workflows/                 # CI/CD workflows (if any)
├── .husky/                        # Git hooks
│   └── pre-commit                 # Pre-commit hook
├── app/                           # Build output (generated)
├── dist/                          # Distribution packages (generated)
├── node_modules/                  # Dependencies (generated)
│
├── supabase-schema.sql            # Database schema & RLS policies
├── package.json                   # Project dependencies & scripts
├── package-lock.json              # Dependency lock file
├── tsconfig.json                  # Root TypeScript config
├── electron-builder.yml           # Electron build configuration
├── eslint.config.mjs              # ESLint v9 flat config
├── .prettierrc.json               # Prettier formatting rules
├── .prettierignore                # Prettier ignore patterns
├── .lintstagedrc.json             # Lint-staged configuration
├── .gitignore                     # Git ignore patterns
├── .env.example                   # Environment template
└── .env                           # Environment variables (create this)
```

---

## 🔧 Available Scripts

### Development

```bash
npm run dev              # Start development server with hot reload
```

### Code Quality & Formatting

```bash
npm run format           # Format all files with Prettier
npm run format:check     # Check if files are formatted
npm run lint             # Run ESLint on all files
npm run lint:fix         # Run ESLint and fix issues
npm run type-check       # Run TypeScript type checking
```

### Build

```bash
npm run build            # Build production app (macOS/Windows/Linux)
```

---

## 🎨 Code Quality

SnapFlow uses a comprehensive code quality setup to maintain consistent code style and catch errors early:

### Pre-commit Hooks

Git hooks automatically run before each commit:

- **Lint-staged**: Runs ESLint and Prettier only on staged files
- **Type checking**: Ensures TypeScript types are valid
- **Formatting**: Auto-formats code with Prettier

### Manual Commands

```bash
# Format code
npm run format              # Format all files
npm run format:check        # Check formatting without modifying

# Linting
npm run lint                # Check for code issues
npm run lint:fix            # Auto-fix linting issues

# Type checking
npm run type-check          # Verify TypeScript types
```

### Configuration Files

- **`.prettierrc.json`** - Prettier formatting rules
- **`.prettierignore`** - Files to skip formatting
- **`.eslintrc.json`** - ESLint rules for code quality
- **`.lintstagedrc.json`** - Lint-staged configuration
- **`.husky/pre-commit`** - Pre-commit hook script

---

## 🐛 Troubleshooting

### Area Capture Showing Wrong Region

**Problem**: Selected area doesn't match what appears in preview (zoomed in)

**Solution**: This should be fixed in the latest version using `nativeImage.crop()`. If still occurring:

```bash
# Update to latest version
git pull
npm install

# Clear cache and restart
rm -rf ~/Library/Application\ Support/SnapFlow
npm run dev
```

**Note**: The latest version uses direct coordinate mapping with native Electron APIs for pixel-perfect accuracy.

### Supabase Connection Issues

**Problem**: "Supabase credentials not configured" error

**Solution**:

```bash
# Check .env file exists
cat .env

# Should show:
# SUPABASE_URL=https://...
# SUPABASE_ANON_KEY=...

# Copy from example if missing
cp .env.example .env
# Then add your credentials
```

### Storage Bucket RLS Policy Error

**Problem**: `StorageApiError: new row violates row-level security policy` or "Storage bucket is not available"

**Root Cause**: The storage bucket doesn't exist or RLS policies are not configured properly.

**Solution**:

1. **Create the bucket manually** (bucket creation requires admin privileges):
   - Go to Supabase Dashboard → **Storage**
   - Click **New bucket**
   - Name: `snapflow-public-bucket`
   - Public: **Yes** (checked)
   - File size limit: **52428800** (50MB)
   - Click **Create bucket**

2. **Verify RLS policies are applied**:
   - Go to Supabase Dashboard → **SQL Editor**
   - Run the storage policies section from [supabase-schema.sql](supabase-schema.sql#L113-L157)
   - This ensures users can upload/read their own files

3. **Restart the application** and try syncing again

**Note**: Storage bucket creation cannot be done programmatically with RLS enabled. It must be created manually through the Supabase Dashboard.

### Authentication Errors

**Problem**: "Invalid email or password" or signup issues

**Solution**:

1. Verify email confirmation is disabled for development:
   - Supabase Dashboard → Authentication → Providers → Email
   - Toggle "Enable Email Confirmations" to OFF
2. Check user exists in Supabase Dashboard → Authentication → Users
3. Try signing up with a new email address

### Session Not Persisting

**Problem**: App logs out after restart

**Solution**:

```bash
# Clear Electron cache
rm -rf ~/Library/Application\ Support/SnapFlow  # macOS
rm -rf ~/.config/SnapFlow                       # Linux

# Restart app
npm run dev
```

### Screenshot Capture Fails (macOS)

**Problem**: "Failed to get sources" error on macOS

**Solution**:

1. Open **System Preferences** → **Security & Privacy** → **Privacy**
2. Select **Screen Recording** from the left sidebar
3. Check the box next to **SnapFlow** (or Electron)
4. Restart the application

**Note**: macOS 10.15+ requires explicit Screen Recording permission.

### App Won't Start

**Problem**: Electron app crashes on startup

**Solution**:

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Electron cache
rm -rf ~/Library/Application\ Support/SnapFlow  # macOS
rm -rf ~/.config/SnapFlow                       # Linux

# Check Node.js version
node --version  # Should be 18+

# Run in development mode with logs
npm run dev
```

### Clipboard Not Working

**Problem**: Screenshots not automatically copying to clipboard

**Solution**:

1. Ensure you're running the latest version with clipboard support
2. Check console logs for "Image copied to clipboard" message
3. Try manually: After capture, the image should be available to paste (Cmd+V / Ctrl+V)
4. On macOS, check System Preferences → Security & Privacy for clipboard permissions

### Hot Reload Not Working

**Problem**: Changes don't reflect in development mode

**Solution**:

```bash
# Kill all Electron processes
pkill -9 Electron

# Restart dev server
npm run dev
```

---

## 👥 Development Team Guidelines

This is a private project. For team members working on the codebase:

### Development Workflow

1. Clone the repository: `git clone <repository-url>`
2. Install dependencies: `npm install`
3. Create a feature branch: `git checkout -b feature/your-feature-name`
4. Make your changes and ensure code quality:
   ```bash
   npm run format      # Format code
   npm run lint:fix    # Fix linting issues
   npm run type-check  # Verify types
   ```
5. Commit your changes (pre-commit hooks will run automatically)
6. Push to your branch: `git push origin feature/your-feature-name`
7. Create a Pull Request for review

### Code Quality Standards

The project enforces code quality through automated tools:

- Pre-commit hooks ensure all code is formatted and linted
- TypeScript type checking prevents type errors

### Documentation for Developers

- [Development Guide](DEVELOPMENT.md) - Complete development workflow and guidelines
- [Code Quality Guide](.github/CODE_QUALITY.md) - Detailed info on Prettier, ESLint, and pre-commit hooks

---

## 📄 License

This is a private project. All rights reserved.

---

## 🙏 Acknowledgments

- [Nextron](https://github.com/saltyshiomix/nextron) - Amazing Next.js + Electron boilerplate
- [Supabase](https://supabase.com/) - Open source Firebase alternative
- [Radix UI](https://www.radix-ui.com/) - Accessible component primitives
- [Konva.js](https://konvajs.org/) - Powerful HTML5 Canvas library
- [Sharp](https://sharp.pixelplumbing.com/) - High performance image processing
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework

---

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Troubleshooting](#-troubleshooting) section
2. Review the [Code Quality Guide](.github/CODE_QUALITY.md)
3. Contact the development team for assistance

---

<p align="center">
  Made with ❤️ by the SnapFlow Team
</p>
