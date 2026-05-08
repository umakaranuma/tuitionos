# TuitionOS

Monorepo for the TuitionOS platform.

- **Backend:** Django REST API (/backend)
- **Admin Frontend:** Next.js 14 (/frontend/admin) â€” admin.tuitionos.lk
- **Institute Frontend:** Next.js 14 (/frontend/institute) â€” [name].tuitionos.lk
- **Shared Types:** TypeScript (/shared)

## Quick Start
`ash
cp backend/.env.example backend/.env
docker-compose up -d
docker-compose exec backend python manage.py migrate
`
See .docs/designsystems/TuitionOS_Project_Structure.md for full documentation.


create superadmin
python manage.py createsuperuser