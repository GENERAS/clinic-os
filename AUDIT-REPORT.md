# ClinicOS Full System Audit Report

**Date:** July 11, 2026
**Scope:** All 24 modules against real-world clinic specification
**Codebase:** 75 DB tables, 40 migrations, 61 page routes, ~210 source files

---

## EXECUTIVE SUMMARY

| Category | Count |
|---|---|
| **Fully Working Modules** | 5 (System Setup, Appointments, Triage, Reports, Compliance) |
| **Mostly Working (bugs/gaps)** | 9 (Patient Mgmt, Consultation, Lab, Pharmacy, Inventory, Billing, Insurance, Dashboard, Staff) |
| **Partially Implemented** | 2 (Accounting, HR) |
| **Completely Missing** | 3 (Admission/IPD, Referrals, Patient Portal) |
| **Architecturally Broken** | 2 (Reception/Check-in, Cashier) |
| **Critical RLS Security Holes** | 26 tables with permissive `USING (true)` |

---

## MODULE-BY-MODULE STATUS

### Module 1: System Setup ⚙️ — 90% COMPLETE

**What Works:**
- Clinic profile (name, email, phone, address, website, description, timezone)
- Logo upload/delete with Supabase storage
- Operating hours editor (7-day grid with per-day toggles)
- Preferences (currency, language, date/time format)
- Notification settings (appointment reminders, low stock, system alerts)
- All forms use react-hook-form + Zod validation
- Owner-only guards on sensitive operations

**Bugs Found:**
| # | Severity | Issue |
|---|---|---|
| 1 | HIGH | `ClinicProfileForm` rendered without `isOwner` prop — non-owners can edit clinic profile |
| 2 | MEDIUM | Operating hours delete-then-insert is not atomic — partial failure loses all hours data |
| 3 | MEDIUM | `DAY_LABELS[0]="Monday"` but JS `getDay()` returns 0=Sunday — latent day-swap bug |
| 4 | LOW | Logo upload has no client-side file type/size validation |

**Missing:**
- No multi-branch/multi-location support (DB has single `clinics` table)
- Preferences stored but never read by other modules (currency, date format ignored)

---

### Module 2: User & Role Management 👨‍⚕️ — 70% COMPLETE

**What Works:**
- Auth: signup, login, logout, forgot/reset password (Supabase Auth)
- Staff list with search/filter/pagination
- Invite staff (email + role, token-based, 7-day expiry)
- Staff detail page (avatar, role display, status, audit log)
- Status management (active/inactive/suspended)
- Soft-delete (prevents removing last Owner)
- Permission system: 21 permissions, `hasPermission`/`hasRole`/`can` utilities
- `PermissionGuard` and `RoleGuard` components
- `get_user_context` RPC for fast auth bootstrap

**Bugs Found:**
| # | Severity | Issue |
|---|---|---|
| 1 | CRITICAL | Role change dropdown is hardcoded `<option value="owner">Owner</option>` — only 1 role selectable, broken stub |
| 2 | HIGH | `getStaff()` filters out users without roles — new signups become invisible |
| 3 | MEDIUM | No invitation acceptance flow — `inviteStaff()` creates token but no page to accept it |
| 4 | MEDIUM | `deleteAvatar` sets URL to null but never deletes file from storage — orphaned files |
| 5 | MEDIUM | No UI form to edit staff profile (name, phone, email) — `updateStaff()` service exists but unused |
| 6 | LOW | Two parallel paths for profile update: `authService.updateProfile` vs `staff-service.updateStaff` |

**Missing:**
- No role CRUD UI (roles are seed-only)
- No invitation acceptance page
- No 2FA/MFA
- No session management
- No bulk operations (invite, role change, deactivate)
- Missing roles: Nurse, Lab Technician, Cashier, Accountant, Administrator

---

### Module 3: Master Data 📚 — 20% COMPLETE

**What Works:**
- `service_catalog` table exists with name, category, price, tax_classification
- Insurance providers referenced in billing code (hardcoded maps)
- Medicines partially covered via consultation prescription seed data

**What's Missing:**
- **No Master Data UI page** — no dedicated management interface
- No insurance provider management (CRUD for providers, coverage %, rules)
- No laboratory test catalog (tests created ad-hoc from consultation)
- No medicine master data management (prescriptions use free-text + seed data)
- No service catalog management page (services only editable via DB seed)
- No department management
- No room management
- No ICD diagnosis code catalog

**Assessment:** This is a critical gap. Without master data management, clinics cannot configure their own services, tests, or insurance providers.

---

### Module 4: Patient Management 👤 — 75% COMPLETE

**What Works:**
- Full registration form (name, phone, email, gender, DOB, address, national ID, emergency contacts)
- 16-digit Rwanda NID validation
- Duplicate detection on phone + NID
- Patient list with search, pagination, computed stats
- Patient profile page with visit history, appointments, notes
- Insurance info on patient record (flat columns)
- Audit logging on create/update

**Bugs Found:**
| # | Severity | Issue |
|---|---|---|
| 1 | MEDIUM | No NID uniqueness check on update — can overwrite another patient's NID |
| 2 | MEDIUM | "Total Visits" stat actually counts appointments (including cancelled/no_show) |
| 3 | MEDIUM | Notes can only be added, never edited or deleted |
| 4 | LOW | Patient search uses raw `ilike` — no full-text search index |

**Missing:**
- No patient delete/soft-delete
- No medical history section (allergies, chronic diseases, past surgeries)
- No family history tracking
- No patient document uploads (lab results, referrals)
- Emergency contacts are flat text, not structured
- Insurance info on `patients` table conflicts with `patient_insurance` table (dual model)

---

### Module 5: Appointment Management 📅 — 80% COMPLETE

**What Works:**
- Full CRUD with status state machine (scheduled→confirmed→arrived→in_progress→completed)
- Conflict detection (prevents double-booking same doctor/time)
- Status history audit trail
- Calendar views (month/week/day)
- Today page with Kanban-style status columns
- WhatsApp automation on create/cancel
- Realtime updates on detail page
- Reschedule with conflict check

**Bugs Found:**
| # | Severity | Issue |
|---|---|---|
| 1 | HIGH | Hard-coded `12000 RWF` lost revenue on every cancellation — pollutes revenue_recovery table |
| 2 | HIGH | `updateAppointment` doesn't validate status — can edit completed/cancelled appointments |
| 3 | MEDIUM | Reschedule doesn't validate status or past dates |
| 4 | MEDIUM | Inconsistent cancelled/no_show filtering across different query methods |
| 5 | LOW | `getDoctors` hardcodes role name "Doctor" — fragile |

**Missing:**
- No drag-and-reschedule on calendar
- No appointment source tracking (walk-in, phone, website, WhatsApp, referral)
- No appointment capacity/limit per doctor per day
- No waitlist management

---

### Module 6: Reception & Check-in 🏥 — 25% BROKEN

**What Works:**
- Patient search (by name, phone, NID)
- `arrived` status in appointment state machine
- Visit creation happens through consultation flow

**What's Broken/Missing:**
- **No dedicated reception page or workflow**
- **Two competing queue systems** — triage queue and scheduling queue are separate, unconnected
- No walk-in quick registration flow
- No check-in confirmation UI
- No visit number generation (VIS-2026-00001 format specified)
- No queue number assignment UI
- No unified patient flow dashboard for reception

**Assessment:** This is architecturally broken. The blueprint requires a simple receptionist workflow; currently, queue management is fragmented across 3 systems (appointment statuses, triage queue, scheduling queue).

---

### Module 7: Triage ❤️ — 85% COMPLETE

**What Works:**
- Full vital signs recording (8 metrics + auto-BMI)
- Chief complaint input with quick-select from 38 Rwanda-common complaints
- 4-tier urgency classification (emergency/urgent/routine/non_urgent)
- Allergies and current medications capture
- Active/completed queue tabs with patient search
- "Start Consultation" button routes to consultation with pre-filled data
- Status flow: waiting→in_consultation→completed

**Bugs Found:**
| # | Severity | Issue |
|---|---|---|
| 1 | MEDIUM | `getTriageCounts` fetches ALL records for counting — no date filter, expensive at scale |
| 2 | LOW | No edit/update of existing triage record |
| 3 | LOW | No realtime queue updates |
| 4 | LOW | No pagination on queue list |

**Missing:**
- No vital sign reference ranges (normal vs abnormal detection)
- No patient history view from triage
- No role-based access (nurse-only)

---

### Module 8: Doctor Consultation 🩺 — 75% COMPLETE

**What Works:**
- SOAP-style form (vitals, chief complaint, HPI, exam, assessment, plan, follow-up)
- 38 quick-select complaints, 30 diagnoses with ICD-10 codes, 60+ medicines
- Allergy cross-check against triage record with inline warning
- Draft vs Complete save paths
- Completing auto-marks appointment + triage as completed
- ConsultationView with prescription preview + print
- Investigation ordering integrated
- Realtime investigation result updates
- Rwanda-specific seed data (medicines, diagnoses, tests, vital sign ranges)

**Bugs Found:**
| # | Severity | Issue |
|---|---|---|
| 1 | HIGH | Appointment completion uses `data.appointment_id` from form data instead of existing consultation record — may be undefined |
| 2 | MEDIUM | `ConsultationForm` accesses `consultService.supabase` directly — breaks encapsulation |
| 3 | MEDIUM | No validation — can complete with zero diagnoses, zero vitals |
| 4 | MEDIUM | "Share via WhatsApp" button has no onClick handler |
| 5 | LOW | `normalizeVitals` duplicated in two files |
| 6 | LOW | Age calculation off by ~1 year (uses year difference only) |

**Missing:**
- No edit existing consultation
- No print consultation notes (only prescriptions printable)
- No referral workflow (treatment plan is free text)
- No template/note shortcuts
- No clinical decision support

---

### Module 9: Laboratory 🧪 — 60% COMPLETE

**What Works:**
- Investigation ordering from consultation
- Lab Results Portal with status filtering
- Result entry (value, unit, reference range, abnormal flag)
- Status flow: ordered→sample_collected→in_progress→completed
- Realtime updates to consultation view
- 40+ investigation seed tests with categories

**Bugs Found:**
| # | Severity | Issue |
|---|---|---|
| 1 | CRITICAL | `updateResult` doesn't filter by `clinic_id` — any clinic can update any investigation |
| 2 | MEDIUM | No status progression UI — can only enter results or change status via dropdown |
| 3 | MEDIUM | Result entry allows going backward in status (completed→sample_collected) |

**Missing:**
- No standalone test ordering (only from consultation)
- No sample collection tracking
- No PDF/print of lab results
- No patient investigation history view
- No abnormal result alerting
- No result validation workflow (second signature for critical results)
- No test catalog management

---

### Module 10: Radiology 🩻 — 0% COMPLETE

**Nothing exists.** No tables, no services, no pages.

**Missing (entire module):**
- No imaging service catalog (X-Ray, Ultrasound, MRI, CT Scan)
- No image storage/upload
- No radiology report creation
- No PACS integration
- No image viewer

**Assessment:** This requires dedicated image storage infrastructure and a viewer component. Significant development effort.

---

### Module 11: Pharmacy 💊 — 65% COMPLETE

**What Works:**
- Pending prescriptions queue grouped by patient
- Prescription detail with inventory item linking
- Batch selection with FEFO (first-expiry-first-out) ordering
- Dispense flow: creates dispensation record, updates prescription status, decrements batch + item stock
- Near-expiry alerts, low stock count
- Pharmacy stats header

**Bugs Found:**
| # | Severity | Issue |
|---|---|---|
| 1 | HIGH | `getPharmacyStats` queries `prescriptions.clinic_id` but prescriptions don't have that column — likely returns null |
| 2 | HIGH | No server-side stock-over-dispense protection — `Math.max(0, ...)` silently zeros out |
| 3 | MEDIUM | Race condition: two simultaneous dispenses read same stock value, both decrement |
| 4 | MEDIUM | Dead code: first `.select()` call result is never used |
| 5 | LOW | "Search all inventory" uses browser `prompt()` — terrible UX |

**Missing:**
- No dispensation history/audit log
- No "Dispense All" shortcut
- No printed dispensing label/receipt
- No return/undo dispense
- No stock adjustment from pharmacy (damaged/expired goods)
- No patient counseling notes

---

### Module 12: Inventory 📦 — 75% COMPLETE

**What Works:**
- Full CRUD for items + categories
- Stock tracking (stock_in, stock_out, expired, adjustment)
- Batch management (batch number, expiry, cost price)
- Transaction history per item
- Stats (total/low/out-of-stock)
- Advanced: suppliers, purchase orders, stock transfers, reorder suggestions, inventory valuation
- Category caching, responsive UI

**Bugs Found:**
| # | Severity | Issue |
|---|---|---|
| 1 | HIGH | `getInventoryItems` status filter loads ALL items client-side — O(N) scan, no pagination |
| 2 | HIGH | `getLowStockItems` also loads ALL items — full table scan |
| 3 | MEDIUM | No duplicate batch number check |
| 4 | MEDIUM | No expired batch auto-deduction or flagging on list page |
| 5 | LOW | Module-level singleton `_catCache` never expires |

**Missing:**
- No item delete/soft-delete
- No barcode/SKU field
- Stock transfers don't deduct from source clinic
- No auto-reorder triggers
- No consumption forecasting

---

### Module 13: Procedure Management 🔬 — 15% COMPLETE

**What Exists:**
- `procedure_consumables` table exists (maps procedures to inventory items with quantities)
- `advanced-inventory.service.js` has `getProcedureConsumables` and `autoDeductConsumables`

**What's Missing:**
- **No procedure UI** — no page to record procedures
- No procedure catalog
- No procedure recording form (type, date, doctor, patient, outcome)
- No automatic inventory deduction workflow (service method exists but unused)
- No procedure billing integration
- No procedure history per patient

---

### Module 14: Billing 💰 — 65% COMPLETE

**What Works:**
- Auto-generated invoice numbers (BILL-YYYY-NNNNNN)
- Line items with service catalog linking
- Tax classification per Rwanda classes (A=18%, B/C/D=0%)
- Payment recording (cash, MoMo, Airtel, bank, card, insurance)
- Invoice status lifecycle (draft→issued→partially_paid→paid→cancelled→refunded)
- Financial summary with date filtering
- Insurance claims creation from billing
- Fiscal receipt generation (RRA payload)

**Bugs Found:**
| # | Severity | Issue |
|---|---|---|
| 1 | CRITICAL | `INSURANCE_SPLITS` defined in BOTH `billing.service.js` and `insurance.service.js` with different values |
| 2 | HIGH | Patient insurance uses flat columns on `patients` table while insurance module uses `patient_insurance` table — two separate data models |
| 3 | MEDIUM | Print button has no onClick handler — no-op |
| 4 | MEDIUM | No invoice cancel/void capability |
| 5 | MEDIUM | No payment refund capability |
| 6 | MEDIUM | Tax calculated client-side only — no server validation |
| 7 | MEDIUM | Outstanding calculation wrong — partially paid invoices counted as fully outstanding |

**Missing:**
- No invoice PDF generation
- No split payments UI (part cash + part insurance)
- No batch payment recording
- No receipt generation

---

### Module 15: Insurance 🛡️ — 55% COMPLETE

**What Works:**
- Patient insurance CRUD (provider, policy, coverage type, annual limit, validity)
- Insurance plans per clinic (coverage %, caps, pre-auth thresholds)
- Pre-authorization workflow (create, approve/reject with notes)
- Pre-auth gating (checks if cost exceeds threshold)
- Annual cap checking
- Claim items management
- ICD-to-billing-category coding validation
- Insurance dashboard with aggregate stats

**Bugs Found:**
| # | Severity | Issue |
|---|---|---|
| 1 | HIGH | Policies tab hardcodes Supabase query instead of using InsuranceService |
| 2 | HIGH | `UsageBar` always shows 0% used — `used={0}` hardcoded |
| 3 | HIGH | `checkAnnualCap` queries `insurance_claims.insurance_id` but claims don't set that column |
| 4 | MEDIUM | No claims management tab — claims only created from BillingPanel |
| 5 | MEDIUM | No claim item management UI (service methods exist but unused) |
| 6 | MEDIUM | Pre-auth doesn't auto-link to claims on approval |

**Missing:**
- Claims listing/management page
- Insurance verification workflow
- Bulk pre-auth approve/reject
- Insurance plan deletion
- Claim status tracking dashboard

---

### Module 16: Cashier 💵 — 30% BROKEN

**What Works:**
- Financial summary dashboard (total billed, collected, outstanding)
- Period filtering (today/week/month)
- Recent invoices list
- Payment method breakdown
- Manual refresh

**What's Broken/Missing:**
- **No payment collection workflow** — read-only dashboard, cannot take payments from this page
- **No patient search → see outstanding → record payment flow** (the core cashier use case)
- No daily reconciliation / cash drawer close
- No receipt generation
- Outstanding calculation wrong (partially paid counted as full)
- No CSV/PDF export
- "Today's Queue" links to `/triage` — likely copy-paste error

**Assessment:** This module is fundamentally incomplete. A cashier cannot actually do their job from this page.

---

### Module 17: Admission (IPD) 🏨 — 0% COMPLETE

**Nothing exists.** Zero files, zero DB tables, zero references.

**Missing (entire module):**
- Admission workflow (admit patient, assign bed/ward)
- Ward/bed management (capacity, availability)
- Discharge workflow (discharge summary, prescriptions)
- IPD billing integration
- Nursing notes / vitals tracking per admission
- Ward transfer
- Bed occupancy dashboard

---

### Module 18: Referral Management 🔄 — 0% COMPLETE

**Nothing exists.** Only a placeholder string in a textarea.

**Missing (entire module):**
- Referral creation (internal doctor-to-doctor, external clinic-to-clinic)
- Referral tracking (pending, accepted, completed)
- Referral letter generation
- Referral outcomes / feedback loop
- Receiving facility management

---

### Module 19: Accounting 📊 — 25% COMPLETE

**What Works:**
- Tax settings per clinic (TIN, EBM serial, tax rate, default tax class)
- Fiscal receipt generation (RRA payload, cryptographic signature)
- Financial summary (billed/collected/outstanding)
- Tax report by tax class with date range

**What's Missing:**
- **No expense tracking** — only revenue tracked
- **No profit & loss statement**
- **No chart of accounts / general ledger**
- **No bank reconciliation**
- **No salary/payroll expenses**
- **No rent, electricity, internet tracking**
- **No accountant role access control**
- Tax settings UI page exists but needs verification

---

### Module 20: HR 👥 — 25% COMPLETE

**What Works:**
- Staff CRUD (invite, view, role change, status, avatar)
- Invitation system with tokens
- Staff list with filters
- Staff credentials in compliance module (licenses, certifications)

**What's Missing:**
- **No payroll module**
- **No leave/vacation management**
- **No shift scheduling** (DB tables exist: `shifts`, `staff_shift_assignments` — but no UI)
- **No attendance tracking**
- **No performance reviews**
- **No contract management**
- **No training records** (separate from compliance credentials)
- Types file is empty (`export {}`)

---

### Module 21: Reporting & Analytics 📈 — 70% COMPLETE

**What Works:**
- 6 report types: Revenue, Patients, Clinical, Pharmacy, Providers, Insurance
- Period selector with 9 presets + custom date range
- Recharts visualizations (PieChart, BarChart, LineChart)
- JSON export
- Top diagnoses, top dispensed medicines, gender breakdown

**Bugs Found:**
| # | Severity | Issue |
|---|---|---|
| 1 | LOW | Export is JSON only — no CSV or PDF |
| 2 | LOW | No comparison periods (this month vs last month) |

**Missing:**
- PDF report generation
- Scheduled/automated report delivery
- Custom report builder
- Age/demographics breakdown
- Referral tracking report
- Compliance summary report
- Appointment no-show rate report

---

### Module 22: Government & Compliance 🇷🇼 — 75% COMPLETE

**What Works:**
- Staff credentials (medical/nursing/pharmacy licenses, CPR, infection control)
- Credential expiry warnings
- IPC logs (sterilization, hand hygiene, waste disposal)
- Equipment maintenance (preventive/corrective/calibration)
- Accreditation checklist with scoring
- Compliance reports (monthly MOH, DHIS2, IPC monthly, disease surveillance)
- Dashboard with compliance percentages

**Missing:**
- No RRA tax compliance integration
- No data privacy compliance tracking (consent logs exist in DB but no UI)
- No government reporting automation
- No DHIS2 auto-submission
- No alert/notification on credential expiry
- No accreditation item seeding for Rwanda MOH standards

---

### Module 23: Patient Portal 📱 — 0% COMPLETE

**Nothing exists.** Zero files, zero references.

**Missing (entire module):**
- Patient-facing authentication
- Appointment self-booking
- Lab result viewing
- Prescription history
- Invoice/payment history
- Profile management
- Messaging with clinic

**Assessment:** This requires a separate patient auth flow, potentially a separate app or subdomain. Significant architecture work.

---

### Module 24: Owner Dashboard 🚀 — 70% COMPLETE

**What Works:**
- Today's appointments with status actions (confirm, arrive)
- Live KPI strip (waiting, today, completed, consultations, alerts)
- Clinical quick-links (triage waiting, pending labs)
- Low stock alerts with links to inventory
- Activity feed (audit logs)
- Notifications panel with mark-as-read
- Task cards (low stock, pending invites, incomplete setup)
- Clinic overview card
- Realtime appointment updates
- Activation checklist for new clinics

**What's Missing:**
- **No revenue summary widget** — financials not surfaced
- **No doctor performance widget**
- **No pending approvals queue** (pre-auth, claims)
- **No appointment trend chart** (no historical visualization)
- **No compliance summary widget**
- **No expiring medicines widget** (DB tracks expiry but dashboard ignores it)
- Types file is empty

---

## CRITICAL SECURITY ISSUES

### RLS Policy Gaps (26 tables affected)

Tables from migrations 00039 and 00040 use `USING (true)` — meaning **any authenticated user from any clinic can read/write data across all clinics.** This affects:

| Table | Data Type |
|---|---|
| `patient_insurance` | Patient insurance policies |
| `insurance_pre_authorizations` | Pre-authorization requests |
| `insurance_plans` | Insurance plan configs |
| `insurance_claim_items` | Claim line items |
| `clinic_tax_settings` | TIN, EBM serial, tax rate |
| `fiscal_receipts` | Tax receipts |
| `suppliers` | Supplier contacts |
| `purchase_orders` | Purchase orders |
| `stock_transfers` | Inter-clinic transfers |
| `staff_credentials` | Medical licenses |
| `ipc_logs` | Infection control data |
| `equipment_maintenance` | Equipment records |
| `compliance_reports` | Government reports |
| `accreditation_items` | Accreditation data |
| `doctor_schedules` | Doctor schedules |
| `shifts` / `staff_shift_assignments` | Shift data |
| `queue_status` | Patient queue |
| `provider_revenue_splits` | Revenue sharing |
| `patient_consents` | Patient consent records |
| `data_access_logs` | Audit trail |
| `data_retention_policies` | Retention config |

**Fix required:** Replace `USING (true)` with proper clinic-scoped policies using `current_user_clinic_id()`.

---

## REAL-WORLD PATIENT FLOW ANALYSIS

Testing the complete flow: Setup → Register → Appointment → Check-in → Triage → Consult → Lab → Pharmacy → Billing → Payment → Receipt → Follow-up

| Step | Status | Notes |
|---|---|---|
| System Setup | ✅ | Works for single clinic |
| Master Data | ⚠️ | Seed data only — no management UI |
| Patient Registration | ✅ | Full form with duplicate detection |
| Appointment Booking | ✅ | Conflict detection works |
| Check-in / Reception | ❌ | No dedicated workflow — fragmented |
| Insurance Verification | ⚠️ | Basic — no real-time verification |
| Queue Management | ❌ | Two competing queue systems |
| Triage | ✅ | Vitals + urgency classification |
| Consultation | ✅ | SOAP form with diagnosis/prescription |
| Lab Orders | ✅ | Ordered from consultation |
| Lab Results | ⚠️ | Entry works, no sample tracking |
| Radiology | ❌ | Not implemented |
| Diagnosis | ✅ | ICD-10 coded |
| Prescription | ✅ | With allergy check |
| Pharmacy Dispensing | ⚠️ | Works but race conditions |
| Procedure | ❌ | Tables exist, no UI |
| Billing | ⚠️ | Invoice works, receipt broken |
| Cashier Payment | ❌ | No collection workflow |
| Insurance Claim | ⚠️ | Creates but no management view |
| Receipt | ❌ | Print is no-op |
| Follow-up | ⚠️ | Appointment reschedule only |
| Reports | ✅ | 6 report types with charts |
| Government Compliance | ✅ | Credential + IPC + accreditation |

**Flow Completion: ~55%** — The core clinical pathway works (register→appoint→triage→consult→prescribe), but the financial pathway and reception workflow are broken.

---

## PRIORITY FIX LIST (Ordered by Impact)

### P0 — CRITICAL (Blocks real-world use)
1. **Fix RLS policies on 26 tables** — data isolation breach
2. **Fix role change dropdown** — only "Owner" selectable
3. **Build Reception/Check-in workflow** — no unified patient flow
4. **Build Cashier payment collection** — core business function missing
5. **Fix billing/insurance data model conflict** — dual insurance storage

### P1 — HIGH (Major feature gaps)
6. Build Master Data management UI
7. Build Admission/IPD module (if needed for target clinics)
8. Build Referral management module
9. Fix pharmacy stock race conditions + dispensation tracking
10. Fix invoice receipt/print generation
11. Build insurance claims management tab
12. Add medical history to patient records

### P2 — MEDIUM (Quality improvements)
13. Fix appointment status validation on update/reschedule
14. Add expense tracking to accounting
15. Add PDF export to reports
16. Add staff profile editing form
17. Fix consultation appointment completion bug
18. Add daily reconciliation to cashier
19. Build procedure recording UI

### P3 — LOW (Polish)
20. Add patient portal (significant new work)
21. Add Radiology module (significant new work)
22. Add payroll/leave to HR
23. Add 2FA/MFA
24. Add drag-and-reschedule on calendar

---

*End of Audit Report*
