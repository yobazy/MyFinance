import React, { useState, useEffect } from "react";
import axios from "axios";

const AccountsPage = () => {
  const [bank, setBank] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [message, setMessage] = useState("");

  // Fetch accounts whenever the selected bank changes
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

  // Handle adding an account
  const handleAddAccount = async () => {
    if (!bank || !accountName) {
      setMessage("Please select a bank and enter an account name.");
      return;
    }

    try {
      const response = await axios.post("http://127.0.0.1:8000/api/accounts/create/", {
        bank,
        name: accountName,
      });
      setMessage(response.data.message);
      setAccountName(""); // Clear input field
      setAccounts([...accounts, { id: response.data.account.id, name: response.data.account.name }]); // Update state
    } catch (error) {
      setMessage(error.response?.data?.error || "Failed to create account.");
    }
  };

  return (
    <div>
      <h2>Manage Accounts</h2>

      {/* Bank Selection Dropdown */}
      <label>Bank:</label>
      <select value={bank} onChange={(e) => setBank(e.target.value)}>
        <option value="">Select a Bank</option>
        <option value="TD">Toronto-Dominion Bank</option>
        <option value="AMEX">American Express</option>
      </select>

      {/* List of existing accounts for selected bank */}
      <h3>Existing Accounts:</h3>
      <ul>
        {accounts.length > 0 ? (
          accounts.map((acc) => <li key={acc.id}>{acc.name}</li>)
        ) : (
          <p>No accounts found.</p>
        )}
      </ul>

      {/* Add Account Input */}
      <label>New Account Name:</label>
      <input
        type="text"
        value={accountName}
        onChange={(e) => setAccountName(e.target.value)}
        placeholder="e.g. Credit Card 1, Savings Account"
      />
      <button onClick={handleAddAccount}>Add Account</button>

      <p>{message}</p>
    </div>
  );
};

export default AccountsPage;
