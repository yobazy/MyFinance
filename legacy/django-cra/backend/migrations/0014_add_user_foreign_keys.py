# Generated migration for adding user foreign keys

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('backend', '0013_scotiabanktransaction'),
    ]

    operations = [
        # Add user field to Category (nullable first)
        migrations.AddField(
            model_name='category',
            name='user',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name='categories', to=settings.AUTH_USER_MODEL),
        ),
        # Add user field to Account (nullable first)
        migrations.AddField(
            model_name='account',
            name='user',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name='accounts', to=settings.AUTH_USER_MODEL),
        ),
        # Add user field to Transaction (nullable first)
        migrations.AddField(
            model_name='transaction',
            name='user',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name='transactions', to=settings.AUTH_USER_MODEL),
        ),
        # Add user field to CategorizationRule (nullable first)
        migrations.AddField(
            model_name='categorizationrule',
            name='user',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name='categorization_rules', to=settings.AUTH_USER_MODEL),
        ),
        # Add user field to RuleGroup (nullable first)
        migrations.AddField(
            model_name='rulegroup',
            name='user',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name='rule_groups', to=settings.AUTH_USER_MODEL),
        ),
        # Add user field to BackupSettings (nullable first, will be OneToOne later)
        migrations.AddField(
            model_name='backupsettings',
            name='user',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name='backup_settings', to=settings.AUTH_USER_MODEL),
        ),
        # Add user field to DatabaseBackup (nullable first)
        migrations.AddField(
            model_name='databasebackup',
            name='user',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name='database_backups', to=settings.AUTH_USER_MODEL),
        ),
        # Update unique_together constraints
        migrations.AlterUniqueTogether(
            name='category',
            unique_together={('user', 'name', 'parent')},
        ),
        migrations.AlterUniqueTogether(
            name='account',
            unique_together={('user', 'bank', 'name')},
        ),
        migrations.AlterUniqueTogether(
            name='rulegroup',
            unique_together={('user', 'name')},
        ),
    ]
