from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, DailyReport, IncomeEntry, ExpenseEntry


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['username', 'email', 'role', 'is_active']
    list_filter = ['role']
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Role', {'fields': ('role',)}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Role', {'fields': ('role', 'email')}),
    )


class IncomeEntryInline(admin.TabularInline):
    model = IncomeEntry
    extra = 0


class ExpenseEntryInline(admin.TabularInline):
    model = ExpenseEntry
    extra = 0


@admin.register(DailyReport)
class DailyReportAdmin(admin.ModelAdmin):
    list_display = ['date', 'total_income', 'total_expense', 'balance', 'created_by', 'updated_at']
    list_filter = ['date']
    inlines = [IncomeEntryInline, ExpenseEntryInline]
    readonly_fields = ['total_income', 'total_expense', 'balance', 'created_at', 'updated_at']
