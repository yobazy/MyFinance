# Make user fields required after data migration

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('backend', '0015_migrate_existing_data_to_default_user'),
    ]

    operations = [
        # Make user fields required (non-nullable)
        migrations.AlterField(
            model_name='category',
            name='user',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='categories', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AlterField(
            model_name='account',
            name='user',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='accounts', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AlterField(
            model_name='transaction',
            name='user',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='transactions', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AlterField(
            model_name='categorizationrule',
            name='user',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='categorization_rules', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AlterField(
            model_name='rulegroup',
            name='user',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='rule_groups', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AlterField(
            model_name='databasebackup',
            name='user',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='database_backups', to=settings.AUTH_USER_MODEL),
        ),
        # Convert BackupSettings user to OneToOneField
        migrations.RemoveField(
            model_name='backupsettings',
            name='user',
        ),
        migrations.AddField(
            model_name='backupsettings',
            name='user',
            field=models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='backup_settings', to=settings.AUTH_USER_MODEL),
            preserve_default=False,
        ),
    ]
