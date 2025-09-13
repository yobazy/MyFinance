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
            'stats': stats
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