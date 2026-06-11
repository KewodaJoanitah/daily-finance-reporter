from django.contrib.auth import authenticate
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.db.models import Sum

from .models import User, DailyReport
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
            refresh_token = request.data.get('refresh')
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'message': 'Logged out successfully.'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class MeView(APIView):
    """Return current logged-in user info."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class DailyReportListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """List all reports — summary only for speed."""
        reports = DailyReport.objects.all()
        serializer = DailyReportSummarySerializer(reports, many=True)
        return Response(serializer.data)

    def post(self, request):
        """Create or update today's report (accountant only)."""
        if request.user.role != 'accountant':
            return Response(
                {'error': 'Only accountants can save reports.'},
                status=status.HTTP_403_FORBIDDEN
            )

        date = request.data.get('date')
        existing = DailyReport.objects.filter(date=date).first()

        if existing:
            # Update existing report
            serializer = DailyReportSerializer(existing, data=request.data)
        else:
            # Create new report
            serializer = DailyReportSerializer(data=request.data)

        if serializer.is_valid():
            report = serializer.save(created_by=request.user)
            return Response(DailyReportSerializer(report).data, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DailyReportDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, date):
        """Get full report for a specific date including all entries."""
        try:
            report = DailyReport.objects.get(date=date)
            return Response(DailyReportSerializer(report).data)
        except DailyReport.DoesNotExist:
            return Response({'error': 'No report found for this date.'}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, date):
        """Delete a report (accountant only)."""
        if request.user.role != 'accountant':
            return Response({'error': 'Only accountants can delete reports.'}, status=status.HTTP_403_FORBIDDEN)
        try:
            report = DailyReport.objects.get(date=date)
            report.delete()
            return Response({'message': 'Report deleted.'}, status=status.HTTP_200_OK)
        except DailyReport.DoesNotExist:
            return Response({'error': 'Report not found.'}, status=status.HTTP_404_NOT_FOUND)


class SummaryView(APIView):
    """Overall totals across all reports — for director dashboard."""
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
