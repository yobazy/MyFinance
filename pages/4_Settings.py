import streamlit as st
from db_settings import load_settings, save_settings

st.title("⚙️ Settings")

# Load current settings
settings = load_settings()

# Create form for settings
with st.form("settings_form"):
    st.subheader("Database Configuration")

    db_name = st.text_input("Database Name", settings["db_name"])
    db_user = st.text_input("Database User", settings["db_user"])
    db_password = st.text_input("Database Password", settings["db_password"], type="password")
    db_host = st.text_input("Database Host", settings["db_host"])
    db_port = st.text_input("Database Port", settings["db_port"])

    submitted = st.form_submit_button("Save Settings")

    if submitted:
        new_settings = {
            "db_name": db_name,
            "db_user": db_user,
            "db_password": db_password,
            "db_host": db_host,
            "db_port": db_port
        }
        save_settings(new_settings)
        st.success("✅ Settings updated successfully!")

st.write("Changes will take effect the next time you restart the app.")
