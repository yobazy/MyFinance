# Data migration to assign existing data to a default user

from django.db import migrations
from django.contrib.auth import get_user_model

def migrate_existing_data(apps, schema_editor):
    """Assign all existing data to a default user"""
    User = get_user_model()
    Category = apps.get_model('backend', 'Category')
    Account = apps.get_model('backend', 'Account')
    Transaction = apps.get_model('backend', 'Transaction')
    CategorizationRule = apps.get_model('backend', 'CategorizationRule')
    RuleGroup = apps.get_model('backend', 'RuleGroup')
    BackupSettings = apps.get_model('backend', 'BackupSettings')
    DatabaseBackup = apps.get_model('backend', 'DatabaseBackup')
    
    # Create or get default user
    default_user, created = User.objects.get_or_create(
        username='default_user',
        defaults={
            'email': 'default@myfinance.local',
            'first_name': 'Default',
            'last_name': 'User',
        }
    )
    
    if created:
        default_user.set_unusable_password()
        default_user.save()
    
    # Migrate Categories
    Category.objects.filter(user__isnull=True).update(user=default_user)
    
    # Migrate Accounts
    Account.objects.filter(user__isnull=True).update(user=default_user)
    
    # Migrate Transactions (via account)
    Transaction.objects.filter(user__isnull=True).update(user=default_user)
    
    # Migrate CategorizationRules
    CategorizationRule.objects.filter(user__isnull=True).update(user=default_user)
    
    # Migrate RuleGroups
    RuleGroup.objects.filter(user__isnull=True).update(user=default_user)
    
    # Migrate BackupSettings (create one for default user if needed)
    for backup_setting in BackupSettings.objects.filter(user__isnull=True):
        backup_setting.user = default_user
        backup_setting.save()
    
    # Migrate DatabaseBackups
    DatabaseBackup.objects.filter(user__isnull=True).update(user=default_user)

def reverse_migration(apps, schema_editor):
    """Reverse migration - set user to None"""
    Category = apps.get_model('backend', 'Category')
    Account = apps.get_model('backend', 'Account')
    Transaction = apps.get_model('backend', 'Transaction')
    CategorizationRule = apps.get_model('backend', 'CategorizationRule')
    RuleGroup = apps.get_model('backend', 'RuleGroup')
    BackupSettings = apps.get_model('backend', 'BackupSettings')
    DatabaseBackup = apps.get_model('backend', 'DatabaseBackup')
    
    User = get_user_model()
    try:
        default_user = User.objects.get(username='default_user')
        Category.objects.filter(user=default_user).update(user=None)
        Account.objects.filter(user=default_user).update(user=None)
        Transaction.objects.filter(user=default_user).update(user=None)
        CategorizationRule.objects.filter(user=default_user).update(user=None)
        RuleGroup.objects.filter(user=default_user).update(user=None)
        BackupSettings.objects.filter(user=default_user).update(user=None)
        DatabaseBackup.objects.filter(user=default_user).update(user=None)
    except User.DoesNotExist:
        pass

class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0014_add_user_foreign_keys'),
    ]

    operations = [
        migrations.RunPython(migrate_existing_data, reverse_migration),
    ]
