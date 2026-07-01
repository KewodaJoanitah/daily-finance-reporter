from django.urls import path
from .views import (
    LoginView,
    LogoutView,
    MeView,
    DailyReportListCreateView,
    DailyReportDetailView,
    SummaryView,
    MessageListCreateView,
    MarkMessagesReadView,
    MarkReportsSeenView,
    NotificationSummaryView,
    UserListCreateView,
    UserDetailView,
)
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    # Auth
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', MeView.as_view(), name='me'),

    # User management (admin director only)
    path('users/', UserListCreateView.as_view(), name='users'),
    path('users/<int:user_id>/', UserDetailView.as_view(), name='user_detail'),

    # Reports — mark-seen must come BEFORE <str:date> to avoid swallowing the slug
    path('reports/', DailyReportListCreateView.as_view(), name='reports'),
    path('reports/mark-seen/', MarkReportsSeenView.as_view(), name='reports_mark_seen'),
    path('reports/<str:date>/', DailyReportDetailView.as_view(), name='report_detail'),

    # Summary
    path('summary/', SummaryView.as_view(), name='summary'),

    # Messages & notifications
    path('messages/', MessageListCreateView.as_view(), name='messages'),
    path('messages/mark-read/', MarkMessagesReadView.as_view(), name='messages_mark_read'),
    path('notifications/summary/', NotificationSummaryView.as_view(), name='notification_summary'),
]