const express = require('express');
const { Category, Transaction } = require('../models');

const router = express.Router();

// Get all categories
router.get('/', async (req, res) => {
  try {
    const { tree, root_only } = req.query;
    
    if (tree === 'true') {
      // Return hierarchical tree structure
      const categories = await Category.findAll({
        where: { 
          parentId: null,
          isActive: true 
        },
        include: [{
          model: Category,
          as: 'subcategories',
          where: { isActive: true },
          required: false,
          include: [{
            model: Category,
            as: 'subcategories',
            where: { isActive: true },
            required: false
          }]
        }]
      });

      const treeData = await Promise.all(categories.map(async (category) => {
        const transactionCount = await category.getTransactionCount();
        return {
          id: category.id,
          name: category.name,
          parent: category.parentId,
          description: category.description,
          color: category.color,
          isActive: category.isActive,
          transactionCount: transactionCount,
          subcategories: await Promise.all(category.subcategories.map(async (sub) => {
            const subTransactionCount = await sub.getTransactionCount();
            return {
              id: sub.id,
              name: sub.name,
              parent: sub.parentId,
              description: sub.description,
              color: sub.color,
              isActive: sub.isActive,
              transactionCount: subTransactionCount,
              subcategories: await Promise.all(sub.subcategories.map(async (subSub) => {
                const subSubTransactionCount = await subSub.getTransactionCount();
                return {
                  id: subSub.id,
                  name: subSub.name,
                  parent: subSub.parentId,
                  description: subSub.description,
                  color: subSub.color,
                  isActive: subSub.isActive,
                  transactionCount: subSubTransactionCount
                };
              }))
            };
          }))
        };
      }));

      res.json(treeData);
    } else if (root_only === 'true') {
      // Return only root categories
      const categories = await Category.findAll({
        where: { 
          parentId: null,
          isActive: true 
        }
      });

      const categoriesWithCounts = await Promise.all(categories.map(async (category) => {
        const transactionCount = await category.getTransactionCount();
        return {
          id: category.id,
          name: category.name,
          parent: category.parentId,
          description: category.description,
          color: category.color,
          isActive: category.isActive,
          createdAt: category.createdAt,
          updatedAt: category.updatedAt,
          transactionCount: transactionCount
        };
      }));

      res.json(categoriesWithCounts);
    } else {
      // Return flat list of all categories
      const categories = await Category.findAll({
        where: { isActive: true },
        include: [{
          model: Category,
          as: 'parent',
          attributes: ['name']
        }]
      });

      const categoriesWithCounts = await Promise.all(categories.map(async (category) => {
        const transactionCount = await category.getTransactionCount();
        return {
          id: category.id,
          name: category.name,
          parent: category.parentId,
          parentName: category.parent ? category.parent.name : null,
          description: category.description,
          color: category.color,
          isActive: category.isActive,
          createdAt: category.createdAt,
          updatedAt: category.updatedAt,
          transactionCount: transactionCount
        };
      }));

      res.json(categoriesWithCounts);
    }
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new category
router.post('/create', async (req, res) => {
  try {
    const { name, parent, description, color } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    // Check if category already exists with same parent
    const existingCategory = await Category.findOne({
      where: { 
        name: name,
        parentId: parent || null
      }
    });

    if (existingCategory) {
      return res.status(400).json({ error: 'Category already exists with this name and parent' });
    }

    const category = await Category.create({
      name: name,
      parentId: parent || null,
      description: description || '',
      color: color || '#2196F3'
    });

    res.status(201).json({
      id: category.id,
      name: category.name,
      parent: category.parentId,
      description: category.description,
      color: category.color,
      isActive: category.isActive,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update category
router.put('/:categoryId', async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { name, parent, description, color, isActive } = req.body;

    const category = await Category.findByPk(categoryId);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Update category fields
    if (name !== undefined) category.name = name;
    if (parent !== undefined) category.parentId = parent;
    if (description !== undefined) category.description = description;
    if (color !== undefined) category.color = color;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();

    res.json({
      id: category.id,
      name: category.name,
      parent: category.parentId,
      description: category.description,
      color: category.color,
      isActive: category.isActive,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt
    });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete category
router.delete('/:categoryId/delete', async (req, res) => {
  try {
    const { categoryId } = req.params;

    const category = await Category.findByPk(categoryId);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Check if category has subcategories
    const subcategoryCount = await Category.count({
      where: { parentId: categoryId }
    });

    if (subcategoryCount > 0) {
      return res.status(400).json({
        error: 'Cannot delete category with subcategories. Please delete subcategories first.'
      });
    }

    await category.destroy();

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create subcategory
router.post('/:parentId/subcategories', async (req, res) => {
  try {
    const { parentId } = req.params;
    const { name, description, color } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    // Check if parent category exists
    const parentCategory = await Category.findByPk(parentId);
    if (!parentCategory) {
      return res.status(404).json({ error: 'Parent category not found' });
    }

    // Check if subcategory already exists
    const existingSubcategory = await Category.findOne({
      where: { 
        name: name,
        parentId: parentId
      }
    });

    if (existingSubcategory) {
      return res.status(400).json({ error: 'Subcategory already exists with this name' });
    }

    const subcategory = await Category.create({
      name: name,
      parentId: parentId,
      description: description || '',
      color: color || '#2196F3'
    });

    res.status(201).json({
      id: subcategory.id,
      name: subcategory.name,
      parent: subcategory.parentId,
      description: subcategory.description,
      color: subcategory.color,
      isActive: subcategory.isActive,
      createdAt: subcategory.createdAt,
      updatedAt: subcategory.updatedAt
    });
  } catch (error) {
    console.error('Error creating subcategory:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get subcategories
router.get('/:categoryId/subcategories', async (req, res) => {
  try {
    const { categoryId } = req.params;

    const category = await Category.findByPk(categoryId);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const subcategories = await Category.findAll({
      where: { 
        parentId: categoryId,
        isActive: true 
      }
    });

    const subcategoriesWithCounts = await Promise.all(subcategories.map(async (subcategory) => {
      const transactionCount = await subcategory.getTransactionCount();
      return {
        id: subcategory.id,
        name: subcategory.name,
        parent: subcategory.parentId,
        description: subcategory.description,
        color: subcategory.color,
        isActive: subcategory.isActive,
        createdAt: subcategory.createdAt,
        updatedAt: subcategory.updatedAt,
        transactionCount: transactionCount
      };
    }));

    res.json(subcategoriesWithCounts);
  } catch (error) {
    console.error('Error fetching subcategories:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get category tree
router.get('/tree', async (req, res) => {
  try {
    const categories = await Category.findAll({
      where: { 
        parentId: null,
        isActive: true 
      },
      include: [{
        model: Category,
        as: 'subcategories',
        where: { isActive: true },
        required: false
      }]
    });

    const treeData = await Promise.all(categories.map(async (category) => {
      const transactionCount = await category.getTransactionCount();
      return {
        id: category.id,
        name: category.name,
        parent: category.parentId,
        description: category.description,
        color: category.color,
        isActive: category.isActive,
        transactionCount: transactionCount,
        subcategories: await Promise.all(category.subcategories.map(async (sub) => {
          const subTransactionCount = await sub.getTransactionCount();
          return {
            id: sub.id,
            name: sub.name,
            parent: sub.parentId,
            description: sub.description,
            color: sub.color,
            isActive: sub.isActive,
            transactionCount: subTransactionCount
          };
        }))
      };
    }));

    res.json(treeData);
  } catch (error) {
    console.error('Error fetching category tree:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
