from django.urls import path, include
from .views import (
    get_categories,
    create_category,
    update_category,
    delete_category,
    transactions_missing_categories,
    update_transaction_category
)

urlpatterns = [
    path('categories/', get_categories, name='get_categories'),
    path('categories/create/', create_category, name='create_category'),
    path('categories/<int:category_id>/', update_category, name='update_category'),
    path('categories/<int:category_id>/delete/', delete_category, name='delete_category'),
    path('missing-categories/', transactions_missing_categories, name='missing_categories'),
    path('transactions/<int:transaction_id>/update-category/', update_transaction_category, name='update_transaction_category'),
    
    # Rule management endpoints
    path('rules/', include('backend.api.urls.rules')),
]
