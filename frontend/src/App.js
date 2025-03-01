import React, { useState, useEffect } from "react";
import axios from "axios";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const App = () => {
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    axios.get("http://127.0.0.1:8000/api/transactions/")
      .then(response => setTransactions(response.data))
      .catch(error => console.error(error));
  }, []);

  return (
    <div>
      <h1>MyFinance Dashboard</h1>
      <BarChart width={600} height={300} data={transactions}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="amount" fill="#82ca9d" />
      </BarChart>
    </div>
  );
};

export default App;
