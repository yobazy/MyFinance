from django.db import migrations, models
import django.utils.timezone

class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0001_initial'),  # Make sure this matches your last migration
    ]

    operations = [
        migrations.AddField(
            model_name='account',
            name='type',
            field=models.CharField(
                choices=[('checking', 'Checking'), ('savings', 'Savings'), ('credit', 'Credit')],
                default='checking',
                max_length=20
            ),
        ),
        migrations.AddField(
            model_name='account',
            name='balance',
            field=models.DecimalField(
                decimal_places=2,
                default=0,
                max_digits=10
            ),
        ),
        migrations.AddField(
            model_name='account',
            name='last_updated',
            field=models.DateTimeField(
                auto_now=True,
                default=django.utils.timezone.now
            ),
        ),
    ] 