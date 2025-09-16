import re
import json
from decimal import Decimal
from typing import Optional, Tuple, List, Dict
from .models import Transaction, Category, CategorizationRule

class AutoCategorizationService:
    """
    Service for automatically categorizing transactions based on rules and patterns.
    """
    
    def __init__(self):
        self.default_rules = self._get_default_rules()
    
    def _get_default_rules(self) -> Dict[str, List[str]]:
        """
        Default categorization rules based on common Canadian merchants and patterns.
        """
        return {
            'Dining Out': [
                'STARBUCKS', 'MCDONALDS', 'TIM HORTONS', 'WENDYS', 'BURGER KING',
                'PIZZA HUT', 'SUBWAY', 'KFC', 'POPEYES', 'PANERA', 'A&W',
                'HARVEY', 'SWISS CHALET', 'BOSTON PIZZA', 'KELSEY', 'MONTANA',
                'RESTAURANT', 'CAFE', 'COFFEE', 'BISTRO', 'GRILL', 'PUB',
                'DOORDASH', 'UBER EATS', 'SKIP THE DISHES', 'FOODORA', 'GRUBHUB',
                'BANGKOK', 'THAI', 'CHINESE', 'INDIAN', 'MEXICAN', 'ITALIAN'
            ],
            'Groceries': [
                'WALMART', 'COSTCO', 'SUPERSTORE', 'SOBEYS', 'LOBLAWS',
                'METRO', 'FOOD BASICS', 'NO FRILLS', 'FRESHCO', 'FARM BOY',
                'INDEPENDENT', 'VALUMART', 'ZEHRS', 'FORTINOS', 'DOMINION'
            ],
            'Gas & Fuel': [
                'PETRO', 'SHELL', 'ESSO', 'MOBIL', 'CANADIAN TIRE GAS',
                'ULTRAMAR', 'HUSKY', 'PIONEER', 'CHEVRON', 'SUNOCO',
                'GAS STATION', 'FUEL', 'PETROLEUM'
            ],
            'Transportation': [
                'TTC', 'UBER', 'LYFT', 'VIA RAIL', 'GO TRANSIT', 'OC TRANSPO',
                'TAXI', 'CAB', 'TRANSIT', 'BUS', 'TRAIN', 'PARKING',
                'PRESTO', 'FARE', 'METRO', 'SUBWAY'
            ],
            'Shopping': [
                'AMAZON', 'CANADIAN TIRE', 'HOME DEPOT', 'LOWES', 'IKEA',
                'BEST BUY', 'STAPLES', 'WALMART', 'TARGET', 'DOLLARAMA',
                'WINNERS', 'MARSHALLS', 'HUDSON BAY'
            ],
            'Utilities': [
                'HYDRO', 'BELL', 'ROGERS', 'TELUS', 'FIDO', 'VIRGIN MOBILE',
                'SHAW', 'COGECO', 'VIDEOTRON', 'ENBRIDGE', 'UNION GAS',
                'ELECTRIC', 'WATER', 'INTERNET', 'PHONE', 'CABLE'
            ],
            'Banking & Fees': [
                'BANK FEE', 'SERVICE CHARGE', 'OVERDRAFT', 'ATM FEE',
                'MONTHLY FEE', 'ANNUAL FEE', 'INTEREST CHARGE'
            ],
            'Healthcare': [
                'PHARMACY', 'SHOPPERS', 'REXALL', 'MEDICAL', 'DENTAL',
                'CLINIC', 'HOSPITAL', 'DOCTOR', 'PHYSIOTHERAPY'
            ],
            'Entertainment': [
                'NETFLIX', 'SPOTIFY', 'AMAZON PRIME', 'DISNEY', 'APPLE MUSIC',
                'CINEPLEX', 'LANDMARK', 'MOVIE', 'THEATRE', 'CONCERT',
                'STUBHUB', 'TICKETMASTER', 'LEGENDS MUSIC', 'MUSIC', 'CONCERT'
            ],
            'Subscriptions': [
                'APPLE.COM', 'APPLE MUSIC', 'APPLE TV', 'APPLE STORE',
                'GOOGLE', 'MICROSOFT', 'ADOBE', 'SUBSCRIPTION'
            ]
        }
    
    def categorize_transaction(self, transaction: Transaction) -> Tuple[Optional[Category], float]:
        """
        Categorize a single transaction and return the category and confidence score.
        
        Returns:
            Tuple of (Category or None, confidence_score)
        """
        if transaction.category:
            # Already categorized
            return transaction.category, 1.0
        
        description = transaction.description.upper()
        amount = abs(float(transaction.amount))
        
        # Check custom rules first (higher priority)
        custom_category, custom_confidence = self._check_custom_rules(transaction)
        if custom_category:
            return custom_category, custom_confidence
        
        # Check default rules
        default_category, default_confidence = self._check_default_rules(description, amount)
        if default_category:
            return default_category, default_confidence
        
        # Check for recurring patterns
        recurring_category, recurring_confidence = self._check_recurring_patterns(transaction)
        if recurring_category:
            return recurring_category, recurring_confidence
        
        return None, 0.0
    
    def _check_custom_rules(self, transaction: Transaction) -> Tuple[Optional[Category], float]:
        """Check against user-defined categorization rules."""
        rules = CategorizationRule.objects.filter(is_active=True).order_by('-priority')
        
        for rule in rules:
            if self._rule_matches(transaction, rule):
                return rule.category, 0.9  # High confidence for custom rules
        
        return None, 0.0
    
    def _rule_matches(self, transaction: Transaction, rule: CategorizationRule) -> bool:
        """Check if a transaction matches a specific rule."""
        description = transaction.description.upper()
        amount = abs(float(transaction.amount))
        
        if rule.rule_type == 'keyword':
            keywords = [k.strip().upper() for k in rule.pattern.split(',')]
            return any(keyword in description for keyword in keywords)
        
        elif rule.rule_type == 'contains':
            return rule.pattern.upper() in description
        
        elif rule.rule_type == 'exact':
            return description == rule.pattern.upper()
        
        elif rule.rule_type == 'amount_range':
            try:
                range_data = json.loads(rule.pattern)
                min_amount = range_data.get('min', 0)
                max_amount = range_data.get('max', float('inf'))
                return min_amount <= amount <= max_amount
            except (json.JSONDecodeError, KeyError):
                return False
        
        elif rule.rule_type == 'recurring':
            # Check for recurring patterns (simplified for now)
            return self._is_recurring_payment(transaction)
        
        return False
    
    def _check_default_rules(self, description: str, amount: float) -> Tuple[Optional[Category], float]:
        """Check against default categorization rules."""
        
        for category_name, keywords in self.default_rules.items():
            for keyword in keywords:
                if keyword in description:
                    try:
                        category = Category.objects.get(name=category_name)
                        confidence = 0.8  # Good confidence for default rules
                        
                        # Boost confidence for exact merchant matches
                        if any(merchant in description for merchant in keywords[:5]):  # Top 5 merchants
                            confidence = 0.85
                        
                        return category, confidence
                    except Category.DoesNotExist:
                        # Category doesn't exist, create it
                        category = Category.objects.create(name=category_name)
                        return category, 0.8
        
        return None, 0.0
    
    def _check_recurring_patterns(self, transaction: Transaction) -> Tuple[Optional[Category], float]:
        """Check for recurring payment patterns."""
        # Look for similar transactions in the past
        similar_transactions = Transaction.objects.filter(
            description__icontains=transaction.description[:20],  # First 20 chars
            account=transaction.account,
            category__isnull=False
        ).exclude(id=transaction.id)[:5]
        
        if similar_transactions.exists():
            # Get the most common category from similar transactions
            categories = [t.category for t in similar_transactions if t.category]
            if categories:
                most_common_category = max(set(categories), key=categories.count)
                confidence = len([c for c in categories if c == most_common_category]) / len(categories)
                return most_common_category, min(confidence * 0.7, 0.75)  # Lower confidence for pattern matching
        
        return None, 0.0
    
    def _is_recurring_payment(self, transaction: Transaction) -> bool:
        """Check if a transaction appears to be a recurring payment."""
        # Simplified check for recurring payments
        amount = abs(float(transaction.amount))
        
        # Look for transactions with same amount and similar description
        similar_count = Transaction.objects.filter(
            amount=transaction.amount,
            description__icontains=transaction.description[:15],
            account=transaction.account
        ).exclude(id=transaction.id).count()
        
        return similar_count >= 2  # At least 2 other similar transactions
    
    def bulk_categorize_transactions(self, queryset=None, confidence_threshold=0.6) -> Dict[str, int]:
        """
        Categorize multiple transactions in bulk.
        
        Args:
            queryset: QuerySet of transactions to categorize (defaults to uncategorized)
            confidence_threshold: Minimum confidence score to auto-assign category
        
        Returns:
            Dictionary with categorization statistics
        """
        if queryset is None:
            queryset = Transaction.objects.filter(category__isnull=True)
        
        stats = {
            'total_processed': 0,
            'auto_categorized': 0,
            'needs_review': 0,
            'no_match': 0
        }
        
        for transaction in queryset:
            stats['total_processed'] += 1
            
            category, confidence = self.categorize_transaction(transaction)
            
            if category and confidence >= confidence_threshold:
                transaction.category = category
                transaction.auto_categorized = True
                transaction.confidence_score = confidence
                transaction.suggested_category = None  # Clear suggestion since it's now categorized
                transaction.save()
                stats['auto_categorized'] += 1
            
            elif category and confidence > 0.3:  # Low confidence but some match
                transaction.confidence_score = confidence
                transaction.suggested_category = category  # Store the suggestion
                transaction.save()
                stats['needs_review'] += 1
            
            else:
                # Still try to get a suggestion even if confidence is very low
                if category:
                    transaction.suggested_category = category
                    transaction.confidence_score = confidence
                    transaction.save()
                stats['no_match'] += 1
        
        return stats
    
    def get_categorization_suggestions(self, transaction: Transaction, limit=3) -> List[Dict]:
        """
        Get categorization suggestions for a transaction with confidence scores.
        """
        suggestions = []
        
        # Get primary suggestion
        category, confidence = self.categorize_transaction(transaction)
        if category:
            suggestions.append({
                'category': category,
                'confidence': confidence,
                'reason': 'Auto-match'
            })
        
        # Get alternative suggestions from similar transactions
        similar_transactions = Transaction.objects.filter(
            description__icontains=transaction.description[:10],
            category__isnull=False
        ).exclude(id=transaction.id)[:10]
        
        category_counts = {}
        for t in similar_transactions:
            if t.category:
                category_counts[t.category] = category_counts.get(t.category, 0) + 1
        
        # Sort by frequency and add to suggestions
        for cat, count in sorted(category_counts.items(), key=lambda x: x[1], reverse=True):
            if cat not in [s['category'] for s in suggestions]:
                confidence = min(count / len(similar_transactions) * 0.6, 0.7)
                suggestions.append({
                    'category': cat,
                    'confidence': confidence,
                    'reason': f'Similar transactions ({count} matches)'
                })
        
        return suggestions[:limit]
    
    def update_suggestions_for_uncategorized(self) -> Dict[str, int]:
        """
        Update suggested categories for all uncategorized transactions.
        This is useful for refreshing suggestions without changing existing categorizations.
        """
        uncategorized = Transaction.objects.filter(category__isnull=True)
        
        stats = {
            'total_processed': 0,
            'suggestions_updated': 0,
            'no_suggestion': 0
        }
        
        for transaction in uncategorized:
            stats['total_processed'] += 1
            
            category, confidence = self.categorize_transaction(transaction)
            
            if category:
                transaction.suggested_category = category
                transaction.confidence_score = confidence
                transaction.save()
                stats['suggestions_updated'] += 1
            else:
                stats['no_suggestion'] += 1
        
        return stats 