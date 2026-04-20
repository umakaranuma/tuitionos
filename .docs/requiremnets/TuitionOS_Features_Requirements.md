# Tuition Management SaaS — Features & Requirements
## Sri Lanka Edition · Solo Developer · 2026

---

## 1. Platform overview

A multi-tenant SaaS platform for Sri Lankan tuition institutes. Built solo using Django, Next.js, MySQL, and Supabase. Two tiers: **Basic (LKR 3,000/mo)** and **Premium (LKR 6,000/mo)**.

**Revenue target:** USD 2,000/mo MRR — achievable at 55 Basic + 20 Premium customers.

---

## 2. Super admin panel

The super admin is the solo developer's control centre for managing all institutes and income.

### 2.1 Institute management

| Capability | Detail |
|---|---|
| View all institutes | Name, district, plan, student count, billing status |
| Search & filter | By plan (Basic/Premium), status (Paid/Due/Overdue/Trial), district |
| Add institute | Manual onboarding with plan selection |
| Edit institute | Plan upgrade/downgrade, contact details, subdomain |
| Suspend institute | Locks login on 21-day overdue — auto or manual |
| View institute detail | Students, batches, storage used, fee history |

### 2.2 Income management

| Capability | Detail |
|---|---|
| MRR dashboard | Total MRR, collected vs outstanding, month-on-month growth |
| Monthly breakdown | Basic collected, Premium collected, outstanding, USD equivalent |
| Invoice list | All invoices with PDF export, status badges, remind/suspend actions |
| Manual invoice | Create one-off invoices for edge cases |
| Auto-reminders | WhatsApp on day 3 overdue, suspend on day 21 — toggleable |
| Monthly summary email | Auto-sent to developer on 1st of each month |

### 2.3 Alerts system

- Overdue institutes with contact number — one-click "Mark paid" or "Suspend"
- Trial expiry warnings 3 days before end — one-click "Send upgrade nudge"
- Payment due today — one-click "Send reminder"
- All auto-reminder toggles controlled from settings panel

### 2.4 Platform settings

- Pricing control: Basic and Premium price editable
- Feature flags: student caps, SMS alerts, new registration toggle
- Basic cap: 200 students enforced at enrollment
- Premium: unlimited students

---

## 3. Notification system (Premium only)

All notifications use **WhatsApp Business API** via Meta Cloud. SMS used only as fallback for the ~8% without WhatsApp.

### 3.1 Notification types

#### Fee reminder
- **Trigger:** 1st of every month, 9:00 AM
- **Recipients:** All enrolled students' parents
- **Channel:** WhatsApp text
- **Cost:** ~LKR 2/msg
- **Template:** `Dear Parent, the monthly fee of LKR {{amount}} for {{student_name}} ({{batch_name}}) at {{institute_name}} is due for {{month}}. Please pay at the institute. Thank you.`
- **Disableable:** Yes, per institute

#### Fee paid confirmation
- **Trigger:** Immediately when admin marks fee as paid
- **Recipients:** That student's parent only
- **Channel:** WhatsApp text
- **Cost:** ~LKR 2/msg
- **Template:** `Payment confirmed. LKR {{amount}} received for {{student_name}} — {{month}} fee at {{institute_name}}. Ref: {{ref_id}}. Thank you.`
- **Disableable:** No — always fires

#### Timetable change alert
- **Trigger:** Admin saves a batch schedule change
- **Recipients:** Students enrolled in that batch only (not whole institute)
- **Channel:** WhatsApp text for minor changes (1–2 sessions); WhatsApp PDF document for 3+ session changes
- **Cost:** ~LKR 2 (text) / LKR 3 (document)
- **Template:** `Schedule update from {{institute_name}}: {{subject}} class for {{batch_name}} has changed to {{new_day}} at {{new_time}}, effective {{effective_date}}. {{note}}`
- **Disableable:** Yes, admin chooses per change

#### Annual timetable PDF
- **Trigger:** Manual — admin-initiated once per year (typically January)
- **Recipients:** All enrolled students' parents
- **Channel:** WhatsApp document (PDF)
- **Cost:** ~LKR 3–5/msg · total LKR 900–1,500 for 300-student institute · amortised ~LKR 75–125/mo
- **Template:** `Dear Parent, please find {{student_name}}'s full class timetable for {{year}} from {{institute_name}} attached. Save this for reference.`
- **Disableable:** No — admin controls timing manually

#### Absent alert
- **Trigger:** End of day digest at 6:00 PM (batched — one message per parent per day regardless of subjects missed)
- **Recipients:** Parents of absent students
- **Channel:** WhatsApp text
- **Cost:** ~LKR 2/msg
- **Disableable:** Yes, per institute

### 3.2 Cost model per Premium institute

At default settings (120 students, 10% absence rate, 22 school days, LKR 2/msg):

| Notification type | Msgs/mo | Cost (LKR) | % of LKR 6,000 |
|---|---|---|---|
| Fee reminder | 120 | 240 | 4.0% |
| Fee paid confirm | ~102 | 204 | 3.4% |
| Timetable changes | ~80 | 240 | 4.0% |
| Annual PDF (÷12) | ~10 | 30 | 0.5% |
| Absent alerts | ~264 | 528 | 8.8% |
| **Total** | **~576** | **~1,242** | **~20.7%** |

**Cost-saving rules enforced:**
- Daily digest batching — one absent alert per parent per day maximum
- Parent notification cap — max 2 messages per parent per day
- Fee reminders via WhatsApp template only (never SMS)
- Timetable change: text message for minor changes, PDF only for 3+ session changes
- Annual PDF: personalised per-student single-page PDF, not full institute schedule

---

## 4. Student promotion system

### 4.1 Overview

At year-end (December/January), all students must be reviewed and moved to their next academic batch. This is the **year-end promotion flow**.

### 4.2 Three actions per student

| Action | Description | DB effect |
|---|---|---|
| **Promote** | Move to next grade batch | New `student_batch_enrollment` created (active, new year); old record archived |
| **Retain** | Keep in same batch | No enrollment change; `academic_year` incremented on existing record |
| **Remove** | Deactivate student | Enrollment status set to `deactivated`; student hidden from active lists |

### 4.3 Promotion rules

- **Never delete** old enrollment records — full attendance and fee history preserved
- `student_batch_enrollment` gains: `status ENUM(active, archived, deactivated)` and `academic_year INT`
- **Batch mapping** must be configured before promotion runs: "Grade 7 Batch A → Grade 8 Batch A"
- Mapping saved as `batch_promotion_map` table — reused as suggestion next year
- A/L completers (final grade) default to **Remove** automatically
- Re-sitting students default to **Retain**

### 4.4 Promotion flow

1. Admin opens "Year-end promotion" panel in December
2. System lists all active batches with student counts
3. For each batch, admin sees all students with default action pre-set
4. Admin can bulk "Promote all" or override individual students
5. Batch mapping dropdown shows existing next-year batches or "Create new"
6. Admin clicks "Confirm & notify parents"
7. System:
   - Archives old `student_batch_enrollment` records
   - Creates new enrollment in next-year batch
   - Generates personalised timetable PDF per student
   - Queues WhatsApp document messages via Celery (10-second delay between sends)
   - Sends: `Your child [Name] has been promoted to [New Batch] for [Year]. Please find their new timetable attached.`

### 4.5 Database schema additions

```sql
ALTER TABLE student_batch_enrollment
  ADD COLUMN status ENUM('active','archived','deactivated') DEFAULT 'active',
  ADD COLUMN academic_year INT NOT NULL DEFAULT 2026,
  ADD COLUMN promoted_at DATETIME NULL,
  ADD COLUMN promoted_by INT NULL REFERENCES users(id);

CREATE TABLE batch_promotion_map (
  id INT AUTO_INCREMENT PRIMARY KEY,
  institute_id INT NOT NULL,
  from_batch_id INT NOT NULL,
  to_batch_id INT NOT NULL,
  academic_year INT NOT NULL,
  UNIQUE KEY unique_map (institute_id, from_batch_id, academic_year)
);
```

### 4.6 Edge cases

| Scenario | Handling |
|---|---|
| Next-year batch does not exist yet | Admin creates it during promotion flow |
| Student enrolled in multiple batches | Each enrollment promoted/retained/removed independently |
| Parent has no WhatsApp | Falls back to SMS text (no PDF attachment) |
| Admin runs promotion twice by mistake | Idempotent — checks for existing active enrollment before creating new one |
| Institute on Basic plan | Promotion runs, but no WhatsApp notification sent |

---

## 5. Pricing & tier features

| Feature | Basic (LKR 3,000) | Premium (LKR 6,000) |
|---|---|---|
| Students | Up to 200 | Unlimited |
| Batches | Up to 10 | Unlimited |
| Storage | 1 GB | 5 GB |
| Attendance marking | Yes | Yes |
| Fee tracking | Yes | Yes |
| PDF fee reports | Attendance only | All reports |
| WhatsApp notifications | No | Yes (all 5 types) |
| Annual timetable PDF blast | No | Yes |
| Year-end promotion | Yes (manual only) | Yes (with auto-notify) |
| Support | Email 72h | Email + WhatsApp 24h |
| Free trial | 14 days | 14 days |

---

## 6. Revenue model

| Scenario | Basic customers | Premium customers | MRR (LKR) | MRR (USD) |
|---|---|---|---|---|
| Launch (Q1) | 5 | 2 | 27,000 | ~87 |
| Growth (Q2) | 20 | 8 | 108,000 | ~348 |
| Scale (Q3) | 45 | 20 | 255,000 | ~823 |
| Target (Q4) | 55 | 20 | 285,000 | ~919 |
| Goal achieved | 55 | 30 | 345,000 | ~1,113 |
| **$2,000 target** | **80** | **30** | **420,000** | **~1,355** |

> Exchange rate assumed: LKR 310 = USD 1. Target reached at approximately 80 Basic + 30 Premium.

---

## 7. Tech stack

| Component | Technology | Hosting | Est. cost |
|---|---|---|---|
| Backend | Django 5 + DRF | Railway | USD 5/mo |
| Frontend | Next.js 14 | Vercel | USD 0/mo |
| Database | MySQL 8 | PlanetScale | USD 0/mo |
| Media | Supabase S3 | Supabase | USD 0–25/mo |
| Task queue | Celery + Redis | Railway | USD 5/mo |
| WhatsApp | Meta Cloud API | Meta | ~LKR 2/msg |
| SMS fallback | Dialog Axiata | Dialog | ~LKR 2/msg |
| Payments | Stripe | Stripe | 2.9% + 0.30 |
| PDF generation | WeasyPrint / ReportLab | In-app | USD 0 |

**Total infra at launch:** USD 10–15/mo
**Total infra at 100 customers:** USD 40–60/mo

---

## 8. Build roadmap (solo developer)

| Phase | Weeks | Deliverables |
|---|---|---|
| 1 — Foundation | 1–2 | Django, MySQL schema, multi-tenant middleware, Supabase |
| 2 — Core CRUD | 3–5 | Institutes, subjects, teachers, batches API + Next.js admin UI |
| 3 — Students | 6–7 | Enrollment, batch assignment, attendance marking |
| 4 — Fees & reports | 8–9 | Fee tracking, PDF export, dashboard |
| 5 — Notifications | 10 | Celery tasks, WhatsApp API, all 5 notification types |
| 6 — Promotion | 11 | Year-end promotion flow, batch mapping, DB schema additions |
| 7 — Launch prep | 12 | Stripe billing, subdomain routing, onboarding wizard |

---

*Document version: 1.0 · April 2026 · TuitionOS — Sri Lanka*
