from django.urls import path
from backend.views import (
    get_categories,
    create_category,
    update_category,
    delete_category,
    create_subcategory,
    get_category_subcategories,
    get_category_tree,
)

app_name = 'categories'

urlpatterns = [
    path('', get_categories, name='list'),
    path('create/', create_category, name='create'),
    path('tree/', get_category_tree, name='tree'),
    path('<int:category_id>/', update_category, name='update'),
    path('<int:category_id>/delete/', delete_category, name='delete'),
    path('<int:parent_id>/subcategories/', create_subcategory, name='create_subcategory'),
    path('<int:category_id>/subcategories/', get_category_subcategories, name='get_subcategories'),
] 