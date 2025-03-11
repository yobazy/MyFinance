import React, { useState, useEffect } from "react";
import axios from "axios";

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
    <div>
      <h2>Upload TD CSV or Amex XLS</h2>

      {/* Bank Selection Dropdown */}
      <label>Bank:</label>
      <select value={bank} onChange={handleBankChange}>
        <option value="">Select a Bank</option>
        <option value="TD">Toronto-Dominion Bank</option>
        <option value="AMEX">American Express</option>
      </select>

      {/* Account Selection Dropdown */}
      <label>Account:</label>
      <select value={account} onChange={handleAccountChange} disabled={!bank}>
        <option value="">Select an account</option>
        {accounts.map((acc) => (
          <option key={acc.id} value={acc.name}>
            {acc.name}
          </option>
        ))}
      </select>

      {/* File Input */}
      <input type="file" accept={bank === "Toronto-Dominion Bank" ? ".csv" : ".xls,.xlsx"} onChange={(e) => setFile(e.target.files[0])} />

      <button onClick={handleUpload}>Upload</button>
      <p>{message}</p>
      <span>File Types:
        <ul>
          <li>TD: CSV</li>
          <li>Amex: XLS, XLSX</li>
        </ul>
      </span>
    </div>
  );
};


export default FileUploader;
