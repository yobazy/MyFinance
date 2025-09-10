from django.shortcuts import render
from rest_framework.response import Response
from rest_framework.decorators import api_view
from django.core.files.storage import default_storage
import pandas as pd
import os
import json
from django.db.models.functions import TruncMonth
from .models import Account
from django.views.decorators.csrf import csrf_exempt

from backend.models import Transaction, Category, TDTransaction, AmexTransaction  # ✅ Import Transaction model
from backend.serializers import TransactionSerializer, CategorySerializer  # ✅ Import Serializer

UPLOAD_DIR = "uploads/"

@api_view(['POST'])
def upload_file(request):
    """Handles CSV/XLS file upload and inserts data into the database."""
    uploaded_file = request.FILES.get('file')
    file_type = request.POST.get('file_type')
    bank = request.POST.get('bank')
    account_name = request.POST.get('account')

    if not uploaded_file:
        return Response({"error": "No file provided"}, status=400)

    if not bank or not account_name:
        return Response({"error": "Bank and account are required"}, status=400)

    # Get or create the account
    try:
        account = Account.objects.get(bank=bank, name=account_name)
    except Account.DoesNotExist:
        return Response({"error": f"Account '{account_name}' not found for bank '{bank}'"}, status=400)

    # Save file to local directory
    file_path = os.path.join(UPLOAD_DIR, uploaded_file.name)
    default_storage.save(file_path, uploaded_file)

    df = None
    try:
        if file_type == "TD":
            df = pd.read_csv(file_path, names=['date', 'charge_name', 'credit_amt', 'debit_amt', 'balance'])
            process_td_data(df, account)
        elif file_type == "Amex":
            df = pd.read_excel(file_path, skiprows=11)
            df.columns = df.columns.str.lower().str.replace(' ', '_')
            df.rename(columns={'exchange_rate': 'exc_rate'}, inplace=True)
            process_amex_data(df, account)
        else:
            return Response({"error": "Unsupported file type"}, status=400)

        if df is not None:
            return Response({"message": f"{file_type} file uploaded successfully", "rows_processed": len(df)})
    except Exception as e:
        return Response({"error": f"Error processing file: {str(e)}"}, status=500)
    finally:
        # Clean up the uploaded file
        if os.path.exists(file_path):
            os.remove(file_path)

    return Response({"error": "Failed to process file"}, status=500)

def process_td_data(df, account):
    """Process and insert TD data into the database."""
    for row in df.itertuples(index=False):
        # Handle empty values properly
        credit_amt = row.credit_amt if not pd.isna(row.credit_amt) and row.credit_amt != '' else None
        debit_amt = row.debit_amt if not pd.isna(row.debit_amt) and row.debit_amt != '' else None
        
        amount = -debit_amt if debit_amt is not None else credit_amt
        
        TDTransaction.objects.create(
            date=row.date,
            charge_name=row.charge_name,
            credit_amt=credit_amt,
            debit_amt=debit_amt,
            balance=row.balance
        )
        Transaction.objects.create(
            date=row.date,
            description=row.charge_name,
            amount=amount,
            source="TD",
            account=account
        )
def process_amex_data(df, account):
    """Process and insert Amex data into the database, ensuring correct formats."""
    from datetime import datetime

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
            account=account
        )
@csrf_exempt
def manage_accounts(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            bank = data.get("bank")
            name = data.get("name")

            if not bank or not name:
                return JsonResponse({"error": "Both bank and account name are required"}, status=400)

            # Ensure account is unique for the bank
            account, created = Account.objects.get_or_create(bank=bank, name=name)

            if created:
                return JsonResponse({"message": f"Account '{name}' added successfully!"}, status=201)
            else:
                return JsonResponse({"error": "Account already exists for this bank."}, status=400)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

    elif request.method == "GET":
        bank = request.GET.get("bank")
        if not bank:
            return JsonResponse({"error": "Bank parameter is required"}, status=400)

        accounts = Account.objects.filter(bank=bank).values("id", "name")
        return JsonResponse({"accounts": list(accounts)}, status=200)

    return JsonResponse({"error": "Invalid request method"}, status=405)

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

@csrf_exempt
def create_account(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            bank = data.get("bank")
            name = data.get("name")
            account_type = data.get("type", "checking")

            if not bank or not name:
                return JsonResponse({"error": "Bank and account name are required"}, status=400)

            account = Account.objects.create(
                bank=bank,
                name=name,
                type=account_type,
                balance=0
            )

            return JsonResponse({
                "message": "Account created successfully",
                "account": {
                    "id": account.id,
                    "name": account.name,
                    "bank": account.bank,
                    "type": account.type,
                    "balance": float(account.balance),
                    "lastUpdated": account.last_updated.isoformat()
                }
            }, status=201)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)
    else:
        return JsonResponse({"error": "Method not allowed. Use POST to create accounts."}, status=405)
@csrf_exempt
def get_accounts(request):
    try:
        bank = request.GET.get("bank")
        accounts = Account.objects.all()
        if bank:
            accounts = accounts.filter(bank=bank)

        return JsonResponse({
            "accounts": [{
                "id": account.id,
                "name": account.name,
                "bank": account.bank,
                "type": account.type,
                "balance": float(account.balance),
                "lastUpdated": account.last_updated.isoformat()
            } for account in accounts]
        })
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@api_view(['GET'])
def get_transactions(request):
    """Fetch all transactions."""
    transactions = Transaction.objects.all().order_by("-date")  # Order by latest
    serializer = TransactionSerializer(transactions, many=True)
    return Response(serializer.data)

@api_view(["POST"])
def reset_database(request):
    """Deletes all transactions and accounts, then runs migrations."""
    try:
        Transaction.objects.all().delete()
        Account.objects.all().delete()

        # Run migrations
        os.system("python manage.py makemigrations && python manage.py migrate")

        return JsonResponse({"message": "Database reset and migrations applied!"})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
    
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

@api_view(['POST'])
def create_category(request):
    """Creates a new category."""
    serializer = CategorySerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)

@api_view(['PUT'])
def update_category(request, category_id):
    """Updates an existing category."""
    try:
        category = Category.objects.get(id=category_id)
        serializer = CategorySerializer(category, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)
    except Category.DoesNotExist:
        return Response({'error': 'Category not found'}, status=404)

@api_view(['DELETE'])
def delete_category(request, category_id):
    """Deletes a category."""
    try:
        category = Category.objects.get(id=category_id)
        category.delete()
        return Response(status=204)
    except Category.DoesNotExist:
        return Response({'error': 'Category not found'}, status=404)

@api_view(['PUT'])
def update_transaction_category(request, transaction_id):
    """Updates a transaction's category."""
    try:
        transaction = Transaction.objects.get(id=transaction_id)
        category_id = request.data.get('category')
        category = Category.objects.get(id=category_id)
        transaction.category = category
        transaction.save()
        return Response(TransactionSerializer(transaction).data)
    except Transaction.DoesNotExist:
        return Response({'error': 'Transaction not found'}, status=404)
    except Category.DoesNotExist:
        return Response({'error': 'Category not found'}, status=400)

@csrf_exempt
def update_account(request, account_id):
    if request.method == "PUT":
        try:
            data = json.loads(request.body)
            account = Account.objects.get(id=account_id)
            
            account.name = data.get("name", account.name)
            account.bank = data.get("bank", account.bank)
            account.type = data.get("type", account.type)
            account.save()

            return JsonResponse({
                "message": "Account updated successfully",
                "account": {
                    "id": account.id,
                    "name": account.name,
                    "bank": account.bank,
                    "type": account.type,
                    "balance": float(account.balance),
                    "lastUpdated": account.last_updated.isoformat()
                }
            })
        except Account.DoesNotExist:
            return JsonResponse({"error": "Account not found"}, status=404)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
def delete_account(request, account_id):
    if request.method == "DELETE":
        try:
            account = Account.objects.get(id=account_id)
            account.delete()
            return JsonResponse({"message": "Account deleted successfully"})
        except Account.DoesNotExist:
            return JsonResponse({"error": "Account not found"}, status=404)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

@api_view(['GET'])
def get_dashboard_data(request):
    try:
        # Get total balance across all accounts
        total_balance = Account.objects.aggregate(total=Sum('balance'))['total'] or 0

        # Get recent transactions
        recent_transactions = Transaction.objects.all().order_by('-date')[:5].values(
            'date', 'description', 'amount', 'category__name'
        )

        # Calculate monthly spending
        current_month = datetime.now().month
        current_year = datetime.now().year
        monthly_spending = Transaction.objects.filter(
            date__month=current_month,
            date__year=current_year,
            amount__lt=0  # Only count expenses
        ).aggregate(total=Sum('amount'))['total'] or 0

        return Response({
            'totalBalance': float(total_balance),
            'recentTransactions': list(recent_transactions),
            'monthlySpending': abs(float(monthly_spending))  # Convert to positive number
        })
    except Exception as e:
        return Response({'error': str(e)}, status=500)