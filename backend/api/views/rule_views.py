from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from django.db.models import Q, Count
from django.utils import timezone
from datetime import datetime, timedelta
import json
import re

from ...models import CategorizationRule, RuleGroup, RuleUsage, Transaction, Category
from ...serializers import CategorizationRuleSerializer, RuleGroupSerializer, RuleUsageSerializer
from ...categorization_service import AutoCategorizationService

@api_view(['GET'])
def get_rules(request):
    """Get all categorization rules with optional filtering."""
    try:
        # Get query parameters
        is_active = request.GET.get('is_active')
        rule_type = request.GET.get('rule_type')
        category_id = request.GET.get('category_id')
        search = request.GET.get('search')
        
        # Build query
        rules = CategorizationRule.objects.select_related('category').all()
        
        if is_active is not None:
            rules = rules.filter(is_active=is_active.lower() == 'true')
        
        if rule_type:
            rules = rules.filter(rule_type=rule_type)
        
        if category_id:
            rules = rules.filter(category_id=category_id)
        
        if search:
            rules = rules.filter(
                Q(name__icontains=search) | 
                Q(description__icontains=search) |
                Q(pattern__icontains=search)
            )
        
        # Order by priority and name
        rules = rules.order_by('-priority', 'name')
        
        serializer = CategorizationRuleSerializer(rules, many=True)
        return Response(serializer.data)
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_rule(request, rule_id):
    """Get a specific categorization rule."""
    try:
        rule = CategorizationRule.objects.select_related('category').get(id=rule_id)
        serializer = CategorizationRuleSerializer(rule)
        return Response(serializer.data)
        
    except CategorizationRule.DoesNotExist:
        return Response({
            'error': 'Rule not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def create_rule(request):
    """Create a new categorization rule."""
    try:
        data = request.data
        
        # Validate required fields
        required_fields = ['name', 'rule_type', 'pattern', 'category']
        for field in required_fields:
            if field not in data:
                return Response({
                    'error': f'Missing required field: {field}'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate category exists
        try:
            category = Category.objects.get(id=data['category'])
        except Category.DoesNotExist:
            return Response({
                'error': 'Category not found'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate pattern based on rule type
        validation_error = validate_rule_pattern(data['rule_type'], data['pattern'])
        if validation_error:
            return Response({
                'error': validation_error
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create rule
        rule = CategorizationRule.objects.create(
            name=data['name'],
            description=data.get('description', ''),
            rule_type=data['rule_type'],
            pattern=data['pattern'],
            category=category,
            priority=data.get('priority', 1),
            is_active=data.get('is_active', True),
            case_sensitive=data.get('case_sensitive', False),
            created_by=data.get('created_by', 'user'),
            conditions=data.get('conditions', {})
        )
        
        serializer = CategorizationRuleSerializer(rule)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)

@api_view(['PUT'])
def update_rule(request, rule_id):
    """Update an existing categorization rule."""
    try:
        rule = CategorizationRule.objects.get(id=rule_id)
        data = request.data
        
        # Validate pattern if provided
        if 'pattern' in data:
            validation_error = validate_rule_pattern(data['rule_type'], data['pattern'])
            if validation_error:
                return Response({
                    'error': validation_error
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update fields
        for field in ['name', 'description', 'rule_type', 'pattern', 'priority', 'is_active', 'case_sensitive', 'conditions']:
            if field in data:
                setattr(rule, field, data[field])
        
        if 'category' in data:
            try:
                category = Category.objects.get(id=data['category'])
                rule.category = category
            except Category.DoesNotExist:
                return Response({
                    'error': 'Category not found'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        rule.save()
        
        serializer = CategorizationRuleSerializer(rule)
        return Response(serializer.data)
        
    except CategorizationRule.DoesNotExist:
        return Response({
            'error': 'Rule not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)

@api_view(['DELETE'])
def delete_rule(request, rule_id):
    """Delete a categorization rule."""
    try:
        rule = CategorizationRule.objects.get(id=rule_id)
        rule.delete()
        
        return Response({
            'success': True,
            'message': 'Rule deleted successfully'
        })
        
    except CategorizationRule.DoesNotExist:
        return Response({
            'error': 'Rule not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def test_rule(request, rule_id):
    """Test a rule against sample transactions."""
    try:
        rule = CategorizationRule.objects.get(id=rule_id)
        sample_text = request.data.get('sample_text', '')
        sample_amount = request.data.get('sample_amount', 0)
        
        # Create a mock transaction for testing
        mock_transaction = type('MockTransaction', (), {
            'description': sample_text,
            'amount': sample_amount,
            'date': timezone.now().date()
        })()
        
        # Test the rule
        service = AutoCategorizationService()
        matches = service._rule_matches(mock_transaction, rule)
        
        return Response({
            'rule_id': rule_id,
            'sample_text': sample_text,
            'sample_amount': sample_amount,
            'matches': matches,
            'rule_preview': rule.get_rule_preview()
        })
        
    except CategorizationRule.DoesNotExist:
        return Response({
            'error': 'Rule not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def apply_rule_to_transactions(request, rule_id):
    """Apply a specific rule to uncategorized transactions."""
    try:
        rule = CategorizationRule.objects.get(id=rule_id)
        
        # Get uncategorized transactions
        transactions = Transaction.objects.filter(category__isnull=True)
        
        matched_count = 0
        for transaction in transactions:
            service = AutoCategorizationService()
            if service._rule_matches(transaction, rule):
                transaction.category = rule.category
                transaction.auto_categorized = True
                transaction.confidence_score = 0.9  # High confidence for manual rules
                transaction.save()
                
                # Record usage
                RuleUsage.objects.create(
                    rule=rule,
                    transaction=transaction,
                    confidence_score=0.9,
                    was_applied=True
                )
                
                # Update rule stats
                rule.increment_match_count()
                matched_count += 1
        
        return Response({
            'success': True,
            'message': f'Rule applied to {matched_count} transactions',
            'matched_count': matched_count
        })
        
    except CategorizationRule.DoesNotExist:
        return Response({
            'error': 'Rule not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_rule_stats(request):
    """Get statistics about rule usage and performance."""
    try:
        total_rules = CategorizationRule.objects.count()
        active_rules = CategorizationRule.objects.filter(is_active=True).count()
        total_matches = RuleUsage.objects.count()
        
        # Top performing rules
        top_rules = CategorizationRule.objects.annotate(
            usage_count=Count('usage_records')
        ).order_by('-usage_count')[:5]
        
        # Recent rule usage
        recent_usage = RuleUsage.objects.select_related('rule', 'transaction').order_by('-matched_at')[:10]
        
        # Rule performance by type
        rule_type_stats = CategorizationRule.objects.values('rule_type').annotate(
            count=Count('id'),
            total_matches=Count('usage_records')
        ).order_by('-total_matches')
        
        return Response({
            'total_rules': total_rules,
            'active_rules': active_rules,
            'total_matches': total_matches,
            'top_rules': CategorizationRuleSerializer(top_rules, many=True).data,
            'recent_usage': RuleUsageSerializer(recent_usage, many=True).data,
            'rule_type_stats': list(rule_type_stats)
        })
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_rule_groups(request):
    """Get all rule groups."""
    try:
        groups = RuleGroup.objects.filter(is_active=True).order_by('name')
        serializer = RuleGroupSerializer(groups, many=True)
        return Response(serializer.data)
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def create_rule_group(request):
    """Create a new rule group."""
    try:
        data = request.data
        
        group = RuleGroup.objects.create(
            name=data['name'],
            description=data.get('description', ''),
            color=data.get('color', '#2196F3'),
            is_active=data.get('is_active', True)
        )
        
        serializer = RuleGroupSerializer(group)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)

def validate_rule_pattern(rule_type, pattern):
    """Validate a rule pattern based on its type."""
    if not pattern or not pattern.strip():
        return "Pattern cannot be empty"
    
    if rule_type == 'regex':
        try:
            re.compile(pattern)
        except re.error as e:
            return f"Invalid regex pattern: {str(e)}"
    
    elif rule_type == 'amount_range':
        try:
            range_data = json.loads(pattern)
            if 'min' not in range_data or 'max' not in range_data:
                return "Amount range must have 'min' and 'max' values"
            min_val = float(range_data['min'])
            max_val = float(range_data['max'])
            if min_val > max_val:
                return "Minimum amount cannot be greater than maximum amount"
        except (json.JSONDecodeError, ValueError, KeyError):
            return "Amount range must be valid JSON with 'min' and 'max' values"
    
    elif rule_type in ['amount_exact', 'amount_greater', 'amount_less']:
        try:
            amount = float(pattern)
            if amount < 0:
                return "Amount cannot be negative"
        except ValueError:
            return "Amount must be a valid number"
    
    elif rule_type == 'keyword':
        if not pattern.strip():
            return "Keywords cannot be empty"
        # Keywords are comma-separated, validate each one
        keywords = [k.strip() for k in pattern.split(',')]
        if not any(keywords):
            return "At least one keyword must be provided"
    
    return None  # No validation errors
