from django.urls import path
from backend.views import get_visualization_data

app_name = 'visualizations'

urlpatterns = [
    path('', get_visualization_data, name='dashboard'),
] 