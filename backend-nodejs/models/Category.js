module.exports = (sequelize, DataTypes) => {
  const Category = sequelize.define('Category', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    parentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'parent_id',
      references: {
        model: 'backend_category',
        key: 'id'
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    color: {
      type: DataTypes.STRING(7),
      defaultValue: '#2196F3'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    }
  }, {
    tableName: 'backend_category',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['name', 'parent_id']
      }
    ]
  });

  Category.associate = (models) => {
    Category.belongsTo(models.Category, {
      foreignKey: 'parentId',
      as: 'parent'
    });
    
    Category.hasMany(models.Category, {
      foreignKey: 'parentId',
      as: 'subcategories'
    });
    
    Category.hasMany(models.Transaction, {
      foreignKey: 'categoryId',
      as: 'transactions'
    });
    
    Category.hasMany(models.CategorizationRule, {
      foreignKey: 'categoryId',
      as: 'rules'
    });
  };

  // Instance methods
  Category.prototype.getFullPath = function() {
    if (this.parent) {
      return `${this.parent.getFullPath()} > ${this.name}`;
    }
    return this.name;
  };

  Category.prototype.getLevel = function() {
    let level = 0;
    let parent = this.parent;
    while (parent) {
      level += 1;
      parent = parent.parent;
    }
    return level;
  };

  Category.prototype.isRoot = function() {
    return this.parentId === null;
  };

  Category.prototype.getAllSubcategories = async function() {
    const subcategories = await this.getSubcategories();
    let allSubcategories = [...subcategories];
    
    for (const subcategory of subcategories) {
      const nestedSubcategories = await subcategory.getAllSubcategories();
      allSubcategories = allSubcategories.concat(nestedSubcategories);
    }
    
    return allSubcategories;
  };

  Category.prototype.getTransactionCount = async function() {
    const subcategories = await this.getAllSubcategories();
    const subcategoryIds = [this.id, ...subcategories.map(sub => sub.id)];
    
    const count = await models.Transaction.count({
      where: {
        categoryId: subcategoryIds
      }
    });
    
    return count;
  };

  return Category;
};
