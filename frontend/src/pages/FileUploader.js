import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { 
  Container, 
  Typography, 
  Card, 
  CardContent, 
  Button, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Box,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  LinearProgress,
  IconButton,
  Paper,
  Switch,
  FormControlLabel
} from "@mui/material";
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useTheme } from "@mui/material/styles";

const FileUploader = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const [file, setFile] = useState(null);
    const [files, setFiles] = useState([]);
    const [fileType, setFileType] = useState("TD");
    const [accounts, setAccounts] = useState([]); // Store fetched accounts
    const [account, setAccount] = useState("");
    const [selectedAccountId, setSelectedAccountId] = useState(""); // Store selected account ID
    const [selectedAccount, setSelectedAccount] = useState(null); // Store selected account object
    const [message, setMessage] = useState("");
    const [isMultipleMode, setIsMultipleMode] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadResults, setUploadResults] = useState([]);

    // Fetch all accounts on component mount
    useEffect(() => {
        axios
            .get(`http://127.0.0.1:8000/api/accounts/`)
            .then((response) => {
            setAccounts(response.data.accounts);
            })
            .catch(() => {
            setAccounts([]);
            });
    }, []);

    const handleAccountChange = (event) => {
        const selectedAccountId = event.target.value;
        
        // Check if "Add Account" option was selected
        if (selectedAccountId === "add_account") {
            navigate("/accounts?create=true");
            return;
        }
        
        // Find the selected account object by ID
        const accountObj = accounts.find(acc => acc.id.toString() === selectedAccountId);
        
        if (accountObj) {
            setAccount(accountObj.name);
            setSelectedAccountId(selectedAccountId);
            setSelectedAccount(accountObj);
            
            // Automatically set file type based on account's bank
            if (accountObj.bank === "AMEX") {
                setFileType("Amex");
            } else if (accountObj.bank === "TD") {
                setFileType("TD");
            } else if (accountObj.bank === "SCOTIA") {
                setFileType("Scotiabank");
            }
        }
    };
    


    const handleFileChange = (event) => {
        if (event.target.files.length > 0) {
            if (isMultipleMode) {
                const newFiles = Array.from(event.target.files);
                setFiles(prevFiles => [...prevFiles, ...newFiles]);
            } else {
                setFile(event.target.files[0]);
            }
        }
    };

    const handleRemoveFile = (index) => {
        if (isMultipleMode) {
            setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
        } else {
            setFile(null);
        }
    };

    const handleClearAllFiles = () => {
        if (isMultipleMode) {
            setFiles([]);
        } else {
            setFile(null);
        }
    };

    const handleDragOver = (event) => {
        event.preventDefault();
    };

    const handleDrop = (event) => {
        event.preventDefault();
        const droppedFiles = Array.from(event.dataTransfer.files);
        
        if (isMultipleMode) {
            setFiles(prevFiles => [...prevFiles, ...droppedFiles]);
        } else {
            setFile(droppedFiles[0]);
        }
    };

  const handleUpload = async () => {
    if (isMultipleMode) {
      if (files.length === 0 || !selectedAccount || !selectedAccountId) {
        setMessage("Please select files and account.");
        return;
      }
    } else {
      if (!file || !selectedAccount || !selectedAccountId) {
        setMessage("Please select a file and account.");
        return;
      }
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadResults([]);
    setMessage("");

    try {
      if (isMultipleMode) {
        // Multiple file upload
        const formData = new FormData();
        files.forEach(file => {
          formData.append("files", file);
        });
        formData.append("file_type", fileType);
        formData.append("bank", selectedAccount.bank);
        formData.append("account", selectedAccount.name);

        const response = await axios.post("http://127.0.0.1:8000/api/upload/multiple", formData);
        setUploadResults(response.data.file_results);
        setMessage(response.data.message);
        setUploadProgress(100);
      } else {
        // Single file upload
        const formData = new FormData();
        formData.append("file", file);
        formData.append("file_type", fileType);
        formData.append("bank", selectedAccount.bank);
        formData.append("account", selectedAccount.name);

        const response = await axios.post("http://127.0.0.1:8000/api/upload/", formData);
        setMessage(response.data.message);
        setUploadProgress(100);
      }
    } catch (error) {
      console.error("Upload error:", error);
      if (error.response && error.response.data && error.response.data.error) {
        setMessage(`Upload failed: ${error.response.data.error}`);
      } else {
        setMessage(`Upload failed: ${error.message}`);
      }
    } finally {
      setUploading(false);
    }
  };


  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Upload Statements 📄
      </Typography>
      
      <Card>
        <CardContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {/* Upload Mode Toggle */}
            <FormControlLabel
              control={
                <Switch
                  checked={isMultipleMode}
                  onChange={(e) => {
                    setIsMultipleMode(e.target.checked);
                    if (e.target.checked) {
                      setFile(null);
                    } else {
                      setFiles([]);
                    }
                  }}
                />
              }
              label="Multiple File Upload"
            />

            <FormControl fullWidth>
              <InputLabel>Account</InputLabel>
              <Select value={selectedAccountId} onChange={handleAccountChange}>
                {accounts.map((account) => (
                  <MenuItem key={account.id} value={account.id.toString()}>
                    {account.name} ({account.bank})
                  </MenuItem>
                ))}
                <Divider />
                <MenuItem value="add_account" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                  <AddIcon sx={{ mr: 1 }} />
                  Add New Account
                </MenuItem>
              </Select>
            </FormControl>

            {selectedAccount && (
              <Box sx={{ 
                p: 2, 
                backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[100], 
                borderRadius: 1,
                border: `1px solid ${theme.palette.mode === 'dark' ? theme.palette.grey[700] : theme.palette.grey[300]}`
              }}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Selected Bank:</strong> {
                    selectedAccount.bank === "TD" ? "TD Bank" : 
                    selectedAccount.bank === "AMEX" ? "American Express" :
                    selectedAccount.bank === "SCOTIA" ? "Scotiabank" : 
                    selectedAccount.bank
                  }
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Account Type:</strong> {selectedAccount.type.charAt(0).toUpperCase() + selectedAccount.type.slice(1)}
                </Typography>
              </Box>
            )}

            <Box sx={{ mb: 2 }}>
              <Typography variant="body1" gutterBottom>
                File Requirements:
              </Typography>
              <ul style={{ 
                marginTop: 0,
                paddingLeft: '1.5rem',
                color: theme.palette.text.secondary 
              }}>
                <li>File must be in {
                  selectedAccount?.bank === "TD" ? "CSV" : 
                  selectedAccount?.bank === "AMEX" ? "XLS/XLSX" :
                  selectedAccount?.bank === "SCOTIA" ? "CSV" : 
                  "CSV"
                } format</li>
                <li>Must contain transaction date, description, and amount</li>
                {selectedAccount?.bank === "TD" && (
                  <li>TD files: Headers optional - supports both formats with/without column headers</li>
                )}
                <li>No header modifications</li>
                {isMultipleMode && (
                  <li>You can select multiple files at once or add them one by one</li>
                )}
              </ul>
            </Box>

            {/* File Upload Area */}
            <Box 
              sx={{ 
                border: '2px dashed #2563eb', 
                borderRadius: 1, 
                p: 3, 
                textAlign: 'center',
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: 'rgba(37, 99, 235, 0.04)'
                }
              }}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <input
                type="file"
                multiple={isMultipleMode}
                accept={
                  selectedAccount?.bank === "TD" ? ".csv" : 
                  selectedAccount?.bank === "AMEX" ? ".xls,.xlsx" :
                  selectedAccount?.bank === "SCOTIA" ? ".csv" : 
                  ".csv"
                }
                onChange={handleFileChange}
                style={{ display: 'none' }}
                id="file-input"
              />
              <label htmlFor="file-input" style={{ cursor: 'pointer' }}>
                <CloudUploadIcon sx={{ 
                  fontSize: 48, 
                  color: '#2563eb', 
                  mb: 1 
                }} />
                <Typography variant="body1" gutterBottom>
                  {isMultipleMode 
                    ? (files.length > 0 ? `${files.length} file(s) selected` : 'Drag and drop or click to select files')
                    : (file ? file.name : 'Drag and drop or click to select file')
                  }
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Supported formats: {
                    selectedAccount?.bank === "TD" ? "CSV" : 
                    selectedAccount?.bank === "AMEX" ? "XLS, XLSX" :
                    selectedAccount?.bank === "SCOTIA" ? "CSV" : 
                    "CSV"
                  }
                </Typography>
              </label>
            </Box>

            {/* File List for Multiple Upload */}
            {isMultipleMode && files.length > 0 && (
              <Paper sx={{ p: 2, mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="h6">Selected Files ({files.length})</Typography>
                  <Button 
                    size="small" 
                    onClick={handleClearAllFiles}
                    startIcon={<DeleteIcon />}
                  >
                    Clear All
                  </Button>
                </Box>
                <List dense>
                  {files.map((file, index) => (
                    <ListItem key={index} sx={{ px: 0 }}>
                      <ListItemIcon>
                        <UploadFileIcon />
                      </ListItemIcon>
                      <ListItemText 
                        primary={file.name}
                        secondary={`${(file.size / 1024).toFixed(1)} KB`}
                      />
                      <IconButton 
                        edge="end" 
                        onClick={() => handleRemoveFile(index)}
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItem>
                  ))}
                </List>
              </Paper>
            )}

            {/* Upload Progress */}
            {uploading && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Uploading files...
                </Typography>
                <LinearProgress variant="determinate" value={uploadProgress} />
              </Box>
            )}

            {/* Upload Results */}
            {uploadResults.length > 0 && (
              <Paper sx={{ p: 2, mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Upload Results
                </Typography>
                <List dense>
                  {uploadResults.map((result, index) => (
                    <ListItem key={index} sx={{ px: 0 }}>
                      <ListItemIcon>
                        {result.success ? (
                          <CheckCircleIcon color="success" />
                        ) : (
                          <ErrorIcon color="error" />
                        )}
                      </ListItemIcon>
                      <ListItemText 
                        primary={result.filename}
                        secondary={
                          result.success 
                            ? `${result.rows_processed} rows processed`
                            : result.error
                        }
                      />
                      {result.success && (
                        <Chip 
                          label="Success" 
                          color="success" 
                          size="small" 
                        />
                      )}
                    </ListItem>
                  ))}
                </List>
              </Paper>
            )}

            <Button
              variant="contained"
              onClick={handleUpload}
              disabled={
                uploading || 
                (isMultipleMode ? files.length === 0 : !file) || 
                !selectedAccount || 
                !account
              }
              fullWidth
              sx={{ mt: 2 }}
            >
              {isMultipleMode ? `Upload ${files.length} Statement${files.length !== 1 ? 's' : ''}` : 'Upload Statement'}
            </Button>

            {message && (
              <Alert severity={message.includes("failed") ? "error" : "success"} sx={{ mt: 2 }}>
                {message}
              </Alert>
            )}
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};


export default FileUploader;
