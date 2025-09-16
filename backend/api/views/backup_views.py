"""
Backup management API views
"""

import os
from django.http import JsonResponse, HttpResponse, Http404
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.utils.decorators import method_decorator
from django.views.decorators.http import require_http_methods
import json

from ...models import BackupSettings, DatabaseBackup
from ...serializers import BackupSettingsSerializer, DatabaseBackupSerializer
from ...backup_service import DatabaseBackupService


@api_view(['GET', 'PUT'])
def backup_settings_view(request):
    """Get or update backup settings"""
    service = DatabaseBackupService()
    
    if request.method == 'GET':
        serializer = BackupSettingsSerializer(service.settings)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        serializer = BackupSettingsSerializer(service.settings, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def create_backup_view(request):
    """Create a new backup"""
    try:
        service = DatabaseBackupService()
        backup_type = request.data.get('backup_type', 'manual')
        notes = request.data.get('notes', '')
        
        backup = service.create_backup(backup_type=backup_type, notes=notes)
        serializer = DatabaseBackupSerializer(backup)
        
        return Response({
            'message': 'Backup created successfully',
            'backup': serializer.data
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def list_backups_view(request):
    """List all backups"""
    backups = DatabaseBackup.objects.all().order_by('-created_at')
    serializer = DatabaseBackupSerializer(backups, many=True)
    return Response(serializer.data)


@api_view(['POST'])
def restore_backup_view(request, backup_id):
    """Restore from a backup"""
    try:
        service = DatabaseBackupService()
        service.restore_backup(backup_id)
        
        return Response({
            'message': 'Database restored successfully'
        }, status=status.HTTP_200_OK)
        
    except DatabaseBackup.DoesNotExist:
        return Response({
            'error': 'Backup not found'
        }, status=status.HTTP_404_NOT_FOUND)
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
def delete_backup_view(request, backup_id):
    """Delete a backup"""
    try:
        backup = DatabaseBackup.objects.get(id=backup_id)
        
        # Delete the file if it exists
        if os.path.exists(backup.file_path):
            os.remove(backup.file_path)
        
        # Delete the record
        backup.delete()
        
        return Response({
            'message': 'Backup deleted successfully'
        }, status=status.HTTP_200_OK)
        
    except DatabaseBackup.DoesNotExist:
        return Response({
            'error': 'Backup not found'
        }, status=status.HTTP_404_NOT_FOUND)
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def backup_stats_view(request):
    """Get backup statistics"""
    try:
        service = DatabaseBackupService()
        stats = service.get_backup_stats()
        return Response(stats)
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def download_backup_view(request, backup_id):
    """Download a backup file"""
    try:
        backup = DatabaseBackup.objects.get(id=backup_id)
        
        if not os.path.exists(backup.file_path):
            return Response({
                'error': 'Backup file not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Determine content type
        if backup.is_compressed:
            content_type = 'application/gzip'
        else:
            content_type = 'application/octet-stream'
        
        # Read file and return as response
        with open(backup.file_path, 'rb') as f:
            response = HttpResponse(f.read(), content_type=content_type)
            response['Content-Disposition'] = f'attachment; filename="{os.path.basename(backup.file_path)}"'
            return response
            
    except DatabaseBackup.DoesNotExist:
        return Response({
            'error': 'Backup not found'
        }, status=status.HTTP_404_NOT_FOUND)
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def check_auto_backup_view(request):
    """Check if auto backup should be created and create it if needed"""
    try:
        service = DatabaseBackupService()
        
        if service.should_create_auto_backup():
            backup = service.create_backup(backup_type='auto', notes='Automatic backup created when user opened site')
            serializer = DatabaseBackupSerializer(backup)
            
            return Response({
                'backup_created': True,
                'message': 'Auto backup created',
                'backup': serializer.data
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'backup_created': False,
                'message': 'Auto backup not needed at this time'
            }, status=status.HTTP_200_OK)
            
    except Exception as e:
        return Response({
            'backup_created': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
