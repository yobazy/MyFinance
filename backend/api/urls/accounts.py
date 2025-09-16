from django.urls import path
from backend.views import (
    get_accounts,
    create_account,
    update_account,
    delete_account,
    refresh_account_balances,
)

app_name = 'accounts'

urlpatterns = [
    path('', get_accounts, name='list'),
    path('create/', create_account, name='create'),
    path('<int:account_id>/', update_account, name='update'),
    path('<int:account_id>/delete/', delete_account, name='delete'),
    path('refresh-balances/', refresh_account_balances, name='refresh_balances'),
] 