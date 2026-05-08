from django.db import models
from apps.institutes.models import Institute

class Invoice(models.Model):
    STATUS_PENDING = 'pending'
    STATUS_PAID = 'paid'
    STATUS_OVERDUE = 'overdue'
    STATUS_CHOICES = [(STATUS_PENDING, 'Pending'), (STATUS_PAID, 'Paid'), (STATUS_OVERDUE, 'Overdue')]

    institute = models.ForeignKey(Institute, on_delete=models.CASCADE, related_name='invoices')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    month = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    paid_at = models.DateTimeField(null=True, blank=True)
    due_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-month']
        unique_together = ('institute', 'month')

class InstituteTransaction(models.Model):
    """Institute-level income/expense transactions for the Accounts page."""
    TYPE_CHOICES = [('income', 'Income'), ('expense', 'Expense')]
    CATEGORY_CHOICES = [
        ('utility_bill', 'Utility Bill'),
        ('staff_salary', 'Staff Salary'),
        ('rent', 'Rent'),
        ('maintenance', 'Maintenance'),
        ('sponsorship', 'Sponsorship'),
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
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']
    def __str__(self): return f'{self.label} ({self.amount})'
