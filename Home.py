import streamlit as st

st.set_page_config(
    page_title="Home",
    page_icon="👋",
)

st.write("# Welcome to myFinance Dashboard! 👋")

st.sidebar.success("Select a function above.")

st.markdown(
    """
    - This app is used to manage my finances
    - Feature descriptions
        - File Uploader: 
            - Upload either TD csv or Amex xls file
            - Adds to 'td' or 'amex' table in the database
        - Add Missing Categories:
            - Manually categorize transactions that are missing categories
            - Manually move transactions from 'amex'/'td' tables to 'all_transactions' table
        - Visualizations:
            - View insights on transactions
"""
)