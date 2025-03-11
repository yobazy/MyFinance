from django.shortcuts import render
from rest_framework.response import Response
from rest_framework.decorators import api_view
from django.core.files.storage import default_storage
import pandas as pd
import os
from django.db.models.functions import TruncMonth

from backend.models import Transaction, Category, TDTransaction, AmexTransaction  # ✅ Import Transaction model
from backend.serializers import TransactionSerializer, CategorySerializer  # ✅ Import Serializer

UPLOAD_DIR = "uploads/"

@api_view(['POST'])
def upload_file(request):
    """Handles CSV/XLS file upload and inserts data into the database."""
    uploaded_file = request.FILES.get('file')
    file_type = request.POST.get('file_type')

    if not uploaded_file:
        return Response({"error": "No file provided"}, status=400)

    # Save file to local directory
    file_path = os.path.join(UPLOAD_DIR, uploaded_file.name)
    default_storage.save(file_path, uploaded_file)

    df = None
    if file_type == "TD":
        df = pd.read_csv(file_path, names=['date', 'charge_name', 'credit_amt', 'debit_amt', 'balance'])
        process_td_data(df)
    elif file_type == "Amex":
        df = pd.read_excel(file_path, skiprows=11)
        df.columns = df.columns.str.lower().str.replace(' ', '_')
        df.rename(columns={'exchange_rate': 'exc_rate'}, inplace=True)
        process_amex_data(df)

    if df is not None:
        return Response({"message": f"{file_type} file uploaded successfully", "rows_processed": len(df)})
    return Response({"error": "Unsupported file type"}, status=400)

def process_td_data(df):
    """Process and insert TD data into the database."""
    for row in df.itertuples(index=False):
        amount = -row.debit_amt if not pd.isna(row.debit_amt) else row.credit_amt
        TDTransaction.objects.create(
            date=row.date,
            charge_name=row.charge_name,
            credit_amt=row.credit_amt,
            debit_amt=row.debit_amt,
            balance=row.balance
        )
        Transaction.objects.create(
            date=row.date,
            description=row.charge_name,
            amount=amount,
            source="TD"
        )
import pandas as pd
from datetime import datetime
from .models import AmexTransaction, Transaction

def process_amex_data(df):
    """Process and insert Amex data into the database, ensuring correct formats."""

    # Convert 'date' and 'date_processed' columns to proper format
    def convert_date(date_str):
        try:
            return datetime.strptime(date_str, "%d %b %Y").strftime("%Y-%m-%d")  # "01 Jan 2025" -> "2025-01-01"
        except ValueError:
            return None  # Return None if date conversion fails

    df['date'] = df['date'].astype(str).apply(convert_date)
    df['date_processed'] = df['date_processed'].astype(str).apply(convert_date)

    # Ensure numeric values are properly formatted and NaN is replaced with 0
    numeric_columns = ['amount', 'commission', 'exc_rate']
    for col in numeric_columns:
        df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)  # Convert to numeric, replace NaN with 0

    # Insert into database
    for row in df.itertuples(index=False):
        if row.date is None or row.date_processed is None:
            continue  # Skip rows with invalid dates

        AmexTransaction.objects.create(
            date=row.date,
            date_processed=row.date_processed,
            description=row.description,
            cardmember=row.cardmember,
            amount=row.amount,
            commission=row.commission,
            exc_rate=row.exc_rate,
            merchant=row.merchant
        )

        # Insert into the combined transactions table
        Transaction.objects.create(
            date=row.date,
            description=row.description,
            amount=row.amount,
            source="Amex",
            merchant=row.merchant
        )


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

def get_accounts(request):
    bank = request.GET.get("bank")  # Get bank parameter from request
    if not bank:
        return JsonResponse({"error": "Bank parameter is required"}, status=400)

    accounts = Account.objects.filter(bank=bank).values("id", "name")
    return JsonResponse({"accounts": list(accounts)})

@api_view(['GET'])
def get_transactions(request):
    """Fetch all transactions."""
    transactions = Transaction.objects.all().order_by("-date")  # Order by latest
    serializer = TransactionSerializer(transactions, many=True)
    return Response(serializer.data)

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

    # Monthly spending trend (SQLite and PostgreSQL compatible)
    monthly_trend = (
        transactions.annotate(month=TruncMonth("date"))  # ✅ TruncMonth replaces DATE_TRUNC
        .values("month")
        .annotate(total_amount=Sum("amount"))
        .order_by("month")
    )

    # Standard deviation per category (spending consistency)
    category_variance = {}
    category_names = transactions.values_list("category__name", flat=True).distinct()

    for category in category_names:
        category_transactions = transactions.filter(category__name=category).values_list(
            "amount", flat=True
        )
        category_variance[category] = float(np.std(list(category_transactions))) if category_transactions else 0

    # Construct JSON response
    response_data = {
        "category_spending": list(category_spending),
        "monthly_trend": list(monthly_trend),
        "category_variance": category_variance,
    }

    return JsonResponse(response_data, safe=False)

@api_view(['GET'])
def get_most_recent_transaction_date(request, table_name):
    """Fetch the most recent transaction date for a given table."""
    model_mapping = {
        "td": TDTransaction,
        "amex": AmexTransaction
    }
    model = model_mapping.get(table_name)

    if model:
        latest_transaction = model.objects.order_by("-date").first()
        if latest_transaction:
            return Response({"date": latest_transaction.date})
    return Response({"error": "No transactions found"}, status=404)