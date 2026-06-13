from django.contrib.auth import authenticate
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.db.models import Sum
import traceback

from .models import User, DailyReport, IncomeEntry, ExpenseEntry
from .serializers import (
    LoginSerializer, UserSerializer,
    DailyReportSerializer, DailyReportSummarySerializer,
)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        username = serializer.validated_data['username']
        password = serializer.validated_data['password']
        user = authenticate(request, username=username, password=password)
        if user is None:
            return Response(
                {'error': 'Invalid username or password.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
        })


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            token = RefreshToken(request.data.get('refresh'))
            token.blacklist()
            return Response({'message': 'Logged out successfully.'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class DailyReportListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        reports = DailyReport.objects.all()
        return Response(DailyReportSummarySerializer(reports, many=True).data)

    def post(self, request):
        if request.user.role != 'accountant':
            return Response(
                {'error': 'Only accountants can save reports.'},
                status=status.HTTP_403_FORBIDDEN
            )

        date = request.data.get('date')
        income_entries = request.data.get('income_entries', [])
        expense_entries = request.data.get('expense_entries', [])

        try:
            is_update = request.data.get('is_update', False)
            existing = DailyReport.objects.filter(date=date).first()

            if existing and not is_update:
                # Report exists but not in edit mode — warn user
                from datetime import datetime
                fmt_date = datetime.strptime(date, '%Y-%m-%d').strftime('%A, %d %B %Y')
                return Response(
                    {
                        'error': 'duplicate',
                        'message': f'A report for {fmt_date} already exists. Please edit the existing report instead.',
                        'date': date,
                    },
                    status=status.HTTP_409_CONFLICT
                )

            bank_deposit = float(request.data.get('bank_deposit', 0) or 0)
            cash_returned = float(request.data.get('cash_returned', 0) or 0)

            if existing and is_update:
                report = existing
                report.bank_deposit = bank_deposit
                report.cash_returned = cash_returned
                report.save()
                report.income_entries.all().delete()
                report.expense_entries.all().delete()
            else:
                report = DailyReport.objects.create(
                    date=date,
                    created_by=request.user,
                    bank_deposit=bank_deposit,
                    cash_returned=cash_returned,
                )

            # Create income entries
            for i, entry in enumerate(income_entries):
                IncomeEntry.objects.create(
                    report=report,
                    label=entry.get('label', ''),
                    amount=float(entry.get('amount', 0) or 0),
                    order=i
                )

            # Create expense entries
            for i, entry in enumerate(expense_entries):
                qty = entry.get('qty')
                unit_price = entry.get('unit_price')
                qty = float(qty) if qty not in (None, '', 'null') else None
                unit_price = float(unit_price) if unit_price not in (None, '', 'null') else None

                ExpenseEntry.objects.create(
                    report=report,
                    category=entry.get('category', 'Other expenses'),
                    item=entry.get('item', ''),
                    qty=qty,
                    unit_price=unit_price,
                    order=i
                )

            # Recalculate totals
            report.recalculate_totals()

            return Response(DailyReportSerializer(report).data, status=status.HTTP_200_OK)

        except Exception as e:
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DailyReportDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, date):
        try:
            report = DailyReport.objects.get(date=date)
            return Response(DailyReportSerializer(report).data)
        except DailyReport.DoesNotExist:
            return Response({'error': 'No report for this date.'}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, date):
        if request.user.role != 'accountant':
            return Response({'error': 'Only accountants can delete reports.'}, status=status.HTTP_403_FORBIDDEN)
        try:
            DailyReport.objects.get(date=date).delete()
            return Response({'message': 'Report deleted.'})
        except DailyReport.DoesNotExist:
            return Response({'error': 'Report not found.'}, status=status.HTTP_404_NOT_FOUND)


class SummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        reports = DailyReport.objects.all()
        totals = reports.aggregate(
            total_income=Sum('total_income'),
            total_expense=Sum('total_expense'),
            total_balance=Sum('balance'),
        )
        return Response({
            'total_income': totals['total_income'] or 0,
            'total_expense': totals['total_expense'] or 0,
            'total_balance': totals['total_balance'] or 0,
            'report_count': reports.count(),
        })