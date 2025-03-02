from django.shortcuts import render
from rest_framework.response import Response
from rest_framework.decorators import api_view
from django.core.files.storage import default_storage
import pandas as pd
import os

from backend.models import Transaction, Category  # ✅ Import Transaction model
from backend.serializers import TransactionSerializer, CategorySerializer  # ✅ Import Serializer

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

@api_view(['GET'])
def get_categories(request):
    """Fetches all categories."""
    categories = Category.objects.all()
    serializer = CategorySerializer(categories, many=True)
    return Response(serializer.data, content_type="application/json")
from django.http import JsonResponse
from django.db.models import Sum
from backend.models import Transaction, Category
from datetime import datetime
import numpy as np

def get_visualization_data(request):
    """API to get transaction data for visualizations"""
    
    # Get start & end date from frontend query params (default: year-to-date)
    start_date = request.GET.get("start_date", f"{datetime.now().year}-01-01")
    end_date = request.GET.get("end_date", datetime.now().strftime("%Y-%m-%d"))

    # Get all transactions within the date range
    transactions = Transaction.objects.filter(date__range=[start_date, end_date])

    # Total spending per category
    category_spending = (
        transactions.values("category__name")
        .annotate(total_amount=Sum("amount"))
        .order_by("-total_amount")
    )

    # Monthly spending trend
    monthly_trend = (
        transactions.extra({"month": "DATE_TRUNC('month', date)"})
        .values("month")
        .annotate(total_amount=Sum("amount"))
        .order_by("month")
    )

    # Standard deviation per category (spending consistency)
    category_variance = {}
    for category in transactions.values_list("category__name", flat=True).distinct():
        category_transactions = transactions.filter(category__name=category).values_list(
            "amount", flat=True
        )
        category_variance[category] = np.std(category_transactions)

    # Construct JSON response
    response_data = {
        "category_spending": list(category_spending),
        "monthly_trend": list(monthly_trend),
        "category_variance": category_variance,
    }

    return JsonResponse(response_data)
