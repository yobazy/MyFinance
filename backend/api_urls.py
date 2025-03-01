from django.urls import path
from backend.views import transactions_missing_categories, upload_file

urlpatterns = [
    path('transactions/missing-categories/', transactions_missing_categories, name='missing-categories'),
    path('upload/', upload_file, name='upload-file'),
]
