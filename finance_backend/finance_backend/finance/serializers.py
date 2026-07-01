from rest_framework import serializers
from .models import User, DailyReport, IncomeEntry, ExpenseEntry, Message


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'is_staff', 'is_active']


class UserCreateSerializer(serializers.ModelSerializer):
    """Used by the admin director to create new user accounts."""
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'first_name', 'last_name', 'role']

    def validate_role(self, value):
        valid_roles = [r[0] for r in User.ROLE_CHOICES]
        if value not in valid_roles:
            raise serializers.ValidationError(f'Role must be one of: {", ".join(valid_roles)}')
        return value

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('A user with this username already exists.')
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return value

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserManageSerializer(serializers.ModelSerializer):
    """Used by the admin director to update role or active status of an existing user."""
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'is_staff', 'is_active']
        read_only_fields = ['id', 'username', 'email']


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
            'bank_deposit', 'cash_returned', 'seen_by_director',
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
        fields = ['id', 'date', 'total_income', 'total_expense', 'balance', 'bank_deposit', 'cash_returned', 'seen_by_director', 'updated_at']


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    recipient_name = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            'id', 'sender', 'sender_name', 'recipient', 'recipient_name',
            'body', 'created_at', 'is_read',
        ]
        read_only_fields = ['id', 'sender', 'recipient', 'created_at', 'is_read']

    def get_sender_name(self, obj):
        return f"{obj.sender.first_name} {obj.sender.last_name}".strip() or obj.sender.username

    def get_recipient_name(self, obj):
        return f"{obj.recipient.first_name} {obj.recipient.last_name}".strip() or obj.recipient.username