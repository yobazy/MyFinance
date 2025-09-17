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
    print(f"DEBUG: Request method: {request.method}")
    print(f"DEBUG: Request FILES: {request.FILES}")
    print(f"DEBUG: Request POST: {request.POST}")
    
    uploaded_file = request.FILES.get('file')
    file_type = request.POST.get('file_type')
    bank = request.POST.get('bank')
    account_name = request.POST.get('account')
    
    print(f"DEBUG: uploaded_file: {uploaded_file}")
    print(f"DEBUG: file_type: {file_type}")
    print(f"DEBUG: bank: {bank}")
    print(f"DEBUG: account_name: {account_name}")

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
            # Read TD CSV with proper headers
            df = pd.read_csv(file_path)
            # Clean column names
            df.columns = df.columns.str.strip()
            process_td_data(df, account)
        elif file_type == "Amex":
            # Try different encodings for Amex files
            try:
                df = pd.read_excel(file_path, skiprows=11)
            except (UnicodeDecodeError, Exception) as e:
                # If Excel reading fails due to encoding, try reading as CSV with different encodings
                print(f"Excel read failed: {e}, trying CSV with different encodings")
                try:
                    df = pd.read_csv(file_path, skiprows=11, encoding='latin-1')
                except UnicodeDecodeError:
                    try:
                        df = pd.read_csv(file_path, skiprows=11, encoding='cp1252')
                    except UnicodeDecodeError:
                        df = pd.read_csv(file_path, skiprows=11, encoding='iso-8859-1')
            
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
    from datetime import datetime
    
    # Convert date column to proper format
    def convert_date(date_str):
        try:
            return datetime.strptime(date_str, "%d %b %Y").strftime("%Y-%m-%d")
        except ValueError:
            return None
    
    df['Date'] = df['Date'].astype(str).apply(convert_date)
    
    # Process each row
    for row in df.itertuples(index=False):
        if row.Date is None:
            continue  # Skip rows with invalid dates
            
        # Handle amount - TD files have a single Amount column
        amount_str = str(row.Amount).replace('$', '').replace(',', '')
        try:
            amount = float(amount_str) if amount_str != 'nan' else 0.0
        except ValueError:
            amount = 0.0
        
        # Create TDTransaction record
        TDTransaction.objects.create(
            date=row.Date,
            charge_name=row.Description,
            credit_amt=amount if amount > 0 else None,
            debit_amt=abs(amount) if amount < 0 else None,
            balance=None  # Not available in this format
        )
        
        # Create Transaction record
        Transaction.objects.create(
            date=row.Date,
            description=row.Description,
            amount=amount,
            source="TD",
            account=account
        )
    
    # Update account balance after processing all transactions
    account.update_balance()
def process_amex_data(df, account):
    """Process and insert Amex data into the database, ensuring correct formats."""
    from datetime import datetime

    # Convert 'date' and 'date_processed' columns to proper format
    def convert_date(date_str):
        try:
            return datetime.strptime(date_str, "%d %b %Y").strftime("%Y-%m-%d")  # "01 Jan 2025" -> "2025-01-01"
        except ValueError:
            return None  # Return None if date conversion fails

    def clean_amount(amount_str):
        """Clean amount string by removing dollar signs, commas, and converting to float."""
        if pd.isna(amount_str) or amount_str == '':
            return 0.0
        try:
            # Remove dollar signs, commas, and any whitespace
            cleaned = str(amount_str).replace('$', '').replace(',', '').strip()
            return float(cleaned)
        except (ValueError, TypeError):
            return 0.0

    df['date'] = df['date'].astype(str).apply(convert_date)
    df['date_processed'] = df['date_processed'].astype(str).apply(convert_date)

    # Clean and convert amount column
    df['amount'] = df['amount'].apply(clean_amount)
    
    # Ensure other numeric values are properly formatted and NaN is replaced with 0
    numeric_columns = ['commission', 'exc_rate']
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
    
    # Update account balance after processing all transactions
    account.update_balance()
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
    """Fetches all categories with optional tree structure."""
    tree_view = request.GET.get('tree', 'false').lower() == 'true'
    root_only = request.GET.get('root_only', 'false').lower() == 'true'
    
    if tree_view:
        # Return hierarchical tree structure
        from .serializers import CategoryTreeSerializer
        categories = Category.objects.filter(parent__isnull=True, is_active=True)
        serializer = CategoryTreeSerializer(categories, many=True)
    elif root_only:
        # Return only root categories
        categories = Category.objects.filter(parent__isnull=True, is_active=True)
        serializer = CategorySerializer(categories, many=True)
    else:
        # Return flat list of all categories
        categories = Category.objects.filter(is_active=True)
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
    transactions = Transaction.objects.select_related('account').all().order_by("-date")  # Order by latest
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
from django.db.models.functions import Abs


def get_visualization_data(request):
    """API to get transaction data for visualizations"""

    # Determine sensible defaults: from earliest transaction date (if any) to today
    first_txn = Transaction.objects.order_by('date').values_list('date', flat=True).first()
    default_start = first_txn.strftime("%Y-%m-%d") if first_txn else f"{datetime.now().year}-01-01"
    default_end = datetime.now().strftime("%Y-%m-%d")

    # Get start & end date from frontend query params (default: use computed defaults)
    start_date = request.GET.get("start_date", default_start)
    end_date = request.GET.get("end_date", default_end)

    # Get all transactions within the date range
    transactions = Transaction.objects.filter(date__range=[start_date, end_date])

    # Only expenses for category pie (positive values for charting)
    expenses = transactions.filter(amount__gt=0)
    category_spending = (
        expenses.values("category__name")
        .annotate(total_amount=Sum("amount"))
        .order_by("-total_amount")
    )

    # Monthly spending trend (sum of expenses by month)
    monthly_trend = (
        expenses.annotate(month=TruncMonth("date"))
        .values("month")
        .annotate(total_amount=Sum("amount"))
        .order_by("month")
    )

    # Monthly income trend (sum of negative amounts by month, converted to positive)
    income = transactions.filter(amount__lt=0)
    monthly_income = (
        income.annotate(month=TruncMonth("date"))
        .values("month")
        .annotate(total_amount=Abs(Sum("amount")))
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
        "monthly_income": list(monthly_income),
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
        # Check if category has subcategories
        if category.subcategories.exists():
            return Response({
                'error': 'Cannot delete category with subcategories. Please delete subcategories first.'
            }, status=400)
        category.delete()
        return Response(status=204)
    except Category.DoesNotExist:
        return Response({'error': 'Category not found'}, status=404)

@api_view(['POST'])
def create_subcategory(request, parent_id):
    """Creates a subcategory under a parent category."""
    try:
        parent_category = Category.objects.get(id=parent_id)
        # Include parent in the data
        data = request.data.copy()
        data['parent'] = parent_id
        serializer = CategorySerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)
    except Category.DoesNotExist:
        return Response({'error': 'Parent category not found'}, status=404)

@api_view(['GET'])
def get_category_subcategories(request, category_id):
    """Gets all subcategories of a specific category."""
    try:
        category = Category.objects.get(id=category_id)
        subcategories = category.subcategories.filter(is_active=True)
        serializer = CategorySerializer(subcategories, many=True)
        return Response(serializer.data)
    except Category.DoesNotExist:
        return Response({'error': 'Category not found'}, status=404)

@api_view(['GET'])
def get_category_tree(request):
    """Gets the complete category tree structure."""
    from .serializers import CategoryTreeSerializer
    categories = Category.objects.filter(parent__isnull=True, is_active=True)
    serializer = CategoryTreeSerializer(categories, many=True)
    return Response(serializer.data)

@api_view(['PUT'])
def update_transaction_category(request, transaction_id):
    """Updates a transaction's category and all other transactions with the same description."""
    try:
        transaction = Transaction.objects.get(id=transaction_id)
        category_id = request.data.get('category')
        category = Category.objects.get(id=category_id)
        
        # Update the original transaction
        transaction.category = category
        transaction.save()
        
        # Find and update all other transactions with the same description
        description = transaction.description
        other_transactions = Transaction.objects.filter(
            description=description
        ).exclude(id=transaction_id)
        
        # Update all matching transactions
        updated_count = other_transactions.update(category=category)
        
        return Response({
            'success': True,
            'transaction': TransactionSerializer(transaction).data,
            'message': f'Updated {updated_count + 1} transactions with the same description',
            'updated_count': updated_count + 1
        })
        
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

@api_view(['POST'])
def refresh_account_balances(request):
    """Refresh all account balances by recalculating from transactions."""
    try:
        accounts = Account.objects.all()
        updated_accounts = []
        
        for account in accounts:
            old_balance = account.balance
            new_balance = account.update_balance()
            updated_accounts.append({
                'id': account.id,
                'name': account.name,
                'bank': account.bank,
                'old_balance': float(old_balance),
                'new_balance': float(new_balance)
            })
        
        return Response({
            'message': f'Successfully updated {len(updated_accounts)} account balances',
            'accounts': updated_accounts
        })
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
def get_dashboard_data(request):
    try:
        # Get account_id from query parameters (optional)
        account_id = request.GET.get('account_id')
        
        # Build base queryset
        transactions_queryset = Transaction.objects.all()
        
        # Filter by account if specified
        if account_id and account_id != 'all':
            try:
                account_id = int(account_id)
                transactions_queryset = transactions_queryset.filter(account_id=account_id)
            except (ValueError, TypeError):
                return Response({'error': 'Invalid account_id parameter'}, status=400)
        
        # Calculate total balance from filtered transactions
        total_balance = transactions_queryset.aggregate(
            total=Sum('amount')
        )['total'] or 0

        # Get recent transactions (filtered)
        recent_transactions = transactions_queryset.order_by('-date')[:5].values(
            'date', 'description', 'amount', 'category__name', 'account__name', 'account__bank'
        )

        # Calculate monthly spending (filtered)
        current_month = datetime.now().month
        current_year = datetime.now().year
        monthly_spending = transactions_queryset.filter(
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