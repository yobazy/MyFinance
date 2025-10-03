const express = require('express');
const { CategorizationRule, RuleGroup, RuleUsage, Category, Transaction } = require('../models');
const { Op } = require('sequelize');

const router = express.Router();

// Get all rules
router.get('/', async (req, res) => {
  try {
    const rules = await CategorizationRule.findAll({
      include: [{
        model: Category,
        as: 'category',
        attributes: ['id', 'name']
      }],
      order: [['priority', 'DESC'], ['name', 'ASC']]
    });

    const rulesWithNames = rules.map(rule => ({
      id: rule.id,
      name: rule.name,
      description: rule.description,
      ruleType: rule.ruleType,
      pattern: rule.pattern,
      category: rule.categoryId,
      categoryName: rule.category ? rule.category.name : null,
      priority: rule.priority,
      isActive: rule.isActive,
      caseSensitive: rule.caseSensitive,
      createdBy: rule.createdBy,
      conditions: rule.conditions,
      matchCount: rule.matchCount,
      lastMatched: rule.lastMatched,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
      rulePreview: rule.getRulePreview()
    }));

    res.json(rulesWithNames);
  } catch (error) {
    console.error('Error fetching rules:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single rule
router.get('/:ruleId', async (req, res) => {
  try {
    const { ruleId } = req.params;

    const rule = await CategorizationRule.findByPk(ruleId, {
      include: [{
        model: Category,
        as: 'category',
        attributes: ['id', 'name']
      }]
    });

    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    res.json({
      id: rule.id,
      name: rule.name,
      description: rule.description,
      ruleType: rule.ruleType,
      pattern: rule.pattern,
      category: rule.categoryId,
      categoryName: rule.category ? rule.category.name : null,
      priority: rule.priority,
      isActive: rule.isActive,
      caseSensitive: rule.caseSensitive,
      createdBy: rule.createdBy,
      conditions: rule.conditions,
      matchCount: rule.matchCount,
      lastMatched: rule.lastMatched,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
      rulePreview: rule.getRulePreview()
    });
  } catch (error) {
    console.error('Error fetching rule:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new rule
router.post('/create', async (req, res) => {
  try {
    const { name, description, ruleType, pattern, categoryId, priority, isActive, caseSensitive, createdBy, conditions } = req.body;

    if (!name || !ruleType || !pattern || !categoryId) {
      return res.status(400).json({ error: 'Name, rule type, pattern, and category are required' });
    }

    // Verify category exists
    const category = await Category.findByPk(categoryId);
    if (!category) {
      return res.status(400).json({ error: 'Category not found' });
    }

    const rule = await CategorizationRule.create({
      name,
      description: description || '',
      ruleType,
      pattern,
      categoryId,
      priority: priority || 1,
      isActive: isActive !== undefined ? isActive : true,
      caseSensitive: caseSensitive || false,
      createdBy: createdBy || 'system',
      conditions: conditions || {}
    });

    res.status(201).json({
      id: rule.id,
      name: rule.name,
      description: rule.description,
      ruleType: rule.ruleType,
      pattern: rule.pattern,
      category: rule.categoryId,
      categoryName: category.name,
      priority: rule.priority,
      isActive: rule.isActive,
      caseSensitive: rule.caseSensitive,
      createdBy: rule.createdBy,
      conditions: rule.conditions,
      matchCount: rule.matchCount,
      lastMatched: rule.lastMatched,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
      rulePreview: rule.getRulePreview()
    });
  } catch (error) {
    console.error('Error creating rule:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update rule
router.put('/:ruleId/update', async (req, res) => {
  try {
    const { ruleId } = req.params;
    const { name, description, ruleType, pattern, categoryId, priority, isActive, caseSensitive, conditions } = req.body;

    const rule = await CategorizationRule.findByPk(ruleId);
    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    // Update rule fields
    if (name !== undefined) rule.name = name;
    if (description !== undefined) rule.description = description;
    if (ruleType !== undefined) rule.ruleType = ruleType;
    if (pattern !== undefined) rule.pattern = pattern;
    if (categoryId !== undefined) {
      // Verify category exists
      const category = await Category.findByPk(categoryId);
      if (!category) {
        return res.status(400).json({ error: 'Category not found' });
      }
      rule.categoryId = categoryId;
    }
    if (priority !== undefined) rule.priority = priority;
    if (isActive !== undefined) rule.isActive = isActive;
    if (caseSensitive !== undefined) rule.caseSensitive = caseSensitive;
    if (conditions !== undefined) rule.conditions = conditions;

    await rule.save();

    // Reload with category information
    await rule.reload({
      include: [{
        model: Category,
        as: 'category',
        attributes: ['id', 'name']
      }]
    });

    res.json({
      id: rule.id,
      name: rule.name,
      description: rule.description,
      ruleType: rule.ruleType,
      pattern: rule.pattern,
      category: rule.categoryId,
      categoryName: rule.category ? rule.category.name : null,
      priority: rule.priority,
      isActive: rule.isActive,
      caseSensitive: rule.caseSensitive,
      createdBy: rule.createdBy,
      conditions: rule.conditions,
      matchCount: rule.matchCount,
      lastMatched: rule.lastMatched,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
      rulePreview: rule.getRulePreview()
    });
  } catch (error) {
    console.error('Error updating rule:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete rule
router.delete('/:ruleId/delete', async (req, res) => {
  try {
    const { ruleId } = req.params;

    const rule = await CategorizationRule.findByPk(ruleId);
    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    await rule.destroy();

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting rule:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test rule
router.post('/:ruleId/test', async (req, res) => {
  try {
    const { ruleId } = req.params;
    const { testDescription, testAmount } = req.body;

    const rule = await CategorizationRule.findByPk(ruleId);
    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    // Test the rule logic
    const matches = await testRuleLogic(rule, testDescription, testAmount);

    res.json({
      ruleId: rule.id,
      ruleName: rule.name,
      testDescription: testDescription,
      testAmount: testAmount,
      matches: matches,
      rulePreview: rule.getRulePreview()
    });
  } catch (error) {
    console.error('Error testing rule:', error);
    res.status(500).json({ error: error.message });
  }
});

// Apply rule to transactions
router.post('/:ruleId/apply', async (req, res) => {
  try {
    const { ruleId } = req.params;

    const rule = await CategorizationRule.findByPk(ruleId);
    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    if (!rule.isActive) {
      return res.status(400).json({ error: 'Rule is not active' });
    }

    // Find uncategorized transactions
    const uncategorizedTransactions = await Transaction.findAll({
      where: { categoryId: null }
    });

    let appliedCount = 0;

    for (const transaction of uncategorizedTransactions) {
      const matches = await testRuleLogic(rule, transaction.description, parseFloat(transaction.amount));
      
      if (matches) {
        transaction.categoryId = rule.categoryId;
        transaction.autoCategorized = true;
        transaction.confidenceScore = 1.0;
        await transaction.save();

        // Record rule usage
        await RuleUsage.create({
          ruleId: rule.id,
          transactionId: transaction.id,
          confidenceScore: 1.0,
          wasApplied: true
        });

        // Increment match count
        await rule.incrementMatchCount();
        appliedCount++;
      }
    }

    res.json({
      message: `Rule applied successfully to ${appliedCount} transactions`,
      appliedCount: appliedCount,
      totalUncategorized: uncategorizedTransactions.length
    });
  } catch (error) {
    console.error('Error applying rule:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get rule statistics
router.get('/stats', async (req, res) => {
  try {
    const totalRules = await CategorizationRule.count();
    const activeRules = await CategorizationRule.count({ where: { isActive: true } });
    const totalMatches = await CategorizationRule.sum('matchCount');
    
    const topRules = await CategorizationRule.findAll({
      include: [{
        model: Category,
        as: 'category',
        attributes: ['name']
      }],
      order: [['matchCount', 'DESC']],
      limit: 10
    });

    res.json({
      totalRules: totalRules,
      activeRules: activeRules,
      totalMatches: totalMatches || 0,
      topRules: topRules.map(rule => ({
        id: rule.id,
        name: rule.name,
        categoryName: rule.category ? rule.category.name : null,
        matchCount: rule.matchCount,
        lastMatched: rule.lastMatched
      }))
    });
  } catch (error) {
    console.error('Error fetching rule statistics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get rule groups
router.get('/groups', async (req, res) => {
  try {
    const groups = await RuleGroup.findAll({
      where: { isActive: true },
      order: [['name', 'ASC']]
    });

    const groupsWithCounts = await Promise.all(groups.map(async (group) => {
      const ruleCount = await CategorizationRule.count({
        where: { ruleGroupId: group.id }
      });

      return {
        id: group.id,
        name: group.name,
        description: group.description,
        color: group.color,
        isActive: group.isActive,
        createdAt: group.createdAt,
        ruleCount: ruleCount
      };
    }));

    res.json(groupsWithCounts);
  } catch (error) {
    console.error('Error fetching rule groups:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create rule group
router.post('/groups/create', async (req, res) => {
  try {
    const { name, description, color } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    const group = await RuleGroup.create({
      name,
      description: description || '',
      color: color || '#2196F3'
    });

    res.status(201).json({
      id: group.id,
      name: group.name,
      description: group.description,
      color: group.color,
      isActive: group.isActive,
      createdAt: group.createdAt,
      ruleCount: 0
    });
  } catch (error) {
    console.error('Error creating rule group:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to test rule logic
async function testRuleLogic(rule, description, amount) {
  const desc = rule.caseSensitive ? description : description.toLowerCase();
  const pattern = rule.caseSensitive ? rule.pattern : rule.pattern.toLowerCase();

  switch (rule.ruleType) {
    case 'keyword':
      const keywords = pattern.split(',').map(k => k.trim());
      return keywords.some(keyword => desc.includes(keyword));
    
    case 'contains':
      return desc.includes(pattern);
    
    case 'exact':
      return desc === pattern;
    
    case 'regex':
      try {
        const regex = new RegExp(pattern, rule.caseSensitive ? '' : 'i');
        return regex.test(description);
      } catch {
        return false;
      }
    
    case 'amount_exact':
      return parseFloat(amount) === parseFloat(pattern);
    
    case 'amount_greater':
      return parseFloat(amount) > parseFloat(pattern);
    
    case 'amount_less':
      return parseFloat(amount) < parseFloat(pattern);
    
    case 'amount_range':
      try {
        const range = JSON.parse(pattern);
        const amt = parseFloat(amount);
        return amt >= parseFloat(range.min) && amt <= parseFloat(range.max);
      } catch {
        return false;
      }
    
    default:
      return false;
  }
}

module.exports = router;
