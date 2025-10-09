const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const csv = require('csv-parser');
const { Transaction, Account, TDTransaction, AmexTransaction, ScotiabankTransaction } = require('../models');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.csv', '.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and Excel files are allowed'), false);
    }
  }
});

// Single file upload
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const { file_type, bank, account } = req.body;
    const uploadedFile = req.file;

    if (!uploadedFile) {
      return res.status(400).json({ error: 'No file provided' });
    }

    if (!bank || !account) {
      return res.status(400).json({ error: 'Bank and account are required' });
    }

    // Get or create the account
    const accountRecord = await Account.findOne({
      where: { bank: bank, name: account }
    });

    if (!accountRecord) {
      return res.status(400).json({ 
        error: `Account '${account}' not found for bank '${bank}'` 
      });
    }

    let rowsProcessed = 0;

    try {
      if (file_type === 'TD') {
        rowsProcessed = await processTDData(uploadedFile.path, accountRecord);
      } else if (file_type === 'Amex') {
        rowsProcessed = await processAmexData(uploadedFile.path, accountRecord);
      } else if (file_type === 'Scotiabank') {
        rowsProcessed = await processScotiabankData(uploadedFile.path, accountRecord);
      } else {
        return res.status(400).json({ error: 'Unsupported file type' });
      }

      res.json({ 
        message: `${file_type} file uploaded successfully`, 
        rows_processed: rowsProcessed 
      });
    } catch (error) {
      console.error('Error processing file:', error);
      res.status(500).json({ error: `Error processing file: ${error.message}` });
    } finally {
      // Clean up uploaded file
      if (fs.existsSync(uploadedFile.path)) {
        fs.unlinkSync(uploadedFile.path);
      }
    }
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Multiple files upload
router.post('/multiple', upload.array('files', 10), async (req, res) => {
  try {
    const { file_type, bank, account } = req.body;
    const uploadedFiles = req.files;

    if (!uploadedFiles || uploadedFiles.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    if (!bank || !account) {
      return res.status(400).json({ error: 'Bank and account are required' });
    }

    // Get or create the account
    const accountRecord = await Account.findOne({
      where: { bank: bank, name: account }
    });

    if (!accountRecord) {
      return res.status(400).json({ 
        error: `Account '${account}' not found for bank '${bank}'` 
      });
    }

    const results = [];
    let totalRowsProcessed = 0;
    let successfulUploads = 0;
    let failedUploads = 0;

    for (const uploadedFile of uploadedFiles) {
      const fileResult = {
        filename: uploadedFile.originalname,
        success: false,
        rows_processed: 0,
        error: null
      };

      try {
        let rowsProcessed = 0;

        if (file_type === 'TD') {
          rowsProcessed = await processTDData(uploadedFile.path, accountRecord);
        } else if (file_type === 'Amex') {
          rowsProcessed = await processAmexData(uploadedFile.path, accountRecord);
        } else if (file_type === 'Scotiabank') {
          rowsProcessed = await processScotiabankData(uploadedFile.path, accountRecord);
        } else {
          fileResult.error = 'Unsupported file type';
          results.push(fileResult);
          failedUploads++;
          continue;
        }

        fileResult.success = true;
        fileResult.rows_processed = rowsProcessed;
        totalRowsProcessed += rowsProcessed;
        successfulUploads++;
      } catch (error) {
        fileResult.error = `Error processing file: ${error.message}`;
        failedUploads++;
      } finally {
        // Clean up uploaded file
        if (fs.existsSync(uploadedFile.path)) {
          fs.unlinkSync(uploadedFile.path);
        }
      }

      results.push(fileResult);
    }

    res.json({
      message: `Upload completed: ${successfulUploads} successful, ${failedUploads} failed`,
      total_rows_processed: totalRowsProcessed,
      successful_uploads: successfulUploads,
      failed_uploads: failedUploads,
      file_results: results
    });
  } catch (error) {
    console.error('Multiple upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper functions for processing different file types
async function processTDData(filePath, account) {
  return new Promise((resolve, reject) => {
    const results = [];
    
    fs.createReadStream(filePath)
      .pipe(csv({
        headers: ['Date', 'Description', 'Amount', 'Credit', 'Balance'],
        skipEmptyLines: true
      }))
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        try {
          let rowsProcessed = 0;

          for (const row of results) {
            if (!row.Date || !row.Description) continue;

            // Convert date - handle MM/DD/YYYY format
            const date = new Date(row.Date);
            if (isNaN(date.getTime())) continue;

            // Handle amount - TD CSV format has Amount, Credit columns
            // If Credit column has value, it's a credit (positive amount), otherwise Amount is debit (negative)
            let amount = 0;
            if (row.Credit && row.Credit.trim() !== '') {
              // This is a credit (positive amount - money coming in)
              const creditStr = String(row.Credit).replace(/[$,\s]/g, '');
              amount = parseFloat(creditStr) || 0;
            } else if (row.Amount && row.Amount.trim() !== '') {
              // This is a debit (negative amount - money going out)
              const amountStr = String(row.Amount).replace(/[$,\s]/g, '');
              amount = -(parseFloat(amountStr) || 0);
            } else {
              continue; // Skip if no amount data
            }

            // Convert description to uppercase
            const description = String(row.Description).toUpperCase();

            // Create TDTransaction record
            await TDTransaction.create({
              date: date.toISOString().split('T')[0],
              chargeName: description,
              creditAmt: amount > 0 ? amount : null,
              debitAmt: amount < 0 ? Math.abs(amount) : null,
              balance: null
            });

            // Create Transaction record
            await Transaction.create({
              date: date.toISOString().split('T')[0],
              description: description,
              amount: amount,
              source: 'TD',
              accountId: account.id
            });

            rowsProcessed++;
          }

          // Update account balance - skip for now to test transaction creation
          // const newBalance = await Transaction.sum('amount', {
          //   where: { accountId: account.id }
          // });
          // account.balance = newBalance || 0;
          // await account.save();

          resolve(rowsProcessed);
        } catch (error) {
          reject(error);
        }
      })
      .on('error', reject);
  });
}

async function processAmexData(filePath, account) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Try to find the data section - look for rows with actual transaction data
  let data = [];
  let startRow = 0;
  
  // First, try the current approach (skip first 11 rows)
  try {
    data = XLSX.utils.sheet_to_json(worksheet, { range: 11 });
    if (data.length > 0 && data[0].Date && data[0].Description) {
      startRow = 11;
    }
  } catch (e) {
    // If that fails, try without range
  }
  
  // If the first approach didn't work, try to find the data section
  if (data.length === 0 || !data[0].Date || !data[0].Description) {
    const allData = XLSX.utils.sheet_to_json(worksheet);
    for (let i = 0; i < allData.length; i++) {
      const row = allData[i];
      if (row.Date && row.Description && row.Amount) {
        data = allData.slice(i);
        startRow = i;
        break;
      }
    }
  }

  let rowsProcessed = 0;

  for (const row of data) {
    // Use correct column names from Amex file structure
    if (!row.Date || !row.Description) continue;

    // Convert dates - handle different date formats
    let date, dateProcessed;
    
    try {
      // Try parsing as Excel date number first
      if (typeof row.Date === 'number') {
        date = new Date((row.Date - 25569) * 86400 * 1000);
      } else {
        date = new Date(row.Date);
      }
      
      if (row['Date Processed']) {
        if (typeof row['Date Processed'] === 'number') {
          dateProcessed = new Date((row['Date Processed'] - 25569) * 86400 * 1000);
        } else {
          dateProcessed = new Date(row['Date Processed']);
        }
      } else {
        dateProcessed = date;
      }
    } catch (e) {
      continue;
    }
    
    if (isNaN(date.getTime()) || isNaN(dateProcessed.getTime())) {
      continue;
    }

    // Handle amount - remove currency symbols and parse
    let amountStr = String(row.Amount || 0);
    // Remove currency symbols, commas, and spaces
    amountStr = amountStr.replace(/[$,\s]/g, '');
    // Handle negative amounts (like "-$508.80")
    const isNegative = amountStr.startsWith('-');
    if (isNegative) {
      amountStr = amountStr.substring(1);
    }
    const amount = parseFloat(amountStr) || 0;
    const finalAmount = isNegative ? -amount : amount;

    // Convert description to uppercase
    const description = String(row.Description).toUpperCase();

    try {
      // Create AmexTransaction record with available fields
      await AmexTransaction.create({
        date: date.toISOString().split('T')[0],
        dateProcessed: dateProcessed.toISOString().split('T')[0],
        description: description,
        cardmember: row.Cardmember || row['Additional Information'] || '',
        amount: finalAmount,
        commission: parseFloat(row.commission) || 0,
        excRate: parseFloat(row.exc_rate) || 0,
        merchant: row.Merchant || row['Additional Information'] || ''
      });

      // Create Transaction record
      await Transaction.create({
        date: date.toISOString().split('T')[0],
        description: description,
        amount: finalAmount,
        source: 'Amex',
        accountId: account.id
      });

      rowsProcessed++;
    } catch (dbError) {
      console.error('Database error for row:', dbError.message);
    }
  }

  // Update account balance
  await account.updateBalance();

  return rowsProcessed;
}

async function processScotiabankData(filePath, account) {
  return new Promise((resolve, reject) => {
    const results = [];
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        try {
          let rowsProcessed = 0;

          for (const row of results) {
            if (!row.Date || !row.Description) continue;

            // Convert date - handle both YYYY-MM-DD and other formats
            let date;
            if (row.Date.includes('-')) {
              // Already in YYYY-MM-DD format
              date = new Date(row.Date);
            } else {
              // Try other date formats
              date = new Date(row.Date);
            }
            
            if (isNaN(date.getTime())) continue;

            // Handle amount - Scotiabank uses negative for credits, positive for debits
            const amountStr = String(row.Amount || 0).replace(/[$,\s]/g, '');
            const amount = parseFloat(amountStr) || 0;

            // Convert description to uppercase
            const description = String(row.Description).toUpperCase();

            // Create ScotiabankTransaction record
            await ScotiabankTransaction.create({
              date: date.toISOString().split('T')[0],
              description: description,
              subDescription: row['Sub-description'] || '',
              status: row.Status || '',
              transactionType: row['Type of Transaction'] || '',
              amount: amount
            });

            // Create Transaction record
            await Transaction.create({
              date: date.toISOString().split('T')[0],
              description: description,
              amount: amount,
              source: 'Scotiabank',
              accountId: account.id
            });

            rowsProcessed++;
          }

          // Update account balance
          await account.updateBalance();

          resolve(rowsProcessed);
        } catch (error) {
          reject(error);
        }
      })
      .on('error', reject);
  });
}

module.exports = router;
