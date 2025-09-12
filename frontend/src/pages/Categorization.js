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
  Pagination
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CategoryIcon from '@mui/icons-material/Category';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import VisibilityIcon from '@mui/icons-material/Visibility';
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
  
  const ITEMS_PER_PAGE = 10;
  const INITIAL_LOAD = 20; // Load first 20 transactions initially

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
      const response = await axios.post("http://127.0.0.1:8000/api/categories/", {
        name: newCategory
      });
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
      await axios.delete(`http://127.0.0.1:8000/api/categories/${categoryId}/`);
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
              color={transaction.amount >= 0 ? "success.main" : "error.main"}
              fontWeight="bold"
            >
              ${Math.abs(transaction.amount).toFixed(2)}
            </Typography>
          </Box>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Select Category</InputLabel>
            <Select
              value=""
              onChange={(e) => handleUpdateTransaction(transaction.id, e.target.value)}
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
          </Box>

          <Divider sx={{ mb: 2 }} />

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
    </Container>
  );
};

export default Categorization;