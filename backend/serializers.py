from rest_framework import serializers
from .models import Transaction, Category, CategorizationRule, RuleGroup, RuleUsage, BackupSettings, DatabaseBackup

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
    rule_preview = serializers.CharField(source='get_rule_preview', read_only=True)
    
    class Meta:
        model = CategorizationRule
        fields = [
            'id', 'name', 'description', 'rule_type', 'pattern', 'category', 'category_name',
            'priority', 'is_active', 'case_sensitive', 'created_by', 'conditions',
            'match_count', 'last_matched', 'created_at', 'updated_at', 'rule_preview'
        ]
        read_only_fields = ['match_count', 'last_matched', 'created_at', 'updated_at']

class RuleGroupSerializer(serializers.ModelSerializer):
    rule_count = serializers.SerializerMethodField()
    
    class Meta:
        model = RuleGroup
        fields = ['id', 'name', 'description', 'color', 'is_active', 'created_at', 'rule_count']
        read_only_fields = ['created_at']
    
    def get_rule_count(self, obj):
        return obj.categorizationrule_set.count()

class RuleUsageSerializer(serializers.ModelSerializer):
    rule_name = serializers.CharField(source='rule.name', read_only=True)
    transaction_description = serializers.CharField(source='transaction.description', read_only=True)
    
    class Meta:
        model = RuleUsage
        fields = [
            'id', 'rule', 'rule_name', 'transaction', 'transaction_description',
            'matched_at', 'confidence_score', 'was_applied'
        ]
        read_only_fields = ['matched_at']

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
