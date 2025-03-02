from django.urls import path
from backend.views import transactions_missing_categories, upload_file, get_categories

urlpatterns = [
    path('missing-categories/', transactions_missing_categories, name='missing-categories'),
    path('categories/', get_categories, name='categories'),  # ✅ Add this line
    path('upload/', upload_file, name='upload-file'),
]
