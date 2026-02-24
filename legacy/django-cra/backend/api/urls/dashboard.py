from django.urls import path
from backend.views import get_dashboard_data

app_name = 'dashboard'

urlpatterns = [
    path('', get_dashboard_data, name='overview'),
] 