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
  Collapse,
  Switch,
  Snackbar,
  Slider,
  LinearProgress
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CategoryIcon from '@mui/icons-material/Category';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import VisibilityIcon from '@mui/icons-material/Visibility';
import StarIcon from '@mui/icons-material/Star';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import AssessmentIcon from '@mui/icons-material/Assessment';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
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
  
  // Auto categorization state
  const [autoCategorizationEnabled, setAutoCategorizationEnabled] = useState(true);
  const [autoCategorizing, setAutoCategorizing] = useState(false);
  const [autoCategorizationStats, setAutoCategorizationStats] = useState(null);
  const [showAutoStats, setShowAutoStats] = useState(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.6);
  const [successMessage, setSuccessMessage] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Bulk categorization state
  const [showBulkConfirmDialog, setShowBulkConfirmDialog] = useState(false);
  const [pendingTransactionId, setPendingTransactionId] = useState(null);
  const [pendingCategoryId, setPendingCategoryId] = useState(null);
  const [matchingTransactionsCount, setMatchingTransactionsCount] = useState(0);
  
  // Add collapsible state for sections
  const [showAutoCategorization, setShowAutoCategorization] = useState(false);
  const [showCategoryManagement, setShowCategoryManagement] = useState(true);
  
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

  // Auto categorization handlers
  const handleAutoCategorizationToggle = useCallback((event) => {
    setAutoCategorizationEnabled(event.target.checked);
    localStorage.setItem('autoCategorizationEnabled', event.target.checked);
  }, []);


  const fetchCategorizationStats = useCallback(async () => {
    try {
      const response = await axios.get("http://127.0.0.1:8000/api/auto-categorization/stats/");
      setAutoCategorizationStats(response.data);
    } catch (error) {
      console.error("Error fetching categorization stats:", error);
    }
  }, []);

  const handleViewStats = useCallback(() => {
    fetchCategorizationStats();
    setShowAutoStats(true);
  }, [fetchCategorizationStats]);

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
      
      // Load auto categorization settings
      const savedEnabled = localStorage.getItem('autoCategorizationEnabled');
      if (savedEnabled !== null) {
        setAutoCategorizationEnabled(savedEnabled === 'true');
      }
      
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to load transactions and categories");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAutoCategorizeBulk = useCallback(async () => {
    if (!autoCategorizationEnabled || allTransactions.length === 0) return;
    
    try {
      setAutoCategorizing(true);
      setSuccessMessage("");
      
      const response = await axios.post("http://127.0.0.1:8000/api/auto-categorization/auto-categorize/", {
        confidence_threshold: confidenceThreshold
      });
      
      if (response.data.success) {
        const stats = response.data.stats;
        setAutoCategorizationStats(stats);
        setShowAutoStats(true);
        
        // Show success message
        setSuccessMessage(
          `Auto-categorization complete! Categorized ${stats.auto_categorized} out of ${stats.total_processed} transactions.`
        );
        setShowSuccess(true);
        
        // Refresh transactions list to remove auto-categorized ones
        await fetchInitialData();
      }
    } catch (error) {
      console.error("Error during auto categorization:", error);
      setError("Failed to auto-categorize transactions");
    } finally {
      setAutoCategorizing(false);
    }
  }, [autoCategorizationEnabled, allTransactions.length, confidenceThreshold, fetchInitialData]);

  const handleUpdateSuggestions = useCallback(async () => {
    try {
      setAutoCategorizing(true);
      setSuccessMessage("");
      
      const response = await axios.post("http://127.0.0.1:8000/api/auto-categorization/update-suggestions/");
      
      if (response.data.success) {
        const stats = response.data.stats;
        
        // Show success message
        setSuccessMessage(
          `Suggestions updated! Generated suggestions for ${stats.suggestions_updated} out of ${stats.total_processed} transactions.`
        );
        setShowSuccess(true);
        
        // Refresh transactions list to show updated suggestions
        await fetchInitialData();
      }
    } catch (error) {
      console.error("Error updating suggestions:", error);
      setError("Failed to update suggestions");
    } finally {
      setAutoCategorizing(false);
    }
  }, [fetchInitialData]);

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
      // First, check how many transactions have the same description
      const transaction = transactions.find(t => t.id === transactionId);
      if (!transaction) return;
      
      const matchingTransactions = transactions.filter(t => 
        t.description === transaction.description && t.id !== transactionId
      );
      
      if (matchingTransactions.length > 0) {
        // Show confirmation dialog for bulk update
        setPendingTransactionId(transactionId);
        setPendingCategoryId(categoryId);
        setMatchingTransactionsCount(matchingTransactions.length);
        setShowBulkConfirmDialog(true);
      } else {
        // No other transactions to update, proceed directly
        await performTransactionUpdate(transactionId, categoryId);
      }
    } catch (error) {
      console.error("Error checking transactions:", error);
      setError("Failed to categorize transaction. Please try again.");
    }
  }, [transactions]);

  // New function to perform the actual update
  const performTransactionUpdate = useCallback(async (transactionId, categoryId) => {
    try {
      const response = await axios.put(`http://127.0.0.1:8000/api/transactions/${transactionId}/update-category/`, {
        category: categoryId
      });
      
      // Show success message with count of updated transactions
      if (response.data.success && response.data.updated_count > 1) {
        setSuccessMessage(`Successfully categorized ${response.data.updated_count} transactions with the same description!`);
        setShowSuccess(true);
      } else {
        setSuccessMessage("Transaction categorized successfully!");
        setShowSuccess(true);
      }
      
      // Remove from both current view and all transactions
      setTransactions(prev => prev.filter(t => t.id !== transactionId));
      setAllTransactions(prev => prev.filter(t => t.id !== transactionId));
    } catch (error) {
      console.error("Error updating transaction:", error);
      setError("Failed to categorize transaction. Please try again.");
    }
  }, []);

  // Function to handle confirmation dialog
  const handleBulkConfirm = useCallback(() => {
    if (pendingTransactionId && pendingCategoryId) {
      performTransactionUpdate(pendingTransactionId, pendingCategoryId);
    }
    setShowBulkConfirmDialog(false);
    setPendingTransactionId(null);
    setPendingCategoryId(null);
    setMatchingTransactionsCount(0);
  }, [pendingTransactionId, pendingCategoryId, performTransactionUpdate]);

  const handleBulkCancel = useCallback(() => {
    setShowBulkConfirmDialog(false);
    setPendingTransactionId(null);
    setPendingCategoryId(null);
    setMatchingTransactionsCount(0);
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
            borderLeft: transaction.auto_categorized ? '4px solid #4caf50' : 'none',
            '&:hover': {
              boxShadow: theme.shadows[2],
            }
          }}
        >
          <Box sx={{ flexGrow: 1 }}>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="body1" fontWeight="medium">
                {transaction.description}
              </Typography>
              {transaction.auto_categorized && (
                <Chip 
                  label={`Auto (${Math.round(transaction.confidence_score * 100)}%)`}
                  size="small"
                  color="success"
                  variant="outlined"
                />
              )}
              {!transaction.category && transaction.suggested_category_name && (
                <Chip 
                  label={`Auto: ${transaction.suggested_category_name} (${Math.round((transaction.confidence_score || 0) * 100)}%)`}
                  size="small"
                  color="warning"
                  variant="outlined"
                />
              )}
            </Box>
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
                handleUpdateTransaction(transaction.id, e.target.value);
              }}
              label="Select Category"
            >
              {categories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {category.name}
                </MenuItem>
              ))}
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

      {/* Auto Categorization Section */}
      <Card sx={{ mb: 2, boxShadow: theme.shadows[1] }}>
        <CardContent sx={{ py: showAutoCategorization ? 3 : 2, px: 2 }}>
          <Box 
            display="flex" 
            alignItems="center" 
            justifyContent="space-between"
            sx={{ 
              mb: showAutoCategorization ? 3 : 0,
              cursor: 'pointer',
              '&:hover': {
                '& .expand-icon': {
                  transform: 'scale(1.1)',
                  transition: 'transform 0.2s ease-in-out'
                }
              }
            }}
            onClick={() => setShowAutoCategorization(!showAutoCategorization)}
          >
            <Box display="flex" alignItems="center">
              <SmartToyIcon 
                color="primary" 
                sx={{ 
                  mr: 1.5, 
                  fontSize: '1.5rem'
                }} 
              />
              <Typography 
                variant="h6"
                sx={{ 
                  fontWeight: 600
                }}
              >
                Smart Auto-Categorization
              </Typography>
              {!showAutoCategorization && (
                <Typography 
                  variant="caption" 
                  color="text.secondary" 
                  sx={{ ml: 1, fontStyle: 'italic' }}
                >
                  {autoCategorizationEnabled ? 'Enabled' : 'Disabled'}
                </Typography>
              )}
              <Chip 
                label="BETA" 
                size="small" 
                color="secondary" 
                variant="outlined"
                sx={{ 
                  ml: 1, 
                  fontSize: '0.65rem', 
                  height: '18px',
                  opacity: showAutoCategorization ? 1 : 0.7,
                  transition: 'opacity 0.2s ease-in-out'
                }}
              />
            </Box>
            <IconButton
              size="small"
              className="expand-icon"
              sx={{ 
                transition: 'transform 0.2s ease-in-out',
                '&:hover': {
                  backgroundColor: 'action.hover'
                }
              }}
            >
              {showAutoCategorization ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
          
          <Collapse in={showAutoCategorization}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
              <Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={autoCategorizationEnabled}
                      onChange={handleAutoCategorizationToggle}
                      color="primary"
                    />
                  }
                  label="Enable Auto-Categorization"
                />
                <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
                  Automatically categorize transactions using AI-powered pattern recognition
                </Typography>
              </Box>
            </Box>

            {autoCategorizationEnabled && (
              <>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" gutterBottom>
                    Confidence Threshold: {Math.round(confidenceThreshold * 100)}%
                  </Typography>
                  <Slider
                    value={confidenceThreshold}
                    onChange={(e, value) => setConfidenceThreshold(value)}
                    min={0.3}
                    max={0.9}
                    step={0.1}
                    marks={[
                      { value: 0.3, label: '30%' },
                      { value: 0.6, label: '60%' },
                      { value: 0.9, label: '90%' }
                    ]}
                    sx={{ maxWidth: 300 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    Higher threshold = more accurate but fewer auto-categorizations
                  </Typography>
                </Box>

                <Box display="flex" gap={2} alignItems="center">
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={autoCategorizing ? <CircularProgress size={20} /> : <AutorenewIcon />}
                    onClick={handleAutoCategorizeBulk}
                    disabled={autoCategorizing || allTransactions.length === 0}
                  >
                    {autoCategorizing ? 'Auto-Categorizing...' : `Auto-Categorize All (${allTransactions.length})`}
                  </Button>
                  
                  <Button
                    variant="outlined"
                    color="secondary"
                    startIcon={<LightbulbIcon />}
                    onClick={handleUpdateSuggestions}
                    disabled={autoCategorizing}
                  >
                    Update Suggestions
                  </Button>
                  
                  <Button
                    variant="outlined"
                    startIcon={<AssessmentIcon />}
                    onClick={handleViewStats}
                  >
                    View Stats
                  </Button>
                </Box>

                {autoCategorizing && (
                  <Box sx={{ mt: 2 }}>
                    <LinearProgress />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Analyzing transaction patterns and applying categorization rules...
                    </Typography>
                  </Box>
                )}
              </>
            )}
          </Collapse>
        </CardContent>
      </Card>

      {/* Auto-Categorization Stats Dialog */}
      <Dialog 
        open={showAutoStats} 
        onClose={() => setShowAutoStats(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <AssessmentIcon color="primary" sx={{ mr: 1 }} />
            Auto-Categorization Statistics
          </Box>
        </DialogTitle>
        <DialogContent>
          {autoCategorizationStats ? (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                    <Typography variant="h4">{autoCategorizationStats.total_processed}</Typography>
                    <Typography variant="body2">Total Processed</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light', color: 'success.contrastText' }}>
                    <Typography variant="h4">{autoCategorizationStats.auto_categorized}</Typography>
                    <Typography variant="body2">Auto-Categorized</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.light', color: 'warning.contrastText' }}>
                    <Typography variant="h4">{autoCategorizationStats.needs_review}</Typography>
                    <Typography variant="body2">Needs Review</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'error.light', color: 'error.contrastText' }}>
                    <Typography variant="h4">{autoCategorizationStats.no_match}</Typography>
                    <Typography variant="body2">No Match</Typography>
                  </Paper>
                </Grid>
              </Grid>
              
              {autoCategorizationStats.total_processed > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" gutterBottom>Success Rate</Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={(autoCategorizationStats.auto_categorized / autoCategorizationStats.total_processed) * 100}
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {Math.round((autoCategorizationStats.auto_categorized / autoCategorizationStats.total_processed) * 100)}% of transactions auto-categorized
                  </Typography>
                </Box>
              )}
            </Box>
          ) : (
            <Typography>Loading statistics...</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAutoStats(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={showSuccess}
        autoHideDuration={6000}
        onClose={() => setShowSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setShowSuccess(false)} severity="success" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>

      {/* Category Management Section */}
      <Card sx={{ mb: 2, boxShadow: theme.shadows[1] }}>
        <CardContent sx={{ py: showCategoryManagement ? 3 : 2, px: 2 }}>
          <Box 
            display="flex" 
            alignItems="center" 
            justifyContent="space-between"
            sx={{ 
              mb: showCategoryManagement ? 3 : 0,
              cursor: 'pointer',
              '&:hover': {
                '& .expand-icon': {
                  transform: 'scale(1.1)',
                  transition: 'transform 0.2s ease-in-out'
                }
              }
            }}
            onClick={() => setShowCategoryManagement(!showCategoryManagement)}
          >
            <Box display="flex" alignItems="center">
              <CategoryIcon 
                color="primary" 
                sx={{ 
                  mr: 1.5, 
                  fontSize: '1.5rem'
                }} 
              />
              <Typography 
                variant="h6"
                sx={{ 
                  fontWeight: 600
                }}
              >
                Manage Categories
              </Typography>
              {!showCategoryManagement && (
                <Typography 
                  variant="caption" 
                  color="text.secondary" 
                  sx={{ ml: 1, fontStyle: 'italic' }}
                >
                  ({categories.length} categories)
                </Typography>
              )}
            </Box>
            <IconButton
              size="small"
              className="expand-icon"
              sx={{ 
                transition: 'transform 0.2s ease-in-out',
                '&:hover': {
                  backgroundColor: 'action.hover'
                }
              }}
            >
              {showCategoryManagement ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
          
          <Collapse in={showCategoryManagement}>
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
                  <Box sx={{ 
                    p: 2, 
                    bgcolor: theme.palette.mode === 'dark' ? 'grey.800' : 'grey.50', 
                    borderRadius: 1, 
                    mb: 2,
                    border: `1px solid ${theme.palette.divider}`
                  }}>
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

            <Grid container spacing={1}>
              {categoryChips}
            </Grid>
          </Collapse>
        </CardContent>
      </Card>

      {/* Transactions Section */}
      <Card sx={{ boxShadow: theme.shadows[1] }}>
        <CardContent sx={{ py: 2, px: 2 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
            <Box display="flex" alignItems="center">
              <AttachMoneyIcon color="primary" sx={{ mr: 1.5, fontSize: '1.5rem' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Uncategorized Transactions
                {!showAll && hasMoreTransactions && (
                  <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1, fontWeight: 400 }}>
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
                size="small"
                sx={{ 
                  textTransform: 'none',
                  fontWeight: 500
                }}
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

      {/* Bulk Categorization Confirmation Dialog */}
      <Dialog open={showBulkConfirmDialog} onClose={handleBulkCancel}>
        <DialogTitle>Bulk Categorization</DialogTitle>
        <DialogContent>
          <Typography>
            This action will categorize {matchingTransactionsCount + 1} transactions with the same description.
            Are you sure you want to proceed?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleBulkCancel}>Cancel</Button>
          <Button 
            onClick={handleBulkConfirm} 
            variant="contained"
            color="primary"
          >
            Categorize All
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
