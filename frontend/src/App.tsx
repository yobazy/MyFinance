import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { AppBar, Toolbar, Typography, Button, Container } from "@mui/material";
import Dashboard from "./pages/Dashboard";
import Accounts from "./pages/AccountsPage.js";
import FileUploader from "./pages/FileUploader";
import Categorization from "./pages/Categorization";
import Visualizations from "./pages/Visualizations";
import Transactions from "./pages/Transactions.tsx";

const App = () => {
  return (
    <Router>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            MyFinance Dashboard
          </Typography>
          <Button color="inherit" component={Link} to="/">
            Home
          </Button>
          <Button color="inherit" component={Link} to="/accounts">
            Accounts
          </Button>
          <Button color="inherit" component={Link} to="/upload">
            File Uploader
          </Button>
          <Button color="inherit" component={Link} to="/transactions">
            Transactions
          </Button>
          <Button color="inherit" component={Link} to="/categorization">
            Categorization
          </Button>
          <Button color="inherit" component={Link} to="/visualizations">
            Visualizations
          </Button>
        </Toolbar>
      </AppBar>

      <Container sx={{ mt: 4 }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/upload" element={<FileUploader />} />
          <Route path="/categorization" element={<Categorization />} />
          <Route path="/visualizations" element={<Visualizations />} />
          <Route path="/transactions" element={<Transactions />} />
        </Routes>
      </Container>
    </Router>
  );
};

export default App;
