from django.urls import path
from backend.views import (
    get_categories,
    create_category,
    update_category,
    delete_category,
)

app_name = 'categories'

urlpatterns = [
    path('', get_categories, name='list'),
    path('create/', create_category, name='create'),
    path('<int:category_id>/', update_category, name='update'),
    path('<int:category_id>/delete/', delete_category, name='delete'),
] 