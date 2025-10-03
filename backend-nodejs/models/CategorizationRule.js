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
    ruleType: {
      type: DataTypes.ENUM(
        'keyword', 'contains', 'exact', 'regex', 'amount_range',
        'amount_exact', 'amount_greater', 'amount_less', 'recurring',
        'merchant', 'date_range', 'day_of_week', 'combined'
      ),
      allowNull: false
    },
    pattern: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'backend_category',
        key: 'id'
      }
    },
    priority: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    caseSensitive: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    createdBy: {
      type: DataTypes.STRING(100),
      defaultValue: 'system'
    },
    conditions: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    matchCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    lastMatched: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'backend_categorizationrule',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    indexes: [
      {
        fields: ['priority']
      },
      {
        fields: ['isActive']
      }
    ]
  });

  CategorizationRule.associate = (models) => {
    CategorizationRule.belongsTo(models.Category, {
      foreignKey: 'categoryId',
      as: 'category'
    });
    
    CategorizationRule.hasMany(models.RuleUsage, {
      foreignKey: 'ruleId',
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
