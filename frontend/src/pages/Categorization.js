import React, { useState, useEffect } from "react";
import axios from "axios";

const Categorization = () => {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    axios.get("http://127.0.0.1:8000/api/missing-categories/")
      .then(response => setTransactions(response.data));

    axios.get("http://127.0.0.1:8000/api/categories/")
      .then(response => setCategories(response.data));
  }, []);

  return (
    <div>
      <h2>Categorize Transactions</h2>
      {transactions.map((t) => (
        <div key={t.id}>
          <p>{t.description} - ${t.amount}</p>
          <select>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button>Update</button>
        </div>
      ))}
    </div>
  );
};

export default Categorization;