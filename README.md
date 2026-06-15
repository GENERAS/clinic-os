# ClinicOS

Vite + React + TailwindCSS v4 + Supabase SPA — clinic management system.

This is actually the most important design exercise of the whole project.

Most developers think:

> Dashboard = page

> Patients = page

> Appointments = page

Wrong.

Each menu item is actually a **workstation** where a user performs jobs.

If we design the jobs correctly, the UI almost designs itself.

---

# WHO USES THE SYSTEM?

Before analyzing menus, identify users:

### Owner

Wants:

* clinic performance
* staff management
* settings
* inventory health

### Receptionist

Wants:

* register patients
* create appointments
* manage today's visits

### Doctor

Wants:

* see patients
* see appointments
* update notes

### Pharmacist

Wants:

* inventory
* stock tracking

---

# 1. DASHBOARD

## Purpose

Answer:

> "What is happening right now?"

This should be the first page after login.

---

## What It Displays

### Top Cards

* Today's Appointments
* Patients Registered Today
* Low Stock Items
* Pending Notifications

---

### Today's Activity

Recent:

* Patient created
* Appointment booked
* Stock adjusted

---

### Upcoming Appointments

Next 5–10 appointments.

Show:

* patient
* doctor
* time
* status

---

### Alerts

Show:

* low stock
* missed appointments
* WhatsApp failures

---

## User Actions

Receptionist:

* create appointment
* register patient

Owner:

* view reports
* manage staff

Pharmacist:

* open inventory

---

## Design

Mobile:

```text
Card
Card
Card

Upcoming Appointments

Alerts

Recent Activity
```

Desktop:

```text
Cards Row

Appointments | Alerts

Activity Feed
```

---

# 2. PATIENTS

## Purpose

Patient database.

Not medical records.

---

## What It Displays

Patient Table:

* Name
* Phone
* Gender
* Age
* Last Visit
* Upcoming Visit

---

## Search

Most important feature.

Search:

* phone
* name

Must be instant.

---

## User Actions

### Receptionist

* create patient
* edit patient
* book appointment

### Doctor

* open profile
* view notes

---

## Patient Profile

Displays:

### Personal Info

* name
* phone
* DOB

### Appointment History

All appointments.

### Notes

Staff notes.

---

## Design

Mobile:

Patient cards.

Desktop:

Table.

---

# 3. APPOINTMENTS

## Purpose

Appointment management center.

---

## What It Displays

Table:

* Patient
* Doctor
* Date
* Time
* Status

---

## Filters

* doctor
* date
* status

---

## User Actions

Receptionist:

* create
* edit
* cancel
* reschedule

Doctor:

* update status

---

## Status Flow

```text
Scheduled
↓

Confirmed
↓

Arrived
↓

In Progress
↓

Completed
```

Alternative:

```text
Cancelled

No Show
```

---

## Design

Table-first design.

Because staff work with many appointments.

---

# 4. TODAY

This deserves its own menu.

---

## Purpose

Receptionist workspace.

Not a report.

A live operations page.

---

## What It Displays

Today's appointments only.

Grouped:

### Upcoming

### Waiting

### In Progress

### Completed

### No Show

---

## User Actions

One click:

* confirm
* arrived
* start
* complete

---

## Why Separate from Appointments?

Appointments = database.

Today = operations.

Huge difference.

---

# Design

Kanban style:

```text
Upcoming

Waiting

In Progress

Completed
```

Very fast.

---

# 5. CALENDAR

## Purpose

Visual schedule.

---

## What It Displays

Day View

Week View

Month View

---

## User Actions

* create appointment
* drag appointment
* reschedule

---

## Design

Google Calendar style.

---

## Connected To

Appointments.

Not separate data.

Same appointments.

Different view.

---

# 6. INVENTORY

## Purpose

Track medicine.

---

## What It Displays

Items:

* name
* stock
* minimum
* status

---

## User Actions

Pharmacist:

* stock in
* stock out
* adjustments

Owner:

* review stock

---

## Important Widget

Low stock alert.

Must always be visible.

---

## Design

Table.

Transaction history panel.

---

# 7. WHATSAPP

## Purpose

Communication center.

---

## What It Displays

Connection status.

Reminder statistics.

Recent messages.

---

## User Actions

Owner:

* connect WhatsApp

Receptionist:

* send reminder manually

---

## Message Log

Show:

* sent
* delivered
* read
* failed

---

## Design

Very simple.

Not chat-like.

Not inbox-style yet.

---

# 8. STAFF

## Purpose

Manage clinic team.

---

## What It Displays

Staff directory.

---

### Columns

* Avatar
* Name
* Role
* Status
* Last Login

---

## User Actions

Owner:

* invite
* suspend
* change role

---

## Design

Table.

Invite button.

---

# 9. CLINIC SETTINGS

This is actually a mini-system.

---

## Tabs

### General

* name
* email
* phone

---

### Branding

* logo

---

### Operating Hours

* opening times

---

### Preferences

* language
* currency

---

### WhatsApp Settings

* phone number
* reminders

---

## User Actions

Only Owner.

---

# 10. NOTIFICATIONS

## Purpose

Attention center.

---

## What It Displays

All alerts.

Examples:

* low stock
* WhatsApp failure
* invitation accepted
* appointment cancelled

---

## User Actions

* mark read
* open related record

---

## Design

List.

Very similar to mobile notifications.

---

# 11. PROFILE

## Purpose

Current user's account.

---

## What It Displays

* avatar
* name
* email
* role

---

## User Actions

* change photo
* change password
* update profile

---

## Design

Simple.

Do not mix clinic settings here.

---

# FEATURE CONNECTION MAP

This is what many founders forget:

```text
Dashboard
    ↓

Patients ←→ Appointments
               ↓
            Calendar
               ↓
              Today

Patients
    ↓
WhatsApp

Appointments
    ↓
WhatsApp

Inventory
    ↓
Notifications

Staff
    ↓
Appointments

Staff
    ↓
Inventory

Clinic Settings
    ↓
Everything

Profile
    ↓
Authentication

Notifications
    ↓
Every Module
```

# MOST IMPORTANT PAGE IN THE ENTIRE SYSTEM

Not Dashboard.

Not Inventory.

Not WhatsApp.

The most important page is:

```text
TODAY
```

Because receptionists will open it every morning and keep it open all day.

If "Today" becomes useful enough, ClinicOS becomes a habit.

If it doesn't, clinics may use the system only occasionally.

My next step would be to design **every screen inside the "Today" module**, because it is likely the highest daily-usage page in the entire application.

```
