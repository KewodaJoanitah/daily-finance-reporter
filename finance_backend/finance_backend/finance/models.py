from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    ROLE_CHOICES = [
        ('accountant', 'Accountant'),
        ('director', 'Director'),
    ]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    email = models.EmailField(unique=True)

    def __str__(self):
        return f"{self.username} ({self.role})"


class DailyReport(models.Model):
    date = models.DateField(unique=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='reports'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Computed totals stored for quick access
    total_income = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_expense = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    balance = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"Report {self.date}"

    def recalculate_totals(self):
        """Recalculate and save totals from entries."""
        self.total_income = sum(
            e.amount for e in self.income_entries.all()
        )
        self.total_expense = sum(
            e.total for e in self.expense_entries.all()
        )
        self.balance = self.total_income - self.total_expense
        self.save()


class IncomeEntry(models.Model):
    report = models.ForeignKey(
        DailyReport, on_delete=models.CASCADE, related_name='income_entries'
    )
    label = models.CharField(max_length=200)
    amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.label}: {self.amount}"


class ExpenseEntry(models.Model):
    CATEGORY_CHOICES = [
        ('Sports', 'Sports'),
        ('Food & kitchen', 'Food & kitchen'),
        ('Utilities', 'Utilities'),
        ('Salaries', 'Salaries'),
        ('Transport', 'Transport'),
        ('Medical', 'Medical'),
        ('Stationery', 'Stationery'),
        ('Maintenance', 'Maintenance'),
        ('Other expenses', 'Other expenses'),
    ]
    report = models.ForeignKey(
        DailyReport, on_delete=models.CASCADE, related_name='expense_entries'
    )
    category = models.CharField(max_length=100, choices=CATEGORY_CHOICES)
    item = models.CharField(max_length=200, blank=True)
    qty = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    unit_price = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    total = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['category', 'order']

    def save(self, *args, **kwargs):
        # Auto-calculate total
        if self.qty and self.unit_price:
            self.total = self.qty * self.unit_price
        elif self.unit_price:
            self.total = self.unit_price
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.category} - {self.item}: {self.total}"
