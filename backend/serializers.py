from rest_framework import serializers
from backend.models import Transaction, Category

class TransactionSerializer(serializers.ModelSerializer):
    account_name = serializers.CharField(source='account.name', read_only=True)
    
    class Meta:
        model = Transaction
        fields = ['id', 'date', 'description', 'amount', 'source', 'account', 'account_name', 'category']

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'  # ✅ Serializes all fields
