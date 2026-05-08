from django.db import models
from apps.institutes.models import Institute

class Subject(models.Model):
    institute = models.ForeignKey(Institute, on_delete=models.CASCADE, related_name='subjects')
    name = models.CharField(max_length=200)
    grade = models.CharField(max_length=50)
    icon = models.CharField(max_length=10, default='∑')
    color_bg = models.CharField(max_length=30, blank=True)
    color_fg = models.CharField(max_length=30, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'subjects'
    def __str__(self): return f'{self.name} (Grade {self.grade})'

class Teacher(models.Model):
    institute = models.ForeignKey(Institute, on_delete=models.CASCADE, related_name='teachers')
    name = models.CharField(max_length=200)
    mobile = models.CharField(max_length=20)
    email = models.EmailField(blank=True)
    subject = models.CharField(max_length=200, blank=True)
    monthly_salary = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'teachers'
    def __str__(self): return self.name

class Batch(models.Model):
    institute = models.ForeignKey(Institute, on_delete=models.CASCADE, related_name='batches')
    name = models.CharField(max_length=200)
    label = models.CharField(max_length=100, blank=True)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='batches')
    teacher = models.ForeignKey(Teacher, on_delete=models.SET_NULL, null=True, blank=True, related_name='batches')
    academic_year = models.PositiveIntegerField()
    monthly_fee = models.DecimalField(max_digits=10, decimal_places=2)
    color = models.CharField(max_length=30, blank=True)
    color_light = models.CharField(max_length=30, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'batches'
    def __str__(self): return self.name

class BatchTeacherConfig(models.Model):
    batch = models.OneToOneField(Batch, on_delete=models.CASCADE, related_name='teacher_config')
    teacher_fee_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    class Meta:
        db_table = 'batch_teacher_configs'

class Exam(models.Model):
    STATUS_CHOICES = [('upcoming', 'Upcoming'), ('ongoing', 'Ongoing'), ('completed', 'Completed')]
    institute = models.ForeignKey(Institute, on_delete=models.CASCADE, related_name='exams')
    name = models.CharField(max_length=200)
    year = models.PositiveIntegerField()
    batch = models.ForeignKey(Batch, on_delete=models.CASCADE, related_name='exams')
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='upcoming')
    max_marks = models.PositiveIntegerField(default=100)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'exams'
    def __str__(self): return f'{self.name} - {self.batch.name}'

class ExamScheduleItem(models.Model):
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='schedule')
    date = models.DateField()
    subject = models.CharField(max_length=200)
    start_time = models.TimeField()
    end_time = models.TimeField()
    class Meta:
        db_table = 'exam_schedule_items'

class ExamMark(models.Model):
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='marks')
    student = models.ForeignKey('students.Student', on_delete=models.CASCADE, related_name='exam_marks')
    subject = models.CharField(max_length=200)
    marks = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    max_marks = models.PositiveIntegerField(default=100)
    class Meta:
        db_table = 'exam_marks'
        unique_together = ('exam', 'student', 'subject')

class TeacherPayment(models.Model):
    STATUS_CHOICES = [('pending', 'Pending'), ('paid', 'Paid'), ('overdue', 'Overdue')]
    TYPE_CHOICES = [('salary', 'Salary'), ('advance', 'Advance'), ('bonus', 'Bonus')]
    institute = models.ForeignKey(Institute, on_delete=models.CASCADE, related_name='teacher_payments')
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, related_name='payments')
    month = models.CharField(max_length=30)  # e.g. "April 2026"
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    paid_date = models.DateField(null=True, blank=True)
    method = models.CharField(max_length=100, blank=True)
    reference_no = models.CharField(max_length=100, blank=True)
    payslip_file = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    payment_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='salary')
    advance_deduction = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'teacher_payments'
        ordering = ['-created_at']

class TeacherAdvance(models.Model):
    STATUS_CHOICES = [('active', 'Active'), ('repaid', 'Repaid'), ('partial', 'Partial')]
    institute = models.ForeignKey(Institute, on_delete=models.CASCADE, related_name='teacher_advances')
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, related_name='advances')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    request_date = models.DateField()
    reason = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    disbursed_date = models.DateField(null=True, blank=True)
    method = models.CharField(max_length=100, blank=True)
    repaid_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'teacher_advances'
