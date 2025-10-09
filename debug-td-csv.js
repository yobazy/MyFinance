const fs = require('fs');
const csv = require('csv-parser');

console.log('Testing TD CSV parsing...');

const results = [];

fs.createReadStream('/Users/bazil/Documents/Programming/my-finance-dash/MyFinance/test_files/td_files/accountactivity.csv')
  .pipe(csv({
    headers: ['Date', 'Description', 'Amount', 'Credit', 'Balance'],
    skipEmptyLines: true
  }))
  .on('data', (data) => {
    console.log('CSV row:', data);
    results.push(data);
  })
  .on('end', () => {
    console.log('Total rows parsed:', results.length);
    console.log('First few rows:');
    results.slice(0, 3).forEach((row, index) => {
      console.log(`Row ${index + 1}:`, row);
    });
  })
  .on('error', (error) => {
    console.error('Error:', error);
  });
