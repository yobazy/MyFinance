from rest_framework import serializers
from backend.models import Transaction

class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = '__all__'  # ✅ Serializes all fields
