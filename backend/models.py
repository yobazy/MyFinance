from django.db import models
from django.db.models import Sum

class Category(models.Model):
    name = models.CharField(max_length=255, unique=True)

    def __str__(self):
        return self.name

class Account(models.Model):
    ACCOUNT_TYPES = [
        ('checking', 'Checking'),
        ('savings', 'Savings'),
        ('credit', 'Credit'),
    ]
    
    name = models.CharField(max_length=100)
    bank = models.CharField(max_length=50)
    type = models.CharField(max_length=20, choices=ACCOUNT_TYPES, default='checking')
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['bank', 'name']

    def __str__(self):
        return f"{self.bank} - {self.name}"
    
    def calculate_balance(self):
        """Calculate the current balance by summing all transactions for this account."""
        from .models import Transaction
        result = Transaction.objects.filter(account=self).aggregate(
            total=Sum('amount')
        )
        return result['total'] or 0
    
    def update_balance(self):
        """Update the balance field with the calculated balance."""
        self.balance = self.calculate_balance()
        self.save(update_fields=['balance'])
        return self.balance
       
class Transaction(models.Model):
    date = models.DateField()
    description = models.TextField()
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    source = models.CharField(max_length=50)  # e.g., TD, Amex
    account = models.ForeignKey(Account, on_delete=models.CASCADE)  # Link to Account
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)  # Optional category
    # New fields for auto-categorization
    auto_categorized = models.BooleanField(default=False)  # Track if auto-categorized
    confidence_score = models.FloatField(null=True, blank=True)  # Confidence in categorization
    suggested_category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='suggested_transactions')  # Suggested category for uncategorized transactions

    def __str__(self):
        return f"{self.date} - {self.description} - {self.amount}"

# New model for categorization rules
class CategorizationRule(models.Model):
    RULE_TYPES = [
        ('keyword', 'Keyword Match'),
        ('contains', 'Description Contains'),
        ('exact', 'Exact Match'),
        ('amount_range', 'Amount Range'),
        ('recurring', 'Recurring Payment'),
    ]
    
    name = models.CharField(max_length=255)
    rule_type = models.CharField(max_length=20, choices=RULE_TYPES)
    pattern = models.TextField()  # The pattern to match (keywords, regex, etc.)
    category = models.ForeignKey(Category, on_delete=models.CASCADE)
    priority = models.IntegerField(default=1)  # Higher number = higher priority
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-priority', 'name']
    
    def __str__(self):
        return f"{self.name} -> {self.category.name}"

class TDTransaction(models.Model):
    date = models.DateField()
    charge_name = models.TextField()
    credit_amt = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    debit_amt = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    balance = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    class Meta:
        db_table = 'td'

class AmexTransaction(models.Model):
    date = models.DateField()
    date_processed = models.DateField()
    description = models.TextField()
    cardmember = models.TextField()
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    commission = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    exc_rate = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
    merchant = models.TextField()

    class Meta:
        db_table = 'amex'

# Database Management Models
class BackupSettings(models.Model):
    """Settings for database backup management"""
    max_backups = models.PositiveIntegerField(default=5, help_text="Maximum number of auto-backups to keep")
    auto_backup_enabled = models.BooleanField(default=True, help_text="Enable automatic backups")
    backup_frequency_hours = models.PositiveIntegerField(default=24, help_text="Hours between automatic backups")
    last_backup = models.DateTimeField(null=True, blank=True, help_text="Last backup timestamp")
    backup_location = models.CharField(max_length=500, default="backups/", help_text="Directory to store backups")
    
    class Meta:
        verbose_name = "Backup Settings"
        verbose_name_plural = "Backup Settings"
    
    def __str__(self):
        return f"Backup Settings (Max: {self.max_backups}, Enabled: {self.auto_backup_enabled})"

class DatabaseBackup(models.Model):
    """Individual backup records"""
    BACKUP_TYPES = [
        ('auto', 'Automatic'),
        ('manual', 'Manual'),
        ('scheduled', 'Scheduled'),
    ]
    
    backup_type = models.CharField(max_length=20, choices=BACKUP_TYPES, default='manual')
    file_path = models.CharField(max_length=500, help_text="Path to backup file")
    file_size = models.BigIntegerField(help_text="Size of backup file in bytes")
    created_at = models.DateTimeField(auto_now_add=True)
    is_compressed = models.BooleanField(default=True, help_text="Whether backup is compressed")
    notes = models.TextField(blank=True, help_text="Optional notes about this backup")
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Database Backup"
        verbose_name_plural = "Database Backups"
    
    def __str__(self):
        return f"Backup {self.id} - {self.backup_type} ({self.created_at.strftime('%Y-%m-%d %H:%M')})"
