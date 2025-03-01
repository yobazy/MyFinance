import os
import PyInstaller.__main__

# Set up the entry point for the app
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

PyInstaller.__main__.run([
    'manage.py',  # Django entry point
    '--onefile',  # Bundle into a single executable
    '--hidden-import=django',  # Ensure Django gets included
    '--hidden-import=sqlite3',  # Ensure SQLite works
    '--name', 'MyFinance'  # Name the output file
])