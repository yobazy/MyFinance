from rest_framework import serializers
from .models import Transaction, Category, CategorizationRule

class TransactionSerializer(serializers.ModelSerializer):
    account_name = serializers.CharField(source='account.name', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    
    class Meta:
        model = Transaction
        fields = [
            'id', 'date', 'description', 'amount', 'source', 'account', 
            'account_name', 'category', 'category_name', 'auto_categorized', 
            'confidence_score'
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
