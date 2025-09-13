import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { 
  Container, 
  Typography, 
  Card, 
  CardContent, 
  Button, 
  Box,
  CircularProgress,
  Alert,
  TextField,
  Grid,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Paper,
  Pagination,
  Checkbox,
  FormGroup,
  FormControlLabel,
  Collapse
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CategoryIcon from '@mui/icons-material/Category';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import VisibilityIcon from '@mui/icons-material/Visibility';
import StarIcon from '@mui/icons-material/Star';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useNavigate } from 'react-router-dom';

const Categorization = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState("");
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMoreTransactions, setHasMoreTransactions] = useState(false);

  // Default categories state
  const [showDefaultCategories, setShowDefaultCategories] = useState(false);
  const [selectedDefaultCategories, setSelectedDefaultCategories] = useState(new Set());
  const [openDefaultDialog, setOpenDefaultDialog] = useState(false);
  const [creatingDefaultCategories, setCreatingDefaultCategories] = useState(false);
  
  const ITEMS_PER_PAGE = 10;
  const INITIAL_LOAD = 20; // Load first 20 transactions initially

  // Predefined default categories organized by type
  const defaultCategories = useMemo(() => [
    // Essential Expenses
    { name: "Housing & Rent", category: "Housing" },
    { name: "Utilities", category: "Housing" },
    { name: "Groceries", category: "Food" },
    { name: "Transportation", category: "Transportation" },
    { name: "Gas & Fuel", category: "Transportation" },
    { name: "Insurance", category: "Insurance" },
    { name: "Healthcare", category: "Healthcare" },
    { name: "Phone & Internet", category: "Utilities" },
    
    // Lifestyle & Entertainment
    { name: "Dining Out", category: "Food" },
    { name: "Entertainment", category: "Entertainment" },
    { name: "Shopping", category: "Shopping" },
    { name: "Clothing", category: "Shopping" },
    { name: "Subscriptions", category: "Entertainment" },
    { name: "Fitness & Gym", category: "Health" },
    
    // Financial
    { name: "Savings", category: "Savings" },
    { name: "Investments", category: "Investments" },
    { name: "Debt Payments", category: "Debt" },
    { name: "Credit Card", category: "Debt" },
    { name: "Bank Fees", category: "Fees" },
    
    // Income
    { name: "Salary", category: "Income" },
    { name: "Freelance", category: "Income" },
    { name: "Interest", category: "Income" },
    { name: "Refunds", category: "Income" },
    
    // Other
    { name: "Education", category: "Education" },
    { name: "Travel", category: "Travel" },
    { name: "Gifts", category: "Gifts" },
    { name: "Charity", category: "Charity" },
    { name: "Pet Care", category: "Pets" },
    { name: "Home Improvement", category: "Home" },
    { name: "Personal Care", category: "Personal" },
    { name: "Books & Learning", category: "Education" },
    { name: "Technology", category: "Technology" },
    { name: "Miscellaneous", category: "Other" }
  ], []);

  // Group default categories by category type
  const groupedDefaultCategories = useMemo(() => {
    const groups = {};
    defaultCategories.forEach(cat => {
      if (!groups[cat.category]) {
        groups[cat.category] = [];
      }
      groups[cat.category].push(cat.name);
    });
    return groups;
  }, [defaultCategories]);

  // Check if category already exists
  const existingCategoryNames = useMemo(() => 
    new Set(categories.map(cat => cat.name.toLowerCase())), 
    [categories]
  );

  // Filter out categories that already exist
  const availableDefaultCategories = useMemo(() => 
    defaultCategories.filter(cat => 
      !existingCategoryNames.has(cat.name.toLowerCase())
    ),
    [defaultCategories, existingCategoryNames]
  );

  // Load initial batch of transactions
  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch categories
      const categoriesResponse = await axios.get("http://127.0.0.1:8000/api/categories/");
      setCategories(categoriesResponse.data);

      // Fetch a small batch of transactions first
      const transactionsResponse = await axios.get("http://127.0.0.1:8000/api/transactions/?uncategorized=true");
      const allFetchedTransactions = transactionsResponse.data;
      
      // Only show first 20 initially
      const initialBatch = allFetchedTransactions.slice(0, INITIAL_LOAD);
      setTransactions(initialBatch);
      setAllTransactions(allFetchedTransactions);
      setTotalPages(Math.ceil(allFetchedTransactions.length / ITEMS_PER_PAGE));
      setHasMoreTransactions(allFetchedTransactions.length > INITIAL_LOAD);
      
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to load transactions and categories");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load all transactions when "View All" is clicked
  const loadAllTransactions = useCallback(async () => {
    if (showAll) return; // Already loaded
    
    try {
      setLoadingMore(true);
      setShowAll(true);
      setCurrentPage(1);
      setTransactions(allTransactions.slice(0, ITEMS_PER_PAGE));
    } catch (error) {
      console.error("Error loading all transactions:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [allTransactions, showAll]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Handle pagination
  const handlePageChange = useCallback((event, page) => {
    setCurrentPage(page);
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    setTransactions(allTransactions.slice(startIndex, endIndex));
  }, [allTransactions]);

  // Handle view all button
  const handleViewAll = useCallback(() => {
    loadAllTransactions();
  }, [loadAllTransactions]);

  // Memoize handlers to prevent unnecessary re-renders
  const handleAddCategory = useCallback(async () => {
    if (!newCategory.trim()) return;
    try {
      console.log('Creating manual category:', newCategory);
      const response = await axios.post("http://127.0.0.1:8000/api/categories/create/", {
        name: newCategory
      });
      console.log('Manual category created successfully:', response.data);
      setCategories(prev => [...prev, response.data]);
      setNewCategory("");
    } catch (error) {
      console.error("Error adding category:", error);
    }
  }, [newCategory]);

  const handleUpdateCategory = useCallback(async (categoryId, newName) => {
    try {
      await axios.put(`http://127.0.0.1:8000/api/categories/${categoryId}/`, {
        name: newName
      });
      setCategories(prev => prev.map(c => 
        c.id === categoryId ? { ...c, name: newName } : c
      ));
      setEditingCategory(null);
      setEditingCategoryName("");
    } catch (error) {
      console.error("Error updating category:", error);
    }
  }, []);

  const handleDeleteCategory = useCallback(async (categoryId) => {
    try {
      await axios.delete(`http://127.0.0.1:8000/api/categories/${categoryId}/delete/`);
      setCategories(prev => prev.filter(c => c.id !== categoryId));
    } catch (error) {
      console.error("Error deleting category:", error);
    }
  }, []);

  const handleUpdateTransaction = useCallback(async (transactionId, categoryId) => {
    try {
      await axios.put(`http://127.0.0.1:8000/api/transactions/${transactionId}/`, {
        category: categoryId
      });
      // Remove from both current view and all transactions
      setTransactions(prev => prev.filter(t => t.id !== transactionId));
      setAllTransactions(prev => prev.filter(t => t.id !== transactionId));
    } catch (error) {
      console.error("Error updating transaction:", error);
    }
  }, []);

  const startEditingCategory = useCallback((category) => {
    setEditingCategory(category.id);
    setEditingCategoryName(category.name);
    setOpenDialog(true);
  }, []);

  const handleEditCategory = useCallback(() => {
    if (editingCategory && editingCategoryName.trim()) {
      handleUpdateCategory(editingCategory, editingCategoryName);
      setOpenDialog(false);
    }
  }, [editingCategory, editingCategoryName, handleUpdateCategory]);

  // Default categories handlers
  const handleDefaultCategoryToggle = useCallback((categoryName) => {
    setSelectedDefaultCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryName)) {
        newSet.delete(categoryName);
      } else {
        newSet.add(categoryName);
      }
      return newSet;
    });
  }, []);

  const handleSelectAllInGroup = useCallback((groupCategories) => {
    setSelectedDefaultCategories(prev => {
      const newSet = new Set(prev);
      groupCategories.forEach(catName => {
        if (availableDefaultCategories.some(cat => cat.name === catName)) {
          newSet.add(catName);
        }
      });
      return newSet;
    });
  }, [availableDefaultCategories]);

  const handleCreateSelectedCategories = useCallback(async () => {
    if (selectedDefaultCategories.size === 0) return;

    try {
      setCreatingDefaultCategories(true);
      
      const selectedCategoriesArray = Array.from(selectedDefaultCategories);
      console.log('=== CREATING DEFAULT CATEGORIES ===');
      console.log('Selected categories to create:', selectedCategoriesArray);
      console.log('Current categories before creation:', categories);
      
      // Create categories one by one and immediately update state
      for (const categoryName of selectedCategoriesArray) {
        try {
          console.log(`Creating category: ${categoryName}`);
          const response = await axios.post("http://127.0.0.1:8000/api/categories/create/", {
            name: categoryName
          });
          
          console.log('Category created successfully:', response.data);
          
          // Immediately add to categories state
          setCategories(prev => {
            console.log('Previous categories state:', prev);
            // Check if category already exists to avoid duplicates
            const exists = prev.some(cat => cat.id === response.data.id || cat.name === response.data.name);
            if (exists) {
              console.log(`Category ${categoryName} already exists in state, skipping`);
              return prev;
            }
            console.log(`Adding category ${categoryName} to state`);
            const newState = [...prev, response.data];
            console.log('New categories state:', newState);
            return newState;
          });
          
          // Small delay to ensure state updates
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.error(`Error creating category "${categoryName}":`, error);
          // Continue creating other categories even if one fails
        }
      }
      
      // Clear selections and close dialog
      setSelectedDefaultCategories(new Set());
      setOpenDefaultDialog(false);
      
      console.log('Category creation process completed');
      console.log('Final categories state should be updated');
      
    } catch (error) {
      console.error("Error creating default categories:", error);
    } finally {
      setCreatingDefaultCategories(false);
    }
  }, [selectedDefaultCategories, categories]);

  // Memoize the category chips to prevent unnecessary re-renders
  const categoryChips = useMemo(() => {
    return categories.map((category) => (
      <Grid item key={category.id}>
        <Chip
          label={category.name}
          onDelete={() => handleDeleteCategory(category.id)}
          deleteIcon={<DeleteIcon />}
          onClick={() => startEditingCategory(category)}
          clickable
          color="primary"
          variant="outlined"
          sx={{ mr: 1, mb: 1 }}
        />
      </Grid>
    ));
  }, [categories, handleDeleteCategory, startEditingCategory]);

  // Memoize transaction items to prevent unnecessary re-renders
  const transactionItems = useMemo(() => {
    console.log('=== RENDERING TRANSACTION ITEMS ===');
    console.log('Current categories state:', categories);
    console.log('Categories count:', categories.length);
    console.log('Categories for dropdown:', categories.map(cat => ({ id: cat.id, name: cat.name })));
    
    return transactions.map((transaction) => (
      <Grid item xs={12} key={transaction.id}>
        <Paper 
          elevation={1} 
          sx={{ 
            p: 2, 
            display: 'flex', 
            alignItems: 'center', 
            gap: 2,
            transition: 'box-shadow 0.2s',
            '&:hover': {
              boxShadow: theme.shadows[2],
            }
          }}
        >
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="body1" fontWeight="medium">
              {transaction.description}
            </Typography>
            <Typography 
              variant="body2" 
              color={transaction.amount >= 0 ? "error.main" : "success.main"}
              fontWeight="bold"
            >
              ${Math.abs(transaction.amount).toFixed(2)}
            </Typography>
          </Box>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Select Category</InputLabel>
            <Select
              value=""
              onChange={(e) => {
                console.log('Category selected:', e.target.value);
                handleUpdateTransaction(transaction.id, e.target.value);
              }}
              label="Select Category"
            >
              {categories.map((category) => {
                console.log('Rendering category option:', category);
                return (
                  <MenuItem key={category.id} value={category.id}>
                    {category.name}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
        </Paper>
      </Grid>
    ));
  }, [transactions, categories, handleUpdateTransaction, theme.shadows]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </Container>
    );
  }

  if (allTransactions.length === 0) {
    return (
      <Container sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Transaction Categories 🏷️
        </Typography>
        <Card 
          sx={{ 
            minHeight: '60vh', 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center', 
            alignItems: 'center',
            backgroundColor: theme.palette.background.paper,
            cursor: 'pointer',
            transition: 'transform 0.2s, box-shadow 0.2s',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: theme.shadows[4],
            }
          }}
          onClick={() => navigate('/upload')}
        >
          <CardContent sx={{ textAlign: 'center' }}>
            <UploadFileIcon sx={{ 
              fontSize: 80, 
              color: theme.palette.primary.main,
              mb: 2,
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'scale(1.1)',
              }
            }} />
            <Typography variant="h5" gutterBottom>
              No transactions to categorize
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 450, mx: 'auto', mb: 3 }}>
              Upload your bank statements to start categorizing your transactions and tracking your spending habits.
            </Typography>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={(e) => {
                e.stopPropagation();
                navigate('/upload');
              }}
            >
              Upload Statements
            </Button>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Transaction Categories 🏷️
      </Typography>

      {/* Category Management Section */}
      <Card sx={{ mb: 3, boxShadow: theme.shadows[2] }}>
        <CardContent>
          <Box display="flex" alignItems="center" mb={3}>
            <CategoryIcon color="primary" sx={{ mr: 1 }} />
            <Typography variant="h6">Manage Categories</Typography>
          </Box>
          
          <Box display="flex" gap={2} mb={3}>
            <TextField
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="New category name"
              variant="outlined"
              size="small"
              sx={{ flexGrow: 1 }}
              onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
            />
            <Button 
              variant="contained" 
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleAddCategory}
              disabled={!newCategory.trim()}
            >
              Add Category
            </Button>
            {availableDefaultCategories.length > 0 && (
              <Button 
                variant="outlined" 
                color="secondary"
                startIcon={<StarIcon />}
                onClick={() => setOpenDefaultDialog(true)}
              >
                Add Defaults
              </Button>
            )}
          </Box>

          {/* Default Categories Preview */}
          {availableDefaultCategories.length > 0 && (
            <Box mb={2}>
              <Button
                onClick={() => setShowDefaultCategories(!showDefaultCategories)}
                startIcon={showDefaultCategories ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                sx={{ mb: 1 }}
                size="small"
              >
                {showDefaultCategories ? 'Hide' : 'Show'} Available Default Categories ({availableDefaultCategories.length})
              </Button>
              
              <Collapse in={showDefaultCategories}>
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Common categories you can add instantly:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {availableDefaultCategories.slice(0, 10).map((cat) => (
                      <Chip 
                        key={cat.name} 
                        label={cat.name} 
                        size="small" 
                        variant="outlined"
                        color="secondary"
                      />
                    ))}
                    {availableDefaultCategories.length > 10 && (
                      <Chip 
                        label={`+${availableDefaultCategories.length - 10} more`} 
                        size="small" 
                        variant="outlined"
                        color="secondary"
                      />
                    )}
                  </Box>
                </Box>
              </Collapse>
            </Box>
          )}

          <Divider sx={{ mb: 2 }} />

          {/* Debug: Current Categories Display */}
          <Box sx={{ mb: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
            <Typography variant="h6" color="info.contrastText" sx={{ mb: 1 }}>
              Debug: Current Categories ({categories.length})
            </Typography>
            <Typography variant="body2" color="info.contrastText" sx={{ mb: 1 }}>
              These are the categories currently available for transactions:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxHeight: '100px', overflowY: 'auto' }}>
              {categories.map((category) => (
                <Chip 
                  key={category.id} 
                  label={`${category.name} (ID: ${category.id})`} 
                  size="small" 
                  variant="filled"
                  color="primary"
                  sx={{ fontSize: '0.75rem' }}
                />
              ))}
              {categories.length === 0 && (
                <Typography variant="body2" color="info.contrastText" sx={{ fontStyle: 'italic' }}>
                  No categories available
                </Typography>
              )}
            </Box>
          </Box>

          <Grid container spacing={1}>
            {categoryChips}
          </Grid>
        </CardContent>
      </Card>

      {/* Transactions Section */}
      <Card sx={{ boxShadow: theme.shadows[2] }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
            <Box display="flex" alignItems="center">
              <AttachMoneyIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">
                Uncategorized Transactions
                {!showAll && hasMoreTransactions && (
                  <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                    (Showing {transactions.length} of {allTransactions.length})
                  </Typography>
                )}
              </Typography>
            </Box>
            
            {!showAll && hasMoreTransactions && (
              <Button
                variant="outlined"
                startIcon={<VisibilityIcon />}
                onClick={handleViewAll}
                disabled={loadingMore}
              >
                {loadingMore ? 'Loading...' : `View All (${allTransactions.length})`}
              </Button>
            )}
          </Box>

          <Grid container spacing={2}>
            {transactionItems}
          </Grid>

          {/* Pagination */}
          {showAll && totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={handlePageChange}
                color="primary"
                size="large"
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Edit Category Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Edit Category</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Category Name"
            fullWidth
            variant="outlined"
            value={editingCategoryName}
            onChange={(e) => setEditingCategoryName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleEditCategory()}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleEditCategory} 
            variant="contained"
            disabled={!editingCategoryName.trim()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Default Categories Dialog */}
      <Dialog 
        open={openDefaultDialog} 
        onClose={() => setOpenDefaultDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <StarIcon color="primary" sx={{ mr: 1 }} />
            Add Default Categories
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Select from our curated list of common financial categories. You can add them instantly to get started with categorizing your transactions.
          </Typography>
          
          {Object.entries(groupedDefaultCategories).map(([groupName, groupCategories]) => {
            const availableInGroup = groupCategories.filter(catName => 
              availableDefaultCategories.some(cat => cat.name === catName)
            );
            
            if (availableInGroup.length === 0) return null;
            
            return (
              <Box key={groupName} sx={{ mb: 3 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                  <Typography variant="h6" color="primary">
                    {groupName}
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => handleSelectAllInGroup(availableInGroup)}
                    disabled={availableInGroup.every(catName => selectedDefaultCategories.has(catName))}
                  >
                    Select All
                  </Button>
                </Box>
                <FormGroup row>
                  {availableInGroup.map((catName) => (
                    <FormControlLabel
                      key={catName}
                      control={
                        <Checkbox
                          checked={selectedDefaultCategories.has(catName)}
                          onChange={() => handleDefaultCategoryToggle(catName)}
                          color="primary"
                        />
                      }
                      label={catName}
                      sx={{ minWidth: '200px', mb: 1 }}
                    />
                  ))}
                </FormGroup>
                <Divider />
              </Box>
            );
          })}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDefaultDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateSelectedCategories}
            variant="contained"
            disabled={selectedDefaultCategories.size === 0 || creatingDefaultCategories}
            startIcon={creatingDefaultCategories ? <CircularProgress size={20} /> : <AddIcon />}
          >
            {creatingDefaultCategories 
              ? 'Creating...' 
              : `Add Selected (${selectedDefaultCategories.size})`
            }
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Categorization;