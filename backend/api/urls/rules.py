from django.urls import path
from ..views.rule_views import (
    get_rules, get_rule, create_rule, update_rule, delete_rule,
    test_rule, apply_rule_to_transactions, get_rule_stats,
    get_rule_groups, create_rule_group
)

urlpatterns = [
    # Rule management
    path('', get_rules, name='get_rules'),
    path('create/', create_rule, name='create_rule'),
    path('<int:rule_id>/', get_rule, name='get_rule'),
    path('<int:rule_id>/update/', update_rule, name='update_rule'),
    path('<int:rule_id>/delete/', delete_rule, name='delete_rule'),
    path('<int:rule_id>/test/', test_rule, name='test_rule'),
    path('<int:rule_id>/apply/', apply_rule_to_transactions, name='apply_rule_to_transactions'),
    
    # Rule statistics
    path('stats/', get_rule_stats, name='get_rule_stats'),
    
    # Rule groups
    path('groups/', get_rule_groups, name='get_rule_groups'),
    path('groups/create/', create_rule_group, name='create_rule_group'),
]
