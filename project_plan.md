# Contracting Operations Intake Manager

## 1. Project Description
Internal enterprise web application for a Contracting Operations team. Replaces an Excel-based Intake tracker with a database-first single-source-of-truth workflow: **Assignment → Contracting Work → Tracker**. Three roles (Administrator, Contracting Admin/Specialist, Management) collaborate on a single Intake record across every page.

- Target users: Contracting Operations teams (enterprise B2B, healthcare-adjacent).
- Design cues: Kaiser Permanente enterprise UI — white backgrounds, subtle gray cards, green accents, rounded corners, color-coded status badges, clean typography.

## 2. Page Structure
- `/` — redirects to Dashboard
- `/dashboard` — KPIs, charts, trend analytics
- `/assignment-center` — Administrator creates & assigns new Intakes
- `/my-intakes` — Personal work queue (Contracting Admin/Specialist)
- `/database` — General Database (search, filter, sort, pagination, export)
- `/reports` — Reports & Dashboards (advanced analytics)
- `/intake/:id` — Intake detail (Phase 1 read-only summary + Phase 2 editable workspace + comment history)

## 3. Core Features
- [x] Three-role permission model with role switcher (demo mode until auth is wired)
- [x] Single Intake data model shared by every page (no duplicate entry)
- [x] Phase 1 Assignment form (Admin-only)
- [x] Phase 2 Contracting workspace (editable by Owner / Backup Owner)
- [x] Phase 3 Tracker (auto-generated view)
- [x] Ticketing-style comment history (never overwrite)
- [x] Global Search, Filters, Sort, Pagination, Export to Excel
- [x] Dropdowns for controlled vocab (Request Type, LOB, KP Entity, Contract Type, Status, Root Cause, Priority, Owner, Backup Owner)
- [x] Color-coded status & priority badges
- [x] Dashboards: totals, SLA, avg completion, by Owner / LOB / Contract Type / KP Entity, monthly trend, root cause
- [x] Calculated fields: Completion Time, Days in Process, Out of SLA, Assignment/Finishing Month & Year, Last Updated, Latest Comment

## 4. Data Model Design
Designed to map 1:1 to a future Supabase `intakes` table plus a related `intake_comments` table.

### Table: intakes
| Field | Type | Description |
|-------|------|-------------|
| id | uuid | PK |
| intake_number | text | Entered by Admin (from COUPA) |
| request_type | text | Dropdown |
| line_of_business | text | Dropdown |
| supplier_name | text | |
| kp_entity | text | Dropdown |
| fda_name | text | |
| fda_nuid | text | |
| requester_name | text | |
| requester_nuid | text | |
| assigned_owner | text | Dropdown |
| backup_owner | text | Dropdown |
| assignment_date | date | |
| priority | text | Dropdown |
| assignment_comments | text | |
| contract_number | text | Phase 2 |
| contract_type | text | Phase 2 dropdown |
| estimated_contract_amount | numeric | Phase 2 |
| received_date | date | Phase 2 |
| status | text | Dropdown |
| finishing_date | date | Phase 2 |
| root_cause | text | Dropdown |
| documents_received | text | |
| missing_information | text | |
| internal_notes | text | |
| follow_up_notes | text | |
| final_comments | text | |
| last_updated | timestamptz | |
| last_updated_by | text | |
| created_at | timestamptz | |

### Table: intake_comments
| Field | Type | Description |
|-------|------|-------------|
| id | uuid | PK |
| intake_id | uuid | FK |
| user_name | text | |
| user_role | text | |
| type | text | assignment / internal / follow-up / timeline |
| body | text | |
| created_at | timestamptz | |

## 5. Backend / Third-party Integration Plan
- Supabase: **planned** — currently mocked via a typed in-memory store with the same field names, so swap-in requires only replacing the store implementation.
- Shopify / Stripe: not applicable.

## 6. Development Phase Plan

### Phase 1: Application shell + core workflow (current)
- Goal: Deliver the complete visual + interactive app on top of a shared in-memory store.
- Deliverable: All pages (Dashboard, Assignment Center, My Intakes, General Database, Reports, Intake Detail), role switcher, comments, filters, KPIs, charts.

### Phase 2: Supabase integration (current)
- Goal: Replace mock store with Supabase tables + Auth + RLS policies matching the role permissions.
- Deliverable: Real users, persistent Intakes and comments, RLS-enforced row access.
- Status: ✅ Complete
  - Database schema aligned with app data model
  - Row Level Security enabled on intakes and comments tables
  - Auth trigger auto-creates public.users record on Supabase signup
  - Login/Signup page with Supabase Auth
  - AuthProvider wraps the app, sessions persist across refreshes
  - Supabase-backed store with in-memory cache for fast reads
  - All CRUD operations write to Supabase first, then update cache
  - Real-time subscriptions for live updates across sessions
  - Fallback to mock seed data when database is empty
  - Role switcher removed — user role comes from auth

### Phase 3: Documents & notifications
- Goal: File uploads for supporting documents (Supabase Storage), email notifications on assignment/status change.