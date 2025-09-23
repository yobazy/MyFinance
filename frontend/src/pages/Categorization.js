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
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import SubdirectoryArrowRightIcon from '@mui/icons-material/SubdirectoryArrowRight';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import AssessmentIcon from '@mui/icons-material/Assessment';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import RuleIcon from '@mui/icons-material/Rule';
import CheckIcon from '@mui/icons-material/Check';
import { useNavigate } from 'react-router-dom';

const Categorization = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryTree, setCategoryTree] = useState([]);
  const [newCategory, setNewCategory] = useState("");
  const [newSubcategory, setNewSubcategory] = useState("");
  const [selectedParentCategory, setSelectedParentCategory] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Default categories state
  const [showDefaultCategories, setShowDefaultCategories] = useState(false);
  const [selectedDefaultCategories, setSelectedDefaultCategories] = useState(new Set());
  const [openDefaultDialog, setOpenDefaultDialog] = useState(false);
  const [creatingDefaultCategories, setCreatingDefaultCategories] = useState(false);
  
  // Auto categorization state
  const [autoCategorizationEnabled, setAutoCategorizationEnabled] = useState(false);
  const [autoCategorizing, setAutoCategorizing] = useState(false);
  const [autoCategorizationStats, setAutoCategorizationStats] = useState(null);
  const [showAutoStats, setShowAutoStats] = useState(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.6);
  const [successMessage, setSuccessMessage] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Preview state
  const [previewData, setPreviewData] = useState([]);
  const [previewStats, setPreviewStats] = useState(null);
  const [previewChanges, setPreviewChanges] = useState(new Map());
  const [applyingChanges, setApplyingChanges] = useState(false);
  const [acceptingIndividual, setAcceptingIndividual] = useState(new Set());
  const [previewPagination, setPreviewPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    pageSize: 20,
    totalCount: 0,
    hasNext: false,
    hasPrevious: false
  });
  
  // Bulk categorization state
  const [showBulkConfirmDialog, setShowBulkConfirmDialog] = useState(false);
  const [pendingTransactionId, setPendingTransactionId] = useState(null);
  const [pendingCategoryId, setPendingCategoryId] = useState(null);
  const [matchingTransactionsCount, setMatchingTransactionsCount] = useState(0);
  
  // Similar transactions state
  const [similarCounts, setSimilarCounts] = useState(new Map());
  const [showSimilarConfirmDialog, setShowSimilarConfirmDialog] = useState(false);
  const [pendingSimilarTransactionId, setPendingSimilarTransactionId] = useState(null);
  const [pendingSimilarCategoryId, setPendingSimilarCategoryId] = useState(null);
  const [pendingSimilarCount, setPendingSimilarCount] = useState(0);
  
  // Add collapsible state for sections
  const [showAutoCategorization, setShowAutoCategorization] = useState(false);
  const [showCategoryManagement, setShowCategoryManagement] = useState(true);
  const [showCategoryHierarchy, setShowCategoryHierarchy] = useState(true);
  
  const ITEMS_PER_PAGE = 10;
  const INITIAL_LOAD = 20; // Load first 20 transactions initially

  // Predefined default categories organized by type
  const defaultCategories = useMemo(() => [
    // Essential Expenses - Housing
    { name: "Rent", category: "Housing" },
    { name: "Mortgage", category: "Housing" },
    { name: "Property Tax", category: "Housing" },
    { name: "Home Insurance", category: "Housing" },
    { name: "HOA Fees", category: "Housing" },
    { name: "Maintenance", category: "Housing" },
    { name: "Repairs", category: "Housing" },
    { name: "Furniture", category: "Housing" },
    { name: "Appliances", category: "Housing" },
    { name: "Utilities", category: "Housing" },
    { name: "Electricity", category: "Housing" },
    { name: "Water", category: "Housing" },
    { name: "Gas", category: "Housing" },
    { name: "Heating", category: "Housing" },
    { name: "Cooling", category: "Housing" },
    { name: "Trash", category: "Housing" },
    { name: "Sewer", category: "Housing" },
    
    // Essential Expenses - Food
    { name: "Groceries", category: "Food" },
    { name: "Supermarket", category: "Food" },
    { name: "Farmers Market", category: "Food" },
    { name: "Bulk Stores", category: "Food" },
    { name: "Dining Out", category: "Food" },
    { name: "Restaurants", category: "Food" },
    { name: "Fast Food", category: "Food" },
    { name: "Coffee Shops", category: "Food" },
    { name: "Takeout", category: "Food" },
    { name: "Delivery", category: "Food" },
    { name: "Work Meals", category: "Food" },
    { name: "Business Meals", category: "Food" },
    
    // Essential Expenses - Transportation
    { name: "Gas & Fuel", category: "Transportation" },
    { name: "Public Transit", category: "Transportation" },
    { name: "Rideshare", category: "Transportation" },
    { name: "Taxi", category: "Transportation" },
    { name: "Parking", category: "Transportation" },
    { name: "Tolls", category: "Transportation" },
    { name: "Vehicle Maintenance", category: "Transportation" },
    { name: "Car Insurance", category: "Transportation" },
    { name: "Registration", category: "Transportation" },
    { name: "Vehicle Payment", category: "Transportation" },
    { name: "Bike Share", category: "Transportation" },
    { name: "Scooter Rental", category: "Transportation" },
    
    // Essential Expenses - Insurance
    { name: "Health Insurance", category: "Insurance" },
    { name: "Dental Insurance", category: "Insurance" },
    { name: "Vision Insurance", category: "Insurance" },
    { name: "Life Insurance", category: "Insurance" },
    { name: "Disability Insurance", category: "Insurance" },
    { name: "Auto Insurance", category: "Insurance" },
    { name: "Home Insurance", category: "Insurance" },
    { name: "Renters Insurance", category: "Insurance" },
    { name: "Pet Insurance", category: "Insurance" },
    { name: "Travel Insurance", category: "Insurance" },
    
    // Essential Expenses - Healthcare
    { name: "Doctor Visits", category: "Healthcare" },
    { name: "Dentist", category: "Healthcare" },
    { name: "Eye Care", category: "Healthcare" },
    { name: "Prescriptions", category: "Healthcare" },
    { name: "Medical Tests", category: "Healthcare" },
    { name: "Emergency Room", category: "Healthcare" },
    { name: "Urgent Care", category: "Healthcare" },
    { name: "Physical Therapy", category: "Healthcare" },
    { name: "Mental Health", category: "Healthcare" },
    { name: "Alternative Medicine", category: "Healthcare" },
    { name: "Medical Equipment", category: "Healthcare" },
    { name: "Health Supplements", category: "Healthcare" },
    
    // Essential Expenses - Utilities & Services
    { name: "Phone & Internet", category: "Utilities" },
    { name: "Mobile Phone", category: "Utilities" },
    { name: "Internet", category: "Utilities" },
    { name: "Cable TV", category: "Utilities" },
    { name: "Streaming Services", category: "Utilities" },
    { name: "Home Security", category: "Utilities" },
    { name: "Lawn Care", category: "Utilities" },
    { name: "Cleaning Services", category: "Utilities" },
    { name: "Pest Control", category: "Utilities" },
    { name: "Snow Removal", category: "Utilities" },
    
    // Lifestyle & Entertainment
    { name: "Movies", category: "Entertainment" },
    { name: "Concerts", category: "Entertainment" },
    { name: "Theater", category: "Entertainment" },
    { name: "Sports Events", category: "Entertainment" },
    { name: "Museums", category: "Entertainment" },
    { name: "Events", category: "Entertainment" },
    { name: "Nightlife", category: "Entertainment" },
    { name: "Bars", category: "Entertainment" },
    { name: "Clubs", category: "Entertainment" },
    { name: "Gaming", category: "Entertainment" },
    { name: "Hobbies", category: "Entertainment" },
    { name: "Subscriptions", category: "Entertainment" },
    { name: "Music Streaming", category: "Entertainment" },
    { name: "Video Streaming", category: "Entertainment" },
    { name: "Gaming Subscriptions", category: "Entertainment" },
    { name: "Magazines", category: "Entertainment" },
    { name: "Newspapers", category: "Entertainment" },
    
    // Lifestyle & Shopping
    { name: "Clothing", category: "Shopping" },
    { name: "Shoes", category: "Shopping" },
    { name: "Accessories", category: "Shopping" },
    { name: "Jewelry", category: "Shopping" },
    { name: "Electronics", category: "Shopping" },
    { name: "Gadgets", category: "Shopping" },
    { name: "Books", category: "Shopping" },
    { name: "Music", category: "Shopping" },
    { name: "Movies & TV", category: "Shopping" },
    { name: "Games", category: "Shopping" },
    { name: "Toys", category: "Shopping" },
    { name: "Sports Equipment", category: "Shopping" },
    { name: "Convenience", category: "Shopping" },
    { name: "Online Shopping", category: "Shopping" },
    { name: "Department Stores", category: "Shopping" },
    { name: "Specialty Stores", category: "Shopping" },
    
    // Lifestyle & Health
    { name: "Fitness & Gym", category: "Health" },
    { name: "Personal Training", category: "Health" },
    { name: "Yoga", category: "Health" },
    { name: "Pilates", category: "Health" },
    { name: "Martial Arts", category: "Health" },
    { name: "Swimming", category: "Health" },
    { name: "Running", category: "Health" },
    { name: "Cycling", category: "Health" },
    { name: "Sports", category: "Health" },
    { name: "Wellness", category: "Health" },
    { name: "Spa", category: "Health" },
    { name: "Massage", category: "Health" },
    { name: "Beauty", category: "Health" },
    { name: "Hair Care", category: "Health" },
    { name: "Skincare", category: "Health" },
    { name: "Personal Care", category: "Health" },
    
    // Financial - Savings & Investments
    { name: "Emergency Fund", category: "Savings" },
    { name: "Retirement", category: "Savings" },
    { name: "Vacation Fund", category: "Savings" },
    { name: "Home Down Payment", category: "Savings" },
    { name: "Education Fund", category: "Savings" },
    { name: "General Savings", category: "Savings" },
    { name: "Stocks", category: "Investments" },
    { name: "Bonds", category: "Investments" },
    { name: "Mutual Funds", category: "Investments" },
    { name: "ETFs", category: "Investments" },
    { name: "Real Estate", category: "Investments" },
    { name: "Crypto", category: "Investments" },
    { name: "Commodities", category: "Investments" },
    { name: "Retirement Accounts", category: "Investments" },
    { name: "529 Plans", category: "Investments" },
    { name: "Brokerage Fees", category: "Investments" },
    
    // Financial - Debt & Fees
    { name: "Credit Card Payments", category: "Debt" },
    { name: "Student Loans", category: "Debt" },
    { name: "Personal Loans", category: "Debt" },
    { name: "Auto Loans", category: "Debt" },
    { name: "Home Loans", category: "Debt" },
    { name: "Business Loans", category: "Debt" },
    { name: "Payday Loans", category: "Debt" },
    { name: "Bank Fees", category: "Fees" },
    { name: "ATM Fees", category: "Fees" },
    { name: "Overdraft Fees", category: "Fees" },
    { name: "Late Fees", category: "Fees" },
    { name: "Service Fees", category: "Fees" },
    { name: "Transaction Fees", category: "Fees" },
    { name: "Annual Fees", category: "Fees" },
    { name: "Foreign Transaction Fees", category: "Fees" },
    
    // Income
    { name: "Salary", category: "Income" },
    { name: "Wages", category: "Income" },
    { name: "Bonuses", category: "Income" },
    { name: "Commissions", category: "Income" },
    { name: "Freelance", category: "Income" },
    { name: "Contract Work", category: "Income" },
    { name: "Side Hustle", category: "Income" },
    { name: "Business Income", category: "Income" },
    { name: "Investment Income", category: "Income" },
    { name: "Dividends", category: "Income" },
    { name: "Interest", category: "Income" },
    { name: "Capital Gains", category: "Income" },
    { name: "Rental Income", category: "Income" },
    { name: "Refunds", category: "Income" },
    { name: "Tax Refunds", category: "Income" },
    { name: "Rebates", category: "Income" },
    { name: "Cashback", category: "Income" },
    { name: "Gifts Received", category: "Income" },
    { name: "Inheritance", category: "Income" },
    { name: "Lottery Winnings", category: "Income" },
    
    // Vices & Habits
    { name: "Alcohol", category: "Vices" },
    { name: "Tobacco", category: "Vices" },
    { name: "Cannabis", category: "Vices" },
    { name: "Vaping", category: "Vices" },
    { name: "Gambling", category: "Vices" },
    { name: "Lottery Tickets", category: "Vices" },
    { name: "Casino", category: "Vices" },
    { name: "Sports Betting", category: "Vices" },
    { name: "Online Gaming", category: "Vices" },
    { name: "Microtransactions", category: "Vices" },
    
    // Education & Learning
    { name: "Tuition", category: "Education" },
    { name: "Books & Learning", category: "Education" },
    { name: "Online Courses", category: "Education" },
    { name: "Certifications", category: "Education" },
    { name: "Workshops", category: "Education" },
    { name: "Seminars", category: "Education" },
    { name: "Conferences", category: "Education" },
    { name: "Training", category: "Education" },
    { name: "Software Licenses", category: "Education" },
    { name: "Educational Materials", category: "Education" },
    { name: "School Supplies", category: "Education" },
    { name: "Student Loans", category: "Education" },
    
    // Travel & Transportation
    { name: "Flights", category: "Travel" },
    { name: "Hotels", category: "Travel" },
    { name: "Airbnb", category: "Travel" },
    { name: "Car Rental", category: "Travel" },
    { name: "Train", category: "Travel" },
    { name: "Bus", category: "Travel" },
    { name: "Cruise", category: "Travel" },
    { name: "Vacation Rentals", category: "Travel" },
    { name: "Travel Insurance", category: "Travel" },
    { name: "Visa & Passport", category: "Travel" },
    { name: "Travel Gear", category: "Travel" },
    { name: "Souvenirs", category: "Travel" },
    { name: "Dining While Traveling", category: "Travel" },
    { name: "Activities", category: "Travel" },
    { name: "Tours", category: "Travel" },
    { name: "Admission Fees", category: "Travel" },
    
    // Gifts & Donations
    { name: "Birthday Gifts", category: "Gifts" },
    { name: "Holiday Gifts", category: "Gifts" },
    { name: "Wedding Gifts", category: "Gifts" },
    { name: "Baby Gifts", category: "Gifts" },
    { name: "Graduation Gifts", category: "Gifts" },
    { name: "Gift Cards", category: "Gifts" },
    { name: "Flowers", category: "Gifts" },
    { name: "Charity", category: "Charity" },
    { name: "Religious Donations", category: "Charity" },
    { name: "Political Donations", category: "Charity" },
    { name: "Crowdfunding", category: "Charity" },
    { name: "Volunteer Expenses", category: "Charity" },
    { name: "Fundraising", category: "Charity" },
    
    // Pets & Animals
    { name: "Pet Food", category: "Pets" },
    { name: "Pet Care", category: "Pets" },
    { name: "Veterinary", category: "Pets" },
    { name: "Pet Supplies", category: "Pets" },
    { name: "Pet Grooming", category: "Pets" },
    { name: "Pet Training", category: "Pets" },
    { name: "Pet Boarding", category: "Pets" },
    { name: "Pet Insurance", category: "Pets" },
    { name: "Pet Toys", category: "Pets" },
    { name: "Pet Medications", category: "Pets" },
    
    // Home & Garden
    { name: "Home Improvement", category: "Home" },
    { name: "Furniture", category: "Home" },
    { name: "Decor", category: "Home" },
    { name: "Kitchen Items", category: "Home" },
    { name: "Bedding", category: "Home" },
    { name: "Tools", category: "Home" },
    { name: "Garden Supplies", category: "Home" },
    { name: "Plants", category: "Home" },
    { name: "Outdoor Furniture", category: "Home" },
    { name: "Cleaning Supplies", category: "Home" },
    { name: "Storage", category: "Home" },
    { name: "Lighting", category: "Home" },
    
    // Technology & Digital
    { name: "Software", category: "Technology" },
    { name: "Hardware", category: "Technology" },
    { name: "Computer Accessories", category: "Technology" },
    { name: "Mobile Accessories", category: "Technology" },
    { name: "Internet Services", category: "Technology" },
    { name: "Cloud Storage", category: "Technology" },
    { name: "Domain Names", category: "Technology" },
    { name: "Web Hosting", category: "Technology" },
    { name: "Digital Subscriptions", category: "Technology" },
    { name: "App Purchases", category: "Technology" },
    { name: "Gaming", category: "Technology" },
    { name: "Tech Support", category: "Technology" },
    
    // Business & Professional
    { name: "Office Supplies", category: "Business" },
    { name: "Professional Services", category: "Business" },
    { name: "Legal Fees", category: "Business" },
    { name: "Accounting", category: "Business" },
    { name: "Marketing", category: "Business" },
    { name: "Advertising", category: "Business" },
    { name: "Business Travel", category: "Business" },
    { name: "Meals & Entertainment", category: "Business" },
    { name: "Equipment", category: "Business" },
    { name: "Software Licenses", category: "Business" },
    { name: "Memberships", category: "Business" },
    { name: "Conferences", category: "Business" },
    { name: "Training", category: "Business" },
    { name: "Consulting", category: "Business" },
    { name: "Business Insurance", category: "Business" },
    
    // Miscellaneous & Other
    { name: "Miscellaneous", category: "Other" },
    { name: "ATM Withdrawals", category: "Other" },
    { name: "Cash", category: "Other" },
    { name: "Transfers", category: "Other" },
    { name: "Adjustments", category: "Other" },
    { name: "Rounding", category: "Other" },
    { name: "Unknown", category: "Other" },
    { name: "Reimbursements", category: "Other" },
    { name: "Refunds", category: "Other" },
    { name: "Returns", category: "Other" },
    { name: "Exchanges", category: "Other" },
    { name: "Deposits", category: "Other" },
    { name: "Withdrawals", category: "Other" }
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

  // Load initial batch of transactions and trigger background loading
  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch categories, category tree, and transactions in parallel
      const [categoriesResponse, categoryTreeResponse, transactionsResponse] = await Promise.all([
        axios.get("http://127.0.0.1:8000/api/categories/"),
        axios.get("http://127.0.0.1:8000/api/categories/tree/"),
        axios.get("http://127.0.0.1:8000/api/transactions/?uncategorized=true")
      ]);
      
      setCategories(categoriesResponse.data);
      setCategoryTree(categoryTreeResponse.data);
      
      const allFetchedTransactions = transactionsResponse.data;
      
      // Store all transactions and set up pagination
      setAllTransactions(allFetchedTransactions);
      setTotalPages(Math.ceil(allFetchedTransactions.length / ITEMS_PER_PAGE));
      
      // Show initial batch for fast rendering
      const initialBatch = allFetchedTransactions.slice(0, INITIAL_LOAD);
      setTransactions(initialBatch);
      
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
        
        // Show success message with rule breakdown
        const userRulesApplied = stats.user_rules_applied || 0;
        const autoCategorized = stats.auto_categorized || 0;
        const totalCategorized = userRulesApplied + autoCategorized;
        
        let message = `Categorization complete! Categorized ${totalCategorized} out of ${stats.total_processed} transactions.`;
        if (userRulesApplied > 0) {
          message += ` (${userRulesApplied} by user rules, ${autoCategorized} by auto-categorization)`;
        }
        
        setSuccessMessage(message);
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


  // Preview functionality
  const handleGeneratePreview = useCallback(async (page = 1) => {
    try {
      setAutoCategorizing(true);
      setSuccessMessage("");
      
      // Ensure we're sending clean, serializable data
      const requestData = {
        confidence_threshold: Number(confidenceThreshold),
        page: Number(page),
        page_size: 20
      };
      
      console.log('Sending preview request:', requestData);
      console.log('Request data type:', typeof requestData);
      console.log('Request data JSON:', JSON.stringify(requestData));
      
      const response = await axios.post("http://127.0.0.1:8000/api/auto-categorization/preview/", requestData);
      
      if (response.data.success) {
        setPreviewData(response.data.preview_data);
        setPreviewStats(response.data.page_stats);
        setPreviewPagination(response.data.pagination);
        setPreviewChanges(new Map());
      }
    } catch (error) {
      console.error("Error generating preview:", error);
      setError("Failed to generate preview");
    } finally {
      setAutoCategorizing(false);
    }
  }, [confidenceThreshold]);

  const handlePreviewPageChange = useCallback((event, page) => {
    // Extract just the page number to avoid circular references
    const pageNumber = Number(page);
    handleGeneratePreview(pageNumber);
  }, [handleGeneratePreview]);

  const handlePreviewChange = useCallback((transactionId, action, categoryId = null) => {
    setPreviewChanges(prev => {
      const newChanges = new Map(prev);
      if (action === 'remove') {
        newChanges.set(transactionId, { action: 'remove' });
      } else if (action === 'categorize' && categoryId) {
        newChanges.set(transactionId, { action: 'categorize', categoryId });
      } else if (action === 'revert') {
        newChanges.delete(transactionId);
      }
      return newChanges;
    });
  }, []);

  const handleAcceptIndividual = useCallback(async (transactionId) => {
    try {
      setAcceptingIndividual(prev => new Set(prev).add(transactionId));
      
      const transaction = previewData.find(t => t.transaction_id === transactionId);
      if (!transaction) {
        setError("Transaction not found");
        return;
      }

      if (!transaction.suggested_category) {
        setError("No suggested category for this transaction. Please select a category manually.");
        return;
      }

      const change = {
        transaction_id: Number(transactionId),
        category_id: Number(transaction.suggested_category.id),
        action: 'categorize',
        confidence: Number(transaction.confidence || 0)
      };

      const response = await axios.post("http://127.0.0.1:8000/api/auto-categorization/apply-preview/", {
        changes: [change]
      });

      if (response.data.success) {
        setSuccessMessage(`Successfully categorized "${transaction.description}"!`);
        setShowSuccess(true);
        
        // Remove the accepted transaction from preview data
        setPreviewData(prev => prev.filter(t => t.transaction_id !== transactionId));
        
        // Update preview stats
        setPreviewStats(prev => ({
          ...prev,
          total_processed: Math.max(0, prev.total_processed - 1),
          [transaction.confidence_level === 'high' ? 'high_confidence' : 
           transaction.confidence_level === 'medium' ? 'medium_confidence' : 'low_confidence']: 
          Math.max(0, prev[transaction.confidence_level === 'high' ? 'high_confidence' : 
              transaction.confidence_level === 'medium' ? 'medium_confidence' : 'low_confidence'] - 1)
        }));
      } else {
        setError(response.data.error || "Failed to accept change");
      }
    } catch (error) {
      console.error("Error accepting individual change:", error);
      setError("Failed to accept change");
    } finally {
      setAcceptingIndividual(prev => {
        const newSet = new Set(prev);
        newSet.delete(transactionId);
        return newSet;
      });
    }
  }, [previewData]);

  const getSimilarCount = useCallback(async (transactionId, description) => {
    try {
      const response = await axios.post("http://127.0.0.1:8000/api/auto-categorization/similar-count/", {
        transaction_id: Number(transactionId),
        description: description
      });

      if (response.data.success) {
        setSimilarCounts(prev => new Map(prev).set(transactionId, response.data.similar_count));
        return response.data.similar_count;
      }
      return 0;
    } catch (error) {
      console.error("Error getting similar count:", error);
      return 0;
    }
  }, []);

  const handleApplyToSimilarClick = useCallback(async (transactionId, categoryId) => {
    const transaction = previewData.find(t => t.transaction_id === transactionId);
    if (!transaction) {
      setError("Transaction not found");
      return;
    }

    // Get the count of similar transactions
    const count = await getSimilarCount(transactionId, transaction.description);
    
    if (count <= 1) {
      setError("No other similar transactions found to apply this category to.");
      return;
    }

    // Show confirmation dialog
    setPendingSimilarTransactionId(transactionId);
    setPendingSimilarCategoryId(categoryId);
    setPendingSimilarCount(count);
    setShowSimilarConfirmDialog(true);
  }, [previewData, getSimilarCount]);

  const handleApplyToSimilar = useCallback(async () => {
    try {
      setAcceptingIndividual(prev => new Set(prev).add(pendingSimilarTransactionId));
      
      const transaction = previewData.find(t => t.transaction_id === pendingSimilarTransactionId);
      if (!transaction) {
        setError("Transaction not found");
        return;
      }

      const response = await axios.post("http://127.0.0.1:8000/api/auto-categorization/apply-to-similar/", {
        transaction_id: Number(pendingSimilarTransactionId),
        category_id: Number(pendingSimilarCategoryId),
        description: transaction.description
      });

      if (response.data.success) {
        setSuccessMessage(
          `Successfully applied category to ${response.data.updated_count} similar transactions!`
        );
        setShowSuccess(true);
        
        // Refresh the preview data to reflect the changes
        handleGeneratePreview(previewPagination.currentPage);
      } else {
        setError(response.data.error || "Failed to apply to similar transactions");
      }
    } catch (error) {
      console.error("Error applying to similar transactions:", error);
      setError("Failed to apply to similar transactions");
    } finally {
      setAcceptingIndividual(prev => {
        const newSet = new Set(prev);
        newSet.delete(pendingSimilarTransactionId);
        return newSet;
      });
      setShowSimilarConfirmDialog(false);
      setPendingSimilarTransactionId(null);
      setPendingSimilarCategoryId(null);
      setPendingSimilarCount(0);
    }
  }, [previewData, previewPagination.currentPage, handleGeneratePreview, pendingSimilarTransactionId, pendingSimilarCategoryId]);

  const handleApplyPreview = useCallback(async () => {
    try {
      setApplyingChanges(true);
      
      const changes = Array.from(previewChanges.entries()).map(([transactionId, change]) => {
        const transaction = previewData.find(t => t.transaction_id === transactionId);
        return {
          transaction_id: Number(transactionId),
          category_id: Number(change.categoryId || transaction?.suggested_category?.id),
          action: String(change.action),
          confidence: Number(transaction?.confidence || 0)
        };
      });
      
      const requestData = {
        changes: changes
      };
      
      const response = await axios.post("http://127.0.0.1:8000/api/auto-categorization/apply-preview/", requestData);
      
      if (response.data.success) {
        setSuccessMessage(
          `Successfully applied ${response.data.applied_count} changes!`
        );
        setShowSuccess(true);
        
        // Clear preview data and refresh transactions
        setPreviewData([]);
        setPreviewStats(null);
        setPreviewChanges(new Map());
        setPreviewPagination({
          currentPage: 1,
          totalPages: 1,
          pageSize: 20,
          totalCount: 0,
          hasNext: false,
          hasPrevious: false
        });
        await fetchInitialData();
      }
    } catch (error) {
      console.error("Error applying changes:", error);
      setError("Failed to apply changes");
    } finally {
      setApplyingChanges(false);
    }
  }, [previewChanges, previewData, fetchInitialData]);

  const handleCancelPreview = useCallback(() => {
    setPreviewData([]);
    setPreviewStats(null);
    setPreviewChanges(new Map());
    setPreviewPagination({
      currentPage: 1,
      totalPages: 1,
      pageSize: 20,
      totalCount: 0,
      hasNext: false,
      hasPrevious: false
    });
  }, []);


  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Load similar counts when preview data changes
  useEffect(() => {
    if (autoCategorizationEnabled && previewData.length > 0) {
      previewData.forEach(transaction => {
        getSimilarCount(transaction.transaction_id, transaction.description);
      });
    }
  }, [autoCategorizationEnabled, previewData, getSimilarCount]);

  // Handle pagination
  const handlePageChange = useCallback((event, page) => {
    setCurrentPage(page);
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    setTransactions(allTransactions.slice(startIndex, endIndex));
  }, [allTransactions]);


  // Memoize handlers to prevent unnecessary re-renders
  const handleAddCategory = useCallback(async () => {
    if (!newCategory.trim()) return;
    const categoryName = newCategory; // Store the name before clearing
    try {
      const response = await axios.post("http://127.0.0.1:8000/api/categories/create/", {
        name: categoryName
      });
      setCategories(prev => [...prev, response.data]);
      setNewCategory("");
      
      // Show success notification
      setSuccessMessage(`Category "${categoryName}" created successfully!`);
      setShowSuccess(true);
      
      // Immediately refresh category tree to show in hierarchy
      const treeResponse = await axios.get("http://127.0.0.1:8000/api/categories/tree/");
      setCategoryTree(treeResponse.data);
    } catch (error) {
      console.error("Error adding category:", error);
    }
  }, [newCategory]);

  const handleAddSubcategory = useCallback(async () => {
    if (!newSubcategory.trim() || !selectedParentCategory) return;
    try {
      console.log('Creating subcategory:', newSubcategory, 'under parent:', selectedParentCategory);
      const response = await axios.post(`http://127.0.0.1:8000/api/categories/${selectedParentCategory}/subcategories/`, {
        name: newSubcategory
      });
      console.log('Subcategory created successfully:', response.data);
      setCategories(prev => [...prev, response.data]);
      setNewSubcategory("");
      setSelectedParentCategory(null);
      
      // Show success notification
      setSuccessMessage(`Subcategory "${newSubcategory}" created successfully!`);
      setShowSuccess(true);
      
      // Immediately refresh category tree to show in hierarchy
      const treeResponse = await axios.get("http://127.0.0.1:8000/api/categories/tree/");
      setCategoryTree(treeResponse.data);
    } catch (error) {
      console.error("Error adding subcategory:", error);
    }
  }, [newSubcategory, selectedParentCategory]);

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
      
      // Immediately refresh category tree to show updated name in hierarchy
      const treeResponse = await axios.get("http://127.0.0.1:8000/api/categories/tree/");
      setCategoryTree(treeResponse.data);
    } catch (error) {
      console.error("Error updating category:", error);
    }
  }, []);

  const handleDeleteCategory = useCallback(async (categoryId) => {
    try {
      await axios.delete(`http://127.0.0.1:8000/api/categories/${categoryId}/delete/`);
      setCategories(prev => prev.filter(c => c.id !== categoryId));
      
      // Refresh category tree
      const treeResponse = await axios.get("http://127.0.0.1:8000/api/categories/tree/");
      setCategoryTree(treeResponse.data);
    } catch (error) {
      console.error("Error deleting category:", error);
    }
  }, []);

  const toggleCategoryExpansion = useCallback((categoryId) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  }, []);

  // Functions to expand/collapse all main categories
  const expandAllCategories = useCallback(() => {
    const mainCategoryIds = categoryTree.map(category => category.id);
    setExpandedCategories(new Set(mainCategoryIds));
  }, [categoryTree]);

  const collapseAllCategories = useCallback(() => {
    setExpandedCategories(new Set());
  }, []);


  // Function to perform the actual update
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
  }, [transactions, performTransactionUpdate]);

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

  const renderCategoryTree = useCallback((categories, level = 0) => {
    return categories.map((category) => {
      // Define colors based on hierarchy level
      const isRootCategory = level === 0;
      const rootColor = category.color || '#2563eb'; // Use theme primary color for root
      const subcategoryColor = category.color || '#64748b'; // Use theme secondary text color for subcategories
      
      // Create a lighter version of the subcategory color
      const subcategoryBgColor = isRootCategory 
        ? rootColor 
        : `${subcategoryColor}20`; // 20% opacity for subcategory background
      
      const textColor = isRootCategory ? 'white' : subcategoryColor;
      const borderColor = isRootCategory ? rootColor : subcategoryColor;
      
      return (
        <Box key={category.id} sx={{ ml: level * 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            {category.subcategories && category.subcategories.length > 0 && (
              <IconButton
                size="small"
                onClick={() => toggleCategoryExpansion(category.id)}
                sx={{ mr: 1 }}
              >
                {expandedCategories.has(category.id) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            )}
            
            <Chip
              label={`${category.name} (${category.transaction_count || 0})`}
              onDelete={() => handleDeleteCategory(category.id)}
              deleteIcon={<DeleteIcon />}
              onClick={() => startEditingCategory(category)}
              clickable
              color="primary"
              variant={isRootCategory ? "filled" : "outlined"}
              sx={{ 
                mr: 1, 
                mb: 1,
                backgroundColor: subcategoryBgColor,
                color: textColor,
                borderColor: borderColor,
                fontWeight: isRootCategory ? 600 : 400,
                '&:hover': {
                  backgroundColor: isRootCategory ? rootColor : `${subcategoryColor}30`,
                }
              }}
            />
            
            <IconButton
              size="small"
              onClick={() => setSelectedParentCategory(category.id)}
              title="Add subcategory"
              sx={{ ml: 1 }}
            >
              <AddCircleOutlineIcon />
            </IconButton>
          </Box>
          
          {category.subcategories && category.subcategories.length > 0 && expandedCategories.has(category.id) && (
            <Box sx={{ ml: 2 }}>
              {renderCategoryTree(category.subcategories, level + 1)}
            </Box>
          )}
        </Box>
      );
    });
  }, [expandedCategories, handleDeleteCategory, startEditingCategory, toggleCategoryExpansion]);

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
      
      // First, collect all unique parent categories that need to be created
      const parentCategories = new Set();
      const categoryMappings = new Map(); // Maps subcategory name to parent category name
      
      selectedCategoriesArray.forEach(categoryName => {
        const defaultCategory = defaultCategories.find(dc => dc.name === categoryName);
        if (defaultCategory) {
          parentCategories.add(defaultCategory.category);
          categoryMappings.set(categoryName, defaultCategory.category);
        }
      });
      
      console.log('Parent categories to create:', Array.from(parentCategories));
      console.log('Category mappings:', Object.fromEntries(categoryMappings));
      
      // Create parent categories first
      const parentCategoryMap = new Map(); // Maps parent name to parent ID
      for (const parentName of parentCategories) {
        try {
          // Check if parent category already exists
          const existingParent = categories.find(cat => cat.name === parentName && !cat.parent);
          if (existingParent) {
            console.log(`Parent category "${parentName}" already exists with ID:`, existingParent.id);
            parentCategoryMap.set(parentName, existingParent.id);
            continue;
          }
          
          console.log(`Creating parent category: ${parentName}`);
          const response = await axios.post("http://127.0.0.1:8000/api/categories/create/", {
            name: parentName
          });
          
          console.log('Parent category created successfully:', response.data);
          parentCategoryMap.set(parentName, response.data.id);
          
          // Add parent to categories state
          setCategories(prev => {
            const exists = prev.some(cat => cat.id === response.data.id || cat.name === response.data.name);
            if (exists) return prev;
            return [...prev, response.data];
          });
          
        } catch (error) {
          console.error(`Error creating parent category "${parentName}":`, error);
        }
      }
      
      // Now create subcategories with proper parent relationships
      for (const categoryName of selectedCategoriesArray) {
        try {
          const parentName = categoryMappings.get(categoryName);
          const parentId = parentCategoryMap.get(parentName);
          
          if (!parentId) {
            console.error(`No parent ID found for category "${categoryName}" with parent "${parentName}"`);
            continue;
          }
          
          // Check if subcategory already exists under this parent
          const existingSubcategory = categories.find(cat => 
            cat.name === categoryName && cat.parent === parentId
          );
          
          if (existingSubcategory) {
            console.log(`Subcategory "${categoryName}" already exists under parent "${parentName}"`);
            continue;
          }
          
          console.log(`Creating subcategory: ${categoryName} under parent: ${parentName} (ID: ${parentId})`);
          const response = await axios.post(`http://127.0.0.1:8000/api/categories/${parentId}/subcategories/`, {
            name: categoryName
          });
          
          console.log('Subcategory created successfully:', response.data);
          
          // Add subcategory to categories state
          setCategories(prev => {
            const exists = prev.some(cat => cat.id === response.data.id || (cat.name === response.data.name && cat.parent === parentId));
            if (exists) return prev;
            return [...prev, response.data];
          });
          
        } catch (error) {
          console.error(`Error creating subcategory "${categoryName}":`, error);
          // Continue creating other categories even if one fails
        }
      }
      
      // Refresh category tree to show the new hierarchy
      try {
        const treeResponse = await axios.get("http://127.0.0.1:8000/api/categories/tree/");
        setCategoryTree(treeResponse.data);
        console.log('Category tree refreshed after creating all categories');
      } catch (treeError) {
        console.error('Error refreshing category tree:', treeError);
      }
      
      // Clear selections and close dialog
      setSelectedDefaultCategories(new Set());
      setOpenDefaultDialog(false);
      
      setSuccessMessage(`Successfully created ${selectedCategoriesArray.length} categories with proper hierarchy!`);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      
    } catch (error) {
      console.error('Error in handleCreateSelectedCategories:', error);
      setError('Failed to create some categories. Please try again.');
    } finally {
      setCreatingDefaultCategories(false);
    }
  }, [selectedDefaultCategories, categories, defaultCategories]);

  // Memoize the category chips to prevent unnecessary re-renders
  const categoryChips = useMemo(() => {
    return renderCategoryTree(categoryTree);
  }, [categoryTree, renderCategoryTree]);

  // Memoize transaction items to prevent unnecessary re-renders
  const transactionItems = useMemo(() => {
    console.log('=== RENDERING TRANSACTION ITEMS ===');
    console.log('Current categories state:', categories);
    console.log('Categories count:', categories.length);
    console.log('Categories for dropdown:', categories.map(cat => ({ id: cat.id, name: cat.name })));
    
    // If auto-categorization is enabled and we have preview data, show preview interface
    if (autoCategorizationEnabled && previewData.length > 0) {
      return previewData.map((transaction) => {
        const change = previewChanges.get(transaction.transaction_id);
        const isModified = change !== undefined;
        const isRemoved = change?.action === 'remove';
        const isCategorized = change?.action === 'categorize';
        
        return (
          <Grid item xs={12} key={transaction.transaction_id}>
            <Paper 
              elevation={isModified ? 3 : 1} 
              sx={{ 
                p: 2, 
                display: 'flex', 
                alignItems: 'center', 
                gap: 2,
                transition: 'all 0.2s',
                border: isModified ? '2px solid' : '1px solid',
                borderColor: isRemoved ? 'error.main' : isCategorized ? 'success.main' : 'divider',
                bgcolor: isRemoved ? 'error.light' : isCategorized ? 'success.light' : 'background.paper',
                opacity: isRemoved ? 0.6 : 1
              }}
            >
              <Box sx={{ flexGrow: 1 }}>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Typography variant="body1" fontWeight="medium">
                    {transaction.description}
                  </Typography>
                  {transaction.suggested_category && (
                    <Chip 
                      label={`${Math.round(transaction.confidence * 100)}%`}
                      size="small"
                      color={transaction.confidence_level === 'high' ? 'success' : transaction.confidence_level === 'medium' ? 'warning' : 'error'}
                      variant="outlined"
                    />
                  )}
                  {transaction.reason === 'User rule' && (
                    <Chip 
                      label="User Rule"
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  )}
                  {transaction.reason === 'No suggestion' && (
                    <Chip 
                      label="No Suggestion"
                      size="small"
                      color="default"
                      variant="outlined"
                    />
                  )}
                  {isModified && (
                    <Chip 
                      label={isRemoved ? 'Removed' : 'Modified'}
                      size="small"
                      color={isRemoved ? 'error' : 'success'}
                      variant="filled"
                    />
                  )}
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {transaction.account_name} • {new Date(transaction.date).toLocaleDateString()}
                </Typography>
                <Typography 
                  variant="body2" 
                  color={transaction.amount >= 0 ? "error.main" : "success.main"}
                  fontWeight="bold"
                >
                  ${Math.abs(transaction.amount).toFixed(2)}
                </Typography>
              </Box>
              
              <Box display="flex" alignItems="center" gap={2}>
                {!isRemoved && transaction.suggested_category && (
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Suggested Category:
                    </Typography>
                    <Chip 
                      label={isCategorized ? 
                        categories.find(c => c.id === change.categoryId)?.name || 'Unknown' :
                        transaction.suggested_category.name
                      }
                      color="primary"
                      variant="outlined"
                    />
                  </Box>
                )}
                {!isRemoved && !transaction.suggested_category && (
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      No Category Suggestion
                    </Typography>
                    <Chip 
                      label="Manual Assignment Required"
                      color="default"
                      variant="outlined"
                    />
                  </Box>
                )}
                
                <Box display="flex" gap={1}>
                  {!isRemoved && (
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                      <InputLabel>Change to</InputLabel>
                      <Select
                        value={isCategorized ? change.categoryId : ''}
                        onChange={(e) => handlePreviewChange(transaction.transaction_id, 'categorize', e.target.value)}
                        label="Change to"
                      >
                        {categories.map((category) => (
                          <MenuItem key={category.id} value={category.id}>
                            {category.full_path || category.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                  
                  {!isRemoved && !isModified && transaction.suggested_category && (
                    <>
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        onClick={() => handleAcceptIndividual(transaction.transaction_id)}
                        startIcon={<CheckIcon />}
                        disabled={acceptingIndividual.has(transaction.transaction_id)}
                      >
                        {acceptingIndividual.has(transaction.transaction_id) ? 'Accepting...' : 'Accept'}
                      </Button>
                      <Button
                        variant="outlined"
                        color="primary"
                        size="small"
                        onClick={() => handleApplyToSimilarClick(transaction.transaction_id, transaction.suggested_category.id)}
                        disabled={acceptingIndividual.has(transaction.transaction_id)}
                        sx={{ ml: 1 }}
                      >
                        Apply to All Similar
                        {similarCounts.has(transaction.transaction_id) && similarCounts.get(transaction.transaction_id) > 1 && (
                          <Chip 
                            label={`${similarCounts.get(transaction.transaction_id)}`}
                            size="small"
                            sx={{ ml: 1, height: 20, fontSize: '0.75rem' }}
                          />
                        )}
                      </Button>
                    </>
                  )}
                  
                  <Button
                    variant="outlined"
                    color={isRemoved ? 'success' : 'error'}
                    size="small"
                    onClick={() => handlePreviewChange(
                      transaction.transaction_id, 
                      isRemoved ? 'revert' : 'remove'
                    )}
                  >
                    {isRemoved ? 'Restore' : 'Remove'}
                  </Button>
                  
                  {isModified && (
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handlePreviewChange(transaction.transaction_id, 'revert')}
                    >
                      Revert
                    </Button>
                  )}
                </Box>
              </Box>
            </Paper>
          </Grid>
        );
      });
    }
    
    // Default transaction display
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
                  {category.full_path || category.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Paper>
      </Grid>
    ));
  }, [transactions, categories, handleUpdateTransaction, theme.shadows, autoCategorizationEnabled, previewData, previewChanges, similarCounts, acceptingIndividual, handlePreviewChange, handleAcceptIndividual, handleApplyToSimilarClick]);

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
        
        {/* No Transactions Message */}
        <Card 
          sx={{ 
            minHeight: '40vh', 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center', 
            alignItems: 'center',
            backgroundColor: theme.palette.background.paper,
            cursor: 'pointer',
            transition: 'transform 0.2s, box-shadow 0.2s',
            mb: 2,
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
              {/* Root Category Creation */}
              <Box display="flex" gap={2} mb={3}>
                <TextField
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="New root category name"
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
                  Add Root Category
                </Button>
              </Box>

              {/* Subcategory Creation */}
              <Box display="flex" gap={2} mb={3} alignItems="center">
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>Parent Category</InputLabel>
                  <Select
                    value={selectedParentCategory || ''}
                    onChange={(e) => setSelectedParentCategory(e.target.value)}
                    label="Parent Category"
                  >
                    {categories.filter(cat => !cat.parent).map((category) => (
                      <MenuItem key={category.id} value={category.id}>
                        {category.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  value={newSubcategory}
                  onChange={(e) => setNewSubcategory(e.target.value)}
                  placeholder="New subcategory name"
                  variant="outlined"
                  size="small"
                  sx={{ flexGrow: 1 }}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddSubcategory()}
                />
                <Button 
                  variant="contained" 
                  color="secondary"
                  startIcon={<SubdirectoryArrowRightIcon />}
                  onClick={handleAddSubcategory}
                  disabled={!newSubcategory.trim() || !selectedParentCategory}
                >
                  Add Subcategory
                </Button>
              </Box>
              
              {availableDefaultCategories.length > 0 && (
                <Button 
                  variant="outlined" 
                  color="secondary"
                  startIcon={<StarIcon />}
                  onClick={() => setOpenDefaultDialog(true)}
                  sx={{ mb: 2 }}
                >
                  Add Defaults
                </Button>
              )}

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

              <Box>
                <Box 
                  display="flex" 
                  alignItems="center" 
                  justifyContent="space-between"
                  sx={{ 
                    mb: showCategoryHierarchy ? 2 : 0,
                    cursor: 'pointer',
                    '&:hover': {
                      '& .expand-icon': {
                        transform: 'scale(1.1)',
                        transition: 'transform 0.2s ease-in-out'
                      }
                    }
                  }}
                  onClick={() => setShowCategoryHierarchy(!showCategoryHierarchy)}
                >
                  <Typography variant="h6">
                    Category Hierarchy
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    {showCategoryHierarchy && (
                      <>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={(e) => {
                            e.stopPropagation();
                            expandAllCategories();
                          }}
                          sx={{ minWidth: 'auto', px: 1, py: 0.5, fontSize: '0.75rem' }}
                        >
                          Expand All
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={(e) => {
                            e.stopPropagation();
                            collapseAllCategories();
                          }}
                          sx={{ minWidth: 'auto', px: 1, py: 0.5, fontSize: '0.75rem' }}
                        >
                          Collapse All
                        </Button>
                      </>
                    )}
                    <IconButton
                      size="small"
                      className="expand-icon"
                      sx={{
                        ml: 1,
                        '&:hover': {
                          backgroundColor: 'action.hover'
                        }
                      }}
                    >
                      {showCategoryHierarchy ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </Box>
                </Box>
                
                <Collapse in={showCategoryHierarchy}>
                  {categoryChips}
                </Collapse>
              </Box>
            </Collapse>
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

                <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
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
                    variant="contained"
                    color="secondary"
                    startIcon={autoCategorizing ? <CircularProgress size={20} /> : <VisibilityIcon />}
                    onClick={handleGeneratePreview}
                    disabled={autoCategorizing || allTransactions.length === 0}
                  >
                    {autoCategorizing ? 'Generating Preview...' : 'Preview Changes'}
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
                  
                  <Button
                    variant="outlined"
                    color="secondary"
                    startIcon={<RuleIcon />}
                    onClick={() => navigate('/rules')}
                  >
                    Manage Rules
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
                <Grid item xs={12} sm={4}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                    <Typography variant="h4">{autoCategorizationStats.total_processed}</Typography>
                    <Typography variant="body2">Total Processed</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light', color: 'success.contrastText' }}>
                    <Typography variant="h4">{autoCategorizationStats.auto_categorized || 0}</Typography>
                    <Typography variant="body2">Auto-Categorized</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'info.light', color: 'info.contrastText' }}>
                    <Typography variant="h4">{autoCategorizationStats.user_rules_applied || 0}</Typography>
                    <Typography variant="body2">User Rules Applied</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.light', color: 'warning.contrastText' }}>
                    <Typography variant="h4">{autoCategorizationStats.needs_review}</Typography>
                    <Typography variant="body2">Needs Review</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6}>
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
                    value={((autoCategorizationStats.auto_categorized || 0) + (autoCategorizationStats.user_rules_applied || 0)) / autoCategorizationStats.total_processed * 100}
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {Math.round(((autoCategorizationStats.auto_categorized || 0) + (autoCategorizationStats.user_rules_applied || 0)) / autoCategorizationStats.total_processed * 100)}% of transactions categorized
                    {autoCategorizationStats.user_rules_applied > 0 && (
                      <span> ({autoCategorizationStats.user_rules_applied} by user rules, {autoCategorizationStats.auto_categorized || 0} by auto-categorization)</span>
                    )}
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
            {/* Root Category Creation */}
            <Box display="flex" gap={2} mb={3}>
              <TextField
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="New root category name"
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
                Add Root Category
              </Button>
            </Box>

            {/* Subcategory Creation */}
            <Box display="flex" gap={2} mb={3} alignItems="center">
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Parent Category</InputLabel>
                <Select
                  value={selectedParentCategory || ''}
                  onChange={(e) => setSelectedParentCategory(e.target.value)}
                  label="Parent Category"
                >
                  {categories.filter(cat => !cat.parent).map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                value={newSubcategory}
                onChange={(e) => setNewSubcategory(e.target.value)}
                placeholder="New subcategory name"
                variant="outlined"
                size="small"
                sx={{ flexGrow: 1 }}
                onKeyPress={(e) => e.key === 'Enter' && handleAddSubcategory()}
              />
              <Button 
                variant="contained" 
                color="secondary"
                startIcon={<SubdirectoryArrowRightIcon />}
                onClick={handleAddSubcategory}
                disabled={!newSubcategory.trim() || !selectedParentCategory}
              >
                Add Subcategory
              </Button>
            </Box>
            
            {availableDefaultCategories.length > 0 && (
              <Button 
                variant="outlined" 
                color="secondary"
                startIcon={<StarIcon />}
                onClick={() => setOpenDefaultDialog(true)}
                sx={{ mb: 2 }}
              >
                Add Defaults
              </Button>
            )}

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

            <Box>
              <Box 
                display="flex" 
                alignItems="center" 
                justifyContent="space-between"
                sx={{ 
                  mb: showCategoryHierarchy ? 2 : 0,
                  cursor: 'pointer',
                  '&:hover': {
                    '& .expand-icon': {
                      transform: 'scale(1.1)',
                      transition: 'transform 0.2s ease-in-out'
                    }
                  }
                }}
                onClick={() => setShowCategoryHierarchy(!showCategoryHierarchy)}
              >
                <Typography variant="h6">
                  Category Hierarchy
                </Typography>
                <Box display="flex" alignItems="center" gap={1}>
                  {showCategoryHierarchy && (
                    <>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={(e) => {
                          e.stopPropagation();
                          expandAllCategories();
                        }}
                        sx={{ minWidth: 'auto', px: 1, py: 0.5, fontSize: '0.75rem' }}
                      >
                        Expand All
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={(e) => {
                          e.stopPropagation();
                          collapseAllCategories();
                        }}
                        sx={{ minWidth: 'auto', px: 1, py: 0.5, fontSize: '0.75rem' }}
                      >
                        Collapse All
                      </Button>
                    </>
                  )}
                  <IconButton
                    size="small"
                    className="expand-icon"
                    sx={{
                      ml: 1,
                      '&:hover': {
                        backgroundColor: 'action.hover'
                      }
                    }}
                  >
                    {showCategoryHierarchy ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </IconButton>
                </Box>
              </Box>
              
              <Collapse in={showCategoryHierarchy}>
                {categoryChips}
              </Collapse>
            </Box>
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
              </Typography>
              {autoCategorizationEnabled && previewChanges.size > 0 && (
                <Chip 
                  label={`${previewChanges.size} changes`} 
                  size="small" 
                  color="secondary" 
                  variant="outlined"
                  sx={{ ml: 1 }}
                />
              )}
            </Box>
            
            <Box display="flex" gap={1}>
              {autoCategorizationEnabled && previewChanges.size > 0 && (
                <>
                  <Button
                    variant="outlined"
                    onClick={handleCancelPreview}
                    disabled={applyingChanges}
                    size="small"
                  >
                    Cancel Changes
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={applyingChanges ? <CircularProgress size={20} /> : <AutorenewIcon />}
                    onClick={handleApplyPreview}
                    disabled={applyingChanges || previewChanges.size === 0}
                    size="small"
                  >
                    {applyingChanges ? 'Applying...' : `Apply ${previewChanges.size} Changes`}
                  </Button>
                </>
              )}
              
            </Box>
          </Box>

          {autoCategorizationEnabled && previewStats && (
            <Box sx={{ 
              mb: 3, 
              p: 2, 
              bgcolor: theme.palette.mode === 'dark' ? 'grey.800' : 'grey.50', 
              borderRadius: 1,
              border: `1px solid ${theme.palette.divider}`
            }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Auto-Categorization Preview</Typography>
                <Typography variant="body2" color="text.secondary">
                  {previewPagination.totalCount} total transactions
                </Typography>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="text.secondary">High Confidence</Typography>
                  <Typography variant="h6" color="success.main">{previewStats.high_confidence}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="text.secondary">Medium Confidence</Typography>
                  <Typography variant="h6" color="warning.main">{previewStats.medium_confidence}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="text.secondary">Low Confidence</Typography>
                  <Typography variant="h6" color="error.main">{previewStats.low_confidence}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="text.secondary">No Suggestion</Typography>
                  <Typography variant="h6" color="text.secondary">{previewStats.no_suggestion || 0}</Typography>
                </Grid>
              </Grid>
            </Box>
          )}

            <Grid container spacing={2}>
              {transactionItems}
            </Grid>

            {/* Pagination */}
            {totalPages > 1 && (
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

      {/* Similar Transactions Confirmation Dialog */}
      <Dialog open={showSimilarConfirmDialog} onClose={() => setShowSimilarConfirmDialog(false)}>
        <DialogTitle>Apply to All Similar Transactions</DialogTitle>
        <DialogContent>
          <Typography>
            This action will apply the category to {pendingSimilarCount} transactions with the same description.
            Are you sure you want to proceed?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSimilarConfirmDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleApplyToSimilar} 
            variant="contained"
            color="primary"
            disabled={acceptingIndividual.has(pendingSimilarTransactionId)}
          >
            {acceptingIndividual.has(pendingSimilarTransactionId) ? 'Applying...' : 'Apply to All'}
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
