from rest_framework import serializers
from .models import User, DailyReport, IncomeEntry, ExpenseEntry


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role']


class IncomeEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = IncomeEntry
        fields = ['id', 'label', 'amount', 'order']


class ExpenseEntrySerializer(serializers.ModelSerializer):
    qty = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )
    unit_price = serializers.DecimalField(
        max_digits=14, decimal_places=2, required=False, allow_null=True
    )

    class Meta:
        model = ExpenseEntry
        fields = ['id', 'category', 'item', 'qty', 'unit_price', 'total', 'order']
        read_only_fields = ['total']


class DailyReportSerializer(serializers.ModelSerializer):
    income_entries = IncomeEntrySerializer(many=True)
    expense_entries = ExpenseEntrySerializer(many=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = DailyReport
        fields = [
            'id', 'date', 'total_income', 'total_expense', 'balance',
            'bank_deposit', 'cash_returned',
            'income_entries', 'expense_entries',
            'created_by_name', 'created_at', 'updated_at',
        ]
        read_only_fields = ['total_income', 'total_expense', 'balance', 'created_at', 'updated_at']

    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() or obj.created_by.username
        return None

    def create(self, validated_data):
        income_data = validated_data.pop('income_entries', [])
        expense_data = validated_data.pop('expense_entries', [])

        report = DailyReport.objects.create(**validated_data)

        for i, entry in enumerate(income_data):
            IncomeEntry.objects.create(report=report, order=i, **entry)

        for i, entry in enumerate(expense_data):
            # Remove 'total' if present since it's auto-calculated
            entry.pop('total', None)
            ExpenseEntry.objects.create(report=report, order=i, **entry)

        report.recalculate_totals()
        return report

    def update(self, instance, validated_data):
        income_data = validated_data.pop('income_entries', [])
        expense_data = validated_data.pop('expense_entries', [])

        instance.date = validated_data.get('date', instance.date)
        instance.save()

        instance.income_entries.all().delete()
        instance.expense_entries.all().delete()

        for i, entry in enumerate(income_data):
            IncomeEntry.objects.create(report=instance, order=i, **entry)

        for i, entry in enumerate(expense_data):
            entry.pop('total', None)
            ExpenseEntry.objects.create(report=instance, order=i, **entry)

        instance.recalculate_totals()
        return instance


class DailyReportSummarySerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views — no nested entries."""
    class Meta:
        model = DailyReport
        fields = ['id', 'date', 'total_income', 'total_expense', 'balance', 'bank_deposit', 'cash_returned', 'updated_at']