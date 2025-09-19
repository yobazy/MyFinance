import React from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Box,
  Link,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Alert
} from '@mui/material';
import {
  AccountBalance as BankIcon,
  Description as DocumentIcon,
  Upload as UploadIcon,
  Help as HelpIcon,
  CheckCircle as CheckIcon,
  Info as InfoIcon
} from '@mui/icons-material';

const HelpPage = () => {
  const supportedBanks = [
    {
      name: "TD Bank",
      code: "TD",
      icon: "/bank_td_icon.svg",
      supportedFormats: ["CSV"],
      helpLinks: [
        {
          title: "How to Export Transactions from TD Bank",
          url: "https://www.td.com/ca/en/personal-banking/online-banking/help-and-support/export-transactions",
          description: "Step-by-step guide to export your transaction data"
        }
      ],
      instructions: [
        "Log into your TD Bank online banking",
        "Navigate to Account History or Transaction History",
        "Select the date range you want to export",
        "Choose 'Export' or 'Download' option",
        "Select CSV format when prompted",
        "Download the file to your computer"
      ]
    },
    {
      name: "American Express",
      code: "AMEX",
      icon: "/bank_amex_icon.svg",
      supportedFormats: ["XLS", "XLSX"],
      helpLinks: [
        {
          title: "How to Download Account Activity from Amex",
          url: "https://www.americanexpress.com/ca/en/help/account-activity-download.html",
          description: "Official Amex guide for downloading account data"
        }
      ],
      instructions: [
        "Log into your American Express online account",
        "Go to 'Account' tab and select 'Statements & Activity'",
        "Choose 'Download' from the account activity page",
        "Select your desired date range",
        "Choose Excel format (.xls or .xlsx)",
        "Download the file to your computer"
      ]
    },
    {
      name: "Scotiabank",
      code: "SCOTIA",
      icon: "/bank_scotia_icon.svg",
      supportedFormats: ["CSV", "XLS", "TXT", "TTX"],
      helpLinks: [
        {
          title: "ScotiaConnect File Download Guide",
          url: "https://www1.scotiaconnect.scotiabank.com/help/secured/en_US/file_download.htm",
          description: "Complete guide for exporting transactions and balances from ScotiaConnect"
        }
      ],
      instructions: [
        "Log into ScotiaConnect online banking",
        "Navigate to 'Account Information' menu",
        "Select 'Transaction Search' then 'Transactions - One Time'",
        "Choose your record layout (Canada/USA/Global)",
        "Select export format (CSV recommended)",
        "Choose date range and transaction type",
        "Select accounts to include in export",
        "Click 'Export' and save the file"
      ]
    }
  ];

  const generalInstructions = [
    "Upload your bank statement file using the Upload page",
    "Select the correct bank and account from the dropdown",
    "The system will automatically process and categorize your transactions",
    "Review and adjust categories as needed in the Transactions page",
    "Use the Analytics page to view spending patterns and insights"
  ];

  const fileFormatInfo = [
    {
      format: "CSV",
      description: "Comma-separated values file",
      banks: ["TD Bank", "Scotiabank"],
      note: "Most common format, easy to process"
    },
    {
      format: "XLS/XLSX",
      description: "Microsoft Excel spreadsheet",
      banks: ["American Express", "Scotiabank"],
      note: "Rich format with multiple sheets possible"
    },
    {
      format: "TXT",
      description: "Fixed-length text file",
      banks: ["Scotiabank"],
      note: "Less common, used for specific exports"
    },
    {
      format: "TTX",
      description: "Tab-separated text file",
      banks: ["Scotiabank"],
      note: "Alternative text format"
    }
  ];

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <HelpIcon color="primary" />
          Help & Support
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Get help with uploading and managing your financial data from supported banks.
        </Typography>
      </Box>

      <Alert severity="info" sx={{ mb: 4 }}>
        <Typography variant="body2">
          <strong>Quick Start:</strong> Upload your bank statement file, select the correct bank and account, 
          and let our system automatically process and categorize your transactions.
        </Typography>
      </Alert>

      {/* Supported Banks Section */}
      <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 4, mb: 3 }}>
        Supported Banks
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {supportedBanks.map((bank) => (
          <Grid item xs={12} md={6} lg={4} key={bank.code}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <img 
                    src={bank.icon} 
                    alt={`${bank.name} Logo`}
                    style={{ 
                      width: '40px', 
                      height: '40px', 
                      marginRight: '12px',
                      objectFit: 'contain'
                    }}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <Typography variant="h6" component="h3">
                    {bank.name}
                  </Typography>
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Supported Formats:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {bank.supportedFormats.map((format) => (
                      <Chip 
                        key={format} 
                        label={format} 
                        size="small" 
                        color="primary" 
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </Box>

                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Help Documentation:
                </Typography>
                {bank.helpLinks.map((link, index) => (
                  <Link 
                    key={index}
                    href={link.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    sx={{ 
                      display: 'block', 
                      mb: 1,
                      textDecoration: 'none',
                      '&:hover': { textDecoration: 'underline' }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                      <DocumentIcon fontSize="small" color="primary" sx={{ mt: 0.5 }} />
                      <Box>
                        <Typography variant="body2" color="primary">
                          {link.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {link.description}
                        </Typography>
                      </Box>
                    </Box>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Step-by-Step Instructions */}
      <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 4, mb: 3 }}>
        How to Export from Each Bank
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {supportedBanks.map((bank) => (
          <Grid item xs={12} md={6} key={`instructions-${bank.code}`}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BankIcon color="primary" />
                {bank.name}
              </Typography>
              <List dense>
                {bank.instructions.map((instruction, index) => (
                  <ListItem key={index} sx={{ py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <Typography variant="body2" color="primary" fontWeight="bold">
                        {index + 1}.
                      </Typography>
                    </ListItemIcon>
                    <ListItemText 
                      primary={instruction}
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* General Upload Instructions */}
      <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 4, mb: 3 }}>
        General Upload Process
      </Typography>
      
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <UploadIcon color="primary" />
          Step-by-Step Upload Guide
        </Typography>
        <List>
          {generalInstructions.map((instruction, index) => (
            <ListItem key={index} sx={{ py: 0.5 }}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <CheckIcon color="success" fontSize="small" />
              </ListItemIcon>
              <ListItemText 
                primary={instruction}
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
          ))}
        </List>
      </Paper>

      {/* File Format Information */}
      <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 4, mb: 3 }}>
        Supported File Formats
      </Typography>
      
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {fileFormatInfo.map((format) => (
          <Grid item xs={12} sm={6} md={3} key={format.format}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {format.format}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {format.description}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Supported by:</strong>
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                  {format.banks.map((bank) => (
                    <Chip 
                      key={bank} 
                      label={bank} 
                      size="small" 
                      variant="outlined"
                    />
                  ))}
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {format.note}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Troubleshooting */}
      <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 4, mb: 3 }}>
        Troubleshooting
      </Typography>
      
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <InfoIcon color="primary" />
          Common Issues and Solutions
        </Typography>
        <List>
          <ListItem>
            <ListItemText 
              primary="File upload fails or shows error"
              secondary="Ensure the file format matches your selected bank. Check that the file is not corrupted and is under 10MB in size."
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="Transactions not appearing correctly"
              secondary="Verify you've selected the correct bank and account. Some banks have different export formats for different account types."
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="Date format issues"
              secondary="The system automatically detects common date formats. If dates appear incorrect, check your bank's export settings."
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="Missing transactions"
              secondary="Ensure your date range includes all desired transactions. Some banks limit the number of transactions per export."
            />
          </ListItem>
        </List>
      </Paper>

      <Divider sx={{ my: 4 }} />
      
      <Box sx={{ textAlign: 'center', py: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Need more help? Check the individual bank help links above or contact support.
        </Typography>
      </Box>
    </Container>
  );
};

export default HelpPage;
