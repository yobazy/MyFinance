from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from .models import Transaction, Category, CategorizationRule
from .categorization_service import AutoCategorizationService
from .serializers import TransactionSerializer, CategorySerializer

@api_view(['POST'])
def auto_categorize_transactions(request):
    """
    Auto-categorize uncategorized transactions.
    """
    try:
        service = AutoCategorizationService()
        confidence_threshold = float(request.data.get('confidence_threshold', 0.6))
        
        # Get uncategorized transactions
        uncategorized = Transaction.objects.filter(category__isnull=True)
        
        stats = service.bulk_categorize_transactions(
            queryset=uncategorized,
            confidence_threshold=confidence_threshold
        )
        
        return Response({
            'success': True,
            'message': f'Processed {stats["total_processed"]} transactions',
            'stats': stats,
            'user_rules_applied': stats.get('user_rule_categorized', 0),
            'auto_categorized': stats.get('auto_categorized', 0)
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def get_categorization_suggestions(request, transaction_id):
    """
    Get categorization suggestions for a specific transaction.
    """
    try:
        transaction_obj = Transaction.objects.get(id=transaction_id)
        service = AutoCategorizationService()
        
        suggestions = service.get_categorization_suggestions(transaction_obj)
        
        return Response({
            'transaction_id': transaction_id,
            'suggestions': [
                {
                    'category_id': s['category'].id,
                    'category_name': s['category'].name,
                    'confidence': round(s['confidence'], 2),
                    'reason': s['reason']
                }
                for s in suggestions
            ]
        })
        
    except Transaction.DoesNotExist:
        return Response({
            'error': 'Transaction not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_categorization_rules(request):
    """Get all categorization rules."""
    rules = CategorizationRule.objects.all()
    
    rules_data = []
    for rule in rules:
        rules_data.append({
            'id': rule.id,
            'name': rule.name,
            'rule_type': rule.rule_type,
            'pattern': rule.pattern,
            'category': rule.category.name,
            'priority': rule.priority,
            'is_active': rule.is_active,
            'created_at': rule.created_at
        })
    
    return Response(rules_data)

@api_view(['POST'])
def create_categorization_rule(request):
    """Create a new categorization rule."""
    try:
        data = request.data
        
        category = Category.objects.get(id=data['category_id'])
        
        rule = CategorizationRule.objects.create(
            name=data['name'],
            rule_type=data['rule_type'],
            pattern=data['pattern'],
            category=category,
            priority=data.get('priority', 1),
            is_active=data.get('is_active', True)
        )
        
        return Response({
            'success': True,
            'rule_id': rule.id,
            'message': 'Categorization rule created successfully'
        })
        
    except Category.DoesNotExist:
        return Response({
            'error': 'Category not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
def update_suggestions(request):
    """
    Update suggested categories for all uncategorized transactions.
    """
    try:
        service = AutoCategorizationService()
        stats = service.update_suggestions_for_uncategorized()
        
        return Response({
            'success': True,
            'message': f'Updated suggestions for {stats["suggestions_updated"]} transactions',
            'stats': stats
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def preview_auto_categorization(request):
    """
    Generate preview of auto-categorization suggestions without applying them.
    Supports pagination to handle large datasets.
    """
    try:
        # Debug logging
        print(f"Request data: {request.data}")
        print(f"Request data type: {type(request.data)}")
        
        service = AutoCategorizationService()
        
        # Handle potential data type issues
        try:
            confidence_threshold = float(request.data.get('confidence_threshold', 0.6))
        except (ValueError, TypeError):
            confidence_threshold = 0.6
            
        try:
            page = int(request.data.get('page', 1))
        except (ValueError, TypeError):
            page = 1
            
        try:
            page_size = int(request.data.get('page_size', 20))
        except (ValueError, TypeError):
            page_size = 20
        
        print(f"Parsed values - confidence: {confidence_threshold}, page: {page}, page_size: {page_size}")
        
        # Get uncategorized transactions with pagination
        uncategorized = Transaction.objects.filter(category__isnull=True)
        total_count = uncategorized.count()
        
        # Calculate pagination
        start_index = (page - 1) * page_size
        end_index = start_index + page_size
        paginated_transactions = uncategorized[start_index:end_index]
        
        preview_data = []
        page_stats = {
            'total_processed': 0,
            'high_confidence': 0,
            'medium_confidence': 0,
            'low_confidence': 0,
            'no_suggestion': 0,
            'user_rules_applied': 0
        }
        
        # Process only the current page of transactions
        for transaction in paginated_transactions:
            page_stats['total_processed'] += 1
            
            category, confidence = service.categorize_transaction(transaction)
            
            # Always include the transaction in preview data, regardless of whether it has a suggestion
            suggestion_data = {
                'transaction_id': transaction.id,
                'description': transaction.description,
                'amount': float(transaction.amount),
                'date': transaction.date.isoformat(),
                'account_name': transaction.account.name if transaction.account else 'Unknown',
                'suggested_category': {
                    'id': category.id,
                    'name': category.name
                } if category else None,
                'confidence': round(confidence, 3) if category else 0,
                'reason': 'Auto-match' if category and confidence < 0.9 else 'User rule' if category and confidence >= 0.9 else 'No suggestion',
                'confidence_level': 'high' if category and confidence >= 0.8 else 'medium' if category and confidence >= 0.5 else 'low' if category else 'none'
            }
            
            preview_data.append(suggestion_data)
            
            # Update page stats
            if category:
                if confidence >= 0.9:
                    page_stats['user_rules_applied'] += 1
                elif confidence >= 0.8:
                    page_stats['high_confidence'] += 1
                elif confidence >= 0.5:
                    page_stats['medium_confidence'] += 1
                else:
                    page_stats['low_confidence'] += 1
            else:
                page_stats['no_suggestion'] += 1
        
        # Sort by confidence (highest first)
        preview_data.sort(key=lambda x: x['confidence'], reverse=True)
        
        # Calculate pagination info
        total_pages = (total_count + page_size - 1) // page_size
        has_next = page < total_pages
        has_previous = page > 1
        
        return Response({
            'success': True,
            'preview_data': preview_data,
            'page_stats': page_stats,
            'pagination': {
                'current_page': page,
                'total_pages': total_pages,
                'page_size': page_size,
                'total_count': total_count,
                'has_next': has_next,
                'has_previous': has_previous
            },
            'confidence_threshold': confidence_threshold
        })
        
    except Exception as e:
        print(f"Error in preview_auto_categorization: {str(e)}")
        print(f"Error type: {type(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def apply_categorization_preview(request):
    """
    Apply the categorization changes from a preview.
    """
    try:
        changes = request.data.get('changes', [])
        
        if not changes:
            return Response({
                'success': True,
                'message': 'No changes to apply',
                'applied_count': 0
            })
        
        applied_count = 0
        errors = []
        
        for change in changes:
            try:
                transaction_id = change['transaction_id']
                category_id = change['category_id']
                action = change.get('action', 'categorize')  # 'categorize' or 'remove'
                
                transaction = Transaction.objects.get(id=transaction_id)
                
                if action == 'categorize':
                    category = Category.objects.get(id=category_id)
                    transaction.category = category
                    transaction.auto_categorized = True
                    transaction.confidence_score = change.get('confidence', 0.0)
                    transaction.suggested_category = None  # Clear suggestion
                    transaction.save()
                    applied_count += 1
                    
                elif action == 'remove':
                    # Remove the suggestion but keep transaction uncategorized
                    transaction.suggested_category = None
                    transaction.confidence_score = None
                    transaction.save()
                    applied_count += 1
                    
            except Transaction.DoesNotExist:
                errors.append(f"Transaction {transaction_id} not found")
            except Category.DoesNotExist:
                errors.append(f"Category {category_id} not found")
            except Exception as e:
                errors.append(f"Error processing transaction {transaction_id}: {str(e)}")
        
        return Response({
            'success': True,
            'message': f'Applied {applied_count} changes successfully',
            'applied_count': applied_count,
            'errors': errors
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def get_similar_transactions_count(request):
    """
    Get count of uncategorized transactions with the same description.
    """
    try:
        transaction_id = request.data.get('transaction_id')
        description = request.data.get('description')
        
        if not transaction_id and not description:
            return Response({
                'success': False,
                'error': 'Transaction ID or description is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get the description from the transaction if not provided
        if not description:
            try:
                transaction = Transaction.objects.get(id=transaction_id)
                description = transaction.description
            except Transaction.DoesNotExist:
                return Response({
                    'success': False,
                    'error': 'Transaction not found'
                }, status=status.HTTP_404_NOT_FOUND)
        
        # Count uncategorized transactions with the same description
        similar_count = Transaction.objects.filter(
            description=description,
            category__isnull=True
        ).count()
        
        return Response({
            'success': True,
            'similar_count': similar_count,
            'description': description
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def apply_category_to_similar_transactions(request):
    """
    Apply a category to all transactions with the same description.
    """
    try:
        transaction_id = request.data.get('transaction_id')
        category_id = request.data.get('category_id')
        description = request.data.get('description')
        
        if not transaction_id or not category_id:
            return Response({
                'success': False,
                'error': 'Transaction ID and Category ID are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get the category
        try:
            category = Category.objects.get(id=category_id)
        except Category.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Category not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Get the description from the transaction if not provided
        if not description:
            try:
                transaction = Transaction.objects.get(id=transaction_id)
                description = transaction.description
            except Transaction.DoesNotExist:
                return Response({
                    'success': False,
                    'error': 'Transaction not found'
                }, status=status.HTTP_404_NOT_FOUND)
        
        # Find all uncategorized transactions with the same description
        similar_transactions = Transaction.objects.filter(
            description=description,
            category__isnull=True
        )
        
        # Apply the category to all similar transactions
        updated_count = 0
        for transaction in similar_transactions:
            transaction.category = category
            transaction.auto_categorized = True
            transaction.suggested_category = None
            transaction.save()
            updated_count += 1
        
        return Response({
            'success': True,
            'message': f'Applied category to {updated_count} similar transactions',
            'updated_count': updated_count,
            'description': description,
            'category_name': category.name
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def categorization_stats(request):
    """Get categorization statistics."""
    total_transactions = Transaction.objects.count()
    categorized = Transaction.objects.filter(category__isnull=False).count()
    auto_categorized = Transaction.objects.filter(auto_categorized=True).count()
    uncategorized = total_transactions - categorized
    
    return Response({
        'total_transactions': total_transactions,
        'categorized': categorized,
        'auto_categorized': auto_categorized,
        'uncategorized': uncategorized,
        'categorization_rate': round((categorized / total_transactions * 100) if total_transactions > 0 else 0, 1)
    })