from django.urls import path
from .views import (
    LoginView,
    LogoutView,
    MeView,
    DailyReportListCreateView,
    DailyReportDetailView,
    SummaryView,
)
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    # Auth
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', MeView.as_view(), name='me'),

    # Reports
    path('reports/', DailyReportListCreateView.as_view(), name='reports'),
    path('reports/<str:date>/', DailyReportDetailView.as_view(), name='report_detail'),

    # Summary
    path('summary/', SummaryView.as_view(), name='summary'),
]
