from rest_framework import serializers
from .models import Transaction, Category, CategorizationRule, BackupSettings, DatabaseBackup

class TransactionSerializer(serializers.ModelSerializer):
    account_name = serializers.CharField(source='account.name', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    suggested_category_name = serializers.CharField(source='suggested_category.name', read_only=True)
    
    class Meta:
        model = Transaction
        fields = [
            'id', 'date', 'description', 'amount', 'source', 'account', 
            'account_name', 'category', 'category_name', 'auto_categorized', 
            'confidence_score', 'suggested_category', 'suggested_category_name'
        ]

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'

class CategorizationRuleSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    
    class Meta:
        model = CategorizationRule
        fields = [
            'id', 'name', 'rule_type', 'pattern', 'category', 'category_name',
            'priority', 'is_active', 'created_at', 'updated_at'
        ]

class BackupSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = BackupSettings
        fields = [
            'id', 'max_backups', 'auto_backup_enabled', 'backup_frequency_hours',
            'last_backup', 'backup_location'
        ]

class DatabaseBackupSerializer(serializers.ModelSerializer):
    file_size_mb = serializers.SerializerMethodField()
    
    class Meta:
        model = DatabaseBackup
        fields = [
            'id', 'backup_type', 'file_path', 'file_size', 'file_size_mb',
            'created_at', 'is_compressed', 'notes'
        ]
    
    def get_file_size_mb(self, obj):
        return round(obj.file_size / (1024 * 1024), 2)
