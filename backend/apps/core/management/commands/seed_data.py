"""
Seed the database with realistic demo data matching the frontend's batchData.ts.
Usage: python manage.py seed_data
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
User = get_user_model()
from apps.institutes.models import Institute, InstituteUser, PlatformSettings
from apps.academics.models import (
    Subject, Teacher, Batch, BatchTeacherConfig,
    Exam, ExamScheduleItem, ExamMark,
    TeacherPayment, TeacherAdvance,
)
from apps.students.models import Student, StudentBatchEnrollment
from apps.fees.models import FeePayment
from apps.attendance.models import Attendance
from apps.timetable.models import TimetableSlot
from apps.billing.models import Invoice, InstituteTransaction
from apps.notifications.models import NotificationLog
from apps.promotion.models import BatchPromotionMap
from rest_framework.authtoken.models import Token
from datetime import date, timedelta, time
from decimal import Decimal
import random


class Command(BaseCommand):
    help = 'Seed the database with demo data'

    def handle(self, *args, **options):
        self.stdout.write('Seeding database...')

        # ── Platform Settings ──
        PlatformSettings.objects.get_or_create(pk=1, defaults={
            'monthly_fee_basic': 3000, 'monthly_fee_premium': 6000,
            'trial_days': 14, 'suspension_grace_days': 7,
        })

        # ── Create Fynux Admin ──
        admin_user, created = User.objects.get_or_create(
            username='admin@tuitionos.com',
            defaults={'email': 'admin@tuitionos.com', 'first_name': 'Fynux', 'last_name': 'Admin',
                      'is_staff': True, 'is_superuser': True}
        )
        if created:
            admin_user.set_password('admin123')
            admin_user.save()
            Token.objects.get_or_create(user=admin_user)
            self.stdout.write(self.style.SUCCESS('  Created admin user: admin@tuitionos.com / admin123'))

        # ── Create Main Institute (St. Patrick's) ──
        inst, _ = Institute.objects.get_or_create(
            subdomain='stpatricks',
            defaults={
                'name': "St. Patrick's Institute",
                'owner_name': 'Sundar Kumar',
                'owner_email': 'sundar@stpatricks.lk',
                'owner_mobile': '+94 77 123 4567',
                'plan': 'premium',
                'status': 'active',
            }
        )

        # Create institute admin user
        inst_user, created = User.objects.get_or_create(
            username='sundar@stpatricks.lk',
            defaults={'email': 'sundar@stpatricks.lk', 'first_name': 'Sundar', 'last_name': 'Kumar'}
        )
        if created:
            inst_user.set_password('institute123')
            inst_user.save()
            Token.objects.get_or_create(user=inst_user)
            InstituteUser.objects.get_or_create(user=inst_user, institute=inst, defaults={'role': 'admin'})
            self.stdout.write(self.style.SUCCESS('  Created institute user: sundar@stpatricks.lk / institute123'))

        # ── Subjects ──
        subj_data = [
            ('Mathematics', 'All', 'Mx'), ('Physics', 'All', 'Ph'),
            ('Chemistry', 'All', 'Ch'), ('English', 'All', 'En'),
            ('Tamil Literature', 'All', 'Ta'), ('Biology', 'All', 'Bi'),
            ('Science', 'All', 'Sc'), ('Combined Maths', 'A/L', 'CM'),
        ]
        subjects = {}
        for name, grade, icon in subj_data:
            s, _ = Subject.objects.get_or_create(
                institute=inst, name=name,
                defaults={'grade': grade, 'icon': icon, 'is_active': True}
            )
            subjects[name] = s

        # ── Teachers ──
        teacher_data = [
            (1, 'Mr. Rajan Nair', 'Mathematics', '+94 77 234 5678', 'rajan@stpatricks.lk', 45000),
            (2, 'Ms. Geetha S.', 'Physics', '+94 77 345 6789', 'geetha@stpatricks.lk', 38000),
            (3, 'Mr. Arjun K.', 'Chemistry', '+94 77 456 7890', 'arjun@stpatricks.lk', 40000),
            (4, 'Ms. Ramya M.', 'English', '+94 77 567 8901', 'ramya@stpatricks.lk', 42000),
            (5, 'Ms. Valli F.', 'Tamil Literature', '+94 77 678 9012', 'valli@stpatricks.lk', 35000),
            (6, 'Ms. Anitha N.', 'Biology', '+94 77 789 0123', 'anitha@stpatricks.lk', 30000),
        ]
        teachers = {}
        for tid, name, subj, mobile, email, salary in teacher_data:
            t, _ = Teacher.objects.get_or_create(
                institute=inst, name=name,
                defaults={'mobile': mobile, 'email': email, 'subject': subj,
                          'monthly_salary': salary, 'is_active': True}
            )
            teachers[tid] = t

        # ── Batches ──
        batch_data = [
            ('g7a', 'Grade 7 — Batch A', 'Grade 7', 'Mathematics', 1, 2026, 3000, '#2a5fa8', '#d8e6fa'),
            ('g8a', 'Grade 8 — Batch A', 'Grade 8', 'Science', None, 2026, 3000, '#2d7a5a', '#d4ede3'),
            ('g9a', 'Grade 9 — Batch A', 'Grade 9', 'Mathematics', 1, 2026, 4500, '#6b3ea8', '#ede8fc'),
            ('g10', 'Grade 10 — O/L Batch', 'Grade 10', 'Mathematics', 1, 2026, 5500, '#c07b1a', '#fef3d7'),
            ('g11', 'Grade 11 — A/L Science', 'Grade 11', 'Physics', 2, 2026, 7000, '#b83030', '#fceaea'),
        ]
        batches = {}
        from apps.academics.models import BatchSubject
        for bid, name, label, subj_name, teacher_id, year, fee, color, colorl in batch_data:
            b, _ = Batch.objects.get_or_create(
                institute=inst, name=name,
                defaults={
                    'label': label,
                    'academic_year': year, 'monthly_fee': fee,
                    'color': color, 'color_light': colorl, 'is_active': True,
                }
            )
            BatchSubject.objects.get_or_create(
                batch=b, subject=subjects[subj_name],
                defaults={'teacher': teachers.get(teacher_id) if teacher_id else None}
            )
            batches[bid] = b

        # ── Students ──
        student_raw = [
            ('Kavitha M.', 'Meena S.', '+94 77 456 7890', 'g7a', 'Grade 7', 3000, 'paid', 99),
            ('Nithya V.', 'Valli P.', '+94 77 678 9012', 'g7a', 'Grade 7', 3000, 'paid', 96),
            ('Arun P.', 'Prabhu A.', '+94 77 100 1001', 'g7a', 'Grade 7', 3000, 'due', 88),
            ('Deepa J.', 'James D.', '+94 77 100 1002', 'g7a', 'Grade 7', 3000, 'paid', 92),
            ('Sanjay L.', 'Latha S.', '+94 77 100 1003', 'g7a', 'Grade 7', 3000, 'paid', 95),
            ('Meena C.', 'Chitra M.', '+94 77 100 1004', 'g7a', 'Grade 7', 3000, 'due', 77),
            ('Rajan N.', 'Nair R.', '+94 77 100 1005', 'g7a', 'Grade 7', 3000, 'paid', 97),
            ('Anitha B.', 'Bala A.', '+94 77 100 1006', 'g7a', 'Grade 7', 3000, 'paid', 91),
            ('Ramesh A.', 'Arjun R.', '+94 77 200 2001', 'g8a', 'Grade 8', 3000, 'paid', 94),
            ('Geetha B.', 'Balan G.', '+94 77 200 2002', 'g8a', 'Grade 8', 3000, 'paid', 91),
            ('Suresh C.', 'Chandra S.', '+94 77 200 2003', 'g8a', 'Grade 8', 3000, 'due', 87),
            ('Kamala D.', 'Devi K.', '+94 77 200 2004', 'g8a', 'Grade 8', 3000, 'paid', 98),
            ('Prabhu E.', 'Elan P.', '+94 77 200 2005', 'g8a', 'Grade 8', 3000, 'overdue', 76),
            ('Valli F.', 'Fathima V.', '+94 77 200 2006', 'g8a', 'Grade 8', 3000, 'paid', 93),
            ('Arjun G.', 'Geetha A.', '+94 77 200 2007', 'g8a', 'Grade 8', 3000, 'paid', 95),
            ('Abhi A.', 'Anna A.', '+94 77 300 3001', 'g9a', 'Grade 9', 4500, 'paid', 95),
            ('Brinda B.', 'Banu B.', '+94 77 300 3002', 'g9a', 'Grade 9', 4500, 'paid', 92),
            ('Dharani D.', 'Devi D.', '+94 77 300 3003', 'g9a', 'Grade 9', 4500, 'due', 97),
            ('Elan E.', 'Elsa E.', '+94 77 300 3004', 'g9a', 'Grade 9', 4500, 'paid', 91),
            ('Fabia F.', 'Faith F.', '+94 77 300 3005', 'g9a', 'Grade 9', 4500, 'paid', 94),
            ('Gobi G.', 'Gopi G.', '+94 77 300 3006', 'g9a', 'Grade 9', 4500, 'overdue', 79),
            ('Aarav Kumar', 'Raj Kumar', '+94 77 123 4567', 'g10', 'Grade 10', 5500, 'paid', 94),
            ('Priya Selvan', 'Selvan M.', '+94 77 234 5678', 'g10', 'Grade 10', 5500, 'due', 81),
            ('Dinesh Raj', 'Raj D.', '+94 77 345 6789', 'g10', 'Grade 10', 5500, 'paid', 97),
            ('Surya T.', 'Thilaga R.', '+94 77 567 8901', 'g10', 'Grade 10', 5500, 'due', 72),
            ('Meena J.', 'Jaya M.', '+94 77 890 1234', 'g10', 'Grade 10', 5500, 'paid', 78),
            ('Ramesh A.', 'Asha R.', '+94 77 100 4001', 'g10', 'Grade 10', 5500, 'paid', 93),
            ('Abhi R.', 'Rajan A.', '+94 77 400 4001', 'g11', 'Grade 11', 7000, 'paid', 97),
            ('Brinda S.', 'Sita B.', '+94 77 400 4002', 'g11', 'Grade 11', 7000, 'paid', 94),
            ('Dharani U.', 'Uma D.', '+94 77 400 4003', 'g11', 'Grade 11', 7000, 'due', 88),
            ('Elan V.', 'Vasu E.', '+94 77 400 4004', 'g11', 'Grade 11', 7000, 'paid', 95),
            ('Fabia W.', 'Wills F.', '+94 77 400 4005', 'g11', 'Grade 11', 7000, 'paid', 92),
        ]

        all_students = []
        for sname, pname, mobile, bid, grade, fee_amt, fee_status, att_pct in student_raw:
            st, _ = Student.objects.get_or_create(
                institute=inst, name=sname, parent_mobile=mobile,
                defaults={
                    'parent_name': pname, 'has_whatsapp': True,
                    'grade': grade, 'is_active': True,
                    'join_date': date(2025, 1, 6),
                }
            )
            all_students.append((st, bid, fee_amt, fee_status, att_pct))

            # Enroll
            StudentBatchEnrollment.objects.get_or_create(
                student=st, batch=batches[bid], academic_year=2026,
                defaults={'status': 'active'}
            )

        # ── Fee Payments (April 2026) ──
        month_date = date(2026, 4, 1)
        for st, bid, fee_amt, fee_status, _ in all_students:
            FeePayment.objects.get_or_create(
                student=st, batch=batches[bid], month=month_date,
                defaults={
                    'amount': fee_amt,
                    'status': fee_status,
                    'paid_at': date(2026, 4, 5) if fee_status == 'paid' else None,
                    'collected_by': 'Sundar Kumar' if fee_status == 'paid' else '',
                }
            )

        # ── Attendance (today) ──
        today = date.today()
        for st, bid, _, _, att_pct in all_students:
            Attendance.objects.get_or_create(
                student=st, batch=batches[bid], date=today,
                defaults={
                    'subject': subjects.get('Mathematics', list(subjects.values())[0]),
                    'is_present': random.random() * 100 < att_pct,
                }
            )

        # ── Timetable ──
        tt_data = [
            ('g7a', '0', '08:00', '09:30', 'Room A1'), ('g7a', '0', '10:00', '11:30', 'Room A1'),
            ('g7a', '2', '08:00', '09:30', 'Room A1'), ('g8a', '0', '14:00', '15:30', 'Room B1'),
            ('g8a', '1', '14:00', '15:30', 'Room B1'), ('g9a', '0', '08:00', '09:30', 'Room C1'),
            ('g9a', '1', '08:00', '09:30', 'Room C1'), ('g10', '0', '08:00', '09:30', 'Room D1'),
            ('g10', '1', '08:00', '09:30', 'Room D1'), ('g10', '3', '08:00', '09:30', 'Room D1'),
            ('g11', '0', '14:00', '15:30', 'Room E1'), ('g11', '0', '16:00', '17:30', 'Room E1'),
            ('g11', '2', '14:00', '15:30', 'Room E1'), ('g11', '4', '14:00', '15:30', 'Room E1'),
        ]
        for bid, day, st_t, en_t, room in tt_data:
            sh, sm = map(int, st_t.split(':'))
            eh, em = map(int, en_t.split(':'))
            TimetableSlot.objects.get_or_create(
                batch=batches[bid], day_of_week=day,
                start_time=time(sh, sm), end_time=time(eh, em),
                defaults={'room': room}
            )

        # ── Teacher Payments ──
        months_list = ['April 2026', 'March 2026', 'February 2026', 'January 2026']
        for tid, t in teachers.items():
            for mi, month in enumerate(months_list):
                is_current = mi == 0
                if is_current:
                    is_paid = tid in [1, 3, 5]
                    status = 'paid' if is_paid else ('overdue' if tid == 6 else 'pending')
                else:
                    status = 'paid'
                TeacherPayment.objects.get_or_create(
                    institute=inst, teacher=t, month=month,
                    defaults={
                        'amount': t.monthly_salary,
                        'status': status,
                        'paid_date': date(2026, 4, 5) if status == 'paid' else None,
                        'method': 'Bank transfer' if status == 'paid' else '',
                        'payment_type': 'salary',
                    }
                )

        # ── Teacher Advances ──
        TeacherAdvance.objects.get_or_create(
            institute=inst, teacher=teachers[2],
            request_date=date(2026, 1, 15),
            defaults={
                'amount': 20000, 'reason': 'Medical emergency — hospital bills',
                'status': 'partial', 'disbursed_date': date(2026, 1, 16),
                'method': 'Bank transfer', 'repaid_amount': 15000,
            }
        )

        # ── Exams ──
        for bid_key, b in batches.items():
            exam, _ = Exam.objects.get_or_create(
                institute=inst, name='Term 1 Exam', batch=b, year=2026,
                defaults={'start_date': date(2026, 2, 10), 'end_date': date(2026, 2, 14),
                          'status': 'completed', 'max_marks': 100}
            )

        # ── Institute Transactions (Accounts) ──
        tx_data = [
            ('April 2026', 'expense', 'utility_bill', 'Electricity Board', 15000, '2026-04-10'),
            ('April 2026', 'expense', 'staff_salary', 'Cleaning Staff (Ravi)', 25000, '2026-04-05'),
            ('March 2026', 'expense', 'rent', 'Building Rent', 60000, '2026-03-01'),
            ('March 2026', 'expense', 'utility_bill', 'Water & Internet', 8500, '2026-03-12'),
            ('March 2026', 'income', 'sponsorship', 'Local Business Grant', 20000, '2026-03-15'),
        ]
        for month, ttype, cat, label, amount, dt in tx_data:
            InstituteTransaction.objects.get_or_create(
                institute=inst, label=label, date=date.fromisoformat(dt),
                defaults={'month': month, 'transaction_type': ttype,
                          'category': cat, 'amount': amount}
            )

        # ── Other Institutes (for admin portal) ──
        other_insts = [
            ('Alpha Lanka', 'alphalanka', 'Colombo', 'basic', 'trial'),
            ('Bright Minds', 'brightminds', 'Kandy', 'basic', 'active'),
            ('Nova Science', 'novascience', 'Gampaha', 'premium', 'active'),
            ('Edu Leaders', 'eduleaders', 'Vavuniya', 'basic', 'active'),
            ('Vision Academy', 'visionacad', 'Colombo', 'premium', 'active'),
            ('Mathura Edu', 'mathuraedu', 'Jaffna', 'basic', 'active'),
            ('Sunrise Tutors', 'sunrisetutors', 'Kandy', 'basic', 'active'),
        ]
        for name, sub, dist, plan, status in other_insts:
            oi, _ = Institute.objects.get_or_create(
                subdomain=sub,
                defaults={
                    'name': name, 'owner_name': f'Admin {name}',
                    'owner_email': f'admin@{sub}.lk',
                    'owner_mobile': '+94 77 000 0000',
                    'plan': plan, 'status': status,
                    'trial_ends_at': date.today() + timedelta(days=5) if status == 'trial' else None,
                }
            )

        # ── Platform Invoices ──
        for oi_inst in Institute.objects.all():
            fee = 6000 if oi_inst.plan == 'premium' else 3000
            for m in range(1, 5):
                inv_month = date(2026, m, 1)
                is_paid = m < 4 or oi_inst.subdomain == 'stpatricks'
                Invoice.objects.get_or_create(
                    institute=oi_inst, month=inv_month,
                    defaults={
                        'amount': fee,
                        'status': 'paid' if is_paid else 'pending',
                        'due_date': inv_month + timedelta(days=15),
                        'paid_at': inv_month + timedelta(days=5) if is_paid else None,
                    }
                )

        # ── Promotion Maps ──
        if 'g7a' in batches and 'g8a' in batches:
            BatchPromotionMap.objects.get_or_create(
                source_batch=batches['g7a'], academic_year=2026,
                defaults={'target_batch': batches['g8a'], 'is_confirmed': False}
            )

        self.stdout.write(self.style.SUCCESS('Database seeded successfully!'))
        self.stdout.write(f'   Institutes: {Institute.objects.count()}')
        self.stdout.write(f'   Students: {Student.objects.count()}')
        self.stdout.write(f'   Batches: {Batch.objects.count()}')
        self.stdout.write(f'   Teachers: {Teacher.objects.count()}')
        self.stdout.write(f'   Fee records: {FeePayment.objects.count()}')
        self.stdout.write(f'   Attendance: {Attendance.objects.count()}')
