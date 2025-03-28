from django.urls import path, include

urlpatterns = [
    path('dashboard/', include('backend.api.urls.dashboard')),
    path('accounts/', include('backend.api.urls.accounts')),
    path('categories/', include('backend.api.urls.categories')),
    path('transactions/', include('backend.api.urls.transactions')),
    path('visualizations/', include('backend.api.urls.visualizations')),
] 