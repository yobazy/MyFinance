import React, { useEffect, useState } from "react";
import axios from "axios";
import { Container, Typography, Card, CardContent, CircularProgress, Box, Button } from "@mui/material";
import { PieChart, Pie, Cell, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar, ResponsiveContainer } from "recharts";
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { useNavigate } from 'react-router-dom';
import { useTheme } from "@mui/material/styles";

const Visualizations = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const theme = useTheme();

  useEffect(() => {
    axios.get("http://127.0.0.1:8000/api/visualizations/")
      .then(response => {
        setData(response.data);
        setLoading(false);
      })
      .catch(error => {
        console.error("Error fetching visualization data:", error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  const hasTransactions = data && 
    data.category_spending?.length > 0 && 
    data.monthly_trend?.length > 0 && 
    Object.keys(data.category_variance || {}).length > 0;

  if (!hasTransactions) {
    return (
      <Container sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Financial Insights 📊
        </Typography>
        <Card 
          sx={{ 
            minHeight: '60vh', 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center', 
            alignItems: 'center',
            backgroundColor: theme.palette.background.paper,
            cursor: 'pointer',
            transition: 'transform 0.2s, box-shadow 0.2s',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: theme.shadows[4],
            }
          }}
          onClick={() => navigate('/upload')}
        >
          <CardContent sx={{ textAlign: 'center' }}>
            <AddCircleOutlineIcon sx={{ 
              fontSize: 80, 
              color: theme.palette.primary.main,
              mb: 2,
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'scale(1.1)',
              }
            }} />
            <Typography variant="h5" gutterBottom>
              No transactions yet
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 450, mx: 'auto', mb: 3 }}>
              Start by uploading your bank statements to see beautiful visualizations and insights about your spending patterns.
            </Typography>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={(e) => {
                e.stopPropagation();
                navigate('/upload');
              }}
            >
              Upload Your First Statement
            </Button>
          </CardContent>
        </Card>
      </Container>
    );
  }

  const COLORS = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.error.main,
  ];

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Financial Insights 📊
      </Typography>

      {/* Category Spending Breakdown (Pie Chart) */}
      <Card sx={{ mb: 3, backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Spending Breakdown by Category</Typography>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie 
                data={data.category_spending} 
                dataKey="total_amount" 
                nameKey="category__name" 
                cx="50%" 
                cy="50%" 
                outerRadius={100} 
                fill={COLORS[0]} 
                label
              >
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
      <Card sx={{ mb: 3, backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Monthly Spending Trend</Typography>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.monthly_trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="total_amount" 
                stroke={COLORS[1]}
                strokeWidth={2}
                dot={{ fill: COLORS[1] }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Spending Consistency (Bar Chart) */}
      <Card sx={{ mb: 3, backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Spending Consistency by Category</Typography>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={Object.entries(data.category_variance).map(([name, std_dev]) => ({ name, std_dev }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="std_dev" fill={COLORS[2]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </Container>
  );
};

export default Visualizations;
