# Generated by Django 5.1.6 on 2025-03-22 04:02

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0003_merge_0002_transaction_category_new_account_fields'),
    ]

    operations = [
        migrations.AlterField(
            model_name='account',
            name='bank',
            field=models.CharField(max_length=50),
        ),
        migrations.AlterField(
            model_name='account',
            name='last_updated',
            field=models.DateTimeField(auto_now=True),
        ),
    ]
