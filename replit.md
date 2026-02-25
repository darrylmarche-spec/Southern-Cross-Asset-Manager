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
  - `app/project-setup.tsx` — Modal for creating/editing projects
  - `app/task/[id].tsx` — Individual task detail/editing screen
  - `app/manual-report.tsx` — Manual report creation with file attachments
  - `app/inbox.tsx` — Admin messaging inbox
- **State Management**: React Context (`AppContext`) backed by server API with AsyncStorage for current user/project session persistence only
- **Data**: Checklist task definitions are hardcoded in `data/checklist-data.ts` with ~40+ overhaul tasks and commissioning sections. All runtime data (projects, task states, reports, messages) is persisted in PostgreSQL via the Express API
- **Styling**: Plain React Native `StyleSheet` with a custom color palette (`constants/colors.ts`). Uses Inter font family via `@expo-google-fonts/inter`
- **Key Libraries**:
  - `@tanstack/react-query` for server state management (configured)
  - `expo-haptics` for tactile feedback
  - `expo-print` and `expo-sharing` for PDF report generation
  - `expo-document-picker` for file attachments in manual reports
  - `react-native-gesture-handler`, `react-native-reanimated`, `react-native-keyboard-controller`
  - `expo-glass-effect` and `expo-blur` for iOS visual effects

### Backend (Express.js)

- **Framework**: Express 5 running on Node.js
- **Entry point**: `server/index.ts`
- **Routes**: `server/routes.ts` — Full REST API with endpoints for:
  - `POST /api/auth/login` — User authentication
  - `GET/POST/DELETE /api/users` — User management
  - `GET/POST/PUT/DELETE /api/projects` — Project CRUD (with role-based filtering)
  - `GET/POST(bulk)/PUT /api/task-states` — Task state management
  - `GET/POST/PUT /api/reports` — Report management
  - `GET/POST/PUT /api/messages` — Admin messaging
- **Storage**: `server/storage.ts` defines an `IStorage` interface with a `DatabaseStorage` implementation backed by PostgreSQL via Drizzle ORM
- **Access Control**: Admin accounts (Davor, Darryl) see all projects and historical data. Team members only see projects they are currently assigned to
- **CORS**: Configured to allow Replit domains and localhost origins for development
- **Static serving**: In production, serves a built static web version of the Expo app; in development, proxies to the Expo Metro bundler
- **Build process**: `scripts/build.js` handles static export for production deployment

### Database

- **ORM**: Drizzle ORM configured for PostgreSQL (`drizzle.config.ts`) using `@neondatabase/serverless` Pool driver
- **Schema**: `shared/schema.ts` — defines 5 tables:
  - `users` — id (UUID), username, password, role
  - `projects` — id (UUID), customer, project_name, location, commission_number, escalator_type, date_of_completion, created_at, created_by, assigned_members (JSON array)
  - `task_states` — id (UUID), uid, project_id, status, assigned_to, due_date, act_duration, act_labor, comments, response, remarks, completed_by, completed_at, attachments (JSON), comment_history (JSON)
  - `reports` — id (UUID), project_id, submitted_by, submitted_at, type, content, notes, subject, status
  - `messages` — id (UUID), type, project_id, project_name, sender_username, subject, body, attachments (JSON), sent_at, read
- **Migrations**: Managed via `drizzle-kit push` (schema sync)
- **Connection**: Uses `DATABASE_URL` environment variable

### Data Model

- **Users**: Default admin accounts (Davor/adminpassword, Darryl/schindler1) seeded on server start. New team members created with default password "password123"
- **Projects**: Created by admins with team member assignments. Admins see all projects; members see only assigned projects
- **Task Definitions**: Static list of ~40+ tasks across 11 sections (Overhaul Workflow + 10 Commissioning sections) defined in `data/checklist-data.ts`
- **Task States**: Per-project task tracking stored in PostgreSQL: status, assigned user, actual duration/labor, response values, remarks, completion timestamps, attachments, comment history
- **Reports**: Generated or manual reports stored in PostgreSQL with project association
- **Messages**: Admin inbox messages stored in PostgreSQL

### Authentication

- Server-side authentication via `/api/auth/login` endpoint
- Passwords stored in PostgreSQL users table
- Client stores current user session in AsyncStorage for persistence across app restarts
- Role-based access: admin role sees all data, member role sees only assigned projects

## External Dependencies

- **PostgreSQL**: Database provisioned via Replit, connected through `DATABASE_URL` environment variable. Used with Drizzle ORM for all data persistence
- **Expo Services**: Uses various Expo SDK modules for device features (haptics, printing, sharing, document picker)
- **Google Fonts**: Inter font family loaded via `@expo-google-fonts/inter`
- **No external APIs or third-party services** are currently integrated beyond the Expo ecosystem
