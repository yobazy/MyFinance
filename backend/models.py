from django.db import models
from django.db.models import Sum
from django.utils import timezone

class Category(models.Model):
    name = models.CharField(max_length=255)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='subcategories')
    description = models.TextField(blank=True, help_text="Optional description for the category")
    color = models.CharField(max_length=7, default='#2196F3', help_text="Hex color code for UI display")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)
    
    class Meta:
        unique_together = ['name', 'parent']  # Allow same name under different parents
        ordering = ['parent__name', 'name']  # Order by parent then name
        verbose_name_plural = "Categories"
    
    def __str__(self):
        if self.parent:
            return f"{self.parent.name} > {self.name}"
        return self.name
    
    @property
    def full_path(self):
        """Get the full hierarchical path of the category"""
        if self.parent:
            return f"{self.parent.full_path} > {self.name}"
        return self.name
    
    @property
    def level(self):
        """Get the depth level of the category (0 for root categories)"""
        level = 0
        parent = self.parent
        while parent:
            level += 1
            parent = parent.parent
        return level
    
    @property
    def is_root(self):
        """Check if this is a root category (no parent)"""
        return self.parent is None
    
    def get_all_subcategories(self):
        """Get all subcategories recursively"""
        subcategories = list(self.subcategories.all())
        for subcategory in subcategories:
            subcategories.extend(subcategory.get_all_subcategories())
        return subcategories
    
    def get_transaction_count(self):
        """Get the count of transactions in this category and all its subcategories"""
        from django.db.models import Count
        subcategory_ids = [self.id] + [sub.id for sub in self.get_all_subcategories()]
        return Transaction.objects.filter(category__in=subcategory_ids).count()

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

# Enhanced model for categorization rules
class CategorizationRule(models.Model):
    RULE_TYPES = [
        ('keyword', 'Keyword Match'),
        ('contains', 'Description Contains'),
        ('exact', 'Exact Match'),
        ('regex', 'Regular Expression'),
        ('amount_range', 'Amount Range'),
        ('amount_exact', 'Exact Amount'),
        ('amount_greater', 'Amount Greater Than'),
        ('amount_less', 'Amount Less Than'),
        ('recurring', 'Recurring Payment'),
        ('merchant', 'Merchant Name'),
        ('date_range', 'Date Range'),
        ('day_of_week', 'Day of Week'),
        ('combined', 'Combined Conditions'),
    ]
    
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, help_text="Optional description of what this rule does")
    rule_type = models.CharField(max_length=20, choices=RULE_TYPES)
    pattern = models.TextField(help_text="The pattern to match (keywords, regex, amount, etc.)")
    category = models.ForeignKey(Category, on_delete=models.CASCADE)
    priority = models.IntegerField(default=1, help_text="Higher number = higher priority")
    is_active = models.BooleanField(default=True)
    case_sensitive = models.BooleanField(default=False, help_text="Whether pattern matching should be case sensitive")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.CharField(max_length=100, default='system', help_text="Who created this rule")
    
    # Additional fields for complex rules
    conditions = models.JSONField(default=dict, blank=True, help_text="Additional conditions for combined rules")
    match_count = models.PositiveIntegerField(default=0, help_text="Number of transactions matched by this rule")
    last_matched = models.DateTimeField(null=True, blank=True, help_text="When this rule last matched a transaction")
    
    class Meta:
        ordering = ['-priority', 'name']
        verbose_name = "Categorization Rule"
        verbose_name_plural = "Categorization Rules"
    
    def __str__(self):
        return f"{self.name} -> {self.category.name}"
    
    def increment_match_count(self):
        """Increment the match count and update last matched timestamp"""
        self.match_count += 1
        self.last_matched = timezone.now()
        self.save(update_fields=['match_count', 'last_matched'])
    
    def get_rule_preview(self):
        """Get a human-readable preview of what this rule matches"""
        if self.rule_type == 'keyword':
            return f"Description contains any of: {self.pattern}"
        elif self.rule_type == 'contains':
            return f"Description contains: {self.pattern}"
        elif self.rule_type == 'exact':
            return f"Description exactly matches: {self.pattern}"
        elif self.rule_type == 'regex':
            return f"Description matches regex: {self.pattern}"
        elif self.rule_type == 'amount_range':
            try:
                import json
                range_data = json.loads(self.pattern)
                return f"Amount between ${range_data.get('min', 0)} and ${range_data.get('max', '∞')}"
            except:
                return f"Amount range: {self.pattern}"
        elif self.rule_type == 'amount_exact':
            return f"Amount exactly: ${self.pattern}"
        elif self.rule_type == 'amount_greater':
            return f"Amount greater than: ${self.pattern}"
        elif self.rule_type == 'amount_less':
            return f"Amount less than: ${self.pattern}"
        elif self.rule_type == 'merchant':
            return f"Merchant name contains: {self.pattern}"
        elif self.rule_type == 'recurring':
            return f"Recurring payment pattern"
        else:
            return f"Custom rule: {self.pattern}"

# Model for rule groups/categories
class RuleGroup(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    color = models.CharField(max_length=7, default='#2196F3', help_text="Hex color code for UI display")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['name']
        verbose_name = "Rule Group"
        verbose_name_plural = "Rule Groups"
    
    def __str__(self):
        return self.name

# Model to track rule performance and usage
class RuleUsage(models.Model):
    rule = models.ForeignKey(CategorizationRule, on_delete=models.CASCADE, related_name='usage_records')
    transaction = models.ForeignKey(Transaction, on_delete=models.CASCADE)
    matched_at = models.DateTimeField(auto_now_add=True)
    confidence_score = models.FloatField(default=1.0)
    was_applied = models.BooleanField(default=True, help_text="Whether this rule was actually applied to categorize the transaction")
    
    class Meta:
        ordering = ['-matched_at']
        verbose_name = "Rule Usage"
        verbose_name_plural = "Rule Usage Records"
    
    def __str__(self):
        return f"{self.rule.name} -> {self.transaction.description[:50]}"

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
