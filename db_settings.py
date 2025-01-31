import json
import os

# Define the settings file location
SETTINGS_FILE = "settings.json"

# Default settings
DEFAULT_SETTINGS = {
    "db_name": "Finance",
    "db_user": "postgres",
    "db_password": "",
    "db_host": "localhost",
    "db_port": "5432"
}

# Function to load settings
def load_settings():
    if not os.path.exists(SETTINGS_FILE):
        save_settings(DEFAULT_SETTINGS)  # Create settings file with defaults
    with open(SETTINGS_FILE, "r") as f:
        return json.load(f)

# Function to save settings
def save_settings(settings):
    with open(SETTINGS_FILE, "w") as f:
        json.dump(settings, f, indent=4)
