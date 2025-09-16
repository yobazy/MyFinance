# Database Backup System

This document describes the database backup system implemented for MyFinance.

## Features

- **Automatic Backups**: Configurable automatic backups triggered when users open the site
- **Manual Backups**: Create backups on-demand through the web interface
- **Backup Management**: View, download, restore, and delete backups
- **Compression**: All backups are automatically compressed to save space
- **Retention Policy**: Automatically clean up old backups based on user settings
- **Multiple Database Support**: Works with both SQLite and PostgreSQL
- **User-Triggered**: Backups only occur when users actively use the application

## Configuration

### Backup Settings

The backup system can be configured through the web interface at `/database` or via the Django admin:

- **Max Backups**: Maximum number of backups to keep (default: 5)
- **Auto Backup Enabled**: Enable/disable automatic backups (default: enabled)
- **Backup Frequency**: Hours between automatic backups (default: 24)
- **Backup Location**: Directory to store backups (default: `backups/`)

### Database Support

- **SQLite**: Direct file copying with compression
- **PostgreSQL**: Uses `pg_dump` and `psql` for backup/restore

## API Endpoints

### Backup Settings
- `GET /api/backup/settings/` - Get current backup settings
- `PUT /api/backup/settings/` - Update backup settings

### Backup Management
- `GET /api/backup/list/` - List all backups
- `POST /api/backup/create/` - Create a new backup
- `POST /api/backup/restore/{id}/` - Restore from backup
- `DELETE /api/backup/delete/{id}/` - Delete a backup
- `GET /api/backup/download/{id}/` - Download backup file
- `GET /api/backup/stats/` - Get backup statistics

## Automatic Backups

### How It Works

Automatic backups are triggered when users open the MyFinance website. The system:

1. **Checks on Site Load**: Every time a user opens the site, the frontend automatically calls the backup check API
2. **Respects User Settings**: Only creates backups if the configured time interval has passed since the last backup
3. **No Background Processes**: No cron jobs or background services required
4. **User-Controlled**: Backups only happen when users are actively using the application

### API Endpoint

The system uses a simple GET endpoint to check and create backups:

```bash
GET /api/backup/check-auto/
```

This endpoint:
- Checks if a backup is needed based on user settings
- Creates a backup if the time interval has passed
- Returns whether a backup was created
- Works silently in the background without user interaction

## Web Interface

The database management interface is available in the **User Settings** page (`/user-settings`) and provides:

1. **Settings Panel**: Configure backup settings
2. **Statistics Panel**: View backup statistics and status
3. **Backup Actions**: Create manual backups and refresh data
4. **Backup History**: View all backups with actions to download, restore, or delete

## File Structure

```
MyFinance/
├── backend/
│   ├── backup_service.py          # Core backup service
│   └── api/views/backup_views.py  # API endpoints
├── frontend/src/pages/
│   └── UserSettings.js            # Web interface (includes backup management)
└── backups/                       # Backup storage directory
```

## Security Considerations

- Backup files are stored in the `backups/` directory
- Ensure proper file permissions on the backup directory
- Consider encrypting sensitive backup files
- Regularly test backup restoration process

## Troubleshooting

### Common Issues

1. **Permission Errors**: Ensure the application has write access to the backup directory
2. **PostgreSQL Connection**: Verify PostgreSQL credentials and network access
3. **Disk Space**: Monitor available disk space for backup storage
4. **API Errors**: Check browser console and Django logs for API call failures

### Logs

- Browser Console: Check for JavaScript errors in the browser developer tools
- Django logs: Check Django logging configuration
- Network tab: Monitor API calls to `/api/backup/check-auto/`

## Backup File Format

- **SQLite**: `myfinance_backup_YYYYMMDD_HHMMSS.db.gz`
- **PostgreSQL**: `myfinance_backup_YYYYMMDD_HHMMSS.sql.gz`

All backups are compressed using gzip to save storage space.
