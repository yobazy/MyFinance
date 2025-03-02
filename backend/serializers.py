from rest_framework import serializers
from backend.models import Transaction, Category

class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = '__all__'  # ✅ Serializes all fields

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'  # ✅ Serializes all fields
