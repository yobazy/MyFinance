# MyFinance Dashboard

MyFinance Dashboard is a comprehensive personal finance management application built with **React** frontend and **Django** backend. This modern web application allows users to upload bank statements, categorize transactions, and generate detailed financial insights and visualizations.

> Note: this repo is currently **mid-migration**. The legacy stack (Django + CRA) is still present, but the recommended multi-user path is **Supabase + Next.js + TS worker**.

## Architecture

- **Frontend**: React with Material-UI components
- **Backend**: Django REST API with SQLite database
- **Data Storage**: Local SQLite database (configurable)

---

## Features

### 🏦 **Multi-Bank Support**
- **TD Bank**: CSV statement uploads
- **American Express**: XLSX statement uploads

### 📊 **Interactive Dashboard**
- Financial overview with key metrics
- Quick action buttons for common tasks
- Real-time data visualization

### �� **File Management**
- Drag-and-drop file upload interface
- Support for CSV and XLSX formats
- Automatic transaction processing and categorization

### 🏷️ **Transaction Management**
- View all transactions in a searchable table
- Manual categorization of uncategorized transactions
- Transaction filtering and search capabilities

### 📈 **Advanced Analytics & Visualizations**
- Spending breakdown by category (pie charts)
- Monthly spending trends (line charts)
- Category variance analysis
- Interactive charts with hover details

### 🏪 **Account Management**
- Create and manage multiple bank accounts
- Account-specific transaction tracking
- Bank-specific data processing

### ⚙️ **User Settings**
- Theme customization (light/dark mode)
- Database management options
- Application preferences

---

## 📸 Screenshots (legacy UI)

Legacy CRA UI screenshots are archived under `legacy/django-cra/screenshots/`.

---

## Installation & Setup

### Prerequisites
- Python 3.8+
- Node.js 16+
- npm or yarn

### Legacy Quick Start (Production Mode)

The easiest way to run the web app is using the provided startup script:

```bash
# Make scripts executable (first time only)
chmod +x legacy/django-cra/start.sh legacy/django-cra/start-dev.sh

# Run in production mode (single server, Django serves React build)
./legacy/django-cra/start.sh
```

The application will be available at `http://localhost:8000/`

---

## Supabase + Next.js (New path)

If you’re moving to a multi-user hosted version, the recommended direction is:
- **Supabase** for Auth + Postgres + Storage
- **TypeScript worker** for async statement ingestion (Excel parsing)

### What’s already in this repo
- Supabase migrations in `supabase/migrations/`
- A TS worker in `worker/` that can process `processing_jobs` of type `ingest_upload` (Amex `.xlsx` first)

### Supabase setup (minimum)
- Run migrations:
  - `supabase/migrations/002_queue_rpc.sql`
  - `supabase/migrations/003_transactions_metadata_and_dedupe.sql`
- `supabase/migrations/004_storage_policies.sql` is only needed if you decide to store uploads in Supabase Storage.

### Run the worker
See `worker/README.md`.

### Run the Next.js app
See `web/README.md`.

### Repo structure (high-level)
- **New**: `web/`, `worker/`, `supabase/`
- **Legacy**: `legacy/django-cra/`
- Details: `docs/repo-audit.md`

### Legacy Development Mode (Two Servers)

For development with hot-reloading:

```bash
# Run development mode (Django on 8000, React on 3000)
./legacy/django-cra/start-dev.sh
```

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000/api/`

### Manual Setup

#### Backend Setup
1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd MyFinance
   ```

2. **Set up Python environment**:
   ```bash
   # Create virtual environment
   python3 -m venv venv
   
   # Activate virtual environment
   # On macOS/Linux:
   source venv/bin/activate
   # On Windows:
   venv\Scripts\activate
   ```

3. **Install Python dependencies**:
   ```bash
   pip install -r legacy/django-cra/requirements.txt
   ```

4. **Run Django migrations**:
   ```bash
   python legacy/django-cra/manage.py migrate
   ```

#### Frontend Setup
1. **Navigate to frontend directory**:
   ```bash
   cd legacy/django-cra/frontend
   ```

2. **Install Node.js dependencies**:
   ```bash
   npm install
   ```

3. **Build React app for production**:
   ```bash
   npm run build
   ```

4. **Return to root and collect static files**:
   ```bash
   cd ../../
   python legacy/django-cra/manage.py collectstatic --noinput
   ```

5. **Start Django server** (serves both API and React app):
   ```bash
   python legacy/django-cra/manage.py runserver
   ```
   The application will be available at `http://localhost:8000/`

---

## Usage

### Getting Started
1. **Start the web application** using one of the methods above
2. **Open your browser** to `http://localhost:8000` (production) or `http://localhost:3000` (development)
3. **Create your first account** in the Accounts section
4. **Upload bank statements** using the Upload page
5. **Categorize transactions** as needed
6. **View insights** in the Analytics section

### Key Workflows
- **Upload Statements**: Select bank type, choose account, upload CSV/XLSX files
- **Categorize Transactions**: Review uncategorized transactions and assign categories
- **View Analytics**: Explore spending patterns through interactive visualizations
- **Manage Accounts**: Add, edit, or remove bank accounts

---

## API Endpoints

The Django backend provides RESTful APIs for:
- `/api/upload/` - File upload processing
- `/api/transactions/` - Transaction management
- `/api/accounts/` - Account management
- `/api/categories/` - Category management
- `/api/visualizations/` - Analytics data
- `/api/dashboard/` - Dashboard metrics

---

## Development

### Building for Production
```bash
# Frontend build
cd legacy/django-cra/frontend
npm run build
cd ../../

# Collect static files
python legacy/django-cra/manage.py collectstatic --noinput

# Start Django server (serves both API and React app)
python legacy/django-cra/manage.py runserver
```

### Environment Variables (Optional)
You can configure the app using environment variables:

```bash
# Production settings
export DEBUG=False
export SECRET_KEY='your-secret-key-here'
export ALLOWED_HOSTS='yourdomain.com,www.yourdomain.com'

# Then run
python legacy/django-cra/manage.py runserver
```

### Database Management
- Database is automatically initialized on first run
- Local SQLite database: `myfinance.db`
- Reset database: Use the reset option in the application

### Web App Architecture
- **Production Mode**: Django serves the built React app from a single server
- **Development Mode**: React dev server (port 3000) communicates with Django API (port 8000)
- **Static Files**: Served via WhiteNoise middleware in production
- **API Routes**: All API endpoints are under `/api/`
- **Frontend Routes**: All other routes are handled by React Router

---

## Technology Stack

- **Frontend**: React 19, Material-UI, Recharts, React Router
- **Backend**: Django 5.1, Django REST Framework
- **Database**: SQLite (local storage)
- **Charts**: Recharts library
- **Styling**: Material-UI with custom theming
