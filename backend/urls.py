"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from .views import upload_file, get_visualization_data, get_transactions, get_accounts, create_account, reset_database, update_account, delete_account, get_dashboard_data

urlpatterns = [
    path('admin/', admin.site.urls),
    path("api/upload/", upload_file, name="upload_file"),
    # VISUALIZATIONS
    path("api/visualizations/", get_visualization_data, name="visualizations"),
    # TRANSACTIONS
    path("api/transactions/", get_transactions, name="transactions"),
    # ACCOUNTS
    path("api/accounts/", get_accounts, name="get_accounts"),
    path("api/accounts/create/", create_account, name="create_account"),
    path("api/accounts/<int:account_id>/", update_account, name="update_account"),
    path("api/accounts/<int:account_id>/delete/", delete_account, name="delete_account"),
    # DASHBOARD
    path("api/dashboard/", get_dashboard_data, name="dashboard"),
    # DATABASE
    path("api/reset-database/", reset_database, name="reset-database"),

    # EXTERNAL API ROUTES, SEE api_urls.py
    path('api/', include('backend.api.urls')),  # All API routes will be under /api/
]
