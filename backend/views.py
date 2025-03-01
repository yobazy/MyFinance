from django.shortcuts import render

from rest_framework.response import Response
from rest_framework.decorators import api_view
from django.core.files.storage import default_storage
import pandas as pd
import os

UPLOAD_DIR = "uploads/"

@api_view(['POST'])
def upload_file(request):
    """Handles file upload (TD CSV or Amex XLS)."""
    uploaded_file = request.FILES.get('file')
    file_type = request.POST.get('file_type')

    if not uploaded_file:
        return Response({"error": "No file provided"}, status=400)

    file_path = os.path.join(UPLOAD_DIR, uploaded_file.name)
    default_storage.save(file_path, uploaded_file)

    # Process the file based on type
    df = None
    if file_type == "TD":
        df = pd.read_csv(file_path, names=['date', 'charge_name', 'credit_amt', 'debit_amt', 'balance'])
    elif file_type == "Amex":
        df = pd.read_excel(file_path, skiprows=11)

    if df is not None:
        return Response({"message": f"{file_type} file uploaded successfully", "data": df.head().to_dict()})
    
    return Response({"error": "Unsupported file type"}, status=400)

@api_view(['GET'])
def transactions_missing_categories(request):
    """Fetches transactions that are missing categories."""
    transactions = Transaction.objects.filter(category__isnull=True)
    serializer = TransactionSerializer(transactions, many=True)
    return Response(serializer.data)