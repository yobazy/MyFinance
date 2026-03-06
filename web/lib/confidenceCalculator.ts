/**
 * Dynamic confidence score calculation for auto-categorization
 * 
 * This system learns from:
 * 1. Rule-specific historical accuracy (user-specific)
 * 2. User acceptance patterns (how often user accepts this rule's suggestions)
 * 3. Global merchant patterns (across all users)
 */

type RuleAccuracyStats = {
  totalMatches: number;
  acceptedMatches: number;
  rejectedMatches: number;
  accuracy: number; // acceptedMatches / totalMatches
};

type GlobalMerchantStats = {
  merchant: string;
  categoryId: string;
  totalOccurrences: number;
  confidence: number; // Based on frequency and consistency
};

type ConfidenceFactors = {
  baseConfidence: number; // From rule type (user vs preset)
  ruleAccuracy: number; // Historical accuracy of this specific rule
  userAcceptanceRate: number; // How often this user accepts this rule
  globalMerchantConfidence: number; // Global learning from merchant patterns
  ruleMatchCount: number; // How many times this rule has matched
};

/**
 * Calculate confidence score for a rule suggestion
 */
export async function calculateConfidence(
  supabase: any,
  userId: string,
  ruleId: string,
  transactionDescription: string,
  ruleCreatedBy: string,
  ruleMatchCount: number
): Promise<number> {
  const factors = await gatherConfidenceFactors(
    supabase,
    userId,
    ruleId,
    transactionDescription,
    ruleCreatedBy,
    ruleMatchCount
  );

  return combineConfidenceFactors(factors);
}

/**
 * Gather all factors that influence confidence
 */
async function gatherConfidenceFactors(
  supabase: any,
  userId: string,
  ruleId: string,
  transactionDescription: string,
  ruleCreatedBy: string,
  ruleMatchCount: number
): Promise<ConfidenceFactors> {
  // Base confidence from rule type
  const baseConfidence = ruleCreatedBy === 'user' ? 0.95 : 0.8;

  // Get rule-specific accuracy stats
  const ruleStats = await getRuleAccuracyStats(supabase, userId, ruleId);
  
  // Get user acceptance rate for this rule
  const userAcceptanceRate = await getUserAcceptanceRate(supabase, userId, ruleId);
  
  // Get global merchant confidence
  const globalMerchantConfidence = await getGlobalMerchantConfidence(
    supabase,
    transactionDescription
  );

  return {
    baseConfidence,
    ruleAccuracy: ruleStats.accuracy,
    userAcceptanceRate,
    globalMerchantConfidence,
    ruleMatchCount,
  };
}

/**
 * Get historical accuracy stats for a specific rule
 */
async function getRuleAccuracyStats(
  supabase: any,
  userId: string,
  ruleId: string
): Promise<RuleAccuracyStats> {
  // Try to use the database function for better performance
  try {
    const { data: stats, error: funcError } = await supabase.rpc('get_rule_accuracy_stats', {
      p_user_id: userId,
      p_rule_id: ruleId,
      p_limit_count: 1000,
    });

    if (!funcError && stats && stats.length > 0) {
      const stat = stats[0];
      return {
        totalMatches: Number(stat.total_matches || 0),
        acceptedMatches: Number(stat.accepted_matches || 0),
        rejectedMatches: Number(stat.rejected_matches || 0),
        accuracy: Number(stat.accuracy || 0),
      };
    }
  } catch {
    // Fall through to manual calculation
  }

  // Fallback: manual calculation
  const { data: ruleUsages, error } = await supabase
    .from('rule_usage')
    .select('was_applied, transaction_id')
    .eq('user_id', userId)
    .eq('rule_id', ruleId)
    .order('matched_at', { ascending: false })
    .limit(1000); // Last 1000 matches

  if (error || !ruleUsages || ruleUsages.length === 0) {
    return { totalMatches: 0, acceptedMatches: 0, rejectedMatches: 0, accuracy: 0 };
  }

  // Check which ones were actually accepted by the user
  const transactionIds = ruleUsages.map((ru: any) => ru.transaction_id);
  
  // Get transactions to see if they were categorized (accepted) or not
  const { data: transactions } = await supabase
    .from('transactions')
    .select('id, category_id, suggested_category_id')
    .in('id', transactionIds);

  const txMap = new Map(transactions?.map((t: any) => [t.id, t]) || []);

  let acceptedMatches = 0;
  let rejectedMatches = 0;

  for (const usage of ruleUsages) {
    const tx = txMap.get(usage.transaction_id);
    if (!tx) continue;

    // If rule was applied and transaction has category, it was accepted
    // If rule suggested but user changed category, it was rejected
    if (usage.was_applied && tx.category_id) {
      acceptedMatches++;
    } else if (!usage.was_applied && tx.suggested_category_id && !tx.category_id) {
      // Suggestion was made but user didn't accept
      rejectedMatches++;
    } else if (usage.was_applied && !tx.category_id) {
      // Was applied but later removed
      rejectedMatches++;
    }
  }

  const totalMatches = ruleUsages.length;
  const accuracy = totalMatches > 0 ? acceptedMatches / totalMatches : 0;

  return { totalMatches, acceptedMatches, rejectedMatches, accuracy };
}

/**
 * Get user's acceptance rate for this specific rule
 */
async function getUserAcceptanceRate(
  supabase: any,
  userId: string,
  ruleId: string
): Promise<number> {
  // Get recent rule usage where suggestions were made
  const { data: recentUsages, error } = await supabase
    .from('rule_usage')
    .select('transaction_id, was_applied')
    .eq('user_id', userId)
    .eq('rule_id', ruleId)
    .eq('was_applied', false) // Only suggestions, not auto-applied
    .order('matched_at', { ascending: false })
    .limit(50); // Last 50 suggestions

  if (error || !recentUsages || recentUsages.length === 0) {
    return 0.5; // Default neutral acceptance rate
  }

  const transactionIds = recentUsages.map((ru: any) => ru.transaction_id);
  
  // Check if user accepted these suggestions
  const { data: transactions } = await supabase
    .from('transactions')
    .select('id, category_id, suggested_category_id')
    .in('id', transactionIds);

  if (!transactions) return 0.5;

  let accepted = 0;
  for (const tx of transactions) {
    // If transaction has category_id matching the suggestion, user accepted it
    if (tx.category_id && tx.suggested_category_id === tx.category_id) {
      accepted++;
    }
  }

  return recentUsages.length > 0 ? accepted / recentUsages.length : 0.5;
}

/**
 * Get global merchant confidence based on patterns across all users
 */
async function getGlobalMerchantConfidence(
  supabase: any,
  transactionDescription: string
): Promise<number> {
  // Extract merchant name from description (simplified - could be enhanced)
  const merchant = extractMerchantName(transactionDescription);
  if (!merchant) return 0.5; // Default neutral

  // Query global merchant patterns
  // This would ideally use a global_merchant_patterns table
  // For now, we'll query categorized transactions to find patterns
  const { data: patterns, error } = await supabase
    .from('transactions')
    .select('category_id, description')
    .not('category_id', 'is', null)
    .ilike('description', `%${merchant}%`)
    .limit(100);

  if (error || !patterns || patterns.length === 0) {
    return 0.5; // No global data
  }

  // Find most common category for this merchant
  const categoryCounts = new Map<string, number>();
  for (const pattern of patterns) {
    const catId = pattern.category_id;
    categoryCounts.set(catId, (categoryCounts.get(catId) || 0) + 1);
  }

  const maxCount = Math.max(...Array.from(categoryCounts.values()));
  const totalCount = patterns.length;
  
  // Confidence based on consistency: if 90% of transactions with this merchant
  // go to one category, confidence is high
  const consistency = maxCount / totalCount;
  
  // Also factor in sample size (more data = more confidence)
  const sampleSizeFactor = Math.min(totalCount / 50, 1.0); // Max confidence at 50+ samples
  
  return 0.3 + (consistency * 0.5) + (sampleSizeFactor * 0.2); // Range: 0.3 to 1.0
}

/**
 * Extract merchant name from transaction description
 * This is a simplified version - could be enhanced with better parsing
 */
function extractMerchantName(description: string): string | null {
  // Remove common prefixes/suffixes
  let merchant = description
    .replace(/^(PP\*|PAYPAL\*|AMZN\s+MKTP\s+CA\*)/i, '')
    .replace(/\s+\d+.*$/, '') // Remove trailing numbers/codes
    .trim();

  // Take first meaningful words (up to 3 words)
  const words = merchant.split(/\s+/).filter(w => w.length > 2);
  if (words.length === 0) return null;

  return words.slice(0, 3).join(' ').toUpperCase();
}

/**
 * Combine all confidence factors into a final score
 */
function combineConfidenceFactors(factors: ConfidenceFactors): number {
  let confidence = factors.baseConfidence;

  // Adjust based on rule accuracy (if we have enough data)
  if (factors.ruleAccuracy > 0 && factors.ruleMatchCount >= 5) {
    // Blend base confidence with actual accuracy
    // More weight to actual accuracy as we get more data
    const accuracyWeight = Math.min(factors.ruleMatchCount / 50, 0.7); // Up to 70% weight
    confidence = confidence * (1 - accuracyWeight) + factors.ruleAccuracy * accuracyWeight;
  }

  // Adjust based on user acceptance rate
  if (factors.userAcceptanceRate > 0) {
    // If user frequently accepts this rule, boost confidence
    // If user frequently rejects, lower confidence
    const acceptanceAdjustment = (factors.userAcceptanceRate - 0.5) * 0.2; // ±10% adjustment
    confidence = Math.max(0.1, Math.min(0.99, confidence + acceptanceAdjustment));
  }

  // Adjust based on global merchant patterns
  if (factors.globalMerchantConfidence > 0.5) {
    // Boost confidence if global patterns support this
    const globalBoost = (factors.globalMerchantConfidence - 0.5) * 0.15; // Up to +7.5%
    confidence = Math.min(0.99, confidence + globalBoost);
  } else if (factors.globalMerchantConfidence < 0.5) {
    // Lower confidence if global patterns don't support this
    const globalPenalty = (0.5 - factors.globalMerchantConfidence) * 0.1; // Up to -5%
    confidence = Math.max(0.1, confidence - globalPenalty);
  }

  // Ensure confidence is within valid range
  return Math.max(0.1, Math.min(0.99, confidence));
}
