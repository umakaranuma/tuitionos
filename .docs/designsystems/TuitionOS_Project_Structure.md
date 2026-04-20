# TuitionOS — Full Project Structure & Architecture Guide
## Monorepo · Django Backend · Next.js Frontend (2 Apps) · 2026

---

## 1. Repository strategy

TuitionOS uses a **monorepo** — one single Git repository contains the backend, the admin frontend, and the institute frontend. This is the right choice for a solo developer because:

- One `git clone` gives you the entire system
- Shared TypeScript types between both frontends
- Single CI/CD pipeline deploys everything
- No cross-repo dependency management headaches
- Easy to search across the entire codebase

```
Repository name:   tuitionos
Git hosting:       GitHub (private)
Branch strategy:   main (production) · develop (staging) · feature/* (work)
```

---

## 2. Top-level folder structure

```
tuitionos/                          ← root of the monorepo
│
├── backend/                        ← Django REST API (shared by both apps)
├── frontend/
│   ├── admin/                      ← Next.js — admin.tuitionos.lk
│   └── institute/                  ← Next.js — [name].tuitionos.lk
│
├── shared/                         ← TypeScript types shared between frontends
├── scripts/                        ← Dev utilities, DB seed, deploy helpers
├── docs/                           ← All MD requirement files live here
│
├── .github/
│   └── workflows/                  ← GitHub Actions CI/CD
│
├── docker-compose.yml              ← Local development environment
├── .env.example                    ← Template for environment variables
├── .gitignore
└── README.md
```

---

## 3. Backend — Django (`/backend`)

### 3.1 Full folder structure

```
backend/
│
├── manage.py
├── requirements.txt                ← All Python dependencies pinned
├── requirements.dev.txt            ← Dev-only: pytest, black, flake8
├── Dockerfile                      ← Production Docker image
├── .env                            ← Local env vars (never committed)
│
├── config/                         ← Django project settings
│   ├── __init__.py
│   ├── settings/
│   │   ├── __init__.py
│   │   ├── base.py                 ← Common settings (all environments)
│   │   ├── development.py          ← Local dev overrides
│   │   ├── production.py           ← Production overrides
│   │   └── test.py                 ← Test runner settings
│   ├── urls.py                     ← Root URL config
│   ├── wsgi.py
│   └── asgi.py
│
├── apps/                           ← All Django apps live here
│   │
│   ├── core/                       ← Shared utilities used by all apps
│   │   ├── __init__.py
│   │   ├── middleware.py           ← TenantMiddleware (subdomain routing)
│   │   ├── permissions.py          ← DRF permission classes
│   │   ├── pagination.py           ← Standard API pagination
│   │   ├── exceptions.py           ← Custom API exception handlers
│   │   └── utils.py                ← Shared helper functions
│   │
│   ├── institutes/                 ← Institute CRUD (admin + tenant context)
│   │   ├── __init__.py
│   │   ├── models.py               ← Institute, PlatformSettings models
│   │   ├── serializers.py
│   │   ├── views.py                ← Admin-facing institute management APIs
│   │   ├── urls.py
│   │   ├── services.py             ← Business logic (create_institute, suspend)
│   │   ├── signals.py              ← Post-save: send welcome email
│   │   ├── tasks.py                ← Celery: auto-suspend, billing reminders
│   │   └── tests/
│   │       ├── test_models.py
│   │       ├── test_views.py
│   │       └── test_services.py
│   │
│   ├── billing/                    ← Invoices and payment tracking
│   │   ├── __init__.py
│   │   ├── models.py               ← Invoice model
│   │   ├── serializers.py
│   │   ├── views.py                ← Admin invoice APIs
│   │   ├── urls.py
│   │   ├── services.py             ← generate_invoice(), mark_paid()
│   │   ├── tasks.py                ← Celery: monthly invoice generation (1st of month)
│   │   └── tests/
│   │
│   ├── academics/                  ← Subjects, teachers, batches
│   │   ├── __init__.py
│   │   ├── models.py               ← Subject, Teacher, Batch, BatchTeacherConfig
│   │   ├── serializers.py
│   │   ├── views.py                ← Institute-scoped CRUD APIs
│   │   ├── urls.py
│   │   ├── services.py             ← Batch creation, teacher assignment
│   │   └── tests/
│   │
│   ├── students/                   ← Student enrollment and management
│   │   ├── __init__.py
│   │   ├── models.py               ← Student, StudentBatchEnrollment
│   │   ├── serializers.py
│   │   ├── views.py                ← Enroll, list, search, detail APIs
│   │   ├── urls.py
│   │   ├── services.py             ← enroll_student(), check_plan_limits()
│   │   └── tests/
│   │
│   ├── attendance/                 ← Daily subject-level attendance
│   │   ├── __init__.py
│   │   ├── models.py               ← Attendance model
│   │   ├── serializers.py
│   │   ├── views.py                ← Mark attendance, get reports
│   │   ├── urls.py
│   │   ├── services.py             ← bulk_mark_attendance()
│   │   ├── tasks.py                ← Celery: 6PM daily digest trigger
│   │   └── tests/
│   │
│   ├── fees/                       ← Fee tracking and payment management
│   │   ├── __init__.py
│   │   ├── models.py               ← FeePayment model
│   │   ├── serializers.py
│   │   ├── views.py                ← Fee list, mark paid, reports
│   │   ├── urls.py
│   │   ├── services.py             ← mark_fee_paid(), generate_fee_report_pdf()
│   │   ├── tasks.py                ← Celery: 1st of month fee record creation
│   │   └── tests/
│   │
│   ├── notifications/              ← WhatsApp/SMS delivery layer
│   │   ├── __init__.py
│   │   ├── models.py               ← NotificationLog model
│   │   ├── serializers.py
│   │   ├── views.py                ← Notification history, toggle settings
│   │   ├── urls.py
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── whatsapp.py         ← Meta Cloud API integration
│   │   │   ├── sms.py              ← Dialog Axiata SMS integration
│   │   │   └── dispatcher.py      ← Routes to WA or SMS based on student.has_whatsapp
│   │   ├── tasks.py                ← All 5 notification Celery tasks
│   │   └── tests/
│   │
│   ├── timetable/                  ← Batch schedules (Premium)
│   │   ├── __init__.py
│   │   ├── models.py               ← TimetableSlot model
│   │   ├── serializers.py
│   │   ├── views.py                ← Timetable CRUD, change detection
│   │   ├── urls.py
│   │   ├── services.py             ← detect_session_changes(), trigger_pdf_or_text()
│   │   └── tests/
│   │
│   ├── promotion/                  ← Year-end student promotion (Premium)
│   │   ├── __init__.py
│   │   ├── models.py               ← BatchPromotionMap model
│   │   ├── serializers.py
│   │   ├── views.py                ← Promotion list, confirm endpoint
│   │   ├── urls.py
│   │   ├── services.py             ← execute_promotion(), validate_mapping()
│   │   ├── tasks.py                ← Celery: staggered WhatsApp sends
│   │   └── tests/
│   │
│   └── pdfs/                       ← PDF generation (WeasyPrint)
│       ├── __init__.py
│       ├── services.py             ← generate_timetable_pdf(), generate_fee_pdf()
│       ├── templates/
│       │   ├── timetable.html      ← HTML template for timetable PDF
│       │   ├── fee_report.html     ← HTML template for fee report PDF
│       │   └── fee_receipt.html    ← HTML template for payment receipt
│       └── tests/
│
├── celery_app.py                   ← Celery application instance
├── celery_beat_schedule.py         ← All periodic task schedules
│
└── migrations_log.md               ← Human-readable migration notes
```

### 3.2 Django settings split explained

```python
# config/settings/base.py — shared across all environments
INSTALLED_APPS = [
    # Django built-ins
    'django.contrib.auth',
    'django.contrib.contenttypes',
    # Third party
    'rest_framework',
    'corsheaders',
    'django_celery_beat',
    # Our apps
    'apps.core',
    'apps.institutes',
    'apps.billing',
    'apps.academics',
    'apps.students',
    'apps.attendance',
    'apps.fees',
    'apps.notifications',
    'apps.timetable',
    'apps.promotion',
    'apps.pdfs',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'apps.core.middleware.TenantMiddleware',   # ← must come early
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
]

# config/settings/development.py
from .base import *
DEBUG = True
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'tuitionos_dev',
        'HOST': 'localhost',
        'PORT': '3306',
        'USER': env('DB_USER'),
        'PASSWORD': env('DB_PASSWORD'),
    }
}
CELERY_TASK_ALWAYS_EAGER = True   # Run tasks synchronously in dev

# config/settings/production.py
from .base import *
DEBUG = False
ALLOWED_HOSTS = ['*.tuitionos.lk', 'tuitionos.lk']
DATABASES = {
    'default': dj_database_url.parse(env('DATABASE_URL'))
}
```

### 3.3 URL routing

```python
# config/urls.py
from django.urls import path, include

urlpatterns = [
    # Admin app APIs (only accessible from admin.tuitionos.lk)
    path('api/admin/', include([
        path('institutes/', include('apps.institutes.urls')),
        path('billing/', include('apps.billing.urls')),
        path('settings/', include('apps.core.urls.settings')),
    ])),

    # Institute app APIs (accessible from [name].tuitionos.lk)
    path('api/', include([
        path('academics/', include('apps.academics.urls')),
        path('students/', include('apps.students.urls')),
        path('attendance/', include('apps.attendance.urls')),
        path('fees/', include('apps.fees.urls')),
        path('notifications/', include('apps.notifications.urls')),
        path('timetable/', include('apps.timetable.urls')),
        path('promotion/', include('apps.promotion.urls')),
    ])),

    # Auth (shared)
    path('api/auth/', include('apps.core.urls.auth')),
]
```

The `TenantMiddleware` intercepts each request before it hits any view and sets `request.is_admin` or `request.institute`. API views check this flag and reject cross-context requests:

```python
# apps/core/permissions.py
class AdminOnly(BasePermission):
    def has_permission(self, request, view):
        return getattr(request, 'is_admin', False)

class InstituteOnly(BasePermission):
    def has_permission(self, request, view):
        return getattr(request, 'institute', None) is not None
```

### 3.4 Celery task schedules

```python
# celery_beat_schedule.py
from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    # Billing
    'generate-monthly-invoices': {
        'task': 'apps.billing.tasks.generate_monthly_invoices',
        'schedule': crontab(hour=0, minute=1, day_of_month=1),
    },
    'send-fee-reminders': {
        'task': 'apps.notifications.tasks.send_monthly_fee_reminders',
        'schedule': crontab(hour=9, minute=0, day_of_month=1),
    },
    'send-second-fee-reminders': {
        'task': 'apps.notifications.tasks.send_second_fee_reminders',
        'schedule': crontab(hour=10, minute=0, day_of_month=10),
    },
    # Attendance
    'send-daily-absent-digest': {
        'task': 'apps.attendance.tasks.send_daily_absent_digest',
        'schedule': crontab(hour=18, minute=0),          # 6:00 PM daily
    },
    # Auto-suspension
    'check-overdue-suspensions': {
        'task': 'apps.billing.tasks.check_overdue_and_suspend',
        'schedule': crontab(hour=1, minute=0),           # 1:00 AM daily
    },
    # Alerts
    'check-trial-expiries': {
        'task': 'apps.institutes.tasks.check_trial_expiries',
        'schedule': crontab(hour=9, minute=30),          # 9:30 AM daily
    },
    # Developer summary
    'monthly-income-summary': {
        'task': 'apps.billing.tasks.send_developer_income_summary',
        'schedule': crontab(hour=8, minute=0, day_of_month=2),  # 2nd of month
    },
}
```

---

## 4. Admin frontend — Next.js (`/frontend/admin`)

### 4.1 Full folder structure

```
frontend/admin/
│
├── package.json
├── tsconfig.json
├── next.config.js                  ← Subdomain routing config
├── tailwind.config.js
├── .env.local                      ← API base URL, etc.
│
├── src/
│   ├── app/                        ← Next.js 14 App Router
│   │   ├── layout.tsx              ← Root layout (sidebar + topbar shell)
│   │   ├── page.tsx                ← Redirects to /dashboard
│   │   ├── (auth)/
│   │   │   └── login/
│   │   │       └── page.tsx        ← Admin login page
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── institutes/
│   │   │   ├── page.tsx            ← Institute list
│   │   │   ├── add/
│   │   │   │   └── page.tsx        ← Add institute form
│   │   │   └── [id]/
│   │   │       └── page.tsx        ← Institute detail / edit
│   │   ├── income/
│   │   │   └── page.tsx
│   │   ├── invoices/
│   │   │   └── page.tsx
│   │   ├── alerts/
│   │   │   └── page.tsx
│   │   ├── settings/
│   │   │   └── page.tsx
│   │   └── pricing/
│   │       └── page.tsx
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx         ← Left navigation
│   │   │   ├── Topbar.tsx          ← Page header with actions
│   │   │   └── PageShell.tsx       ← Sidebar + Topbar wrapper
│   │   ├── ui/                     ← Design system components
│   │   │   ├── Button.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── KpiCard.tsx
│   │   │   ├── DataTable.tsx       ← Reusable table with sorting/filtering
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Toggle.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   ├── Alert.tsx
│   │   │   └── Modal.tsx
│   │   ├── institutes/
│   │   │   ├── InstituteTable.tsx
│   │   │   ├── InstituteFilters.tsx
│   │   │   ├── AddInstituteForm.tsx
│   │   │   └── SubdomainInput.tsx  ← Live validation + auto-slug
│   │   ├── income/
│   │   │   ├── MrrChart.tsx
│   │   │   ├── GoalTracker.tsx
│   │   │   └── BreakdownTable.tsx
│   │   ├── invoices/
│   │   │   └── InvoiceTable.tsx
│   │   └── alerts/
│   │       ├── AlertCard.tsx
│   │       └── AutoActionToggles.tsx
│   │
│   ├── hooks/
│   │   ├── useInstitutes.ts        ← SWR hook for institute list
│   │   ├── useIncome.ts
│   │   ├── useInvoices.ts
│   │   ├── useAlerts.ts
│   │   └── useSettings.ts
│   │
│   ├── lib/
│   │   ├── api.ts                  ← Axios instance with auth headers
│   │   ├── auth.ts                 ← Login, logout, token refresh
│   │   └── utils.ts                ← formatLKR(), formatDate(), etc.
│   │
│   └── types/
│       └── index.ts                ← Re-exports from shared/types
│
└── public/
    └── favicon.ico
```

---

## 5. Institute frontend — Next.js (`/frontend/institute`)

### 5.1 Full folder structure

```
frontend/institute/
│
├── package.json
├── tsconfig.json
├── next.config.js                  ← Reads subdomain from Host header
├── tailwind.config.js
├── .env.local
│
├── src/
│   ├── app/
│   │   ├── layout.tsx              ← Root layout — reads institute from subdomain
│   │   ├── page.tsx                ← Redirects to /dashboard
│   │   ├── (auth)/
│   │   │   └── login/
│   │   │       └── page.tsx        ← Institute-branded login
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── subjects/
│   │   │   └── page.tsx
│   │   ├── teachers/
│   │   │   └── page.tsx
│   │   ├── batches/
│   │   │   └── page.tsx
│   │   ├── students/
│   │   │   ├── page.tsx            ← Student list
│   │   │   └── [id]/
│   │   │       └── page.tsx        ← Student profile
│   │   ├── attendance/
│   │   │   └── page.tsx
│   │   ├── fees/
│   │   │   └── page.tsx
│   │   ├── notifications/
│   │   │   └── page.tsx            ← Premium gate if Basic plan
│   │   ├── timetable/
│   │   │   └── page.tsx            ← Premium gate if Basic plan
│   │   └── promotion/
│   │       └── page.tsx            ← Premium gate if Basic plan
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx         ← Jade-themed sidebar with PRO badges
│   │   │   ├── Topbar.tsx
│   │   │   ├── PageShell.tsx
│   │   │   └── PremiumGate.tsx     ← Upgrade prompt for locked features
│   │   ├── ui/                     ← Same component names as admin (shared design)
│   │   │   ├── Button.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── KpiCard.tsx
│   │   │   ├── DataTable.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Toggle.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   └── Modal.tsx
│   │   ├── academics/
│   │   │   ├── SubjectCard.tsx
│   │   │   ├── TeacherTable.tsx
│   │   │   ├── BatchCard.tsx
│   │   │   └── BatchForm.tsx
│   │   ├── students/
│   │   │   ├── StudentTable.tsx
│   │   │   ├── EnrollForm.tsx
│   │   │   └── StudentProfile.tsx
│   │   ├── attendance/
│   │   │   ├── SubjectAttendanceCard.tsx
│   │   │   ├── AttendanceTable.tsx
│   │   │   └── AttendanceSummary.tsx
│   │   ├── fees/
│   │   │   ├── FeeTable.tsx
│   │   │   ├── MarkPaidModal.tsx
│   │   │   └── FeeStats.tsx
│   │   ├── notifications/
│   │   │   ├── NotificationToggles.tsx
│   │   │   ├── NotificationHistory.tsx
│   │   │   └── AnnualPdfSender.tsx
│   │   ├── timetable/
│   │   │   ├── TimetableGrid.tsx
│   │   │   ├── SlotEditor.tsx
│   │   │   └── ChangeNotifyModal.tsx
│   │   └── promotion/
│   │       ├── BatchSelector.tsx
│   │       ├── StudentPromoCard.tsx
│   │       └── BatchMappingDropdown.tsx
│   │
│   ├── hooks/
│   │   ├── useInstitute.ts         ← Current institute context (plan, name, id)
│   │   ├── useSubjects.ts
│   │   ├── useTeachers.ts
│   │   ├── useBatches.ts
│   │   ├── useStudents.ts
│   │   ├── useAttendance.ts
│   │   ├── useFees.ts
│   │   ├── useNotifications.ts
│   │   ├── useTimetable.ts
│   │   └── usePromotion.ts
│   │
│   ├── lib/
│   │   ├── api.ts                  ← Axios instance — auto-sends institute_id via cookie
│   │   ├── auth.ts
│   │   ├── subdomain.ts            ← Extract subdomain from window.location
│   │   └── utils.ts
│   │
│   └── types/
│       └── index.ts                ← Re-exports from shared/types
│
└── public/
    └── favicon.ico
```

---

## 6. Shared TypeScript types (`/shared`)

```
shared/
│
└── types/
    ├── institute.ts
    ├── student.ts
    ├── batch.ts
    ├── attendance.ts
    ├── fee.ts
    ├── notification.ts
    ├── invoice.ts
    └── index.ts                    ← Barrel export
```

Example type file:

```typescript
// shared/types/student.ts
export interface Student {
  id: number;
  name: string;
  parentMobile: string;
  instituteId: number;
  createdAt: string;
}

export interface StudentBatchEnrollment {
  studentId: number;
  batchId: number;
  status: 'active' | 'archived' | 'deactivated';
  academicYear: number;
  promotedAt: string | null;
}

export type PromotionAction = 'promote' | 'retain' | 'remove';

// shared/types/index.ts
export * from './institute';
export * from './student';
export * from './batch';
export * from './attendance';
export * from './fee';
export * from './notification';
export * from './invoice';
```

Both `frontend/admin` and `frontend/institute` reference this via `tsconfig.json` path alias:

```json
// frontend/admin/tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@tuitionos/types": ["../../shared/types/index.ts"]
    }
  }
}
```

---

## 7. Scripts and utilities (`/scripts`)

```
scripts/
│
├── seed/
│   ├── seed_dev.py                 ← Creates sample institutes, students, batches
│   └── seed_admin.py               ← Creates the developer superuser account
│
├── deploy/
│   ├── deploy_backend.sh           ← Deploy Django to Railway
│   ├── deploy_admin.sh             ← Deploy admin Next.js to Vercel
│   └── deploy_institute.sh         ← Deploy institute Next.js to Vercel
│
└── db/
    ├── backup.sh                   ← mysqldump to Supabase storage
    └── restore.sh                  ← Restore from backup
```

---

## 8. Documentation (`/docs`)

```
docs/
│
├── TuitionOS_Admin_App_Requirements.md
├── TuitionOS_Institute_App_Requirements.md
├── TuitionOS_Features_Requirements.md
├── TuitionOS_Project_Structure.md      ← This file
├── TuitionOS_Design_System.html
├── api/
│   ├── admin_api.md                ← Admin API endpoint reference
│   └── institute_api.md            ← Institute API endpoint reference
└── architecture/
    ├── subdomain_routing.md
    └── notification_flow.md
```

---

## 9. Environment variables

### 9.1 Backend `.env`

```bash
# Django
SECRET_KEY=your-secret-key-here
DEBUG=False
ALLOWED_HOSTS=*.tuitionos.lk,tuitionos.lk

# Database
DATABASE_URL=mysql://user:password@host:3306/tuitionos_prod

# Redis / Celery
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/1

# WhatsApp / Meta Cloud API
META_WHATSAPP_API_TOKEN=EAAxxxxxxxxxxxxxxxx
META_PHONE_NUMBER_ID=1234567890
META_WABA_ID=0987654321

# Dialog SMS fallback
DIALOG_SMS_API_KEY=dlg_xxxxxxxxxxxxxxxx
DIALOG_SMS_API_URL=https://sms.dialog.lk/api/v2/send

# Supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJxxx...
SUPABASE_BUCKET_NAME=tuitionos-media

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Developer email (income summaries)
DEVELOPER_EMAIL=dev@tuitionos.lk

# LKR/USD exchange rate (update manually or via API)
LKR_USD_RATE=310

# Security
FERNET_KEY=your-fernet-encryption-key
```

### 9.2 Frontend `.env.local` (both apps)

```bash
# Admin app
NEXT_PUBLIC_API_BASE_URL=https://api.tuitionos.lk
NEXT_PUBLIC_APP_ENV=production

# Institute app
NEXT_PUBLIC_API_BASE_URL=https://api.tuitionos.lk
NEXT_PUBLIC_APP_ENV=production
```

---

## 10. Docker — local development

```yaml
# docker-compose.yml
version: '3.9'

services:
  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: tuitionos_dev
      MYSQL_USER: tuitionos
      MYSQL_PASSWORD: devpassword
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    command: python manage.py runserver 0.0.0.0:8000
    volumes:
      - ./backend:/app
    ports:
      - "8000:8000"
    env_file:
      - ./backend/.env
    depends_on:
      - db
      - redis

  celery-worker:
    build: ./backend
    command: celery -A celery_app worker --loglevel=info
    volumes:
      - ./backend:/app
    env_file:
      - ./backend/.env
    depends_on:
      - redis
      - db

  celery-beat:
    build: ./backend
    command: celery -A celery_app beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler
    volumes:
      - ./backend:/app
    env_file:
      - ./backend/.env
    depends_on:
      - redis
      - db

  admin-frontend:
    image: node:20-alpine
    working_dir: /app
    command: sh -c "npm install && npm run dev"
    volumes:
      - ./frontend/admin:/app
      - ./shared:/shared
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

  institute-frontend:
    image: node:20-alpine
    working_dir: /app
    command: sh -c "npm install && npm run dev"
    volumes:
      - ./frontend/institute:/app
      - ./shared:/shared
    ports:
      - "3001:3001"
    environment:
      - NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

volumes:
  mysql_data:
```

**Local dev access:**

| Service | URL |
|---|---|
| Admin frontend | `http://localhost:3000` |
| Institute frontend | `http://localhost:3001` |
| Django API | `http://localhost:8000` |
| Django admin panel | `http://localhost:8000/django-admin` |

---

## 11. Deployment architecture

### 11.1 Production services

| Component | Service | Why |
|---|---|---|
| Django API | Railway | Simple Python deploy, $5/mo starter |
| Celery worker | Railway (same project, separate service) | Same codebase, separate process |
| Celery beat | Railway (same project, separate service) | Cron scheduler |
| Admin Next.js | Vercel | Free hobby tier, instant deploys |
| Institute Next.js | Vercel | Free hobby tier, instant deploys |
| MySQL database | PlanetScale | Free tier 5GB, serverless MySQL |
| Redis | Railway (addon) | $5/mo, used by Celery |
| Media storage | Supabase | Free 1GB, then pay-as-you-go |
| DNS | Cloudflare | Wildcard `*.tuitionos.lk` A record |
| SSL | Let's Encrypt (via Railway) | Auto wildcard cert |

### 11.2 DNS setup (Cloudflare)

```
Type    Name                Value              TTL
A       tuitionos.lk        [Railway IP]       Auto
A       *.tuitionos.lk      [Railway IP]       Auto
CNAME   api.tuitionos.lk    [Railway domain]   Auto
```

The wildcard `*.tuitionos.lk` covers both `admin.tuitionos.lk` and every institute subdomain like `stpatricks.tuitionos.lk` — no new DNS entries per institute.

### 11.3 How both Next.js apps are deployed to Vercel

Both apps are in the same monorepo. Vercel handles them as two separate projects:

**Project 1 — Admin App**
```
Vercel project name:  tuitionos-admin
Root directory:       frontend/admin
Domain:               admin.tuitionos.lk
Build command:        npm run build
Output directory:     .next
```

**Project 2 — Institute App**
```
Vercel project name:  tuitionos-institute
Root directory:       frontend/institute
Domain:               *.tuitionos.lk
Build command:        npm run build
Output directory:     .next
```

The institute app's Vercel domain is the wildcard `*.tuitionos.lk`. When a request arrives at `stpatricks.tuitionos.lk`, Vercel serves the institute app. The app reads `window.location.hostname` to extract the subdomain and sets the API context accordingly.

### 11.4 Request flow — end to end

```
Browser requests: https://stpatricks.tuitionos.lk/attendance

1. DNS (Cloudflare)
   *.tuitionos.lk → Railway server IP
   TTL: auto (300s)

2. Railway reverse proxy (Nginx)
   Routes request to → Next.js institute app (port 3001)
   OR
   Routes request to → Django API (port 8000) if path starts with /api/

3. Next.js institute app
   Reads Host header: stpatricks.tuitionos.lk
   Extracts subdomain: stpatricks
   Renders /attendance page
   Makes API call: GET https://stpatricks.tuitionos.lk/api/attendance/

4. Django API receives /api/attendance/
   TenantMiddleware reads Host header
   Extracts subdomain: stpatricks
   Looks up Institute WHERE subdomain = 'stpatricks'
   Sets request.institute = <Institute id=7>
   Passes to AttendanceView

5. AttendanceView
   Queries: Attendance.objects.filter(institute_id=7, date=today)
   Returns JSON response

6. Next.js renders the attendance page with the data
   Displays in browser
```

---

## 12. CI/CD — GitHub Actions

```
.github/
└── workflows/
    ├── backend.yml          ← On push to main: run tests → deploy to Railway
    ├── admin-frontend.yml   ← On push to main: lint → deploy to Vercel
    └── institute-frontend.yml
```

```yaml
# .github/workflows/backend.yml
name: Backend CI/CD

on:
  push:
    branches: [main]
    paths: ['backend/**']

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v4
        with: { python-version: '3.12' }
      - run: pip install -r backend/requirements.txt
      - run: cd backend && python manage.py test --settings=config.settings.test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          curl -fsSL https://railway.app/install.sh | sh
          railway up --service backend
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

---

## 13. Getting started — new developer setup

```bash
# 1. Clone the repository
git clone https://github.com/yourname/tuitionos.git
cd tuitionos

# 2. Copy environment files
cp backend/.env.example backend/.env
cp frontend/admin/.env.example frontend/admin/.env.local
cp frontend/institute/.env.example frontend/institute/.env.local

# 3. Start all services with Docker
docker-compose up -d

# 4. Run database migrations
docker-compose exec backend python manage.py migrate

# 5. Create the developer superuser (admin app login)
docker-compose exec backend python scripts/seed/seed_admin.py

# 6. Seed development data (sample institutes + students)
docker-compose exec backend python scripts/seed/seed_dev.py

# 7. Install frontend dependencies
cd frontend/admin && npm install
cd ../institute && npm install

# 8. Visit the apps
# Admin:     http://localhost:3000
# Institute: http://localhost:3001
# API:       http://localhost:8000/api/
```

---

## 14. Key architectural decisions — explained

### Why a monorepo?
Solo developer — one repo means one place to search, one CI/CD to maintain, and no versioning between packages. If a second developer joins, the monorepo gives them the full picture in one clone.

### Why two separate Next.js apps instead of one?
The admin app and institute app have fundamentally different users, routes, and layouts. Keeping them separate means:
- Independent deployments — a bug in the institute app doesn't block an admin deploy
- Different Vercel domains (`admin.tuitionos.lk` vs `*.tuitionos.lk`)
- Cleaner code — no conditional rendering based on user type at the root level
- Easier to hand off the institute app to another developer later

### Why Django for the backend?
- DRF (Django REST Framework) provides serializers, viewsets, and authentication out of the box
- Django's ORM handles the multi-tenant `institute_id` filter pattern cleanly
- Celery integrates natively with Django for all 5 notification types and billing tasks
- WeasyPrint PDF generation works in the same Python process
- PlanetScale's MySQL dialect is fully supported

### Why MySQL over PostgreSQL?
PlanetScale offers a generous free tier with serverless MySQL. The schema uses no PostgreSQL-specific features. MySQL 8 covers all needed functionality including JSON columns, window functions, and proper foreign key constraints.

### Why Supabase for storage?
Supabase S3 is compatible with the AWS S3 API, so if the project grows beyond Supabase's free tier, it can switch to AWS S3 with a one-line URL change. The free 1GB covers early-stage media (teacher photos, logos) before paying customers generate storage demand.

---

*Project Structure Guide · Version 1.0 · April 2026 · TuitionOS*
