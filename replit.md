# SCS Checklist

## Overview

SCS Checklist is a mobile application that digitizes Schindler escalator and moving walk checklists. It covers two main workflows: an **Overhaul Workflow** (tracking estimated vs actual duration/labor for each step of escalator overhaul) and a **Commissioning Checklist** (with pass/fail/N/A responses across multiple inspection sections). The app supports multiple users, project management, task tracking with progress dashboards, and PDF report generation.

Built with **Expo (React Native)** for the frontend and **Express.js** for the backend API server, designed to run on Replit with PostgreSQL as the database.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (Expo / React Native)

- **Framework**: Expo SDK 54 with React Native 0.81, using the new architecture
- **Routing**: `expo-router` with file-based routing and typed routes enabled
  - `app/index.tsx` — Login screen
  - `app/(tabs)/` — Main tabbed interface (Dashboard, Checklist, Completed, Settings)
  - `app/project-setup.tsx` — Modal for creating new projects
  - `app/task/[id].tsx` — Individual task detail/editing screen
- **State Management**: React Context (`AppContext`) with `AsyncStorage` for local persistence. The AppContext manages users, projects, task states, login/logout, and all CRUD operations client-side
- **Data**: Checklist task definitions are hardcoded in `data/checklist-data.ts` with ~40+ overhaul tasks and commissioning sections. Task state (completion, responses, actual hours) is stored per-project
- **Styling**: Plain React Native `StyleSheet` with a custom color palette (`constants/colors.ts`). Uses Inter font family via `@expo-google-fonts/inter`
- **Key Libraries**:
  - `@tanstack/react-query` for server state management (configured but mostly unused — data currently lives in AsyncStorage)
  - `expo-haptics` for tactile feedback
  - `expo-print` and `expo-sharing` for PDF report generation
  - `react-native-gesture-handler`, `react-native-reanimated`, `react-native-keyboard-controller`
  - `expo-glass-effect` and `expo-blur` for iOS visual effects

### Backend (Express.js)

- **Framework**: Express 5 running on Node.js
- **Entry point**: `server/index.ts`
- **Routes**: `server/routes.ts` — currently minimal, provides the HTTP server scaffold with `/api` prefix convention
- **Storage**: `server/storage.ts` defines an `IStorage` interface with a `MemStorage` implementation (in-memory). This is the layer to swap in database-backed storage
- **CORS**: Configured to allow Replit domains and localhost origins for development
- **Static serving**: In production, serves a built static web version of the Expo app; in development, proxies to the Expo Metro bundler
- **Build process**: `scripts/build.js` handles static export for production deployment

### Database

- **ORM**: Drizzle ORM configured for PostgreSQL (`drizzle.config.ts`)
- **Schema**: `shared/schema.ts` — currently defines only a `users` table with id, username, password
- **Migrations**: Output to `./migrations` directory
- **Connection**: Uses `DATABASE_URL` environment variable
- **Current state**: The schema is minimal. Most app data (projects, tasks, task states) is managed client-side in AsyncStorage via AppContext. The database infrastructure is in place but not fully utilized — the app is designed to eventually move this data server-side

### Data Model (Client-Side)

- **Users**: Hardcoded default users in `checklist-data.ts` (e.g., "Darryl", "TeamMember1")
- **Projects**: Created by users with fields: customer, project name, location, commission number, escalator type, date of completion
- **Task Definitions**: Static list of ~40+ tasks across 11 sections (Overhaul Workflow + 10 Commissioning sections)
- **Task States**: Per-project task completion tracking with: status (pending/completed), assigned user, actual duration/labor, response values (yes/no/pass/fail/N/A), remarks, completion timestamps

### Authentication

- Simple username/password authentication stored in AsyncStorage on the client side
- No server-side auth currently implemented (the Drizzle users table exists but isn't wired up)
- Login state persists across app restarts via AsyncStorage

## External Dependencies

- **PostgreSQL**: Database provisioned via Replit, connected through `DATABASE_URL` environment variable. Used with Drizzle ORM for schema management (`drizzle-kit push` for migrations)
- **Expo Services**: Uses various Expo SDK modules for device features (haptics, printing, sharing, image picker, location)
- **Google Fonts**: Inter font family loaded via `@expo-google-fonts/inter`
- **No external APIs or third-party services** are currently integrated beyond the Expo ecosystem