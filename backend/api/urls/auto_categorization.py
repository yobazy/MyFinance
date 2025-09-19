from django.urls import path
from backend.auto_categorization_views import (
    auto_categorize_transactions,
    get_categorization_suggestions,
    get_categorization_rules,
    create_categorization_rule,
    update_suggestions,
    categorization_stats,
    preview_auto_categorization,
    apply_categorization_preview,
    apply_category_to_similar_transactions,
    get_similar_transactions_count
)

app_name = 'auto_categorization'

urlpatterns = [
    path('auto-categorize/', auto_categorize_transactions, name='auto_categorize'),
    path('preview/', preview_auto_categorization, name='preview'),
    path('apply-preview/', apply_categorization_preview, name='apply_preview'),
    path('apply-to-similar/', apply_category_to_similar_transactions, name='apply_to_similar'),
    path('similar-count/', get_similar_transactions_count, name='similar_count'),
    path('suggestions/<int:transaction_id>/', get_categorization_suggestions, name='suggestions'),
    path('update-suggestions/', update_suggestions, name='update_suggestions'),
    path('rules/', get_categorization_rules, name='rules_list'),
    path('rules/create/', create_categorization_rule, name='rules_create'),
    path('stats/', categorization_stats, name='stats'),
]