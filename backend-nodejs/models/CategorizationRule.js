module.exports = (sequelize, DataTypes) => {
  const CategorizationRule = sequelize.define('CategorizationRule', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    rule_type: {
      type: DataTypes.ENUM(
        'keyword', 'contains', 'exact', 'regex', 'amount_range',
        'amount_exact', 'amount_greater', 'amount_less', 'recurring',
        'merchant', 'date_range', 'day_of_week', 'combined'
      ),
      allowNull: false,
      field: 'rule_type'
    },
    pattern: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'category_id',
      references: {
        model: 'backend_category',
        key: 'id'
      }
    },
    priority: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    },
    case_sensitive: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'case_sensitive'
    },
    created_by: {
      type: DataTypes.STRING(100),
      defaultValue: 'system',
      field: 'created_by'
    },
    conditions: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    match_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'match_count'
    },
    last_matched: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_matched'
    }
  }, {
    tableName: 'backend_categorizationrule',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['priority']
      },
      {
        fields: ['is_active']
      }
    ]
  });

  CategorizationRule.associate = (models) => {
    CategorizationRule.belongsTo(models.Category, {
      foreignKey: 'category_id',
      as: 'category'
    });
    
    CategorizationRule.hasMany(models.RuleUsage, {
      foreignKey: 'rule_id',
      as: 'ruleUsages'
    });
  };

  // Instance methods
  CategorizationRule.prototype.incrementMatchCount = async function() {
    this.matchCount += 1;
    this.lastMatched = new Date();
    await this.save();
  };

  CategorizationRule.prototype.getRulePreview = function() {
    switch (this.ruleType) {
      case 'keyword':
        return `Description contains any of: ${this.pattern}`;
      case 'contains':
        return `Description contains: ${this.pattern}`;
      case 'exact':
        return `Description exactly matches: ${this.pattern}`;
      case 'regex':
        return `Description matches regex: ${this.pattern}`;
      case 'amount_range':
        try {
          const rangeData = JSON.parse(this.pattern);
          return `Amount between $${rangeData.min || 0} and $${rangeData.max || '∞'}`;
        } catch {
          return `Amount range: ${this.pattern}`;
        }
      case 'amount_exact':
        return `Amount exactly: $${this.pattern}`;
      case 'amount_greater':
        return `Amount greater than: $${this.pattern}`;
      case 'amount_less':
        return `Amount less than: $${this.pattern}`;
      case 'merchant':
        return `Merchant name contains: ${this.pattern}`;
      case 'recurring':
        return `Recurring payment pattern`;
      default:
        return `Custom rule: ${this.pattern}`;
    }
  };

  return CategorizationRule;
};
