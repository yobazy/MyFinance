const { Sequelize } = require('sequelize');
const path = require('path');

// Database connection
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '..', 'db.sqlite3'),
  logging: false
});

async function addBackupEnhancements() {
  try {
    console.log('Starting backup enhancements migration...');

    // Add new columns to DatabaseBackup table
    console.log('Adding new columns to DatabaseBackup table...');
    
    await sequelize.query(`
      ALTER TABLE backend_databasebackup 
      ADD COLUMN checksum VARCHAR(64) DEFAULT NULL;
    `);
    console.log('✓ Added checksum column');

    await sequelize.query(`
      ALTER TABLE backend_databasebackup 
      ADD COLUMN is_encrypted BOOLEAN DEFAULT 0;
    `);
    console.log('✓ Added is_encrypted column');

    await sequelize.query(`
      ALTER TABLE backend_databasebackup 
      ADD COLUMN status VARCHAR(20) DEFAULT 'completed';
    `);
    console.log('✓ Added status column');

    // Add new columns to BackupSettings table
    console.log('Adding new columns to BackupSettings table...');
    
    await sequelize.query(`
      ALTER TABLE backend_backupsettings 
      ADD COLUMN compression_enabled BOOLEAN DEFAULT 1;
    `);
    console.log('✓ Added compression_enabled column');

    await sequelize.query(`
      ALTER TABLE backend_backupsettings 
      ADD COLUMN encryption_enabled BOOLEAN DEFAULT 0;
    `);
    console.log('✓ Added encryption_enabled column');

    await sequelize.query(`
      ALTER TABLE backend_backupsettings 
      ADD COLUMN encryption_key VARCHAR(255) DEFAULT NULL;
    `);
    console.log('✓ Added encryption_key column');

    await sequelize.query(`
      ALTER TABLE backend_backupsettings 
      ADD COLUMN retention_days INTEGER DEFAULT NULL;
    `);
    console.log('✓ Added retention_days column');

    await sequelize.query(`
      ALTER TABLE backend_backupsettings 
      ADD COLUMN max_backup_size BIGINT DEFAULT NULL;
    `);
    console.log('✓ Added max_backup_size column');

    await sequelize.query(`
      ALTER TABLE backend_backupsettings 
      ADD COLUMN cloud_storage_enabled BOOLEAN DEFAULT 0;
    `);
    console.log('✓ Added cloud_storage_enabled column');

    await sequelize.query(`
      ALTER TABLE backend_backupsettings 
      ADD COLUMN cloud_provider VARCHAR(50) DEFAULT NULL;
    `);
    console.log('✓ Added cloud_provider column');

    await sequelize.query(`
      ALTER TABLE backend_backupsettings 
      ADD COLUMN cloud_config TEXT DEFAULT NULL;
    `);
    console.log('✓ Added cloud_config column');

    // Update existing records with default values
    console.log('Updating existing records...');
    
    await sequelize.query(`
      UPDATE backend_databasebackup 
      SET status = 'completed' 
      WHERE status IS NULL;
    `);
    console.log('✓ Updated existing backup records with default status');

    await sequelize.query(`
      UPDATE backend_backupsettings 
      SET compression_enabled = 1,
          encryption_enabled = 0,
          retention_days = 30,
          max_backup_size = 1073741824,
          cloud_storage_enabled = 0
      WHERE compression_enabled IS NULL;
    `);
    console.log('✓ Updated existing settings records with default values');

    // Create indexes for better performance
    console.log('Creating indexes...');
    
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_backup_status 
      ON backend_databasebackup(status);
    `);
    console.log('✓ Created index on backup status');

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_backup_type 
      ON backend_databasebackup(backup_type);
    `);
    console.log('✓ Created index on backup type');

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_backup_created_at 
      ON backend_databasebackup(created_at);
    `);
    console.log('✓ Created index on backup created_at');

    console.log('✅ Backup enhancements migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run migration if called directly
if (require.main === module) {
  addBackupEnhancements()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = addBackupEnhancements;
