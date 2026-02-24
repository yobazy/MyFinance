from django.contrib import admin
from .models import (
    Category, Account, Transaction, CategorizationRule, 
    TDTransaction, AmexTransaction, BackupSettings, DatabaseBackup
)

# Register your models here.

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name']
    search_fields = ['name']

@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = ['name', 'bank', 'type', 'balance', 'last_updated']
    list_filter = ['bank', 'type']
    search_fields = ['name', 'bank']

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ['date', 'description', 'amount', 'source', 'account', 'category']
    list_filter = ['source', 'account', 'category', 'date']
    search_fields = ['description', 'account__name']
    date_hierarchy = 'date'

@admin.register(CategorizationRule)
class CategorizationRuleAdmin(admin.ModelAdmin):
    list_display = ['name', 'rule_type', 'category', 'priority', 'is_active']
    list_filter = ['rule_type', 'is_active', 'category']
    search_fields = ['name', 'pattern']

@admin.register(TDTransaction)
class TDTransactionAdmin(admin.ModelAdmin):
    list_display = ['date', 'charge_name', 'credit_amt', 'debit_amt', 'balance']
    list_filter = ['date']
    search_fields = ['charge_name']

@admin.register(AmexTransaction)
class AmexTransactionAdmin(admin.ModelAdmin):
    list_display = ['date', 'description', 'amount', 'merchant']
    list_filter = ['date']
    search_fields = ['description', 'merchant']

@admin.register(BackupSettings)
class BackupSettingsAdmin(admin.ModelAdmin):
    list_display = ['max_backups', 'auto_backup_enabled', 'backup_frequency_hours', 'last_backup']
    readonly_fields = ['last_backup']

@admin.register(DatabaseBackup)
class DatabaseBackupAdmin(admin.ModelAdmin):
    list_display = ['id', 'backup_type', 'created_at', 'file_size', 'is_compressed']
    list_filter = ['backup_type', 'is_compressed', 'created_at']
    readonly_fields = ['created_at', 'file_size']
    date_hierarchy = 'created_at'
