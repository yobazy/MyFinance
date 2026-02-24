import re
import json
from decimal import Decimal
from datetime import datetime
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
            'Convenience': [
                '7-ELEVEN', 'CIRCLE K', 'MAC', 'COUGAR', 'QUICK MART',
                'CONVENIENCE', 'CORNER STORE', 'GAS STATION', 'FUEL',
                'SNACK', 'DRINK', 'CIGARETTE', 'TOBACCO', 'LOTTERY'
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
            'Events': [
                'TICKETMASTER', 'STUBHUB', 'EVENTBRITE', 'CONCERT', 'FESTIVAL',
                'CONFERENCE', 'EXPO', 'SHOW', 'PERFORMANCE', 'THEATRE',
                'SPORTS EVENT', 'GAME', 'MATCH', 'TOURNAMENT', 'EVENT'
            ],
            'Nightlife': [
                'BAR', 'CLUB', 'NIGHTCLUB', 'LOUNGE', 'PUB', 'TAVERN',
                'COCKTAIL', 'DANCE', 'NIGHTLIFE', 'DRINK', 'ALCOHOL',
                'WINE', 'BEER', 'SPIRITS', 'NIGHT OUT'
            ],
            'Subscriptions': [
                'APPLE.COM', 'APPLE MUSIC', 'APPLE TV', 'APPLE STORE',
                'GOOGLE', 'MICROSOFT', 'ADOBE', 'SUBSCRIPTION'
            ],
            'Alcohol': [
                'LCBO', 'BEER STORE', 'SAQ', 'BC LIQUOR', 'ALBERTA LIQUOR',
                'WINE', 'BEER', 'SPIRITS', 'LIQUOR', 'ALCOHOL', 'VODKA',
                'WHISKEY', 'RUM', 'GIN', 'TEQUILA', 'CHAMPAGNE', 'COCKTAIL',
                'BAR', 'PUB', 'TAVERN', 'BREWERY', 'WINERY', 'DISTILLERY'
            ],
            'Cannabis': [
                'OCS', 'CANNABIS', 'MARIJUANA', 'WEED', 'POT', 'DISPENSARY',
                'CANNABIS STORE', 'CANNABIS RETAIL', 'CANNABIS CO', 'CANNABIS CORP',
                'CANNABIS INC', 'CANNABIS LTD', 'CANNABIS SHOP', 'CANNABIS OUTLET',
                'CANNABIS MARKET', 'CANNABIS SUPPLY', 'CANNABIS EXPRESS',
                'CANNABIS CLUB', 'CANNABIS CAFE', 'CANNABIS LOUNGE'
            ],
            'Vaping': [
                'VAPE', 'VAPING', 'E-CIGARETTE', 'E-CIG', 'VAPOR', 'VAPORIZER',
                'VAPE SHOP', 'VAPE STORE', 'VAPE OUTLET', 'VAPE SUPPLY',
                'VAPE EXPRESS', 'VAPE MARKET', 'VAPE CORNER', 'VAPE LOUNGE',
                'VAPE CAFE', 'VAPE BAR', 'VAPE CLUB', 'VAPE WORLD'
            ]
        }
    
    def categorize_transaction(self, transaction: Transaction) -> Tuple[Optional[Category], float]:
        """
        Categorize a single transaction and return the category and confidence score.
        
        Priority order:
        1. User-created rules (absolute priority)
        2. Default auto-categorization rules (fallback)
        3. Recurring pattern detection (last resort)
        
        Returns:
            Tuple of (Category or None, confidence_score)
        """
        if transaction.category:
            # Already categorized
            return transaction.category, 1.0
        
        # STEP 1: Check user-created rules first (ABSOLUTE PRIORITY)
        # User rules completely override auto-categorization
        user_rule_category, user_rule_confidence = self._check_user_rules(transaction)
        if user_rule_category:
            return user_rule_category, user_rule_confidence
        
        # STEP 2: Only if no user rules match, check default auto-categorization
        description = transaction.description.upper()
        amount = abs(float(transaction.amount))
        
        default_category, default_confidence = self._check_default_rules(description, amount)
        if default_category:
            return default_category, default_confidence
        
        # STEP 3: Last resort - check for recurring patterns
        recurring_category, recurring_confidence = self._check_recurring_patterns(transaction)
        if recurring_category:
            return recurring_category, recurring_confidence
        
        return None, 0.0
    
    def _check_user_rules(self, transaction: Transaction) -> Tuple[Optional[Category], float]:
        """
        Check against user-defined categorization rules.
        
        This method has ABSOLUTE PRIORITY over all other categorization methods.
        User rules completely override the default auto-categorization system.
        Only suggests subcategories, not root categories.
        """
        from .models import RuleUsage
        
        # Get all active user rules, ordered by priority (highest first)
        rules = CategorizationRule.objects.filter(is_active=True).order_by('-priority')
        
        for rule in rules:
            if self._rule_matches(transaction, rule):
                # Only suggest subcategories (categories with a parent)
                if rule.category.parent is not None:
                    # Record rule usage for analytics
                    RuleUsage.objects.create(
                        rule=rule,
                        transaction=transaction,
                        confidence_score=0.95,  # Very high confidence for user rules
                        was_applied=True
                    )
                    
                    # Update rule statistics
                    rule.increment_match_count()
                    
                    # Return immediately - user rules have absolute priority
                    return rule.category, 0.95  # Very high confidence for user rules
                else:
                    # If the rule points to a root category, skip it
                    continue
        
        return None, 0.0
    
    def _rule_matches(self, transaction: Transaction, rule: CategorizationRule) -> bool:
        """Check if a transaction matches a specific rule."""
        description = transaction.description
        amount = abs(float(transaction.amount))
        
        # Apply case sensitivity
        if rule.case_sensitive:
            search_description = description
            search_pattern = rule.pattern
        else:
            search_description = description.upper()
            search_pattern = rule.pattern.upper()
        
        if rule.rule_type == 'keyword':
            keywords = [k.strip() for k in rule.pattern.split(',')]
            if not rule.case_sensitive:
                keywords = [k.upper() for k in keywords]
            return any(keyword in search_description for keyword in keywords)
        
        elif rule.rule_type == 'contains':
            return search_pattern in search_description
        
        elif rule.rule_type == 'exact':
            return search_description == search_pattern
        
        elif rule.rule_type == 'regex':
            try:
                flags = 0 if rule.case_sensitive else re.IGNORECASE
                return bool(re.search(rule.pattern, description, flags))
            except re.error:
                return False
        
        elif rule.rule_type == 'amount_range':
            try:
                range_data = json.loads(rule.pattern)
                min_amount = range_data.get('min', 0)
                max_amount = range_data.get('max', float('inf'))
                return min_amount <= amount <= max_amount
            except (json.JSONDecodeError, KeyError):
                return False
        
        elif rule.rule_type == 'amount_exact':
            try:
                target_amount = float(rule.pattern)
                return abs(amount - target_amount) < 0.01  # Allow for small floating point differences
            except ValueError:
                return False
        
        elif rule.rule_type == 'amount_greater':
            try:
                min_amount = float(rule.pattern)
                return amount > min_amount
            except ValueError:
                return False
        
        elif rule.rule_type == 'amount_less':
            try:
                max_amount = float(rule.pattern)
                return amount < max_amount
            except ValueError:
                return False
        
        elif rule.rule_type == 'merchant':
            # Extract merchant name from description (simplified)
            merchant_name = self._extract_merchant_name(description)
            if not rule.case_sensitive:
                merchant_name = merchant_name.upper()
                search_pattern = rule.pattern.upper()
            return search_pattern in merchant_name
        
        elif rule.rule_type == 'date_range':
            try:
                range_data = json.loads(rule.pattern)
                start_date = datetime.strptime(range_data.get('start', ''), '%Y-%m-%d').date()
                end_date = datetime.strptime(range_data.get('end', ''), '%Y-%m-%d').date()
                return start_date <= transaction.date <= end_date
            except (json.JSONDecodeError, KeyError, ValueError):
                return False
        
        elif rule.rule_type == 'day_of_week':
            try:
                target_days = [int(d) for d in rule.pattern.split(',')]  # 0=Monday, 6=Sunday
                return transaction.date.weekday() in target_days
            except (ValueError, AttributeError):
                return False
        
        elif rule.rule_type == 'recurring':
            return self._is_recurring_payment(transaction)
        
        elif rule.rule_type == 'combined':
            return self._evaluate_combined_rule(transaction, rule)
        
        return False
    
    def _extract_merchant_name(self, description: str) -> str:
        """Extract merchant name from transaction description."""
        # Simple merchant extraction - remove common prefixes/suffixes
        merchant = description.strip()
        
        # Remove common prefixes
        prefixes_to_remove = [
            'POS ', 'DEBIT ', 'CREDIT ', 'PURCHASE ', 'PAYMENT ',
            'TRANSFER ', 'WITHDRAWAL ', 'DEPOSIT ', 'ATM '
        ]
        
        for prefix in prefixes_to_remove:
            if merchant.upper().startswith(prefix):
                merchant = merchant[len(prefix):].strip()
                break
        
        # Remove common suffixes
        suffixes_to_remove = [
            ' #', ' REF:', ' AUTH:', ' ID:', ' TID:',
            ' TERM:', ' SEQ:', ' BATCH:'
        ]
        
        for suffix in suffixes_to_remove:
            if suffix in merchant.upper():
                merchant = merchant[:merchant.upper().find(suffix)].strip()
                break
        
        return merchant
    
    def _evaluate_combined_rule(self, transaction: Transaction, rule: CategorizationRule) -> bool:
        """Evaluate a combined rule with multiple conditions."""
        conditions = rule.conditions or {}
        operator = conditions.get('operator', 'AND')  # AND or OR
        
        # Get individual condition results
        results = []
        
        # Description conditions
        if 'description_contains' in conditions:
            search_text = conditions['description_contains']
            if not rule.case_sensitive:
                search_text = search_text.upper()
                description = transaction.description.upper()
            else:
                description = transaction.description
            results.append(search_text in description)
        
        if 'description_regex' in conditions:
            try:
                flags = 0 if rule.case_sensitive else re.IGNORECASE
                results.append(bool(re.search(conditions['description_regex'], transaction.description, flags)))
            except re.error:
                results.append(False)
        
        # Amount conditions
        amount = abs(float(transaction.amount))
        if 'amount_min' in conditions:
            results.append(amount >= float(conditions['amount_min']))
        
        if 'amount_max' in conditions:
            results.append(amount <= float(conditions['amount_max']))
        
        if 'amount_exact' in conditions:
            target_amount = float(conditions['amount_exact'])
            results.append(abs(amount - target_amount) < 0.01)
        
        # Date conditions
        if 'date_after' in conditions:
            try:
                after_date = datetime.strptime(conditions['date_after'], '%Y-%m-%d').date()
                results.append(transaction.date >= after_date)
            except ValueError:
                results.append(False)
        
        if 'date_before' in conditions:
            try:
                before_date = datetime.strptime(conditions['date_before'], '%Y-%m-%d').date()
                results.append(transaction.date <= before_date)
            except ValueError:
                results.append(False)
        
        # Evaluate results based on operator
        if not results:
            return False
        
        if operator.upper() == 'OR':
            return any(results)
        else:  # AND
            return all(results)
    
    def _check_default_rules(self, description: str, amount: float) -> Tuple[Optional[Category], float]:
        """Check against default categorization rules."""
        
        # Map default rule categories to their corresponding subcategories
        category_mapping = {
            'Dining Out': 'Dining Out',
            'Groceries': 'Groceries', 
            'Gas & Fuel': 'Gas & Fuel',
            'Transportation': 'Public Transit',  # Default to Public Transit for general transportation
            'Shopping': 'Online Shopping',  # Default to Online Shopping for general shopping
            'Convenience': 'Convenience',
            'Utilities': 'Miscellaneous',  # Map to Miscellaneous since there's no Utilities subcategory
            'Banking & Fees': 'Banking & Fees',
            'Healthcare': 'Personal Care',  # Map to Personal Care since there's no Healthcare subcategory
            'Entertainment': 'Subscriptions',  # Default to Subscriptions for general entertainment
            'Events': 'Events',
            'Nightlife': 'Nightlife',
            'Subscriptions': 'Subscriptions',
            'Alcohol': 'Alcohol',
            'Cannabis': 'Cannabis',
            'Vaping': 'Vaping'
        }
        
        for category_name, keywords in self.default_rules.items():
            for keyword in keywords:
                if keyword in description:
                    try:
                        # Get the mapped subcategory name
                        subcategory_name = category_mapping.get(category_name, category_name)
                        
                        # Find the subcategory (category with a parent)
                        category = Category.objects.get(name=subcategory_name, parent__isnull=False)
                        confidence = 0.8  # Good confidence for default rules
                        
                        # Boost confidence for exact merchant matches
                        if any(merchant in description for merchant in keywords[:5]):  # Top 5 merchants
                            confidence = 0.85
                        
                        return category, confidence
                    except Category.DoesNotExist:
                        # If subcategory doesn't exist, try to find the root category and create a subcategory
                        try:
                            root_category = Category.objects.get(name=category_name, parent__isnull=True)
                            # Create the subcategory under the root category
                            category = Category.objects.create(
                                name=subcategory_name,
                                parent=root_category
                            )
                            return category, 0.8
                        except Category.DoesNotExist:
                            # If neither root nor subcategory exists, skip this rule
                            continue
        
        return None, 0.0
    
    def _check_recurring_patterns(self, transaction: Transaction) -> Tuple[Optional[Category], float]:
        """Check for recurring payment patterns. Only suggests subcategories."""
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
                # Only suggest subcategories (categories with a parent)
                if most_common_category.parent is not None:
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
        
        User rules have ABSOLUTE PRIORITY and will override auto-categorization.
        
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
            'user_rule_categorized': 0,
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
                
                # Track if this was categorized by user rule or auto-categorization
                if confidence >= 0.9:  # User rules have very high confidence
                    stats['user_rule_categorized'] += 1
                else:
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
        Only suggests subcategories, not root categories.
        """
        suggestions = []
        
        # Get primary suggestion
        category, confidence = self.categorize_transaction(transaction)
        if category and category.parent is not None:  # Only suggest subcategories
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
            if t.category and t.category.parent is not None:  # Only count subcategories
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