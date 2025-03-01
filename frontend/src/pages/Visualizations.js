import React, { useEffect, useState } from "react";
import axios from "axios";
import { Container, Typography, Card, CardContent, CircularProgress } from "@mui/material";
import { PieChart, Pie, Cell, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar, ResponsiveContainer } from "recharts";

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff6b6b", "#a29bfe"];

const Visualizations = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get("http://127.0.0.1:8000/api/visualizations/")
      .then(response => {
        setData(response.data);
        setLoading(false);
      })
      .catch(error => console.error("Error fetching visualization data:", error));
  }, []);

  if (loading) return <CircularProgress />;

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Financial Insights 📊
      </Typography>

      {/* Category Spending Breakdown (Pie Chart) */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6">Spending Breakdown by Category</Typography>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={data.category_spending} dataKey="total_amount" nameKey="category__name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label>
                {data.category_spending.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Monthly Spending Trend (Line Chart) */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6">Monthly Spending Trend</Typography>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.monthly_trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="total_amount" stroke="#82ca9d" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Spending Consistency (Bar Chart) */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6">Spending Consistency by Category</Typography>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={Object.entries(data.category_variance).map(([name, std_dev]) => ({ name, std_dev }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="std_dev" fill="#ffc658" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </Container>
  );
};

export default Visualizations;
