# SnapFlow Desktop<p align="center"><img src="https://i.imgur.com/a9QWW0v.png"></p>

SnapFlow is an Electron-based desktop app for screenshot/screen recording with issue tracking and external platform sync (GitHub, Zoho).## Usage

## Tech Stack### Create an App

- **Framework**: Nextron (Next.js + Electron)```

- **Language**: TypeScript# with npx

- **Database**: PostgreSQL + Prisma ORM$ npx create-nextron-app my-app --example with-tailwindcss

- **UI**: Tailwind CSS, Radix UI

- **Image Editor**: TUI Image Editor (Toast UI)# with yarn

- **State**: Zustand$ yarn create nextron-app my-app --example with-tailwindcss

- **Auth**: bcrypt password hashing

# with pnpm

## Prerequisites$ pnpm dlx create-nextron-app my-app --example with-tailwindcss

````

- Node.js 18+

- PostgreSQL database (local or cloud)### Install Dependencies



## Quick Start```

$ cd my-app

### 1. Install Dependencies

# using yarn or npm

```bash$ yarn (or `npm install`)

npm install

```# using pnpm

$ pnpm install --shamefully-hoist

### 2. Setup Database```



**Option A: Docker (Recommended)**### Use it



```bash```

# Start PostgreSQL# development mode

docker compose up -d$ yarn dev (or `npm run dev` or `pnpm run dev`)



# Run migrations# production build

npm run prisma:migrate$ yarn build (or `npm run build` or `pnpm run build`)

````

**Option B: Local PostgreSQL**

```bash
# Create database
createdb snapflow

# Update .env with your connection string
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/snapflow"

# Run migrations
npm run prisma:migrate
```

**Option C: Cloud Database**

Use [Supabase](https://supabase.com), [Neon](https://neon.tech), or [Railway](https://railway.app):

1. Create a PostgreSQL database
2. Copy connection string to `.env`
3. Run `npm run prisma:push`

### 3. Run Development

```bash
npm run dev
```

## Available Scripts

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run prisma:migrate   # Create and apply migrations (dev)
npm run prisma:push      # Push schema to database (prod)
npm run prisma:studio    # Open database GUI
npm run prisma:generate  # Generate Prisma Client
```

## Docker Commands

```bash
# Start PostgreSQL
docker compose up -d

# Stop PostgreSQL
docker compose down

# Start with pgAdmin (http://localhost:5050)
docker compose --profile tools up -d

# View logs
docker compose logs -f postgres

# Connect to database
docker compose exec postgres psql -U postgres -d snapflow
```

## Database Configuration

Default connection (matches docker-compose.yml):

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/snapflow"
```

## Project Structure

```
snapflow-desktop/
├── main/              # Electron main process
│   ├── background.ts  # IPC handlers, app lifecycle
│   ├── preload.ts     # Context bridge API
│   ├── services/      # Business logic (auth, capture, etc.)
│   └── utils/         # Prisma client, session, storage
├── renderer/          # Next.js frontend
│   ├── pages/         # App pages
│   ├── components/    # React components
│   ├── store/         # Zustand state
│   └── types/         # TypeScript definitions
├── prisma/
│   └── schema.prisma  # Database schema
└── docker-compose.yml # PostgreSQL setup
```

## Features

- 📸 **Screenshot Capture**: Quick fullscreen capture with annotation tools
- 🎥 **Screen Recording**: Coming soon
- 📝 **Issue Tracking**: Organize captures with titles and descriptions
- 🖊️ **Annotations**: Professional image editor with draw, shapes, text, filters, and more
- 🔄 **Platform Sync**: Sync to GitHub Issues or Zoho Projects
- 🔒 **Secure Auth**: Local PostgreSQL database with bcrypt encryption
- 🔐 **Persistent Sessions**: Stay logged in across app restarts
- 💾 **Smart Storage**: Organized by date in ~/SnapFlow/Captures
- 🎨 **Dark Mode UI**: Beautiful dark theme interface

## Annotation Features

The built-in **TUI Image Editor** provides professional-grade annotation tools:

- ✏️ **Draw**: Freehand drawing with customizable brush sizes and colors
- 🔷 **Shapes**: Add rectangles, circles, triangles, and polygons
- ➡️ **Arrows & Lines**: Point out specific areas
- 📝 **Text**: Add labels and descriptions
- 🎨 **Filters**: Apply visual effects (blur, brightness, contrast, etc.)
- 🖼️ **Icons**: Insert predefined icons and symbols
- ↩️ **Undo/Redo**: Full history management
- 💾 **Export**: Save annotated screenshots as PNG

## First Run

1. Start the app: `npm run dev`
2. Sign up with your email and password
3. Start capturing screenshots!

**Session Management:**

- Your login session persists across app restarts
- No need to log in every time you open the app
- Sessions are stored securely in encrypted local storage
- Only cleared when you explicitly log out

## Troubleshooting

**Can't connect to database:**

```bash
# Check PostgreSQL is running
docker compose ps
# or
pg_isready
```

**Migration errors:**

```bash
npm run prisma:generate
npm run prisma:migrate
```

**Port 5432 in use:**

```bash
# Stop local PostgreSQL
brew services stop postgresql@15
# or change docker-compose.yml port
```

**Screenshot capture fails (macOS):**

If you get "Failed to get sources" error:

1. Go to **System Preferences** → **Security & Privacy** → **Privacy**
2. Select **Screen Recording** from the left sidebar
3. Check the box next to **SnapFlow** (or the Electron app)
4. Restart the app

Note: macOS 10.15+ requires explicit Screen Recording permission for screenshot capture.

## License

See LICENSE file for details.
