from django.urls import path
from backend.views import (
    get_transactions,
    transactions_missing_categories,
    update_transaction_category,
    get_most_recent_transaction_date,
    upload_file,
)

app_name = 'transactions'

urlpatterns = [
    path('', get_transactions, name='list'),
    path('upload/', upload_file, name='upload'),
    path('missing-categories/', transactions_missing_categories, name='missing_categories'),
    path('<int:transaction_id>/update-category/', update_transaction_category, name='update_category'),
    path('latest/<str:table_name>/', get_most_recent_transaction_date, name='latest_date'),
] 