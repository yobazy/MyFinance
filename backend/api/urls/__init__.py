from django.urls import path, include

urlpatterns = [
    path('dashboard/', include('backend.api.urls.dashboard')),
    path('accounts/', include('backend.api.urls.accounts')),
    path('categories/', include('backend.api.urls.categories')),
    path('transactions/', include('backend.api.urls.transactions')),
    path('visualizations/', include('backend.api.urls.visualizations')),
    path('auto-categorization/', include('backend.api.urls.auto_categorization')),
    path('backup/', include('backend.api.urls.backup')),
    path('rules/', include('backend.api.urls.rules')),
] 