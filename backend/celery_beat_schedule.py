from celery.schedules import crontab
CELERY_BEAT_SCHEDULE = {
    'generate-monthly-invoices': {'task': 'apps.billing.tasks.generate_monthly_invoices', 'schedule': crontab(hour=0, minute=1, day_of_month=1)},
    'send-fee-reminders': {'task': 'apps.notifications.tasks.send_monthly_fee_reminders', 'schedule': crontab(hour=9, minute=0, day_of_month=1)},
    'send-second-fee-reminders': {'task': 'apps.notifications.tasks.send_second_fee_reminders', 'schedule': crontab(hour=10, minute=0, day_of_month=10)},
    'send-daily-absent-digest': {'task': 'apps.attendance.tasks.send_daily_absent_digest', 'schedule': crontab(hour=18, minute=0)},
    'check-overdue-suspensions': {'task': 'apps.billing.tasks.check_overdue_and_suspend', 'schedule': crontab(hour=1, minute=0)},
    'check-trial-expiries': {'task': 'apps.institutes.tasks.check_trial_expiries', 'schedule': crontab(hour=9, minute=30)},
    'monthly-income-summary': {'task': 'apps.billing.tasks.send_developer_income_summary', 'schedule': crontab(hour=8, minute=0, day_of_month=2)},
}
