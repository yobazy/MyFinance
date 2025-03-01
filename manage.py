#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys
import json

# Load database settings from settings.json
SETTINGS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "settings.json")

# Check if settings.json exists, otherwise default to local storage
if os.path.exists(SETTINGS_FILE):
    with open(SETTINGS_FILE, "r") as f:
        db_config = json.load(f)
else:
    db_config = {"storage_type": "local"}
    with open(SETTINGS_FILE, "w") as f:
        json.dump(db_config, f, indent=4)


def initialize_database():
    """Automatically initializes the database only when running the server."""
    if db_config.get("storage_type") == "local" and "runserver" in sys.argv:
        print("🔹 Local storage selected. Checking database...")
        db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "myfinance.db")

        if not os.path.exists(db_path):
            print("⚡ Initializing local database...")
            os.system("python manage.py migrate")
            print("✅ Database initialized successfully.")
        else:
            print("✅ Database already exists.")


def main():
    """Run administrative tasks."""
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")

    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc

    # Ensure database is only initialized during `runserver`
    initialize_database()

    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
