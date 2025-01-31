import streamlit as st
import pandas as pd
import psycopg2
from psycopg2 import OperationalError
from db_settings import load_settings

def connect_to_db():
    settings = load_settings()  # Load user-configured settings
    try:
        conn = psycopg2.connect(
            dbname=settings["db_name"],
            user=settings["db_user"],
            password=settings["db_password"],
            host=settings["db_host"],
            port=settings["db_port"]
        )
        return conn
    except OperationalError:
        st.warning("❌ Unable to connect to the PostgreSQL database. Please check your settings.")
        return None

# Function to fetch the most recent transaction date from the Amex table
def get_most_recent_transaction_date(table):
    conn = connect_to_db()
    if conn is not None:
        try:
            cursor = conn.cursor()
            cursor.execute(f"SELECT MAX(date) FROM {table};")
            result = cursor.fetchone()
            conn.close()
            return result[0]  # The most recent date
        except Exception as e:
            st.error(f"Error fetching the most recent transaction date: {e}")
            conn.close()
            return None
    else:
        return None
    
# Streamlit UI for file upload
st.title("File Uploader for TD and Amex Tables")

# Check the database connection on page load
def check_db_connection():
    conn = connect_to_db()
    if conn is not None:
        st.success("✅ Connected to the PostgreSQL database.")
        conn.close()
    else:
        st.error("❌ Failed to connect to the PostgreSQL database. Please check your database settings.")

# Run the database connection check when the page loads
check_db_connection()

amex_recent_date = get_most_recent_transaction_date('amex')
if amex_recent_date:
    st.info(f"📅 Most recent transaction date in 'amex' table: {amex_recent_date}")

td_recent_date = get_most_recent_transaction_date('td')
if td_recent_date:
    st.info(f"📅 Most recent transaction date in 'td' table: {td_recent_date}")
        

# Choose between uploading a CSV or an XLS file
file_type = st.radio("Select File Type:", ('CSV for TD', 'XLS for Amex'))

# Upload the appropriate file based on selection
if file_type == 'CSV for TD':
    uploaded_file = st.file_uploader("Choose a CSV file", type="csv")
else:
    uploaded_file = st.file_uploader("Choose an XLS file", type="xls")

# Clean and convert columns to numeric values
def clean_numeric_columns(df, columns):
    for column in columns:
        # Convert the column to string, replace unwanted characters, and convert to numeric
        df[column] = pd.to_numeric(df[column].astype(str).str.replace('[$,]', '', regex=True), errors='coerce')
    return df


# Insert Data into the all_transactions table
def insert_data_to_all_transactions(date, description, amount, source):
    conn = connect_to_db()
    if conn is not None:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO all_transactions (source, date, description, amount)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT DO NOTHING
        """, (source, date, description, amount))
        conn.commit()
        cursor.close()
        conn.close()

# Insert Data into the TD table and also the combined table
def insert_data_to_td(df):
    conn = connect_to_db()
    if conn is not None:
        cursor = conn.cursor()
        for row in df.itertuples(index=False):
            # Convert debit_amt to negative if it exists, otherwise use credit_amt as is
            amount = -row.debit_amt if not pd.isna(row.debit_amt) else row.credit_amt
            
            cursor.execute("""
                INSERT INTO td (date, charge_name, credit_amt, debit_amt, balance)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT DO NOTHING
            """, (row.date, row.charge_name, row.credit_amt, row.debit_amt, row.balance))
            
            # Insert into the all_transactions table with combined structure
            insert_data_to_all_transactions(row.date, row.charge_name, amount, 'TD')
        
        conn.commit()
        cursor.close()
        conn.close()
    else:
        st.warning("Data insertion failed because the database connection could not be established.")

# Insert Data into the Amex table and also the combined table
def insert_data_to_amex(df):
    conn = connect_to_db()
    if conn is not None:
        cursor = conn.cursor()

        # Clean and convert relevant columns to numeric values
        df = clean_numeric_columns(df, ['amount', 'commission', 'exc_rate'])

        for row in df.itertuples(index=False):
            st.write(f"Inserting into Amex: {row}")  # Debugging

            cursor.execute("""
                INSERT INTO amex (date, date_processed, description, cardmember, amount, commission, exc_rate, merchant)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (date, description, amount, merchant) DO NOTHING;
            """, (row.date, row.date_processed, row.description, row.cardmember, row.amount, row.commission, row.exc_rate, row.merchant))

            # Insert into the all_transactions table with combined structure
            insert_data_to_all_transactions(row.date, row.description, row.amount, 'Amex')

        conn.commit()
        cursor.close()
        conn.close()
    else:
        st.warning("Data insertion failed because the database connection could not be established.")

# Processing the file
if uploaded_file is not None:
    if file_type == 'CSV for TD':
        # Define the column names since the CSV has no headers
        column_names = ['date', 'charge_name', 'credit_amt', 'debit_amt', 'balance']
        
        # Read CSV and assign the defined column names
        df = pd.read_csv(uploaded_file, names=column_names)

        st.write("Data Preview for TD Table:")
        st.dataframe(df.head())

        # Add a button to insert data into the TD table
        if st.button("Insert Data into TD Table"):
            insert_data_to_td(df)
            st.success("Data successfully inserted into the TD table and combined all_transactions table!")
    
    else:
        # For XLS, skip the first 8 rows and read the headers from row 9
        df = pd.read_excel(uploaded_file, skiprows=11)

        # Convert the column names to lowercase and replace spaces with underscores
        df.columns = df.columns.str.lower().str.replace(' ', '_')

        # Manually change specific column names
        df.rename(columns={
            'exchange_rate': 'exc_rate',
        }, inplace=True)

        # Clean numeric columns for Amex data
        df = clean_numeric_columns(df, ['amount', 'commission', 'exc_rate'])

        st.write("Data Preview for Amex Table:")
        st.dataframe(df.head())

        # Add a button to insert data into the Amex table
        if st.button("Insert Data into Amex Table"):
            insert_data_to_amex(df)
            st.success("Data successfully inserted into the Amex table and combined all_transactions table!")
