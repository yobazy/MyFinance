const fs = require('fs');
const path = require('path');
const winston = require('winston');
const AWS = require('aws-sdk');
const { Storage } = require('@google-cloud/storage');
const { BlobServiceClient } = require('@azure/storage-blob');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'cloud-storage' },
  transports: [
    new winston.transports.File({ filename: 'logs/cloud-storage-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/cloud-storage-combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

class CloudStorageService {
  constructor() {
    this.providers = new Map();
    this.initialized = false;
  }

  /**
   * Initialize cloud storage providers
   * @param {Object} config - Cloud storage configuration
   * @returns {Promise<void>}
   */
  async initialize(config = {}) {
    try {
      logger.info('Initializing cloud storage service');

      // Initialize AWS S3 if configured
      if (config.aws) {
        await this.initializeAWS(config.aws);
      }

      // Initialize Google Cloud Storage if configured
      if (config.google) {
        await this.initializeGoogleCloud(config.google);
      }

      // Initialize Azure Blob Storage if configured
      if (config.azure) {
        await this.initializeAzure(config.azure);
      }

      this.initialized = true;
      logger.info('Cloud storage service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize cloud storage service', { error: error.message });
      throw error;
    }
  }

  /**
   * Initialize AWS S3
   * @param {Object} config - AWS configuration
   * @returns {Promise<void>}
   */
  async initializeAWS(config) {
    try {
      const s3 = new AWS.S3({
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
        region: config.region || 'us-east-1'
      });

      this.providers.set('aws_s3', {
        client: s3,
        bucket: config.bucket,
        region: config.region || 'us-east-1'
      });

      logger.info('AWS S3 initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize AWS S3', { error: error.message });
      throw error;
    }
  }

  /**
   * Initialize Google Cloud Storage
   * @param {Object} config - Google Cloud configuration
   * @returns {Promise<void>}
   */
  async initializeGoogleCloud(config) {
    try {
      const storage = new Storage({
        projectId: config.projectId,
        keyFilename: config.keyFilename,
        credentials: config.credentials
      });

      this.providers.set('google_cloud', {
        client: storage,
        bucket: storage.bucket(config.bucket)
      });

      logger.info('Google Cloud Storage initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Google Cloud Storage', { error: error.message });
      throw error;
    }
  }

  /**
   * Initialize Azure Blob Storage
   * @param {Object} config - Azure configuration
   * @returns {Promise<void>}
   */
  async initializeAzure(config) {
    try {
      const blobServiceClient = BlobServiceClient.fromConnectionString(config.connectionString);
      
      this.providers.set('azure', {
        client: blobServiceClient,
        containerName: config.containerName
      });

      logger.info('Azure Blob Storage initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Azure Blob Storage', { error: error.message });
      throw error;
    }
  }

  /**
   * Upload backup to cloud storage
   * @param {string} filePath - Local file path
   * @param {string} fileName - Remote file name
   * @param {string} provider - Cloud provider ('aws_s3', 'google_cloud', 'azure')
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} Upload result
   */
  async uploadBackup(filePath, fileName, provider, options = {}) {
    if (!this.initialized) {
      throw new Error('Cloud storage service not initialized');
    }

    const providerConfig = this.providers.get(provider);
    if (!providerConfig) {
      throw new Error(`Provider ${provider} not configured`);
    }

    try {
      logger.info(`Uploading backup to ${provider}`, { fileName, filePath });

      let result;
      switch (provider) {
        case 'aws_s3':
          result = await this.uploadToS3(filePath, fileName, providerConfig, options);
          break;
        case 'google_cloud':
          result = await this.uploadToGoogleCloud(filePath, fileName, providerConfig, options);
          break;
        case 'azure':
          result = await this.uploadToAzure(filePath, fileName, providerConfig, options);
          break;
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }

      logger.info(`Backup uploaded successfully to ${provider}`, { fileName, url: result.url });
      return result;

    } catch (error) {
      logger.error(`Failed to upload backup to ${provider}`, { 
        error: error.message, 
        fileName, 
        filePath 
      });
      throw error;
    }
  }

  /**
   * Upload to AWS S3
   * @param {string} filePath - Local file path
   * @param {string} fileName - Remote file name
   * @param {Object} config - Provider configuration
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} Upload result
   */
  async uploadToS3(filePath, fileName, config, options = {}) {
    const fileContent = fs.readFileSync(filePath);
    
    const params = {
      Bucket: config.bucket,
      Key: fileName,
      Body: fileContent,
      ContentType: 'application/gzip',
      ServerSideEncryption: options.encryption || 'AES256',
      Metadata: {
        'backup-type': options.backupType || 'manual',
        'created-at': new Date().toISOString(),
        'file-size': fileContent.length.toString()
      }
    };

    const result = await config.client.upload(params).promise();
    
    return {
      url: result.Location,
      key: result.Key,
      bucket: result.Bucket,
      etag: result.ETag,
      size: fileContent.length
    };
  }

  /**
   * Upload to Google Cloud Storage
   * @param {string} filePath - Local file path
   * @param {string} fileName - Remote file name
   * @param {Object} config - Provider configuration
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} Upload result
   */
  async uploadToGoogleCloud(filePath, fileName, config, options = {}) {
    const file = config.bucket.file(fileName);
    
    const metadata = {
      contentType: 'application/gzip',
      metadata: {
        'backup-type': options.backupType || 'manual',
        'created-at': new Date().toISOString(),
        'file-size': fs.statSync(filePath).size.toString()
      }
    };

    await file.upload(filePath, { metadata });
    
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 1000 * 60 * 60 * 24 * 7 // 7 days
    });

    return {
      url: url,
      name: fileName,
      bucket: config.bucket.name,
      size: fs.statSync(filePath).size
    };
  }

  /**
   * Upload to Azure Blob Storage
   * @param {string} filePath - Local file path
   * @param {string} fileName - Remote file name
   * @param {Object} config - Provider configuration
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} Upload result
   */
  async uploadToAzure(filePath, fileName, config, options = {}) {
    const containerClient = config.client.getContainerClient(config.containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(fileName);

    const fileContent = fs.readFileSync(filePath);
    
    const uploadOptions = {
      blobHTTPHeaders: {
        blobContentType: 'application/gzip'
      },
      metadata: {
        'backup-type': options.backupType || 'manual',
        'created-at': new Date().toISOString(),
        'file-size': fileContent.length.toString()
      }
    };

    await blockBlobClient.upload(fileContent, fileContent.length, uploadOptions);
    
    return {
      url: blockBlobClient.url,
      name: fileName,
      container: config.containerName,
      size: fileContent.length
    };
  }

  /**
   * Download backup from cloud storage
   * @param {string} fileName - Remote file name
   * @param {string} provider - Cloud provider
   * @param {string} localPath - Local download path
   * @returns {Promise<Object>} Download result
   */
  async downloadBackup(fileName, provider, localPath) {
    if (!this.initialized) {
      throw new Error('Cloud storage service not initialized');
    }

    const providerConfig = this.providers.get(provider);
    if (!providerConfig) {
      throw new Error(`Provider ${provider} not configured`);
    }

    try {
      logger.info(`Downloading backup from ${provider}`, { fileName, localPath });

      let result;
      switch (provider) {
        case 'aws_s3':
          result = await this.downloadFromS3(fileName, localPath, providerConfig);
          break;
        case 'google_cloud':
          result = await this.downloadFromGoogleCloud(fileName, localPath, providerConfig);
          break;
        case 'azure':
          result = await this.downloadFromAzure(fileName, localPath, providerConfig);
          break;
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }

      logger.info(`Backup downloaded successfully from ${provider}`, { fileName, localPath });
      return result;

    } catch (error) {
      logger.error(`Failed to download backup from ${provider}`, { 
        error: error.message, 
        fileName, 
        localPath 
      });
      throw error;
    }
  }

  /**
   * Download from AWS S3
   * @param {string} fileName - Remote file name
   * @param {string} localPath - Local download path
   * @param {Object} config - Provider configuration
   * @returns {Promise<Object>} Download result
   */
  async downloadFromS3(fileName, localPath, config) {
    const params = {
      Bucket: config.bucket,
      Key: fileName
    };

    const result = await config.client.getObject(params).promise();
    fs.writeFileSync(localPath, result.Body);
    
    return {
      localPath: localPath,
      size: result.ContentLength,
      lastModified: result.LastModified
    };
  }

  /**
   * Download from Google Cloud Storage
   * @param {string} fileName - Remote file name
   * @param {string} localPath - Local download path
   * @param {Object} config - Provider configuration
   * @returns {Promise<Object>} Download result
   */
  async downloadFromGoogleCloud(fileName, localPath, config) {
    const file = config.bucket.file(fileName);
    
    const [metadata] = await file.getMetadata();
    await file.download({ destination: localPath });
    
    return {
      localPath: localPath,
      size: parseInt(metadata.size),
      lastModified: new Date(metadata.updated)
    };
  }

  /**
   * Download from Azure Blob Storage
   * @param {string} fileName - Remote file name
   * @param {string} localPath - Local download path
   * @param {Object} config - Provider configuration
   * @returns {Promise<Object>} Download result
   */
  async downloadFromAzure(fileName, localPath, config) {
    const containerClient = config.client.getContainerClient(config.containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(fileName);

    const downloadResponse = await blockBlobClient.download(0);
    const downloadedContent = await this.streamToBuffer(downloadResponse.readableStreamBody);
    fs.writeFileSync(localPath, downloadedContent);

    const properties = await blockBlobClient.getProperties();
    
    return {
      localPath: localPath,
      size: properties.contentLength,
      lastModified: properties.lastModified
    };
  }

  /**
   * Delete backup from cloud storage
   * @param {string} fileName - Remote file name
   * @param {string} provider - Cloud provider
   * @returns {Promise<boolean>} Delete result
   */
  async deleteBackup(fileName, provider) {
    if (!this.initialized) {
      throw new Error('Cloud storage service not initialized');
    }

    const providerConfig = this.providers.get(provider);
    if (!providerConfig) {
      throw new Error(`Provider ${provider} not configured`);
    }

    try {
      logger.info(`Deleting backup from ${provider}`, { fileName });

      let result;
      switch (provider) {
        case 'aws_s3':
          result = await this.deleteFromS3(fileName, providerConfig);
          break;
        case 'google_cloud':
          result = await this.deleteFromGoogleCloud(fileName, providerConfig);
          break;
        case 'azure':
          result = await this.deleteFromAzure(fileName, providerConfig);
          break;
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }

      logger.info(`Backup deleted successfully from ${provider}`, { fileName });
      return result;

    } catch (error) {
      logger.error(`Failed to delete backup from ${provider}`, { 
        error: error.message, 
        fileName 
      });
      throw error;
    }
  }

  /**
   * Delete from AWS S3
   * @param {string} fileName - Remote file name
   * @param {Object} config - Provider configuration
   * @returns {Promise<boolean>} Delete result
   */
  async deleteFromS3(fileName, config) {
    const params = {
      Bucket: config.bucket,
      Key: fileName
    };

    await config.client.deleteObject(params).promise();
    return true;
  }

  /**
   * Delete from Google Cloud Storage
   * @param {string} fileName - Remote file name
   * @param {Object} config - Provider configuration
   * @returns {Promise<boolean>} Delete result
   */
  async deleteFromGoogleCloud(fileName, config) {
    const file = config.bucket.file(fileName);
    await file.delete();
    return true;
  }

  /**
   * Delete from Azure Blob Storage
   * @param {string} fileName - Remote file name
   * @param {Object} config - Provider configuration
   * @returns {Promise<boolean>} Delete result
   */
  async deleteFromAzure(fileName, config) {
    const containerClient = config.client.getContainerClient(config.containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(fileName);
    await blockBlobClient.delete();
    return true;
  }

  /**
   * List backups in cloud storage
   * @param {string} provider - Cloud provider
   * @param {Object} options - List options
   * @returns {Promise<Array>} List of backups
   */
  async listBackups(provider, options = {}) {
    if (!this.initialized) {
      throw new Error('Cloud storage service not initialized');
    }

    const providerConfig = this.providers.get(provider);
    if (!providerConfig) {
      throw new Error(`Provider ${provider} not configured`);
    }

    try {
      logger.info(`Listing backups from ${provider}`);

      let result;
      switch (provider) {
        case 'aws_s3':
          result = await this.listFromS3(providerConfig, options);
          break;
        case 'google_cloud':
          result = await this.listFromGoogleCloud(providerConfig, options);
          break;
        case 'azure':
          result = await this.listFromAzure(providerConfig, options);
          break;
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }

      logger.info(`Listed ${result.length} backups from ${provider}`);
      return result;

    } catch (error) {
      logger.error(`Failed to list backups from ${provider}`, { error: error.message });
      throw error;
    }
  }

  /**
   * List from AWS S3
   * @param {Object} config - Provider configuration
   * @param {Object} options - List options
   * @returns {Promise<Array>} List of backups
   */
  async listFromS3(config, options = {}) {
    const params = {
      Bucket: config.bucket,
      Prefix: options.prefix || 'myfinance_backup_',
      MaxKeys: options.maxKeys || 1000
    };

    const result = await config.client.listObjectsV2(params).promise();
    
    return result.Contents.map(item => ({
      name: item.Key,
      size: item.Size,
      lastModified: item.LastModified,
      etag: item.ETag
    }));
  }

  /**
   * List from Google Cloud Storage
   * @param {Object} config - Provider configuration
   * @param {Object} options - List options
   * @returns {Promise<Array>} List of backups
   */
  async listFromGoogleCloud(config, options = {}) {
    const [files] = await config.bucket.getFiles({
      prefix: options.prefix || 'myfinance_backup_',
      maxResults: options.maxResults || 1000
    });

    return files.map(file => ({
      name: file.name,
      size: parseInt(file.metadata.size),
      lastModified: new Date(file.metadata.updated)
    }));
  }

  /**
   * List from Azure Blob Storage
   * @param {Object} config - Provider configuration
   * @param {Object} options - List options
   * @returns {Promise<Array>} List of backups
   */
  async listFromAzure(config, options = {}) {
    const containerClient = config.client.getContainerClient(config.containerName);
    const blobs = containerClient.listBlobsFlat({
      prefix: options.prefix || 'myfinance_backup_'
    });

    const result = [];
    for await (const blob of blobs) {
      result.push({
        name: blob.name,
        size: blob.properties.contentLength,
        lastModified: blob.properties.lastModified
      });
    }

    return result;
  }

  /**
   * Convert stream to buffer
   * @param {ReadableStream} readableStream - Stream to convert
   * @returns {Promise<Buffer>} Buffer
   */
  async streamToBuffer(readableStream) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      readableStream.on('data', (data) => chunks.push(data));
      readableStream.on('end', () => resolve(Buffer.concat(chunks)));
      readableStream.on('error', reject);
    });
  }

  /**
   * Get available providers
   * @returns {Array} List of available providers
   */
  getAvailableProviders() {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if provider is configured
   * @param {string} provider - Provider name
   * @returns {boolean} Whether provider is configured
   */
  isProviderConfigured(provider) {
    return this.providers.has(provider);
  }
}

module.exports = new CloudStorageService();
