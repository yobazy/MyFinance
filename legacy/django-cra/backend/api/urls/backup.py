"""
Backup management API URLs
"""

from django.urls import path
from backend.api.views.backup_views import (
    backup_settings_view,
    create_backup_view,
    list_backups_view,
    restore_backup_view,
    delete_backup_view,
    backup_stats_view,
    download_backup_view,
    check_auto_backup_view
)

urlpatterns = [
    path('settings/', backup_settings_view, name='backup_settings'),
    path('create/', create_backup_view, name='create_backup'),
    path('list/', list_backups_view, name='list_backups'),
    path('restore/<int:backup_id>/', restore_backup_view, name='restore_backup'),
    path('delete/<int:backup_id>/', delete_backup_view, name='delete_backup'),
    path('stats/', backup_stats_view, name='backup_stats'),
    path('download/<int:backup_id>/', download_backup_view, name='download_backup'),
    path('check-auto/', check_auto_backup_view, name='check_auto_backup'),
]
