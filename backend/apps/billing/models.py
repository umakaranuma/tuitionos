from django.db import models
from apps.institutes.models import Institute

def payment_slip_upload_to(instance, filename):
    return f'payment_slips/{instance.institute_id}/{instance.month.year}/{instance.month.month:02d}/{filename}'


def invoice_payment_slip_upload_to(instance, filename):
    inv = instance.invoice
    return f'payment_slips/{inv.institute_id}/{inv.month.year}/{inv.month.month:02d}/payments/{filename}'


class Invoice(models.Model):
    STATUS_PENDING = 'pending'
    STATUS_PARTIAL = 'partial'
    STATUS_PAID = 'paid'
    STATUS_OVERDUE = 'overdue'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_PARTIAL, 'Partially Paid'),
        (STATUS_PAID, 'Paid'),
        (STATUS_OVERDUE, 'Overdue'),
    ]

    institute = models.ForeignKey(Institute, on_delete=models.CASCADE, related_name='invoices')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    paid_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    month = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    paid_at = models.DateTimeField(null=True, blank=True)
    due_date = models.DateField()
    reference_note = models.CharField(max_length=200, blank=True, null=True)
    payment_slip = models.FileField(upload_to=payment_slip_upload_to, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'invoices'
        ordering = ['-month']
        unique_together = ('institute', 'month')

class InvoicePayment(models.Model):
    """A single transfer/installment against an invoice.

    Partial payments accumulate as multiple InvoicePayment rows — each with its
    own transferred amount, document/slip and reference — so a 2–3 installment
    settlement keeps every entry and document on record.
    """
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='payments')
    institute = models.ForeignKey(Institute, on_delete=models.CASCADE, related_name='invoice_payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    slip = models.FileField(upload_to=invoice_payment_slip_upload_to, blank=True, null=True)
    reference_note = models.CharField(max_length=200, blank=True, default='')
    actor = models.CharField(max_length=120, blank=True, default='Admin')
    is_advance = models.BooleanField(default=False)
    source_month = models.DateField(null=True, blank=True)  # for advance carried from another month
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'invoice_payments'
        ordering = ['created_at']

    def __str__(self):
        return f'Payment {self.amount} on invoice {self.invoice_id}'


class InstituteTransaction(models.Model):
    """Institute-level income/expense transactions for the Accounts page."""
    TYPE_CHOICES = [('income', 'Income'), ('expense', 'Expense')]
    CATEGORY_CHOICES = [
        ('student_fee', 'Student Fees'),
        ('utility_bill', 'Utility Bill'),
        ('staff_salary', 'Staff Salary'),
        ('rent', 'Rent'),
        ('maintenance', 'Maintenance'),
        ('sponsorship', 'Sponsorship'),
        ('platform_fee', 'Platform Fee'),
        ('other_income', 'Other Income'),
        ('other', 'Other'),
    ]

    institute = models.ForeignKey(Institute, on_delete=models.CASCADE, related_name='transactions')
    month = models.CharField(max_length=30)  # e.g. "April 2026"
    transaction_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES)
    label = models.CharField(max_length=200)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    date = models.DateField()
    # True only on the single running-total row per institute+month+category
    # for student_fee / staff_salary (e.g. one "Student Fees" row for August
    # that holds the sum of every paid fee that month) — every new paid
    # fee/salary updates that one row's amount rather than adding a new line.
    # Lets the UI lock editing on a per-row basis, since a category like
    # staff_salary can have both this auto-total row and manual entries.
    is_auto_synced = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'institute_transactions'
        ordering = ['-date']
    def __str__(self): return f'{self.label} ({self.amount})'

    @property
    def is_system(self) -> bool:
        return self.is_auto_synced or self.category == 'platform_fee'


class InvoiceActivity(models.Model):
    """Audit trail of every billing edit performed on an invoice."""
    ACTION_CREATED = 'created'
    ACTION_PAYMENT_RECORDED = 'payment_recorded'
    ACTION_MARKED_PAID = 'marked_paid'
    ACTION_REVERTED_PENDING = 'reverted_pending'
    ACTION_STATUS_CHANGED = 'status_changed'
    ACTION_AMOUNT_CHANGED = 'amount_changed'
    ACTION_SLIP_UPLOADED = 'slip_uploaded'
    ACTION_ADVANCE_APPLIED = 'advance_applied'
    ACTION_PAYMENT_EDITED = 'payment_edited'
    ACTION_PAYMENT_REMOVED = 'payment_removed'
    ACTION_CHOICES = [
        (ACTION_CREATED, 'Invoice Created'),
        (ACTION_PAYMENT_RECORDED, 'Payment Recorded'),
        (ACTION_MARKED_PAID, 'Marked Paid'),
        (ACTION_REVERTED_PENDING, 'Reverted to Pending'),
        (ACTION_STATUS_CHANGED, 'Status Changed'),
        (ACTION_AMOUNT_CHANGED, 'Amount Changed'),
        (ACTION_SLIP_UPLOADED, 'Slip Uploaded'),
        (ACTION_ADVANCE_APPLIED, 'Advance Applied'),
        (ACTION_PAYMENT_EDITED, 'Payment Edited'),
        (ACTION_PAYMENT_REMOVED, 'Payment Removed'),
    ]

    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='activities')
    institute = models.ForeignKey(Institute, on_delete=models.CASCADE, related_name='invoice_activities')
    action = models.CharField(max_length=30, choices=ACTION_CHOICES)
    detail = models.CharField(max_length=300, blank=True, default='')
    actor = models.CharField(max_length=120, blank=True, default='Admin')
    amount_snapshot = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'invoice_activities'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.get_action_display()} — {self.invoice_id}'
