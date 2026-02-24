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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  Badge,
  LinearProgress,
  Snackbar,
  Slider,
  FormGroup,
  Checkbox,
  Collapse,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  ListItemIcon
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as TestIcon,
  Visibility as ViewIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Rule as RuleIcon,
  Category as CategoryIcon,
  Assessment as StatsIcon,
  SmartToy as AutoIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  AttachMoney as MoneyIcon,
  Description as DescriptionIcon,
  CalendarToday as CalendarIcon,
  Store as StoreIcon
} from "@mui/icons-material";

const RuleManagement = () => {
  const theme = useTheme();
  const [rules, setRules] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Dialog states
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openTestDialog, setOpenTestDialog] = useState(false);
  const [openStatsDialog, setOpenStatsDialog] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [testingRule, setTestingRule] = useState(null);
  
  // Form states
  const [ruleForm, setRuleForm] = useState({
    name: "",
    description: "",
    rule_type: "keyword",
    pattern: "",
    category: "",
    priority: 1,
    is_active: true,
    case_sensitive: false,
    conditions: {}
  });
  
  // Test form states
  const [testForm, setTestForm] = useState({
    sample_text: "",
    sample_amount: 0
  });
  
  // Filter and search states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("priority");
  const [sortOrder, setSortOrder] = useState("desc");
  
  // Tab state
  const [activeTab, setActiveTab] = useState(0);
  
  // Stats state
  const [ruleStats, setRuleStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  
  // Test result state
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  // Rule type options with descriptions
  const ruleTypes = [
    { value: "keyword", label: "Keyword Match", description: "Match if description contains any of the specified keywords", icon: <DescriptionIcon /> },
    { value: "contains", label: "Contains Text", description: "Match if description contains the specified text", icon: <SearchIcon /> },
    { value: "exact", label: "Exact Match", description: "Match if description exactly matches the specified text", icon: <CheckIcon /> },
    { value: "regex", label: "Regular Expression", description: "Match using a regular expression pattern", icon: <RuleIcon /> },
    { value: "amount_range", label: "Amount Range", description: "Match if amount is within specified range", icon: <MoneyIcon /> },
    { value: "amount_exact", label: "Exact Amount", description: "Match if amount exactly matches specified value", icon: <CheckIcon /> },
    { value: "amount_greater", label: "Amount Greater Than", description: "Match if amount is greater than specified value", icon: <TrendingUpIcon /> },
    { value: "amount_less", label: "Amount Less Than", description: "Match if amount is less than specified value", icon: <TrendingUpIcon /> },
    { value: "merchant", label: "Merchant Name", description: "Match based on merchant name extraction", icon: <StoreIcon /> },
    { value: "recurring", label: "Recurring Payment", description: "Match recurring payment patterns", icon: <ScheduleIcon /> },
    { value: "date_range", label: "Date Range", description: "Match if transaction date is within specified range", icon: <CalendarIcon /> },
    { value: "day_of_week", label: "Day of Week", description: "Match based on day of the week", icon: <CalendarIcon /> },
    { value: "combined", label: "Combined Conditions", description: "Match using multiple conditions with AND/OR logic", icon: <RuleIcon /> }
  ];

  // Load data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [rulesResponse, categoriesResponse] = await Promise.all([
        axios.get("http://127.0.0.1:8000/api/rules/"),
        axios.get("http://127.0.0.1:8000/api/categories/")
      ]);
      
      setRules(rulesResponse.data);
      setCategories(categoriesResponse.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to load rules and categories");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRuleStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      const response = await axios.get("http://127.0.0.1:8000/api/rules/stats/");
      setRuleStats(response.data);
    } catch (error) {
      console.error("Error fetching rule stats:", error);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter and sort rules
  const filteredRules = useMemo(() => {
    let filtered = rules;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(rule =>
        rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rule.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rule.pattern.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rule.category_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply type filter
    if (filterType !== "all") {
      filtered = filtered.filter(rule => rule.rule_type === filterType);
    }

    // Apply status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter(rule => 
        filterStatus === "active" ? rule.is_active : !rule.is_active
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "priority":
          aValue = a.priority;
          bValue = b.priority;
          break;
        case "matches":
          aValue = a.match_count || 0;
          bValue = b.match_count || 0;
          break;
        case "created":
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        default:
          aValue = a.priority;
          bValue = b.priority;
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [rules, searchTerm, filterType, filterStatus, sortBy, sortOrder]);

  // Handle form changes
  const handleFormChange = (field, value) => {
    setRuleForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTestFormChange = (field, value) => {
    setTestForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Reset form
  const resetForm = () => {
    setRuleForm({
      name: "",
      description: "",
      rule_type: "keyword",
      pattern: "",
      category: "",
      priority: 1,
      is_active: true,
      case_sensitive: false,
      conditions: {}
    });
  };

  // Create rule
  const handleCreateRule = async () => {
    try {
      const response = await axios.post("http://127.0.0.1:8000/api/rules/create/", ruleForm);
      setRules(prev => [response.data, ...prev]);
      setOpenCreateDialog(false);
      resetForm();
      setSuccessMessage("Rule created successfully!");
      setShowSuccess(true);
    } catch (error) {
      console.error("Error creating rule:", error);
      setError("Failed to create rule: " + (error.response?.data?.error || error.message));
    }
  };

  // Update rule
  const handleUpdateRule = async () => {
    try {
      const response = await axios.put(`http://127.0.0.1:8000/api/rules/${editingRule.id}/update/`, ruleForm);
      setRules(prev => prev.map(rule => rule.id === editingRule.id ? response.data : rule));
      setOpenEditDialog(false);
      setEditingRule(null);
      resetForm();
      setSuccessMessage("Rule updated successfully!");
      setShowSuccess(true);
    } catch (error) {
      console.error("Error updating rule:", error);
      setError("Failed to update rule: " + (error.response?.data?.error || error.message));
    }
  };

  // Delete rule
  const handleDeleteRule = async (ruleId) => {
    if (!window.confirm("Are you sure you want to delete this rule?")) return;
    
    try {
      await axios.delete(`http://127.0.0.1:8000/api/rules/${ruleId}/delete/`);
      setRules(prev => prev.filter(rule => rule.id !== ruleId));
      setSuccessMessage("Rule deleted successfully!");
      setShowSuccess(true);
    } catch (error) {
      console.error("Error deleting rule:", error);
      setError("Failed to delete rule: " + (error.response?.data?.error || error.message));
    }
  };

  // Test rule
  const handleTestRule = async () => {
    if (!testingRule) return;
    
    try {
      setTesting(true);
      const response = await axios.post(`http://127.0.0.1:8000/api/rules/${testingRule.id}/test/`, testForm);
      setTestResult(response.data);
    } catch (error) {
      console.error("Error testing rule:", error);
      setError("Failed to test rule: " + (error.response?.data?.error || error.message));
    } finally {
      setTesting(false);
    }
  };

  // Apply rule to transactions
  const handleApplyRule = async (ruleId) => {
    try {
      const response = await axios.post(`http://127.0.0.1:8000/api/rules/${ruleId}/apply/`);
      setSuccessMessage(`Rule applied to ${response.data.matched_count} transactions!`);
      setShowSuccess(true);
      fetchData(); // Refresh rules to update match counts
    } catch (error) {
      console.error("Error applying rule:", error);
      setError("Failed to apply rule: " + (error.response?.data?.error || error.message));
    }
  };

  // Open edit dialog
  const handleOpenEditDialog = (rule) => {
    setEditingRule(rule);
    setRuleForm({
      name: rule.name,
      description: rule.description || "",
      rule_type: rule.rule_type,
      pattern: rule.pattern,
      category: rule.category,
      priority: rule.priority,
      is_active: rule.is_active,
      case_sensitive: rule.case_sensitive,
      conditions: rule.conditions || {}
    });
    setOpenEditDialog(true);
  };

  // Open test dialog
  const handleOpenTestDialog = (rule) => {
    setTestingRule(rule);
    setTestForm({
      sample_text: "",
      sample_amount: 0
    });
    setTestResult(null);
    setOpenTestDialog(true);
  };

  // Get rule type info
  const getRuleTypeInfo = (ruleType) => {
    return ruleTypes.find(type => type.value === ruleType) || ruleTypes[0];
  };

  // Render pattern input based on rule type
  const renderPatternInput = () => {
    const { rule_type, pattern } = ruleForm;
    
    switch (rule_type) {
      case "keyword":
        return (
          <TextField
            fullWidth
            label="Keywords (comma-separated)"
            value={pattern}
            onChange={(e) => handleFormChange("pattern", e.target.value)}
            placeholder="e.g., STARBUCKS, COFFEE, CAFE"
            helperText="Enter keywords separated by commas"
          />
        );
      
      case "contains":
        return (
          <TextField
            fullWidth
            label="Text to search for"
            value={pattern}
            onChange={(e) => handleFormChange("pattern", e.target.value)}
            placeholder="e.g., AMAZON"
            helperText="Text that must be contained in the description"
          />
        );
      
      case "exact":
        return (
          <TextField
            fullWidth
            label="Exact text"
            value={pattern}
            onChange={(e) => handleFormChange("pattern", e.target.value)}
            placeholder="e.g., MONTHLY RENT PAYMENT"
            helperText="Exact text that must match the description"
          />
        );
      
      case "regex":
        return (
          <TextField
            fullWidth
            label="Regular Expression"
            value={pattern}
            onChange={(e) => handleFormChange("pattern", e.target.value)}
            placeholder="e.g., ^PAYMENT.*RENT$"
            helperText="Regular expression pattern"
          />
        );
      
      case "amount_range":
        return (
          <Box>
            <TextField
              fullWidth
              label="Amount Range (JSON)"
              value={pattern}
              onChange={(e) => handleFormChange("pattern", e.target.value)}
              placeholder='{"min": 10, "max": 100}'
              helperText="JSON object with min and max amounts"
            />
          </Box>
        );
      
      case "amount_exact":
      case "amount_greater":
      case "amount_less":
        return (
          <TextField
            fullWidth
            label="Amount"
            type="number"
            value={pattern}
            onChange={(e) => handleFormChange("pattern", e.target.value)}
            placeholder="e.g., 50.00"
            helperText="Amount value"
            inputProps={{ step: "0.01" }}
          />
        );
      
      case "merchant":
        return (
          <TextField
            fullWidth
            label="Merchant Name"
            value={pattern}
            onChange={(e) => handleFormChange("pattern", e.target.value)}
            placeholder="e.g., AMAZON"
            helperText="Merchant name to match"
          />
        );
      
      case "day_of_week":
        return (
          <TextField
            fullWidth
            label="Days of Week (comma-separated)"
            value={pattern}
            onChange={(e) => handleFormChange("pattern", e.target.value)}
            placeholder="e.g., 0,1,2,3,4 (Monday-Friday)"
            helperText="Days of week: 0=Monday, 1=Tuesday, ..., 6=Sunday"
          />
        );
      
      case "date_range":
        return (
          <TextField
            fullWidth
            label="Date Range (JSON)"
            value={pattern}
            onChange={(e) => handleFormChange("pattern", e.target.value)}
            placeholder='{"start": "2024-01-01", "end": "2024-12-31"}'
            helperText="JSON object with start and end dates"
          />
        );
      
      default:
        return (
          <TextField
            fullWidth
            label="Pattern"
            value={pattern}
            onChange={(e) => handleFormChange("pattern", e.target.value)}
            placeholder="Enter pattern..."
          />
        );
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Rule Management 🎯
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Stats Overview */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Typography variant="h6">Rule Statistics</Typography>
            <Button
              variant="outlined"
              startIcon={<StatsIcon />}
              onClick={() => {
                fetchRuleStats();
                setOpenStatsDialog(true);
              }}
              disabled={loadingStats}
            >
              {loadingStats ? <CircularProgress size={20} /> : "View Stats"}
            </Button>
          </Box>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={3}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                <Typography variant="h4">{rules.length}</Typography>
                <Typography variant="body2">Total Rules</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light', color: 'success.contrastText' }}>
                <Typography variant="h4">{rules.filter(r => r.is_active).length}</Typography>
                <Typography variant="body2">Active Rules</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'info.light', color: 'info.contrastText' }}>
                <Typography variant="h4">
                  {rules.reduce((sum, rule) => sum + (rule.match_count || 0), 0)}
                </Typography>
                <Typography variant="body2">Total Matches</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.light', color: 'warning.contrastText' }}>
                <Typography variant="h4">
                  {rules.filter(r => r.rule_type === 'keyword').length}
                </Typography>
                <Typography variant="body2">Keyword Rules</Typography>
              </Paper>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Typography variant="h6">Rules</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                resetForm();
                setOpenCreateDialog(true);
              }}
            >
              Create Rule
            </Button>
          </Box>
          
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search rules..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>
            <Grid item xs={12} sm={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Type</InputLabel>
                <Select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  label="Type"
                >
                  <MenuItem value="all">All Types</MenuItem>
                  {ruleTypes.map(type => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Sort By</InputLabel>
                <Select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  label="Sort By"
                >
                  <MenuItem value="priority">Priority</MenuItem>
                  <MenuItem value="name">Name</MenuItem>
                  <MenuItem value="matches">Matches</MenuItem>
                  <MenuItem value="created">Created</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={2}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              >
                {sortOrder === "asc" ? "↑" : "↓"}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Rules List */}
      <Card>
        <CardContent>
          {filteredRules.length === 0 ? (
            <Box textAlign="center" py={4}>
              <Typography variant="h6" color="text.secondary">
                No rules found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {searchTerm || filterType !== "all" || filterStatus !== "all"
                  ? "Try adjusting your filters"
                  : "Create your first rule to get started"
                }
              </Typography>
              {!searchTerm && filterType === "all" && filterStatus === "all" && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    resetForm();
                    setOpenCreateDialog(true);
                  }}
                >
                  Create Rule
                </Button>
              )}
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Pattern</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell>Matches</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredRules.map((rule) => {
                    const ruleTypeInfo = getRuleTypeInfo(rule.rule_type);
                    return (
                      <TableRow key={rule.id}>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {rule.name}
                            </Typography>
                            {rule.description && (
                              <Typography variant="caption" color="text.secondary">
                                {rule.description}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={ruleTypeInfo.icon}
                            label={ruleTypeInfo.label}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                            {rule.pattern.length > 50 
                              ? `${rule.pattern.substring(0, 50)}...` 
                              : rule.pattern
                            }
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={rule.category_name}
                            size="small"
                            color="secondary"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{rule.priority}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{rule.match_count || 0}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={rule.is_active ? "Active" : "Inactive"}
                            size="small"
                            color={rule.is_active ? "success" : "default"}
                            variant={rule.is_active ? "filled" : "outlined"}
                          />
                        </TableCell>
                        <TableCell>
                          <Box display="flex" gap={1}>
                            <Tooltip title="Test Rule">
                              <IconButton
                                size="small"
                                onClick={() => handleOpenTestDialog(rule)}
                              >
                                <TestIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit Rule">
                              <IconButton
                                size="small"
                                onClick={() => handleOpenEditDialog(rule)}
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Apply to Transactions">
                              <IconButton
                                size="small"
                                onClick={() => handleApplyRule(rule.id)}
                                disabled={!rule.is_active}
                              >
                                <AutoIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Rule">
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteRule(rule.id)}
                                color="error"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Rule Dialog */}
      <Dialog 
        open={openCreateDialog || openEditDialog} 
        onClose={() => {
          setOpenCreateDialog(false);
          setOpenEditDialog(false);
          setEditingRule(null);
          resetForm();
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingRule ? "Edit Rule" : "Create New Rule"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Rule Name"
                value={ruleForm.name}
                onChange={(e) => handleFormChange("name", e.target.value)}
                placeholder="e.g., Coffee Shops"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description (Optional)"
                value={ruleForm.description}
                onChange={(e) => handleFormChange("description", e.target.value)}
                placeholder="Brief description of what this rule does"
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Rule Type</InputLabel>
                <Select
                  value={ruleForm.rule_type}
                  onChange={(e) => handleFormChange("rule_type", e.target.value)}
                  label="Rule Type"
                >
                  {ruleTypes.map(type => (
                    <MenuItem key={type.value} value={type.value}>
                      <Box display="flex" alignItems="center">
                        {type.icon}
                        <Box ml={1}>
                          <Typography variant="body2">{type.label}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {type.description}
                          </Typography>
                        </Box>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={ruleForm.category}
                  onChange={(e) => handleFormChange("category", e.target.value)}
                  label="Category"
                >
                  {categories.map(category => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.full_path || category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              {renderPatternInput()}
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Priority"
                type="number"
                value={ruleForm.priority}
                onChange={(e) => handleFormChange("priority", parseInt(e.target.value) || 1)}
                inputProps={{ min: 1, max: 100 }}
                helperText="Higher number = higher priority"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={ruleForm.is_active}
                    onChange={(e) => handleFormChange("is_active", e.target.checked)}
                  />
                }
                label="Active"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={ruleForm.case_sensitive}
                    onChange={(e) => handleFormChange("case_sensitive", e.target.checked)}
                  />
                }
                label="Case Sensitive"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenCreateDialog(false);
            setOpenEditDialog(false);
            setEditingRule(null);
            resetForm();
          }}>
            Cancel
          </Button>
          <Button
            onClick={editingRule ? handleUpdateRule : handleCreateRule}
            variant="contained"
            disabled={!ruleForm.name || !ruleForm.pattern || !ruleForm.category}
          >
            {editingRule ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Test Rule Dialog */}
      <Dialog 
        open={openTestDialog} 
        onClose={() => {
          setOpenTestDialog(false);
          setTestingRule(null);
          setTestResult(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Test Rule</DialogTitle>
        <DialogContent>
          {testingRule && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {testingRule.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {getRuleTypeInfo(testingRule.rule_type).description}
              </Typography>
              
              <Divider sx={{ my: 2 }} />
              
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Sample Description"
                    value={testForm.sample_text}
                    onChange={(e) => handleTestFormChange("sample_text", e.target.value)}
                    placeholder="e.g., STARBUCKS COFFEE #1234"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Sample Amount"
                    type="number"
                    value={testForm.sample_amount}
                    onChange={(e) => handleTestFormChange("sample_amount", parseFloat(e.target.value) || 0)}
                    inputProps={{ step: "0.01" }}
                  />
                </Grid>
              </Grid>
              
              {testResult && (
                <Box sx={{ mt: 3 }}>
                  <Divider />
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    Test Result
                  </Typography>
                  <Alert 
                    severity={testResult.matches ? "success" : "info"}
                    icon={testResult.matches ? <CheckIcon /> : <CancelIcon />}
                  >
                    {testResult.matches 
                      ? "✅ Rule matches the sample transaction!" 
                      : "❌ Rule does not match the sample transaction"
                    }
                  </Alert>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    <strong>Pattern:</strong> {testResult.rule_preview}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenTestDialog(false);
            setTestingRule(null);
            setTestResult(null);
          }}>
            Close
          </Button>
          <Button
            onClick={handleTestRule}
            variant="contained"
            disabled={testing || !testForm.sample_text}
            startIcon={testing ? <CircularProgress size={20} /> : <TestIcon />}
          >
            {testing ? "Testing..." : "Test Rule"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Stats Dialog */}
      <Dialog 
        open={openStatsDialog} 
        onClose={() => setOpenStatsDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <StatsIcon sx={{ mr: 1 }} />
            Rule Performance Statistics
          </Box>
        </DialogTitle>
        <DialogContent>
          {ruleStats ? (
            <Box>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} sm={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                    <Typography variant="h4">{ruleStats.total_rules}</Typography>
                    <Typography variant="body2">Total Rules</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light', color: 'success.contrastText' }}>
                    <Typography variant="h4">{ruleStats.active_rules}</Typography>
                    <Typography variant="body2">Active Rules</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'info.light', color: 'info.contrastText' }}>
                    <Typography variant="h4">{ruleStats.total_matches}</Typography>
                    <Typography variant="body2">Total Matches</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.light', color: 'warning.contrastText' }}>
                    <Typography variant="h4">
                      {ruleStats.total_rules > 0 ? Math.round((ruleStats.active_rules / ruleStats.total_rules) * 100) : 0}%
                    </Typography>
                    <Typography variant="body2">Active Rate</Typography>
                  </Paper>
                </Grid>
              </Grid>
              
              <Typography variant="h6" gutterBottom>
                Top Performing Rules
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Rule Name</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Matches</TableCell>
                      <TableCell>Category</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ruleStats.top_rules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell>{rule.name}</TableCell>
                        <TableCell>
                          <Chip 
                            label={getRuleTypeInfo(rule.rule_type).label} 
                            size="small" 
                            color="primary" 
                            variant="outlined" 
                          />
                        </TableCell>
                        <TableCell>{rule.usage_count || 0}</TableCell>
                        <TableCell>{rule.category_name}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ) : (
            <Box textAlign="center" py={4}>
              <CircularProgress />
              <Typography sx={{ mt: 2 }}>Loading statistics...</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenStatsDialog(false)}>Close</Button>
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
    </Container>
  );
};

export default RuleManagement;
