import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  FormControlLabel, 
  Switch,
  Typography,
  Box,
  Divider,
  Paper,
  TextField,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  CircularProgress,
  Grid
} from "@mui/material";
import {
  Backup as BackupIcon,
  Restore as RestoreIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Settings as SettingsIcon,
  Storage as StorageIcon,
  Schedule as ScheduleIcon
} from "@mui/icons-material";

const UserSettings = () => {
  const [message, setMessage] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  
  // Backup settings state
  const [backupSettings, setBackupSettings] = useState({
    max_backups: 5,
    auto_backup_enabled: true,
    backup_frequency_hours: 24,
    backup_location: 'backups/'
  });
  const [backups, setBackups] = useState([]);
  const [backupStats, setBackupStats] = useState({});
  const [backupLoading, setBackupLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [restoreDialog, setRestoreDialog] = useState({ open: false, backupId: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, backupId: null });
  const [resetConfirmDialog, setResetConfirmDialog] = useState({ open: false });

  useEffect(() => {
    // Load theme preference on component mount
    const savedTheme = localStorage.getItem('theme');
    setDarkMode(savedTheme === 'dark');
    
    // Load backup settings and data
    fetchBackupSettings();
    fetchBackups();
    fetchBackupStats();
  }, []);

  const handleThemeToggle = () => {
    const newTheme = !darkMode ? 'dark' : 'light';
    setDarkMode(!darkMode);
    localStorage.setItem('theme', newTheme);
    // Emit theme change event
    window.dispatchEvent(new CustomEvent('themeChange', { detail: newTheme }));
  };

  const handleResetDatabase = () => {
    setResetConfirmDialog({ open: true });
  };

  const handleConfirmResetDatabase = async () => {
    try {
      const response = await axios.post("http://127.0.0.1:8000/api/reset-database/");
      setMessage(response.data.message);
      setResetConfirmDialog({ open: false });
    } catch (error) {
      setMessage("Failed to reset database.");
      setResetConfirmDialog({ open: false });
    }
  };

  // Backup-related functions
  const fetchBackupSettings = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/backup/settings/');
      const data = await response.json();
      setBackupSettings(data);
    } catch (error) {
      showSnackbar('Failed to fetch backup settings', 'error');
    }
  };

  const fetchBackups = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/backup/list/');
      const data = await response.json();
      setBackups(data);
    } catch (error) {
      showSnackbar('Failed to fetch backups', 'error');
    }
  };

  const fetchBackupStats = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/backup/stats/');
      const data = await response.json();
      setBackupStats(data);
    } catch (error) {
      showSnackbar('Failed to fetch backup statistics', 'error');
    }
  };

  const updateBackupSettings = async () => {
    setBackupLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/backup/settings/', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(backupSettings),
      });

      if (response.ok) {
        showSnackbar('Backup settings updated successfully', 'success');
        fetchBackupStats();
      } else {
        showSnackbar('Failed to update settings', 'error');
      }
    } catch (error) {
      showSnackbar('Failed to update settings', 'error');
    } finally {
      setBackupLoading(false);
    }
  };

  const createBackup = async () => {
    setBackupLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/backup/create/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          backup_type: 'manual',
          notes: 'Manual backup created by user'
        }),
      });

      if (response.ok) {
        showSnackbar('Backup created successfully', 'success');
        fetchBackups();
        fetchBackupStats();
      } else {
        const error = await response.json();
        showSnackbar(error.error || 'Failed to create backup', 'error');
      }
    } catch (error) {
      showSnackbar('Failed to create backup', 'error');
    } finally {
      setBackupLoading(false);
    }
  };

  const restoreBackup = async (backupId) => {
    setBackupLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/api/backup/restore/${backupId}/`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        showSnackbar(data.message || 'Database restored successfully', 'success');
        setRestoreDialog({ open: false, backupId: null });
      } else {
        const error = await response.json();
        showSnackbar(error.error || 'Failed to restore backup', 'error');
      }
    } catch (error) {
      showSnackbar('Failed to restore backup', 'error');
    } finally {
      setBackupLoading(false);
    }
  };

  const deleteBackup = async (backupId) => {
    setBackupLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/api/backup/delete/${backupId}/`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showSnackbar('Backup deleted successfully', 'success');
        fetchBackups();
        fetchBackupStats();
        setDeleteDialog({ open: false, backupId: null });
      } else {
        const error = await response.json();
        showSnackbar(error.error || 'Failed to delete backup', 'error');
      }
    } catch (error) {
      showSnackbar('Failed to delete backup', 'error');
    } finally {
      setBackupLoading(false);
    }
  };

  const downloadBackup = async (backupId) => {
    try {
      const response = await fetch(`http://localhost:8000/api/backup/download/${backupId}/`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_${backupId}.db.gz`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showSnackbar('Backup downloaded successfully', 'success');
      } else {
        showSnackbar('Failed to download backup', 'error');
      }
    } catch (error) {
      showSnackbar('Failed to download backup', 'error');
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getBackupTypeColor = (type) => {
    switch (type) {
      case 'auto': return 'primary';
      case 'manual': return 'secondary';
      case 'scheduled': return 'success';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        User Settings
      </Typography>
      
      <Grid container spacing={3}>
        {/* Appearance Settings */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Appearance
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={darkMode}
                  onChange={handleThemeToggle}
                />
              }
              label="Dark Mode"
            />
          </Paper>
        </Grid>

        {/* Database Reset */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Database Reset
            </Typography>
            <Button 
              onClick={handleResetDatabase} 
              variant="contained"
              color="error"
              sx={{ mb: 2 }}
            >
              Reset Database
            </Button>
            {message && (
              <Typography variant="body2" color="text.secondary">
                {message}
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Backup Settings */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <StorageIcon /> Database Backup Settings
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={backupSettings.auto_backup_enabled}
                          onChange={(e) => setBackupSettings({...backupSettings, auto_backup_enabled: e.target.checked})}
                        />
                      }
                      label="Enable Automatic Backups"
                    />

                    <TextField
                      label="Maximum Backups to Keep"
                      type="number"
                      value={backupSettings.max_backups}
                      onChange={(e) => setBackupSettings({...backupSettings, max_backups: parseInt(e.target.value) || 5})}
                      inputProps={{ min: 1, max: 50 }}
                      fullWidth
                    />

                    <TextField
                      label="Backup Frequency (hours)"
                      type="number"
                      value={backupSettings.backup_frequency_hours}
                      onChange={(e) => setBackupSettings({...backupSettings, backup_frequency_hours: parseInt(e.target.value) || 24})}
                      inputProps={{ min: 1, max: 168 }}
                      fullWidth
                      disabled={!backupSettings.auto_backup_enabled}
                    />

                    <TextField
                      label="Backup Location"
                      value={backupSettings.backup_location}
                      onChange={(e) => setBackupSettings({...backupSettings, backup_location: e.target.value})}
                      fullWidth
                    />

                    <Button
                      variant="contained"
                      onClick={updateBackupSettings}
                      disabled={backupLoading}
                      startIcon={backupLoading ? <CircularProgress size={20} /> : <SettingsIcon />}
                    >
                      Update Settings
                    </Button>
                  </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ScheduleIcon /> Backup Statistics
                  </Typography>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Typography variant="body2">
                      <strong>Total Backups:</strong> {backupStats.total_backups || 0}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Total Size:</strong> {backupStats.total_size_mb || 0} MB
                    </Typography>
                    <Typography variant="body2">
                      <strong>Max Backups:</strong> {backupStats.max_backups || 0}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Auto Backup:</strong> {backupStats.auto_backup_enabled ? 'Enabled' : 'Disabled'}
                    </Typography>
                    {backupStats.last_backup && (
                      <Typography variant="body2">
                        <strong>Last Backup:</strong> {formatDate(backupStats.last_backup)}
                      </Typography>
                    )}
                    {backupStats.next_auto_backup && (
                      <Typography variant="body2">
                        <strong>Next Auto Backup:</strong> {formatDate(backupStats.next_auto_backup)}
                      </Typography>
                    )}
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Backup Actions */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BackupIcon /> Backup Actions
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={createBackup}
                  disabled={backupLoading}
                  startIcon={backupLoading ? <CircularProgress size={20} /> : <BackupIcon />}
                >
                  Create Manual Backup
                </Button>
                
                <Button
                  variant="outlined"
                  onClick={() => { fetchBackups(); fetchBackupStats(); }}
                  startIcon={<ScheduleIcon />}
                >
                  Refresh
                </Button>
              </Box>

              {/* Backup List */}
              <Typography variant="h6" gutterBottom>
                Backup History
              </Typography>
              
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Type</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell>Size</TableCell>
                      <TableCell>Compressed</TableCell>
                      <TableCell>Notes</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {backups.map((backup) => (
                      <TableRow key={backup.id}>
                        <TableCell>
                          <Chip
                            label={backup.backup_type}
                            color={getBackupTypeColor(backup.backup_type)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{formatDate(backup.created_at)}</TableCell>
                        <TableCell>{formatFileSize(backup.file_size)}</TableCell>
                        <TableCell>{backup.is_compressed ? 'Yes' : 'No'}</TableCell>
                        <TableCell>{backup.notes || '-'}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <IconButton
                              size="small"
                              onClick={() => downloadBackup(backup.id)}
                              title="Download"
                            >
                              <DownloadIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => setRestoreDialog({ open: true, backupId: backup.id })}
                              title="Restore"
                              color="warning"
                            >
                              <RestoreIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => setDeleteDialog({ open: true, backupId: backup.id })}
                              title="Delete"
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Restore Confirmation Dialog */}
      <Dialog open={restoreDialog.open} onClose={() => setRestoreDialog({ open: false, backupId: null })}>
        <DialogTitle>Confirm Restore</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to restore this backup? This will replace your current database with the backup data including:
            <br />• All transactions and accounts
            <br />• All categories and subcategories
            <br />• All categorization rules and rule groups
            <br />• All backup settings and history
            <br /><br />
            <strong>This action cannot be undone!</strong>
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreDialog({ open: false, backupId: null })}>
            Cancel
          </Button>
          <Button
            onClick={() => restoreBackup(restoreDialog.backupId)}
            color="warning"
            variant="contained"
            disabled={backupLoading}
          >
            {backupLoading ? <CircularProgress size={20} /> : 'Restore'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, backupId: null })}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this backup? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, backupId: null })}>
            Cancel
          </Button>
          <Button
            onClick={() => deleteBackup(deleteDialog.backupId)}
            color="error"
            variant="contained"
            disabled={backupLoading}
          >
            {backupLoading ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reset Database Confirmation Dialog */}
      <Dialog open={resetConfirmDialog.open} onClose={() => setResetConfirmDialog({ open: false })}>
        <DialogTitle>Confirm Database Reset</DialogTitle>
        <DialogContent>
          <Typography>
            <strong>WARNING:</strong> This will permanently delete ALL data from your database including:
            <br />• All transactions and accounts
            <br />• All categories and subcategories
            <br />• All categorization rules and rule groups
            <br />• All backup settings and backup history
            <br /><br />
            This action cannot be undone! Make sure you have a backup if you want to preserve your data.
            <br /><br />
            Are you absolutely sure you want to reset the database?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetConfirmDialog({ open: false })}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmResetDatabase}
            color="error"
            variant="contained"
          >
            Yes, Reset Database
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UserSettings;
