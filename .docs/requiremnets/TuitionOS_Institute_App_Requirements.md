# TuitionOS — Institute Application
## Full Requirements & Technical Specification
### `[subdomain].tuitionos.lk` · Institute Admin · Version 1.0 · 2026

---

## 1. Application overview

The Institute App is the operational system used by individual tuition institutes to manage their daily academic and financial workflow. Each institute has its own isolated subdomain, its own login, and can only see its own data — never another institute's.

**URL pattern:** `[subdomain].tuitionos.lk` (e.g. `stpatricks.tuitionos.lk`)
**Access:** Institute admin (principal, director, or office staff)
**Authentication:** Institute-specific admin user created by the developer during onboarding
**Stack:** Django REST API + Next.js frontend · MySQL multi-tenant · Supabase S3

---

## 2. How institutes access the app

### 2.1 Welcome email flow

When the developer creates an institute in the Admin App, the system automatically sends a welcome email to the institute's contact email:

```
Subject: Your TuitionOS portal is ready — St. Patrick's Academy

Dear Sundar Kumar,

Your TuitionOS institute portal has been set up successfully.

Portal URL:       https://stpatricks.tuitionos.lk
Temporary password: Xk9#mP2qL

Please log in and change your password immediately.

Your plan: Premium (LKR 6,000/month)
Trial ends: 22 April 2026

For support: WhatsApp +94 77 XXX XXXX

— TuitionOS Team
```

### 2.2 First login flow

1. Institute admin visits `https://stpatricks.tuitionos.lk`
2. Sees the TuitionOS login page branded with their institute name
3. Enters their email and the temporary password from the welcome email
4. System forces an immediate password change before proceeding
5. Admin lands on their Dashboard

### 2.3 Authentication details

| Property | Value |
|---|---|
| Login URL | `https://[subdomain].tuitionos.lk/login` |
| Session | JWT in httpOnly cookie · 12-hour expiry |
| Password reset | Email link — expires in 1 hour |
| Remember me | 30-day persistent session (optional) |
| Multi-user | Not supported in v1.0 — single admin per institute |

### 2.4 Tenant isolation — how data is kept separate

Every database query in the Institute App is automatically scoped to the institute's `institute_id`. This is enforced at the middleware layer — it is not possible for one institute's admin to see another institute's data:

```python
# middleware/tenant_middleware.py

class TenantMiddleware:
    def __call__(self, request):
        subdomain = extract_subdomain(request.get_host())
        institute = Institute.objects.get(subdomain=subdomain, is_active=True)
        request.institute = institute
        request.institute_id = institute.id
        return self.get_response(request)

# Every API view enforces this automatically via a base class:
class InstituteAPIView(APIView):
    def get_queryset(self, model):
        return model.objects.filter(institute_id=self.request.institute_id)
```

---

## 3. Plan-based feature access

The Institute App shows all screens in the sidebar but gates Premium features with a `PRO` badge and a prompt to upgrade:

| Feature | Basic | Premium |
|---|---|---|
| Dashboard | Yes | Yes |
| Subjects | Yes | Yes |
| Teachers | Yes | Yes |
| Batches | Yes (max 10) | Yes (unlimited) |
| Students | Yes (max 200) | Yes (unlimited) |
| Attendance marking | Yes | Yes |
| Fee tracking | Yes | Yes |
| Fee PDF reports | Attendance only | All reports |
| Notifications | No | Yes |
| Timetable | No | Yes |
| Year-end promotion | Manual (no notify) | Yes + auto-notify |

When a Basic institute clicks a Premium feature, they see:

```
This feature is available on Premium (LKR 6,000/mo).
Contact your TuitionOS administrator to upgrade.
```

---

## 4. Academic setup

### 4.1 Subjects

Subjects are the foundation of the system. Everything else (teachers, batches, attendance) is built on top of subjects.

**Fields:**

| Field | Type | Notes |
|---|---|---|
| subject_name | VARCHAR(100) | e.g. "Mathematics", "Physics", "Tamil Literature" |
| subject_icon_url | TEXT | Optional icon image uploaded to Supabase S3 |
| institute_id | INT FK | Auto-scoped to current institute |

**Rules:**
- Subject names must be unique within an institute
- A subject cannot be deleted if it is assigned to any active batch
- No limit on number of subjects

**Database:**

```sql
CREATE TABLE subjects (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  institute_id    INT NOT NULL REFERENCES institutes(id),
  subject_name    VARCHAR(100) NOT NULL,
  subject_icon_url TEXT NULL,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_subject (institute_id, subject_name)
);
```

### 4.2 Teachers

Teacher profiles are created and managed within the institute. Each teacher is associated with one primary subject.

**Fields:**

| Field | Type | Notes |
|---|---|---|
| name | VARCHAR(255) | Full name |
| subject_id | INT FK | Primary subject taught |
| mobile | VARCHAR(20) | Contact number |
| photo_url | TEXT | Optional — Supabase S3 · compressed to <250KB |
| institute_id | INT FK | Auto-scoped |

**Rules:**
- A teacher can teach multiple batches but has one primary subject
- A teacher cannot be deleted if they are currently assigned to an active batch
- Photo upload: JPEG/PNG only · max 5MB upload · system compresses to <250KB

**Database:**

```sql
CREATE TABLE teachers (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  institute_id    INT NOT NULL REFERENCES institutes(id),
  subject_id      INT NOT NULL REFERENCES subjects(id),
  name            VARCHAR(255) NOT NULL,
  photo_url       TEXT NULL,
  mobile          VARCHAR(20) NULL,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 4.3 Batches

A batch is the core operational unit. It groups multiple subjects (and their teachers) under one monthly fee. Students enroll into batches, not individual subjects.

**Fields:**

| Field | Type | Notes |
|---|---|---|
| batch_name | VARCHAR(255) | e.g. "Grade 10 — O/L Science Package A" |
| monthly_fee | DECIMAL(10,2) | Fee charged per student per month (LKR) |
| institute_id | INT FK | Auto-scoped |

**Batch → Teacher → Subject mapping (junction table):**

```sql
CREATE TABLE batches (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  institute_id    INT NOT NULL REFERENCES institutes(id),
  batch_name      VARCHAR(255) NOT NULL,
  monthly_fee     DECIMAL(10,2) NOT NULL,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE batch_teachers_config (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  batch_id        INT NOT NULL REFERENCES batches(id),
  teacher_id      INT NOT NULL REFERENCES teachers(id),
  subject_id      INT NOT NULL REFERENCES subjects(id),
  UNIQUE KEY unique_batch_subject (batch_id, subject_id)
);
```

**Rules:**
- Basic plan: maximum 10 batches
- Premium plan: unlimited batches
- A batch must have at least one subject-teacher mapping before students can be enrolled
- Deleting a batch is blocked if it has active enrolled students

---

## 5. Student management

### 5.1 Enrollment

Students are created at the institute level and then assigned to one or more batches.

**Student fields:**

| Field | Type | Notes |
|---|---|---|
| name | VARCHAR(255) | Student full name |
| parent_mobile | VARCHAR(20) | **Unique key for notifications** — WhatsApp number |
| institute_id | INT FK | Auto-scoped |

**Enrollment (junction table):**

```sql
CREATE TABLE students (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  institute_id    INT NOT NULL REFERENCES institutes(id),
  name            VARCHAR(255) NOT NULL,
  parent_mobile   VARCHAR(20) NOT NULL,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE student_batch_enrollment (
  student_id      INT NOT NULL REFERENCES students(id),
  batch_id        INT NOT NULL REFERENCES batches(id),
  status          ENUM('active','archived','deactivated') DEFAULT 'active',
  academic_year   INT NOT NULL DEFAULT 2026,
  promoted_at     DATETIME NULL,
  promoted_by     INT NULL REFERENCES users(id),
  PRIMARY KEY (student_id, batch_id, academic_year)
);
```

**Rules:**
- Basic plan: maximum 200 active students
- Premium plan: unlimited students
- `parent_mobile` is the unique notification key — one WhatsApp number per student record
- A student can be enrolled in multiple batches simultaneously (common in Jaffna — student attends multiple subject centres)
- Enrollment records are never deleted — they are archived or deactivated (for year-end promotion history)

### 5.2 Student list features

- Search by student name or parent mobile
- Filter by batch
- View per-student: current batches, fee status, attendance rate
- Bulk enroll from CSV (future feature — not in v1.0)

---

## 6. Attendance

### 6.1 How attendance works

Attendance is marked at the **subject level within a batch**, not at the batch level. This means if a student is enrolled in a batch that covers Mathematics, Physics, and Chemistry, three separate attendance records are created per session day — one per subject.

This granularity allows:
- Per-subject attendance reports
- Absent alerts that specify which subject was missed
- Accurate attendance rates per teacher

### 6.2 Attendance marking flow

1. Admin opens Attendance screen
2. Selects the batch from the dropdown
3. Selects the subject (or marks all subjects at once)
4. Sees all enrolled students listed
5. Marks each student as Present or Absent
6. Clicks "Save & send alerts"
7. System saves all records
8. If any student is marked Absent: Celery queues the daily digest task (fires at 6:00 PM)

### 6.3 Absent alert batching

**Critical rule:** Only ONE WhatsApp message is sent per parent per day, regardless of how many subjects the student missed.

```python
# tasks/notifications.py

@shared_task
def send_daily_absent_digest():
    """Runs at 6:00 PM every school day via Celery beat"""
    today = date.today()
    # Find all students who were absent in any subject today
    absences = Attendance.objects.filter(
        date=today,
        status='ABSENT'
    ).select_related('student', 'subject', 'student__institute')

    # Group by (institute, student) to batch per parent
    grouped = {}
    for absence in absences:
        key = (absence.institute_id, absence.student_id)
        if key not in grouped:
            grouped[key] = {
                'student': absence.student,
                'subjects': [],
                'institute': absence.student.institute,
            }
        grouped[key]['subjects'].append(absence.subject.subject_name)

    # Send one WhatsApp per parent
    for (inst_id, stud_id), data in grouped.items():
        if data['institute'].plan != 'premium':
            continue  # Premium only
        if not data['institute'].notifications_absent_enabled:
            continue

        subject_list = ' and '.join(data['subjects'])
        message = f"Dear Parent, {data['student'].name} was absent from {subject_list} today ({today.strftime('%d %b %Y')}). — {data['institute'].name}"

        send_whatsapp.delay(
            to=data['student'].parent_mobile,
            message=message
        )
```

### 6.4 Attendance database schema

```sql
CREATE TABLE attendance (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  institute_id    INT NOT NULL REFERENCES institutes(id),
  student_id      INT NOT NULL REFERENCES students(id),
  subject_id      INT NOT NULL REFERENCES subjects(id),
  batch_id        INT NOT NULL REFERENCES batches(id),
  date            DATE NOT NULL,
  status          ENUM('PRESENT','ABSENT') NOT NULL,
  marked_by       INT NULL REFERENCES users(id),
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_attendance (student_id, subject_id, date),
  INDEX idx_date_institute (date, institute_id),
  INDEX idx_student_date (student_id, date)
);
```

---

## 7. Fee tracking

### 7.1 How fees work

Each batch has a `monthly_fee` (LKR). When a student is enrolled in a batch, a monthly fee record is created for them on the 1st of each month automatically.

### 7.2 Fee record fields

```sql
CREATE TABLE fee_payments (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  institute_id    INT NOT NULL REFERENCES institutes(id),
  student_id      INT NOT NULL REFERENCES students(id),
  batch_id        INT NOT NULL REFERENCES batches(id),
  billing_month   DATE NOT NULL,             -- e.g. 2026-04-01
  amount_due      DECIMAL(10,2) NOT NULL,    -- from batch.monthly_fee at time of billing
  amount_paid     DECIMAL(10,2) DEFAULT 0,
  paid_at         DATETIME NULL,
  payment_ref     VARCHAR(100) NULL,         -- LankaQR ref, bank transfer ref, etc.
  status          ENUM('due','paid','overdue','waived') DEFAULT 'due',
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_fee (student_id, batch_id, billing_month)
);
```

### 7.3 Mark fee as paid — flow

1. Admin finds the student in the Fee tracking screen
2. Clicks "Mark paid"
3. Optionally enters a payment reference number
4. Clicks Confirm
5. System:
   - Sets `fee_payments.status = 'paid'` and `paid_at = NOW()`
   - If Premium plan: triggers `send_fee_paid_confirmation` Celery task immediately

```python
@shared_task
def send_fee_paid_confirmation(fee_payment_id: int):
    fp = FeePayment.objects.select_related('student','batch','institute').get(id=fee_payment_id)
    message = (
        f"Payment confirmed. LKR {int(fp.amount_paid):,} received for "
        f"{fp.student.name} — {fp.batch.batch_name} "
        f"({fp.billing_month.strftime('%B %Y')}) at {fp.institute.name}. "
        f"Ref: PAY-{fp.id:04d}. Thank you."
    )
    send_whatsapp.delay(to=fp.student.parent_mobile, message=message)
```

### 7.4 Fee reports

- **Basic plan:** PDF of attendance summary only
- **Premium plan:** Full fee collection report (collected, outstanding, per-batch breakdown)

PDF is generated using WeasyPrint from an HTML template and uploaded to Supabase S3 for download.

---

## 8. Notification system (Premium only)

### 8.1 Five notification types

#### 1. Fee reminder

| Property | Value |
|---|---|
| Trigger | 1st of every month · 9:00 AM · Celery beat |
| Recipients | All enrolled students' parents in the institute |
| Channel | WhatsApp Business API text message |
| Cost | ~LKR 2 per message |
| Disableable | Yes — per institute toggle |

**Template (Meta pre-approved):**
```
Dear Parent, the monthly fee of LKR {{amount}} for {{student_name}}
({{batch_name}}) at {{institute_name}} is due for {{month}}.
Please pay at the institute. Thank you.
```

**Second reminder** (day 10 for unpaid students):
```
Reminder: The monthly fee of LKR {{amount}} for {{student_name}}
at {{institute_name}} remains unpaid for {{month}}.
Please settle at your earliest. Thank you.
```

#### 2. Fee paid confirmation

| Property | Value |
|---|---|
| Trigger | Immediately when admin marks fee as paid |
| Recipients | That student's parent only |
| Channel | WhatsApp text |
| Cost | ~LKR 2 per message |
| Disableable | No — always fires |

**Template:**
```
Payment confirmed. LKR {{amount}} received for {{student_name}} —
{{month}} fee at {{institute_name}}. Ref: {{ref_id}}. Thank you.
```

#### 3. Timetable change alert

| Property | Value |
|---|---|
| Trigger | Admin saves a batch schedule change |
| Recipients | Students enrolled in that specific batch |
| Channel | WhatsApp text (1–2 session changes) · WhatsApp PDF document (3+ session changes) |
| Cost | ~LKR 2 (text) · ~LKR 3 (document) |
| Disableable | Yes — admin chooses per change |

**Template:**
```
Schedule update from {{institute_name}}: {{subject}} class for
{{batch_name}} has changed to {{new_day}} at {{new_time}},
effective {{effective_date}}. {{note}}
```

**Logic for text vs PDF:**

```python
def should_send_pdf(changed_sessions: int) -> bool:
    return changed_sessions >= 3

def notify_timetable_change(batch_id: int, changes: list):
    students = get_batch_students(batch_id)
    if should_send_pdf(len(changes)):
        # Generate updated timetable PDF for this batch
        pdf_url = generate_timetable_pdf(batch_id)
        for student in students:
            send_whatsapp_document.delay(
                to=student.parent_mobile,
                document_url=pdf_url,
                caption=build_change_caption(changes)
            )
    else:
        message = build_change_text_message(changes)
        for student in students:
            send_whatsapp.delay(to=student.parent_mobile, message=message)
```

#### 4. Annual timetable PDF

| Property | Value |
|---|---|
| Trigger | Manual — admin clicks "Send annual timetable" button |
| Recipients | All enrolled students' parents |
| Channel | WhatsApp document (PDF) |
| Cost | ~LKR 3–5 per message · LKR 936–1,560 total for 312-student institute |
| Disableable | No — admin controls timing |
| PDF type | Personalised single-page PDF per student (their batches only) |

**Implementation — rate-limited Celery chain:**

```python
@shared_task
def send_annual_timetable_blast(institute_id: int):
    institute = Institute.objects.get(id=institute_id)
    students = Student.objects.filter(
        institute_id=institute_id,
        student_batch_enrollment__status='active'
    ).distinct()

    for i, student in enumerate(students):
        # 10-second delay between sends to respect WhatsApp rate limits
        send_student_timetable.apply_async(
            args=[student.id, institute_id],
            countdown=i * 10
        )

@shared_task
def send_student_timetable(student_id: int, institute_id: int):
    student = Student.objects.get(id=student_id)
    # Generate personalised 1-page PDF
    pdf_path = generate_student_timetable_pdf(student_id)
    # Upload to Supabase, get media URL
    media_url = upload_to_supabase(pdf_path)
    # Send via WhatsApp
    message = f"Dear Parent, please find {student.name}'s full class timetable for 2026 from {student.institute.name} attached. Save this for reference."
    send_whatsapp_document.delay(
        to=student.parent_mobile,
        document_url=media_url,
        caption=message
    )
```

**Why personalised PDFs (not one shared PDF):**
- One shared PDF contains all students' schedules — privacy concern
- A 312-student PDF is too large for WhatsApp document delivery
- Per-student PDF is 1 page, loads instantly on parent's phone
- WhatsApp charges the same rate regardless of file size
- Once generated per batch, the same PDF `media_id` is reused for all students in that batch → reduces API calls

#### 5. Absent alert (daily digest)

| Property | Value |
|---|---|
| Trigger | Celery beat task at 6:00 PM every school day |
| Recipients | Parents of students marked absent that day |
| Channel | WhatsApp text |
| Cost | ~LKR 2 per message |
| Cap | Maximum 1 absent alert per parent per day regardless of subjects missed |
| Disableable | Yes — per institute toggle |

**Template:**
```
Dear Parent, {{student_name}} was absent from {{subjects}} today
({{date}}). — {{institute_name}}
```

If student missed multiple subjects: `subjects = "Physics and Chemistry"`

### 8.2 Notification cost model

At default settings per Premium institute (120 students, 10% absence rate, 22 school days, LKR 2/msg):

| Notification type | Msgs/mo | Cost (LKR) | % of LKR 6,000 |
|---|---|---|---|
| Fee reminder | 120 | 240 | 4.0% |
| Fee paid confirm | ~102 | 204 | 3.4% |
| Timetable changes | ~80 | 240 | 4.0% |
| Annual PDF (÷12) | ~10 | 30 | 0.5% |
| Absent alerts (batched) | ~264 | 528 | 8.8% |
| **Total** | **~576** | **~1,242** | **~20.7%** |

### 8.3 WhatsApp API technical implementation

```python
# services/whatsapp.py
import requests

WHATSAPP_API_URL = "https://graph.facebook.com/v18.0/{phone_number_id}/messages"

def send_whatsapp_text(to: str, message: str) -> dict:
    """Send a plain text WhatsApp message"""
    headers = {
        "Authorization": f"Bearer {settings.META_WHATSAPP_API_TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": to.replace('+', '').replace(' ', ''),  # e.g. "94771234567"
        "type": "text",
        "text": {"body": message}
    }
    response = requests.post(
        WHATSAPP_API_URL.format(phone_number_id=settings.META_PHONE_NUMBER_ID),
        json=payload,
        headers=headers,
        timeout=10
    )
    return response.json()

def send_whatsapp_document(to: str, document_url: str, caption: str) -> dict:
    """Send a PDF document via WhatsApp"""
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": to.replace('+', '').replace(' ', ''),
        "type": "document",
        "document": {
            "link": document_url,
            "caption": caption,
            "filename": "timetable_2026.pdf"
        }
    }
    # ... same headers and post
```

**SMS fallback for parents without WhatsApp (~8%):**

```python
def send_notification(student: Student, message: str, attachment_url: str = None):
    if student.has_whatsapp:  # field set during enrollment
        if attachment_url:
            send_whatsapp_document.delay(student.parent_mobile, attachment_url, message)
        else:
            send_whatsapp_text.delay(student.parent_mobile, message)
    else:
        # SMS fallback via Dialog Axiata — text only, no attachments
        send_sms_dialog.delay(student.parent_mobile, message[:160])
```

---

## 9. Timetable (Premium only)

### 9.1 Timetable structure

Each batch has a weekly timetable — day and time slots mapped to subjects and teachers.

```sql
CREATE TABLE timetable_slots (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  institute_id    INT NOT NULL REFERENCES institutes(id),
  batch_id        INT NOT NULL REFERENCES batches(id),
  subject_id      INT NOT NULL REFERENCES subjects(id),
  teacher_id      INT NOT NULL REFERENCES teachers(id),
  day_of_week     TINYINT NOT NULL,  -- 0=Monday, 1=Tuesday, ... 4=Friday
  start_time      TIME NOT NULL,     -- e.g. '08:00:00'
  end_time        TIME NOT NULL,     -- e.g. '09:30:00'
  effective_from  DATE NOT NULL,
  effective_to    DATE NULL,         -- NULL = currently active
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 9.2 Timetable change flow

1. Admin edits a slot in the timetable grid
2. System counts how many sessions are affected by the change
3. Admin is shown: "This change affects X sessions. Notify parents?" with a toggle
4. If notify = YES and sessions ≥ 3: PDF notification queued
5. If notify = YES and sessions < 3: text notification queued
6. Old slot gets `effective_to = TODAY` · New slot created with `effective_from = change_date`

---

## 10. Year-end promotion (Premium full, Basic partial)

### 10.1 Overview

At the end of each academic year (December/January), every student must be reviewed and either promoted to the next grade batch, retained in the same batch, or removed from the system.

### 10.2 Three actions

| Action | Description | What happens in DB |
|---|---|---|
| **Promote** | Move to next grade batch | Old `student_batch_enrollment` gets `status = 'archived'` · New enrollment created with `status = 'active'` and `academic_year = next_year` |
| **Retain** | Keep in same batch for another year | `academic_year` incremented on existing record · No new enrollment created |
| **Remove** | Deactivate (O/L complete, dropout, transfer) | `status = 'deactivated'` · Student hidden from active lists · All history preserved |

**Critical rule: enrollment records are never deleted.** Full attendance and fee history is always preserved and linked through `student_id`.

### 10.3 Batch mapping

Before running promotion, admin must configure which batch maps to which next-year batch. This mapping is saved and reused as a default suggestion the following year:

```sql
CREATE TABLE batch_promotion_map (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  institute_id    INT NOT NULL,
  from_batch_id   INT NOT NULL REFERENCES batches(id),
  to_batch_id     INT NOT NULL REFERENCES batches(id),
  academic_year   INT NOT NULL,
  UNIQUE KEY uq_map (institute_id, from_batch_id, academic_year)
);
```

**Example mapping:**
```
Grade 7 — Batch A (2026) → Grade 8 — Batch A (2027)
Grade 10 — O/L Batch (2026) → Grade 11 — A/L Science (2027)
Grade 11 — A/L Science (2026) → [None — students removed]
```

### 10.4 Promotion flow (step by step)

1. Admin opens Year-end promotion screen (visible in December)
2. Selects a batch from the sidebar
3. System shows default action per student:
   - A/L completers (final grade) → defaulted to **Remove**
   - All others → defaulted to **Promote**
4. Admin configures batch mapping in the dropdown
5. Admin can use **Promote all** to bulk-set all students to Promote
6. Admin can override individual students using the dropdown per student card
7. Admin clicks **Confirm & notify parents**
8. System executes (idempotent — safe to run twice):

```python
@shared_task
def execute_year_end_promotion(institute_id: int, batch_id: int, decisions: dict):
    """
    decisions = {student_id: 'promote' | 'retain' | 'remove'}
    """
    for student_id, action in decisions.items():
        enrollment = StudentBatchEnrollment.objects.get(
            student_id=student_id,
            batch_id=batch_id,
            status='active'
        )

        if action == 'promote':
            # Get next batch from mapping
            mapping = BatchPromotionMap.objects.get(
                from_batch_id=batch_id,
                academic_year=current_year()
            )
            # Archive old enrollment
            enrollment.status = 'archived'
            enrollment.save()
            # Create new enrollment in next batch
            new_enrollment, created = StudentBatchEnrollment.objects.get_or_create(
                student_id=student_id,
                batch_id=mapping.to_batch_id,
                academic_year=next_year(),
                defaults={'status': 'active', 'promoted_at': now()}
            )
            if created and institute.plan == 'premium':
                # Queue personalised timetable notification
                send_promotion_notification.apply_async(
                    args=[student_id, mapping.to_batch_id],
                    countdown=student_idx * 10  # 10s stagger
                )

        elif action == 'retain':
            enrollment.academic_year = next_year()
            enrollment.save()

        elif action == 'remove':
            enrollment.status = 'deactivated'
            enrollment.save()
```

### 10.5 Promotion notification (Premium only)

```
Dear Parent, {{student_name}} has been promoted to {{new_batch_name}}
for the {{year}} academic year at {{institute_name}}.
Please find their updated timetable attached.

We look forward to another great year!
— {{institute_name}}
```

The timetable PDF for the new batch is attached to this WhatsApp document message.

### 10.6 Edge cases

| Scenario | Handling |
|---|---|
| Next-year batch doesn't exist yet | Admin can create a new batch inline from the promotion screen's mapping dropdown |
| Student enrolled in multiple batches | Each enrollment is promoted/retained/removed independently |
| Parent has no WhatsApp | SMS text-only fallback (no PDF for SMS) |
| Admin runs promotion twice | Idempotent — checks for existing `active` enrollment before creating a new one |
| Basic plan institute | Promotion runs, student records updated, but no WhatsApp notification is sent |

---

## 11. Screens summary

| Screen | URL path | Plan | Purpose |
|---|---|---|---|
| Dashboard | `/` | Both | Institute KPIs, fee collection, attendance, recent notifications |
| Subjects | `/subjects` | Both | Add/edit subjects with icons |
| Teachers | `/teachers` | Both | Staff profiles and subject assignments |
| Batches | `/batches` | Both (Basic: max 10) | Create batches, map subjects/teachers, set fees |
| Students | `/students` | Both (Basic: max 200) | Enroll students, assign to batches |
| Attendance | `/attendance` | Both | Daily subject-level attendance marking |
| Fee tracking | `/fees` | Both | Monthly fee status per student, mark paid |
| Notifications | `/notifications` | Premium only | Toggles, message history, annual PDF send |
| Timetable | `/timetable` | Premium only | Weekly schedule per batch, change alerts |
| Year-end promotion | `/promotion` | Premium (with notify) | Move students to next grade at year end |

---

## 12. Storage and media

| Data type | Storage | Rule |
|---|---|---|
| Student and fee data | MySQL | Relational — primary data store |
| Teacher photos | Supabase S3 | Compressed to <250KB on upload |
| Institute logos | Supabase S3 | Compressed to <250KB on upload |
| Subject icons | Supabase S3 | PNG/SVG · max 50KB |
| Generated PDFs (fee reports, timetables) | Supabase S3 | Stored 90 days then auto-deleted |
| Annual timetable PDFs | Supabase S3 | Stored until next year's promotion |

**Storage quota enforcement:**

| Plan | Quota | Enforcement |
|---|---|---|
| Basic | 1 GB | Upload blocked when `storage_used_gb >= 1.0` |
| Premium | 5 GB | Upload blocked when `storage_used_gb >= 5.0` |

---

## 13. Database — complete schema

```sql
-- Core institute data (also in admin scope)
CREATE TABLE institutes (...);  -- see Admin App Requirements

-- Academic structure
CREATE TABLE subjects (...);               -- Section 4.1
CREATE TABLE teachers (...);               -- Section 4.2
CREATE TABLE batches (...);                -- Section 4.3
CREATE TABLE batch_teachers_config (...);  -- Section 4.3

-- Student lifecycle
CREATE TABLE students (...);               -- Section 5.1
CREATE TABLE student_batch_enrollment (    -- Section 5.1 + 10.4
  student_id      INT NOT NULL,
  batch_id        INT NOT NULL,
  status          ENUM('active','archived','deactivated') DEFAULT 'active',
  academic_year   INT NOT NULL DEFAULT 2026,
  promoted_at     DATETIME NULL,
  promoted_by     INT NULL,
  PRIMARY KEY (student_id, batch_id, academic_year)
);

-- Daily operations
CREATE TABLE attendance (...);             -- Section 6.4
CREATE TABLE fee_payments (...);           -- Section 7.2

-- Timetable
CREATE TABLE timetable_slots (...);        -- Section 9.1

-- Year-end promotion
CREATE TABLE batch_promotion_map (...);    -- Section 10.3

-- Notification log
CREATE TABLE notification_log (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  institute_id    INT NOT NULL,
  student_id      INT NULL,
  notification_type ENUM('fee_reminder','fee_paid','absent_alert','timetable_change','annual_pdf'),
  channel         ENUM('whatsapp','sms'),
  recipient_mobile VARCHAR(20),
  message_preview TEXT,
  cost_lkr        DECIMAL(6,2),
  sent_at         DATETIME,
  status          ENUM('sent','failed','pending'),
  whatsapp_message_id VARCHAR(100) NULL
);
```

---

*Institute App Requirements · Version 1.0 · April 2026 · TuitionOS*
