// Simple utility tests
const path = require('path');
const fs = require('fs');

describe('Backend Utilities', () => {
  test('should have required dependencies', () => {
    const express = require('express');
    const { Sequelize } = require('sequelize');
    const cors = require('cors');
    
    expect(express).toBeDefined();
    expect(Sequelize).toBeDefined();
    expect(cors).toBeDefined();
  });

  test('should have database config', () => {
    const dbConfig = require('../config/database');
    expect(dbConfig).toBeDefined();
    expect(dbConfig.sequelize).toBeDefined();
  });

  test('should have models directory', () => {
    const modelsPath = path.join(__dirname, '../models');
    expect(fs.existsSync(modelsPath)).toBe(true);
  });

  test('should have routes directory', () => {
    const routesPath = path.join(__dirname, '../routes');
    expect(fs.existsSync(routesPath)).toBe(true);
  });

  test('should have server.js file', () => {
    const serverPath = path.join(__dirname, '../server.js');
    expect(fs.existsSync(serverPath)).toBe(true);
  });
});
