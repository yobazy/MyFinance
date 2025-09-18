import React, { useState, useEffect } from "react";
import axios from "axios";
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
  Alert
} from "@mui/material";
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useTheme } from "@mui/material/styles";

const FileUploader = () => {
    const theme = useTheme();
    const [file, setFile] = useState(null);
    const [fileType, setFileType] = useState("TD");
    const [accounts, setAccounts] = useState([]); // Store fetched accounts
    const [account, setAccount] = useState("");
    const [selectedAccount, setSelectedAccount] = useState(null); // Store selected account object
    const [message, setMessage] = useState("");

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
        const selectedAccountName = event.target.value;
        setAccount(selectedAccountName);
        
        // Find the selected account object to get bank info
        const accountObj = accounts.find(acc => acc.name === selectedAccountName);
        setSelectedAccount(accountObj);
        
        // Automatically set file type based on account's bank
        if (accountObj) {
            if (accountObj.bank === "AMEX") {
                setFileType("Amex");
            } else if (accountObj.bank === "TD") {
                setFileType("TD");
            }
        }
    };
    
    const handleCreateAccount = async () => {
        if (!selectedAccount) {
          setMessage("Please select an account first.");
          return;
        }
    
        try {
          const response = await axios.post("http://127.0.0.1:8000/api/accounts/create/", { 
            bank: selectedAccount.bank, 
            name: account 
          });
          setMessage(`Account "${account}" created successfully!`);
        } catch (error) {
          setMessage("Failed to create account.");
        }
    };


    const handleFileChange = (event) => {
        if (event.target.files.length > 0) {
            setFile(event.target.files[0]);
        }
    };

  const handleUpload = async () => {
    if (!file || !selectedAccount || !account) {
      setMessage("Please select a file and account.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("file_type", fileType);
    formData.append("bank", selectedAccount.bank);
    formData.append("account", account);

    try {
      const response = await axios.post("http://127.0.0.1:8000/api/upload/", formData);
      setMessage(response.data.message);
    } catch (error) {
      console.error("Upload error:", error);
      if (error.response && error.response.data && error.response.data.error) {
        setMessage(`Upload failed: ${error.response.data.error}`);
      } else {
        setMessage(`Upload failed: ${error.message}`);
      }
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
            <FormControl fullWidth>
              <InputLabel>Account</InputLabel>
              <Select value={account} onChange={handleAccountChange}>
                {accounts.map((account) => (
                  <MenuItem key={account.id} value={account.name}>
                    {account.name} ({account.bank})
                  </MenuItem>
                ))}
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
                  <strong>Selected Bank:</strong> {selectedAccount.bank === "TD" ? "TD Bank" : "American Express"}
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
                <li>File must be in {selectedAccount?.bank === "TD" ? "CSV" : "XLS/XLSX"} format</li>
                <li>Must contain transaction date, description, and amount</li>
                <li>No header modifications</li>
              </ul>
            </Box>

            <Box sx={{ 
              border: '2px dashed #2563eb', 
              borderRadius: 1, 
              p: 3, 
              textAlign: 'center',
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: 'rgba(37, 99, 235, 0.04)'
              }
            }}>
              <input
                type="file"
                accept={selectedAccount?.bank === "TD" ? ".csv" : ".xls,.xlsx"}
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
                  {file ? file.name : 'Drag and drop or click to select file'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Supported formats: {selectedAccount?.bank === "TD" ? "CSV" : "XLS, XLSX"}
                </Typography>
              </label>
            </Box>

            <Button
              variant="contained"
              onClick={handleUpload}
              disabled={!file || !selectedAccount || !account}
              fullWidth
            >
              Upload Statement
            </Button>

            {message && (
              <Alert severity={message.includes("failed") ? "error" : "success"}>
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
