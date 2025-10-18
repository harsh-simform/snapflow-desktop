# SnapFlow Desktop

<p align="center">
  <strong>A powerful Electron-based screenshot capture and annotation tool with issue tracking and platform integrations</strong>
</p>

<p align="center">
  Capture, annotate, organize, and sync your screenshots to GitHub Issues or Zoho Projects
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

### Screenshot Capture
- 📸 **Full Screen Capture** - Capture entire display with multi-monitor support
- 🪟 **Window Capture** - Select and capture individual application windows
- ✂️ **Region Selection** - Draw custom rectangular area to capture
- 🖥️ **Smart Display Handling** - Automatically selects best display for capture
- 🔐 **Permission Management** - Checks and guides macOS Screen Recording permissions

### Image Annotation
- ✏️ **Freehand Drawing** - Pen tool with customizable colors and stroke width
- 🔷 **Shape Tools** - Rectangles, circles with fill and stroke options
- ➡️ **Arrow Tool** - Directional arrows for pointing out specific areas
- 📝 **Text Tool** - Add and edit text labels with custom styling
- 🎨 **Color Picker** - 10+ predefined colors plus custom color selection
- ↩️ **Undo/Redo** - Complete action history management
- 🖱️ **Selection & Transform** - Select, move, and resize drawn elements

### Issue Tracking
- 📋 **Create Issues** - Save captures as issues with title, description, and tags
- 🏷️ **Tag Management** - Organize issues with custom tags
- 🔍 **Smart Filtering** - Filter by type, status, tags, and search
- 📊 **Sort Options** - Sort by date or name in ascending/descending order
- 🖼️ **Preview Mode** - Full-resolution image preview with details sidebar
- 💾 **Local Storage** - Organized file structure: `~/SnapFlow/Captures/YYYY/MM/DD/issueId/`

### Platform Integrations
- 🐙 **GitHub Integration** - Create GitHub issues with embedded screenshots
- 🔄 **Zoho Projects** - Create Zoho bugs with screenshot attachments
- 📊 **Sync Status Tracking** - Track sync status per issue (local/syncing/synced/failed)
- 🔗 **External Links** - Store and access issue URLs on external platforms
- 🌐 **Multi-Platform Sync** - Sync single issue to multiple platforms

### Security & Authentication
- 🔒 **User Authentication** - Email-based signup and login
- 🛡️ **Password Security** - bcrypt hashing with 10 salt rounds
- 💾 **Session Persistence** - Stay logged in across app restarts
- 🗄️ **PostgreSQL Database** - Secure user data storage
- 🔐 **Context Isolation** - Electron security best practices

### User Experience
- 🎨 **Dark Mode UI** - Beautiful dark theme interface with Radix UI components
- ⚡ **System Tray** - Quick access to capture from menu bar
- 🎬 **Smooth Animations** - Framer Motion transitions
- 🔔 **Toast Notifications** - User-friendly feedback with Sonner
- 💻 **Cross-Platform** - macOS support (Windows/Linux coming soon)
- 📱 **Responsive Design** - Adaptive layout for different screen sizes

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
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL + Auth + Real-time)
- **Image Processing**: [Sharp](https://sharp.pixelplumbing.com/) 0.33.2
- **Storage**: [electron-store](https://github.com/sindresorhus/electron-store) 8.2.0
- **HTTP Client**: [axios](https://axios-http.com/) 1.6.7

### Development Tools
- **Build Tool**: [electron-builder](https://www.electron.build/) 24.13.3
- **Package Manager**: npm/yarn/pnpm

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

3. Create a `.env` file in the project root:
   ```bash
   cp .env.example .env
   ```

4. Update `.env` with your Supabase credentials:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key-here
   NODE_ENV=development
   ```

5. **(Optional)** For development, disable email confirmation in Supabase:
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
- **User Profiles**: Store user metadata (name, email)

For detailed setup instructions, see [SUPABASE_SETUP.md](SUPABASE_SETUP.md)

### Platform Connectors

#### GitHub Integration

1. Go to **Settings** → **Connectors**
2. Click **Add Connector** → **GitHub**
3. Enter:
   - **Access Token**: Personal access token with `repo` scope
   - **Owner**: Repository owner username
   - **Repository**: Repository name
4. Save connector

**Creating GitHub Token:**
1. Go to GitHub Settings → Developer Settings → Personal Access Tokens
2. Generate new token (classic)
3. Select `repo` scope
4. Copy token

#### Zoho Projects Integration

1. Go to **Settings** → **Connectors**
2. Click **Add Connector** → **Zoho**
3. Enter:
   - **Access Token**: Zoho OAuth token
   - **Portal ID**: Your Zoho portal ID
   - **Project ID**: Target project ID
4. Save connector

---

## 📖 Usage Guide

### Capturing Screenshots

#### From System Tray
1. Click the SnapFlow icon in your system tray
2. Select capture mode:
   - **Full Screen** - Capture entire display
   - **Area** - Draw selection rectangle
   - **Window** - Choose specific window
3. Screenshot opens in annotation editor

#### From App Window
1. Click **New Capture** button
2. Select capture mode
3. For region selection, drag to create selection rectangle
4. For window selection, click on window thumbnail
5. Press `ESC` to cancel

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
3. Sort by date or name
4. Click issue card to preview

#### Syncing to Platforms
1. Open issue preview or hover over issue card
2. Click **GitHub** or **Zoho** button
3. Wait for sync to complete
4. View external issue link in preview

### Keyboard Shortcuts

- **ESC**: Cancel capture/close dialog
- **Cmd/Ctrl + Z**: Undo (in annotation editor)
- **Cmd/Ctrl + Shift + Z**: Redo (in annotation editor)

---

## 📁 Project Structure

```
snapflow-desktop/
├── main/                          # Electron main process
│   ├── background.ts              # App lifecycle, IPC handlers, tray menu
│   ├── preload.ts                 # Context bridge API (window.api)
│   ├── services/                  # Business logic modules
│   │   ├── auth.ts                # User authentication
│   │   ├── capture.ts             # Screenshot capture logic
│   │   ├── issues.ts              # Issue CRUD operations
│   │   ├── connectors.ts          # GitHub/Zoho integrations
│   │   └── config.ts              # Database configuration
│   ├── utils/                     # Utilities
│   │   ├── prisma.ts              # Prisma client singleton
│   │   ├── session.ts             # Session management
│   │   ├── storage.ts             # File system storage
│   │   └── id-generator.ts        # ID generation
│   └── helpers/
│       └── create-window.ts       # Window creation utility
│
├── renderer/                      # Next.js frontend application
│   ├── pages/                     # React pages
│   │   ├── _app.tsx               # App wrapper
│   │   ├── home.tsx               # Dashboard with issue list
│   │   ├── auth.tsx               # Login/signup page
│   │   ├── annotate.tsx           # Image annotation editor
│   │   ├── capture.tsx            # Capture mode selection
│   │   ├── window-capture.tsx     # Window picker overlay
│   │   ├── area-capture.tsx       # Area selection overlay
│   │   └── settings.tsx           # App settings
│   ├── components/
│   │   ├── LocalImage.tsx         # Local file image loader
│   │   └── ui/                    # Reusable UI components
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       ├── Card.tsx
│   │       ├── Badge.tsx
│   │       ├── Dialog.tsx
│   │       ├── Select.tsx
│   │       ├── ChipsInput.tsx
│   │       └── ...
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
├── prisma/
│   ├── schema.prisma              # Database schema
│   └── migrations/                # Migration files
│
├── resources/                     # App resources (icons, etc.)
├── app/                           # Build output
├── docker-compose.yml             # PostgreSQL Docker setup
├── package.json                   # Project dependencies
├── tsconfig.json                  # Root TypeScript config
├── electron-builder.yml           # Electron build configuration
└── .env                           # Environment variables (create this)
```

---

## 🔧 Available Scripts

### Development

```bash
npm run dev              # Start development server with hot reload
```

### Build

```bash
npm run build            # Build production app (macOS/Windows/Linux)
```

---

## 🐛 Troubleshooting

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

### Image Preview Shows Small Image

**Problem**: Screenshot preview appears too small in dialog

**Solution**: This should be fixed in the latest version. If still occurring:
1. Clear browser cache: Cmd+Shift+R (macOS) or Ctrl+Shift+R (Windows)
2. Restart the app
3. Update to latest version: `git pull && npm install`

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

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- Follow existing code style (TypeScript, ESLint)
- Write descriptive commit messages
- Update documentation for new features
- Test on multiple platforms if possible
- Keep PRs focused on a single feature/fix

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Nextron](https://github.com/saltyshiomix/nextron) - Amazing Next.js + Electron boilerplate
- [Radix UI](https://www.radix-ui.com/) - Accessible component primitives
- [Konva.js](https://konvajs.org/) - Powerful HTML5 Canvas library
- [Prisma](https://www.prisma.io/) - Next-generation ORM
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework

---

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Troubleshooting](#-troubleshooting) section
2. Search existing [GitHub Issues](../../issues)
3. Create a new issue with detailed information

---

<p align="center">
  Made with ❤️ by the SnapFlow Team
</p>
