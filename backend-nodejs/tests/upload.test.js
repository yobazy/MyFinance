// Upload functionality tests
const path = require('path');
const fs = require('fs');

describe('Upload Functionality', () => {
  test('should have upload route file', () => {
    const uploadPath = path.join(__dirname, '../routes/upload.js');
    expect(fs.existsSync(uploadPath)).toBe(true);
  });

  test('should have test files directory', () => {
    const testFilesPath = path.join(__dirname, '../../test_files');
    expect(fs.existsSync(testFilesPath)).toBe(true);
  });

  test('should have TD test files', () => {
    const tdPath = path.join(__dirname, '../../test_files/td_files');
    expect(fs.existsSync(tdPath)).toBe(true);
    
    const files = fs.readdirSync(tdPath);
    expect(files.length).toBeGreaterThan(0);
  });

  test('should have Amex test files', () => {
    const amexPath = path.join(__dirname, '../../test_files/amex_files');
    expect(fs.existsSync(amexPath)).toBe(true);
    
    const files = fs.readdirSync(amexPath);
    expect(files.length).toBeGreaterThan(0);
  });

  test('should have Scotiabank test files', () => {
    const scotiaPath = path.join(__dirname, '../../test_files/scotiabank');
    expect(fs.existsSync(scotiaPath)).toBe(true);
    
    const files = fs.readdirSync(scotiaPath);
    expect(files.length).toBeGreaterThan(0);
  });

  test('should have multer dependency for file uploads', () => {
    const multer = require('multer');
    expect(multer).toBeDefined();
  });

  test('should have xlsx dependency for Excel files', () => {
    const xlsx = require('xlsx');
    expect(xlsx).toBeDefined();
  });

  test('should have csv-parser dependency for CSV files', () => {
    const csvParser = require('csv-parser');
    expect(csvParser).toBeDefined();
  });
});
