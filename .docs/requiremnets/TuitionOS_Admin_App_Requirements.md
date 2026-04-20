# TuitionOS — Admin Application
## Full Requirements & Technical Specification
### `admin.tuitionos.lk` · Solo Developer · Version 1.0 · 2026

---

## 1. Application overview

The Admin App is the solo developer's private control centre for managing the entire TuitionOS platform. It is a separate application from the Institute App with its own authentication, its own subdomain, and access to platform-wide data across all tenants.

**URL:** `admin.tuitionos.lk`
**Access:** Solo developer only — no institute admin can log in here
**Authentication:** Single superuser account with 2FA enforced
**Stack:** Django admin views + Next.js frontend · MySQL · Railway deployment

---

## 2. Authentication & access control

### 2.1 Login

The admin login page lives at `admin.tuitionos.lk/login`. It is not publicly linked from any marketing page.

| Field | Detail |
|---|---|
| Username | Developer email (e.g. `dev@tuitionos.lk`) |
| Password | Bcrypt hashed, min 16 characters enforced |
| 2FA | TOTP via Google Authenticator — mandatory |
| Session | JWT stored in httpOnly cookie · 8-hour expiry |
| Failed attempts | Lockout after 5 attempts · 15-minute cooldown |

### 2.2 Access model

```
SuperUser (solo developer)
└── Full read/write on ALL institutes
└── Full read/write on ALL financial records
└── Platform settings and pricing control
└── Institute creation, suspension, deletion
```

No other user role can access the Admin App. Institute admins authenticate separately at their own subdomain.

---

## 3. Institute management

### 3.1 How institutes are created

Every institute on TuitionOS is manually onboarded by the developer via the Admin App. There is no self-registration flow in v1.0 — the developer controls all signups.

**Onboarding steps (admin side):**

1. Developer receives a request (WhatsApp, email, or direct contact)
2. Developer opens `admin.tuitionos.lk` → Institutes → Add institute
3. Developer fills in the onboarding form:

| Field | Required | Notes |
|---|---|---|
| Institute name | Yes | Full legal or trading name |
| District | Yes | Dropdown: Jaffna, Colombo, Kandy, Gampaha, Vavuniya, Southern, Other |
| Contact email | Yes | Used for billing invoices and platform emails |
| WhatsApp mobile | Yes | Used for payment reminders and support |
| Admin name | Yes | The person who will log in to the institute app |
| Subscription plan | Yes | Basic (LKR 3,000) · Premium (LKR 6,000) · 14-day trial |
| Subdomain | Yes | See Section 3.2 — subdomain generation |

4. Developer clicks **Create institute**
5. System automatically:
   - Creates the `institutes` record in MySQL with `institute_id`
   - Generates the subdomain and configures DNS (see Section 3.2)
   - Creates the institute admin user account with a temporary password
   - Sends a welcome email to the contact email with login URL and temporary password
   - Creates the first invoice for the selected plan
   - If trial selected: sets `trial_ends_at = NOW() + 14 days`

### 3.2 Subdomain generation — full technical flow

Every institute gets a unique subdomain under `tuitionos.lk`. This is how the system creates and manages it:

#### Step 1 — Subdomain input

The developer types a short slug for the institute in the Add Institute form. The system validates it in real time:

```
Rules:
- Lowercase letters, numbers, and hyphens only
- Minimum 3 characters, maximum 30 characters
- Cannot start or end with a hyphen
- Must be globally unique across all institutes
- Reserved words blocked: admin, api, www, mail, static, media, app, login, dashboard, support
```

**Auto-suggestion:** The system auto-generates a slug from the institute name:

```python
import re
from django.utils.text import slugify

def generate_subdomain(institute_name: str) -> str:
    slug = slugify(institute_name)          # "st-patricks-academy-jaffna"
    slug = re.sub(r'-+', '-', slug)         # collapse double hyphens
    slug = slug[:30].rstrip('-')            # truncate at 30 chars
    return slug

# "St. Patrick's Academy, Jaffna" → "st-patricks-academy-jaffna"
# "Alpha Lanka Institute"         → "alpha-lanka-institute"
# "Bright Minds Kandy"            → "bright-minds-kandy"
```

#### Step 2 — DNS configuration

TuitionOS uses a **wildcard DNS record** at the domain registrar level:

```
Type:  A record (wildcard)
Host:  *.tuitionos.lk
Value: [Server IP address — e.g. 123.45.67.89]
TTL:   300 (5 minutes)
```

Because the wildcard `*.tuitionos.lk` already points to the server, **no new DNS record needs to be created per institute**. The wildcard catches every subdomain automatically.

#### Step 3 — Django subdomain routing

Django reads the incoming `Host` header and extracts the subdomain:

```python
# middleware/tenant_middleware.py

class TenantMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        host = request.get_host().lower()
        # host = "stpatricks.tuitionos.lk"

        subdomain = host.replace('.tuitionos.lk', '').replace('www.', '')
        # subdomain = "stpatricks"

        if subdomain == 'admin':
            request.tenant = None  # admin app — no institute context
            request.is_admin = True
        else:
            try:
                institute = Institute.objects.get(subdomain=subdomain, is_active=True)
                request.tenant = institute
                request.institute_id = institute.id
                request.is_admin = False
            except Institute.DoesNotExist:
                return HttpResponse('Institute not found', status=404)

        return self.get_response(request)
```

#### Step 4 — Next.js frontend routing

The Next.js frontend reads the subdomain from the request and renders the correct app:

```javascript
// next.config.js
module.exports = {
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/:path*',
          has: [{ type: 'host', value: 'admin.tuitionos.lk' }],
          destination: '/admin/:path*',
        },
        {
          source: '/:path*',
          has: [{ type: 'host', value: ':subdomain.tuitionos.lk' }],
          destination: '/institute/:path*',
        },
      ],
    };
  },
};
```

#### Step 5 — SSL certificate

A wildcard SSL certificate covers all subdomains automatically:

```
Certificate: *.tuitionos.lk
Provider:    Let's Encrypt (via Certbot wildcard)
Renewal:     Auto-renews every 90 days via cron
Covers:      admin.tuitionos.lk, stpatricks.tuitionos.lk, [any].tuitionos.lk
```

#### Complete subdomain lifecycle example

```
1. Developer types: "St. Patrick's Academy, Jaffna"
2. Auto-slug:       "st-patricks-academy-jaffna"
3. Developer edits: "stpatricks" (shorter preferred)
4. Uniqueness check: passes
5. Institute created in DB with subdomain = "stpatricks"
6. No DNS change needed (wildcard already active)
7. Institute app live at: https://stpatricks.tuitionos.lk
8. Welcome email sent: "Your portal: https://stpatricks.tuitionos.lk"
9. Institute admin logs in, changes temporary password
```

### 3.3 Institute status management

| Status | Meaning | Access |
|---|---|---|
| `trial` | 14-day free trial — plan not yet activated | Full feature access matching selected plan |
| `active` | Paying customer — subscription current | Full feature access for their plan |
| `due` | Invoice issued, payment not yet received | Full access — reminder sent |
| `overdue` | 10+ days past due date | Full access — escalated reminders |
| `suspended` | 21+ days overdue OR manual suspend by developer | Login blocked — data preserved |
| `cancelled` | Institute closed — permanent | Login blocked — data archived 1 year |

**Auto-suspension flow:**

```
Day 1  → Invoice generated and emailed
Day 3  → WhatsApp reminder (auto, if toggle on)
Day 10 → Second WhatsApp reminder
Day 21 → Auto-suspend (if toggle on) — login blocked, data intact
Day 90 → Developer manually reviews — archive or reactivate
```

### 3.4 Institute list — filters and search

| Filter | Logic |
|---|---|
| All | Show all institutes regardless of status |
| Premium | `plan = 'premium'` |
| Basic | `plan = 'basic'` |
| Overdue | `status IN ('due', 'overdue', 'suspended')` |
| Trial | `status = 'trial'` |

Search queries across: institute name, district, contact email, subdomain, admin name.

### 3.5 Institute detail view

Clicking an institute in the list opens the detail page showing:

- Institute profile (name, district, plan, subdomain, contact)
- Current billing status and invoice history
- Student count and storage used (GB of quota consumed)
- Active batches count
- Notification usage this month (messages sent, cost in LKR)
- Option to: Edit details · Upgrade/downgrade plan · Suspend · Delete

---

## 4. Income management

### 4.1 MRR dashboard

Displayed on both the Dashboard screen and the Income screen:

| Metric | Calculation |
|---|---|
| Total MRR (LKR) | `SUM(monthly_fee)` for all `active` + `due` + `overdue` institutes |
| Total MRR (USD) | `Total MRR LKR ÷ exchange_rate` (rate stored in settings, default 310) |
| Collected this month | `SUM(amount_paid)` from invoices with `status = 'paid'` this month |
| Outstanding | `Total MRR − Collected` |
| Notification spend | `SUM(notification_cost_lkr)` from all Premium institutes this month |

### 4.2 Monthly breakdown table

Columns: Month · Basic collected (LKR) · Premium collected (LKR) · Total (LKR) · USD equivalent · Status

Data comes from the `invoices` table grouped by `billing_month`.

### 4.3 USD goal tracker

```python
GOAL_USD = 2000
current_mrr_usd = total_mrr_lkr / exchange_rate
progress_pct = (current_mrr_usd / GOAL_USD) * 100
remaining_usd = max(0, GOAL_USD - current_mrr_usd)

# Additional Premium needed to close gap:
premium_usd_value = 6000 / exchange_rate  # ~$19.35
premium_needed = math.ceil(remaining_usd / premium_usd_value)
```

---

## 5. Invoice management

### 5.1 Invoice generation

Invoices are generated automatically on the 1st of each month via a Celery scheduled task:

```python
# tasks/billing.py
from celery import shared_task
from celery.schedules import crontab

@app.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):
    # Run at 00:01 AM on the 1st of every month
    sender.add_periodic_task(
        crontab(hour=0, minute=1, day_of_month=1),
        generate_monthly_invoices.s(),
    )

@shared_task
def generate_monthly_invoices():
    institutes = Institute.objects.filter(
        status__in=['active', 'trial'],
        plan__in=['basic', 'premium']
    )
    for inst in institutes:
        if inst.status == 'trial' and inst.trial_ends_at > now():
            continue  # skip billing for active trials
        Invoice.objects.create(
            institute=inst,
            amount=inst.monthly_fee,  # 3000 or 6000
            billing_month=current_month(),
            due_date=now().date() + timedelta(days=10),
            status='due'
        )
```

### 5.2 Invoice actions

| Action | Who triggers | Effect |
|---|---|---|
| Mark paid | Developer manually in admin | `invoice.status = 'paid'` · institute status set to `active` |
| Send reminder | Developer or auto-trigger | WhatsApp message sent to institute mobile |
| PDF download | Developer | Pre-generated PDF of the invoice |
| Suspend | Developer | `institute.status = 'suspended'` · login blocked |
| Manual invoice | Developer | Create one-off invoice for custom amounts |

### 5.3 Invoice schema

```sql
CREATE TABLE invoices (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  institute_id    INT NOT NULL REFERENCES institutes(id),
  amount          DECIMAL(10,2) NOT NULL,      -- 3000.00 or 6000.00
  billing_month   DATE NOT NULL,               -- e.g. 2026-04-01
  due_date        DATE NOT NULL,
  paid_at         DATETIME NULL,
  status          ENUM('due','paid','overdue','cancelled') DEFAULT 'due',
  notes           TEXT NULL,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_institute_month (institute_id, billing_month),
  INDEX idx_status (status)
);
```

---

## 6. Alerts system

### 6.1 Alert types displayed

| Alert type | Trigger condition | Action available |
|---|---|---|
| Overdue payment | `invoice.due_date < TODAY - 10` | Mark paid · Suspend · Call |
| Due today | `invoice.due_date = TODAY` | Mark paid · Send reminder |
| Trial expiry soon | `trial_ends_at BETWEEN NOW() AND NOW() + 3 days` | Send upgrade nudge · End trial |

### 6.2 Auto-action toggles

Each toggle is stored in `platform_settings` table:

| Setting key | Default | Effect when ON |
|---|---|---|
| `auto_whatsapp_day3` | ON | Send WhatsApp reminder on day 3 overdue |
| `auto_suspend_day21` | ON | Suspend institute login on day 21 overdue |
| `trial_expiry_email` | ON | Email institute 3 days before trial ends |
| `monthly_summary_email` | ON | Email developer income summary on 1st |

---

## 7. Platform settings

### 7.1 Pricing control

```python
# platform_settings table
SETTINGS = {
    'basic_price_lkr':   3000,
    'premium_price_lkr': 6000,
    'trial_days':        14,
    'exchange_rate_usd': 310,
}
```

Price changes apply to new billing cycles only — existing active invoices are not retroactively changed.

### 7.2 Feature flags

| Flag | Default | Effect |
|---|---|---|
| `basic_student_cap` | 200 | Block enrollment above this on Basic plan |
| `sms_alerts_premium_only` | ON | Block notification sends for Basic institutes |
| `registrations_open` | ON | Toggle public registration (not used in v1.0 — no public signup) |
| `notifications_enabled` | ON | Global kill switch for all WhatsApp/SMS sends |

### 7.3 API credentials stored in settings

| Key | Description |
|---|---|
| `meta_whatsapp_api_token` | Meta Cloud API auth token |
| `meta_phone_number_id` | WhatsApp Business phone number ID |
| `dialog_sms_api_key` | Dialog Axiata bulk SMS API key |
| `stripe_secret_key` | Stripe payment processing key |
| `stripe_webhook_secret` | Stripe webhook verification secret |

All credential fields are encrypted at rest using Django's `Fernet` encryption. Never stored in plain text.

---

## 8. Pricing page

Read-only reference in the admin app showing:

- Side-by-side tier comparison (Basic vs Premium)
- Current prices (pulled from `platform_settings`)
- Feature matrix
- Revenue milestone table: Q1 → Q4 → $2,000 goal

---

## 9. Screens summary

| Screen | URL | Purpose |
|---|---|---|
| Dashboard | `/` | Platform KPIs, MRR chart, recent activity, goal tracker |
| All institutes | `/institutes` | Filterable list of all institutes |
| Add institute | `/institutes/add` | Onboard a new institute |
| Institute detail | `/institutes/:id` | View/edit individual institute |
| Income | `/income` | MRR breakdown, USD goal, collection status |
| Invoices | `/invoices` | All invoices — actions per invoice |
| Alerts | `/alerts` | Action items + auto-action settings |
| Settings | `/settings` | Pricing, flags, API keys, tech stack |
| Pricing | `/pricing` | Tier comparison + revenue milestones |

---

## 10. Database tables (admin scope)

```sql
-- Core institute record
CREATE TABLE institutes (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(255) NOT NULL,
  subdomain       VARCHAR(30) NOT NULL UNIQUE,
  district        VARCHAR(100),
  contact_email   VARCHAR(255) NOT NULL,
  whatsapp_mobile VARCHAR(20) NOT NULL,
  admin_name      VARCHAR(255),
  plan            ENUM('basic','premium') NOT NULL,
  status          ENUM('trial','active','due','overdue','suspended','cancelled') DEFAULT 'trial',
  trial_ends_at   DATETIME NULL,
  logo_url        TEXT NULL,
  storage_used_gb FLOAT DEFAULT 0,
  package_type    ENUM('BASIC','PREMIUM') NOT NULL,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_subdomain (subdomain),
  INDEX idx_status (status),
  INDEX idx_plan (plan)
);

-- Platform-wide settings
CREATE TABLE platform_settings (
  setting_key     VARCHAR(100) PRIMARY KEY,
  setting_value   TEXT NOT NULL,
  updated_at      DATETIME ON UPDATE CURRENT_TIMESTAMP
);

-- Admin audit log
CREATE TABLE admin_audit_log (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  action          VARCHAR(100) NOT NULL,  -- e.g. 'INSTITUTE_SUSPENDED'
  target_type     VARCHAR(50),            -- e.g. 'institute'
  target_id       INT,
  performed_by    INT REFERENCES users(id),
  details         JSON,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

*Admin App Requirements · Version 1.0 · April 2026 · TuitionOS*
