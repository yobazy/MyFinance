"""
Database backup service for MyFinance application
Handles automatic and manual database backups
Auto-backups are triggered when users open the site
"""

import os
import shutil
import gzip
import json
from datetime import datetime, timedelta
from django.conf import settings
from django.db import connection
from django.core.management import call_command
from django.utils import timezone
from .models import BackupSettings, DatabaseBackup


class DatabaseBackupService:
    """Service class for managing database backups"""
    
    def __init__(self):
        self.settings = self._get_or_create_settings()
    
    def _get_or_create_settings(self):
        """Get or create backup settings"""
        settings_obj, created = BackupSettings.objects.get_or_create(
            id=1,
            defaults={
                'max_backups': 5,
                'auto_backup_enabled': True,
                'backup_frequency_hours': 24,
                'backup_location': 'backups/'
            }
        )
        return settings_obj
    
    def _ensure_backup_directory(self):
        """Ensure backup directory exists"""
        backup_dir = os.path.join(settings.BASE_DIR, self.settings.backup_location)
        os.makedirs(backup_dir, exist_ok=True)
        return backup_dir
    
    def _get_database_path(self):
        """Get the current database file path"""
        db_config = settings.DATABASES['default']
        if db_config['ENGINE'] == 'django.db.backends.sqlite3':
            return db_config['NAME']
        else:
            # For PostgreSQL, we'll use pg_dump
            return None
    
    def create_backup(self, backup_type='manual', notes=''):
        """Create a database backup"""
        try:
            backup_dir = self._ensure_backup_directory()
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            
            if self._get_database_path():
                # SQLite backup
                db_path = self._get_database_path()
                backup_filename = f"myfinance_backup_{timestamp}.db"
                backup_path = os.path.join(backup_dir, backup_filename)
                
                # Copy the database file
                shutil.copy2(db_path, backup_path)
                
                # Compress the backup
                compressed_path = f"{backup_path}.gz"
                with open(backup_path, 'rb') as f_in:
                    with gzip.open(compressed_path, 'wb') as f_out:
                        shutil.copyfileobj(f_in, f_out)
                
                # Remove uncompressed file
                os.remove(backup_path)
                final_path = compressed_path
                is_compressed = True
                
            else:
                # PostgreSQL backup using pg_dump
                db_config = settings.DATABASES['default']
                backup_filename = f"myfinance_backup_{timestamp}.sql"
                backup_path = os.path.join(backup_dir, backup_filename)
                
                # Create pg_dump command
                pg_dump_cmd = f"pg_dump -h {db_config['HOST']} -U {db_config['USER']} -d {db_config['NAME']} -f {backup_path}"
                
                # Set password via environment variable
                env = os.environ.copy()
                env['PGPASSWORD'] = db_config['PASSWORD']
                
                import subprocess
                result = subprocess.run(pg_dump_cmd, shell=True, env=env, capture_output=True, text=True)
                
                if result.returncode != 0:
                    raise Exception(f"pg_dump failed: {result.stderr}")
                
                # Compress the backup
                compressed_path = f"{backup_path}.gz"
                with open(backup_path, 'rb') as f_in:
                    with gzip.open(compressed_path, 'wb') as f_out:
                        shutil.copyfileobj(f_in, f_out)
                
                # Remove uncompressed file
                os.remove(backup_path)
                final_path = compressed_path
                is_compressed = True
            
            # Get file size
            file_size = os.path.getsize(final_path)
            
            # Create backup record
            backup_record = DatabaseBackup.objects.create(
                backup_type=backup_type,
                file_path=final_path,
                file_size=file_size,
                is_compressed=is_compressed,
                notes=notes
            )
            
            # Update settings with last backup time
            self.settings.last_backup = timezone.now()
            self.settings.save()
            
            # Clean up old backups
            self._cleanup_old_backups()
            
            return backup_record
            
        except Exception as e:
            raise Exception(f"Backup failed: {str(e)}")
    
    def _cleanup_old_backups(self):
        """Remove old backups based on max_backups setting"""
        backups = DatabaseBackup.objects.all().order_by('-created_at')
        
        if backups.count() > self.settings.max_backups:
            backups_to_delete = backups[self.settings.max_backups:]
            
            for backup in backups_to_delete:
                # Delete the file
                if os.path.exists(backup.file_path):
                    os.remove(backup.file_path)
                
                # Delete the record
                backup.delete()
    
    def restore_backup(self, backup_id):
        """Restore from a backup"""
        try:
            backup = DatabaseBackup.objects.get(id=backup_id)
            
            if not os.path.exists(backup.file_path):
                raise Exception("Backup file not found")
            
            # Preserve current backup records and settings before restore
            current_backups = list(DatabaseBackup.objects.all().values())
            current_settings = list(BackupSettings.objects.all().values())
            
            if self._get_database_path():
                # SQLite restore
                db_path = self._get_database_path()
                
                if backup.is_compressed:
                    # Decompress the backup
                    temp_path = backup.file_path.replace('.gz', '')
                    with gzip.open(backup.file_path, 'rb') as f_in:
                        with open(temp_path, 'wb') as f_out:
                            shutil.copyfileobj(f_in, f_out)
                    
                    # Replace current database
                    shutil.copy2(temp_path, db_path)
                    os.remove(temp_path)
                else:
                    shutil.copy2(backup.file_path, db_path)
                    
            else:
                # PostgreSQL restore
                db_config = settings.DATABASES['default']
                
                if backup.is_compressed:
                    # Decompress the backup
                    temp_path = backup.file_path.replace('.gz', '')
                    with gzip.open(backup.file_path, 'rb') as f_in:
                        with open(temp_path, 'wb') as f_out:
                            shutil.copyfileobj(f_in, f_out)
                    
                    # Restore using psql
                    psql_cmd = f"psql -h {db_config['HOST']} -U {db_config['USER']} -d {db_config['NAME']} -f {temp_path}"
                    
                    env = os.environ.copy()
                    env['PGPASSWORD'] = db_config['PASSWORD']
                    
                    import subprocess
                    result = subprocess.run(psql_cmd, shell=True, env=env, capture_output=True, text=True)
                    
                    if result.returncode != 0:
                        raise Exception(f"psql restore failed: {result.stderr}")
                    
                    os.remove(temp_path)
                else:
                    # Restore directly
                    psql_cmd = f"psql -h {db_config['HOST']} -U {db_config['USER']} -d {db_config['NAME']} -f {backup.file_path}"
                    
                    env = os.environ.copy()
                    env['PGPASSWORD'] = db_config['PASSWORD']
                    
                    import subprocess
                    result = subprocess.run(psql_cmd, shell=True, env=env, capture_output=True, text=True)
                    
                    if result.returncode != 0:
                        raise Exception(f"psql restore failed: {result.stderr}")
            
            # Restore backup records and settings after database restore
            self._restore_backup_metadata(current_backups, current_settings)
            
            # Validate that the restore was successful
            self._validate_restore()
            
            return True
            
        except Exception as e:
            raise Exception(f"Restore failed: {str(e)}")
    
    def _restore_backup_metadata(self, current_backups, current_settings):
        """Restore backup records and settings after database restore"""
        try:
            # Clear any existing backup records that might have been restored
            DatabaseBackup.objects.all().delete()
            BackupSettings.objects.all().delete()
            
            # Restore backup records
            for backup_data in current_backups:
                # Remove the id field to let Django auto-assign new IDs
                backup_data_copy = backup_data.copy()
                if 'id' in backup_data_copy:
                    del backup_data_copy['id']
                
                # Create new backup record
                DatabaseBackup.objects.create(**backup_data_copy)
            
            # Restore backup settings
            for settings_data in current_settings:
                # Remove the id field to let Django auto-assign new IDs
                settings_data_copy = settings_data.copy()
                if 'id' in settings_data_copy:
                    del settings_data_copy['id']
                
                # Create new settings record
                BackupSettings.objects.create(**settings_data_copy)
                
        except Exception as e:
            # Log the error but don't fail the restore
            print(f"Warning: Failed to restore backup metadata: {str(e)}")
    
    def _validate_restore(self):
        """Validate that the restore was successful by checking key data"""
        try:
            from .models import Category, Transaction, Account, CategorizationRule
            
            # Check if we can access the database and key models
            category_count = Category.objects.count()
            transaction_count = Transaction.objects.count()
            account_count = Account.objects.count()
            rule_count = CategorizationRule.objects.count()
            
            # Log the validation results
            print(f"Restore validation - Categories: {category_count}, Transactions: {transaction_count}, Accounts: {account_count}, Rules: {rule_count}")
            
            # If we get here without errors, the restore was successful
            return True
            
        except Exception as e:
            # Log the error but don't fail the restore
            print(f"Warning: Restore validation failed: {str(e)}")
            return False
    
    def should_create_auto_backup(self):
        """Check if an automatic backup should be created"""
        if not self.settings.auto_backup_enabled:
            return False
        
        if not self.settings.last_backup:
            return True
        
        time_since_last = timezone.now() - self.settings.last_backup
        return time_since_last >= timedelta(hours=self.settings.backup_frequency_hours)
    
    def get_backup_stats(self):
        """Get backup statistics"""
        total_backups = DatabaseBackup.objects.count()
        total_size = sum(backup.file_size for backup in DatabaseBackup.objects.all())
        
        return {
            'total_backups': total_backups,
            'total_size_mb': round(total_size / (1024 * 1024), 2),
            'max_backups': self.settings.max_backups,
            'auto_backup_enabled': self.settings.auto_backup_enabled,
            'last_backup': self.settings.last_backup,
            'next_auto_backup': (
                self.settings.last_backup + timedelta(hours=self.settings.backup_frequency_hours)
                if self.settings.last_backup else None
            )
        }
