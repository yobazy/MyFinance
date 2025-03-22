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

const FileUploader = () => {
    const [file, setFile] = useState(null);
    const [fileType, setFileType] = useState("TD");
    const [bank, setBank] = useState("");
    const [accounts, setAccounts] = useState([]); // Store fetched accounts
    const [account, setAccount] = useState("");
    const [message, setMessage] = useState("");

    // Fetch accounts when bank selection changes
    useEffect(() => {
        if (bank) {
        axios
            .get(`http://127.0.0.1:8000/api/accounts/?bank=${bank}`)
            .then((response) => {
            setAccounts(response.data.accounts);
            })
            .catch(() => {
            setAccounts([]);
            });
        }
    }, [bank]);

    const handleBankChange = (event) => {
        setBank(event.target.value);
      };

    const handleAccountChange = (event) => {
    setAccount(event.target.value);
    };
    
    const handleCreateAccount = async () => {
        if (!bank || !account) {
          setMessage("Please enter a bank and account name.");
          return;
        }
    
        try {
          const response = await axios.post("http://127.0.0.1:8000/api/accounts/", { bank, name: account });
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
        if (!file || !bank || !account) {
          setMessage("Please select a file and enter bank and account.");
          return;
        }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("file_type", fileType);
    formData.append("bank", bank);
    formData.append("account", account);

    try {
      const response = await axios.post("http://127.0.0.1:8000/api/upload/", formData);
      setMessage(response.data.message);
    } catch (error) {
      setMessage("Upload failed.");
    }
  };


  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Upload Statements 📄
      </Typography>
      <Card sx={{ 
        backgroundColor: '#f8f9fa',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <CardContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Bank</InputLabel>
              <Select
                value={bank}
                onChange={handleBankChange}
                label="Bank"
              >
                <MenuItem value="">Select a Bank</MenuItem>
                <MenuItem value="TD">Toronto-Dominion Bank</MenuItem>
                <MenuItem value="AMEX">American Express</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Account</InputLabel>
              <Select
                value={account}
                onChange={handleAccountChange}
                disabled={!bank}
                label="Account"
              >
                <MenuItem value="">Select an account</MenuItem>
                {accounts.map((acc) => (
                  <MenuItem key={acc.id} value={acc.name}>
                    {acc.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ 
              border: '2px dashed #8884d8', 
              borderRadius: 1, 
              p: 3, 
              textAlign: 'center',
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: '#f0f0f0'
              }
            }}>
              <input
                type="file"
                accept={bank === "TD" ? ".csv" : ".xls,.xlsx"}
                onChange={handleFileChange}
                style={{ display: 'none' }}
                id="file-input"
              />
              <label htmlFor="file-input" style={{ cursor: 'pointer' }}>
                <CloudUploadIcon sx={{ fontSize: 48, color: '#8884d8', mb: 1 }} />
                <Typography variant="body1" gutterBottom>
                  {file ? file.name : 'Drag and drop or click to select file'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Supported formats: {bank === "TD" ? "CSV" : "XLS, XLSX"}
                </Typography>
              </label>
            </Box>

            <Button
              variant="contained"
              onClick={handleUpload}
              disabled={!file || !bank || !account}
              sx={{
                backgroundColor: '#8884d8',
                '&:hover': {
                  backgroundColor: '#7673c0',
                },
                '&.Mui-disabled': {
                  backgroundColor: '#e0e0e0',
                }
              }}
            >
              Upload Statement
            </Button>

            {message && (
              <Alert severity={message.includes("failed") ? "error" : "success"}>
                {message}
              </Alert>
            )}

            <Typography variant="body2" color="text.secondary">
              File Types:
              <ul>
                <li>TD: CSV format</li>
                <li>Amex: XLS, XLSX format</li>
              </ul>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};


export default FileUploader;
