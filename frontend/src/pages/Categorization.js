import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  Container, 
  Typography, 
  Card, 
  CardContent, 
  Button, 
  Box,
  CircularProgress,
  Alert 
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useNavigate } from 'react-router-dom';

const Categorization = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState("");
  const [editingCategory, setEditingCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get uncategorized transactions instead of "missing categories"
        const transactionsResponse = await axios.get("http://127.0.0.1:8000/api/transactions/?uncategorized=true");
        setTransactions(transactionsResponse.data);

        const categoriesResponse = await axios.get("http://127.0.0.1:8000/api/categories/");
        setCategories(categoriesResponse.data);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to load transactions and categories");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    try {
      const response = await axios.post("http://127.0.0.1:8000/api/categories/", {
        name: newCategory
      });
      setCategories([...categories, response.data]);
      setNewCategory("");
    } catch (error) {
      console.error("Error adding category:", error);
    }
  };

  const handleUpdateCategory = async (categoryId, newName) => {
    try {
      await axios.put(`http://127.0.0.1:8000/api/categories/${categoryId}/`, {
        name: newName
      });
      setCategories(categories.map(c => 
        c.id === categoryId ? { ...c, name: newName } : c
      ));
      setEditingCategory(null);
    } catch (error) {
      console.error("Error updating category:", error);
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    try {
      await axios.delete(`http://127.0.0.1:8000/api/categories/${categoryId}/`);
      setCategories(categories.filter(c => c.id !== categoryId));
    } catch (error) {
      console.error("Error deleting category:", error);
    }
  };

  const handleUpdateTransaction = async (transactionId, categoryId) => {
    try {
      await axios.put(`http://127.0.0.1:8000/api/transactions/${transactionId}/`, {
        category: categoryId
      });
      setTransactions(transactions.filter(t => t.id !== transactionId));
    } catch (error) {
      console.error("Error updating transaction:", error);
    }
  };

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

  if (transactions.length === 0) {
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
              boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
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
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Categorize Transactions</h2>
      
      {/* Category Management Section */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-3">Manage Categories</h3>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="New category name"
            className="border p-2 rounded"
          />
          <button 
            onClick={handleAddCategory}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Add Category
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {categories.map((category) => (
            <div key={category.id} className="flex items-center gap-2">
              {editingCategory === category.id ? (
                <input
                  type="text"
                  defaultValue={category.name}
                  onBlur={(e) => handleUpdateCategory(category.id, e.target.value)}
                  className="border p-2 rounded"
                />
              ) : (
                <span>{category.name}</span>
              )}
              <button 
                onClick={() => setEditingCategory(category.id)}
                className="text-blue-500"
              >
                Edit
              </button>
              <button 
                onClick={() => handleDeleteCategory(category.id)}
                className="text-red-500"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Transactions Section */}
      <div>
        <h3 className="text-xl font-semibold mb-3">Uncategorized Transactions</h3>
        <div className="grid grid-cols-1 gap-4">
          {transactions.map((transaction) => (
            <div key={transaction.id} className="flex items-center gap-4 p-4 border rounded">
              <div className="flex-grow">
                <p className="font-medium">{transaction.description}</p>
                <p className="text-green-600">${transaction.amount}</p>
              </div>
              <select
                onChange={(e) => handleUpdateTransaction(transaction.id, e.target.value)}
                className="border p-2 rounded"
              >
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Categorization;