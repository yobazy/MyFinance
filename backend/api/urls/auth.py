from django.urls import path
from ..views.auth_views import (
    oauth_login,
    oauth_callback,
    get_current_user,
    logout,
    refresh_token_view,
)

urlpatterns = [
    path('login/<str:provider>/', oauth_login, name='oauth_login'),
    path('callback/<str:provider>/', oauth_callback, name='oauth_callback'),
    path('user/', get_current_user, name='get_current_user'),
    path('logout/', logout, name='logout'),
    path('refresh/', refresh_token_view, name='refresh_token'),
]
