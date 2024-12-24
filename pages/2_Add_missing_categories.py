import streamlit as st
import pandas as pd
import psycopg2

# Function to connect to PostgreSQL
def connect_to_db():
    try:
        conn = psycopg2.connect(
            dbname="Finance",
            user="postgres",
            password="",
            host="localhost",
            port="5432"
        )
        return conn
    except Exception as e:
        st.error("Unable to connect to the PostgreSQL database.")
        return None

# Fetch transactions with missing category or subcategory data
def get_transactions_with_missing_categories(show_all=False):
    conn = connect_to_db()
    if conn:
        if show_all:
            query = """
            SELECT t.id, t.date, t.description, t.amount, c.name AS category, array_agg(s.name) AS subcategories
            FROM all_transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            LEFT JOIN transaction_subcategories ts ON t.id = ts.transaction_id
            LEFT JOIN subcategories s ON ts.subcategory_id = s.id
            GROUP BY t.id, t.date, t.description, t.amount, c.name;
            """
        else:
            query = """
            SELECT t.id, t.date, t.description, t.amount, c.name AS category, array_agg(s.name) AS subcategories
            FROM all_transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            LEFT JOIN transaction_subcategories ts ON t.id = ts.transaction_id
            LEFT JOIN subcategories s ON ts.subcategory_id = s.id
            WHERE t.category_id IS NULL
            GROUP BY t.id, t.date, t.description, t.amount, c.name;
            """
        df = pd.read_sql(query, conn)
        conn.close()
        return df
    return pd.DataFrame()

# Fetch categories and subcategories
def get_categories_and_subcategories():
    conn = connect_to_db()
    if conn:
        categories_query = "SELECT id, name FROM categories;"
        subcategories_query = "SELECT id, category_id, name FROM subcategories;"
        categories = pd.read_sql(categories_query, conn)
        subcategories = pd.read_sql(subcategories_query, conn)
        conn.close()
        return categories, subcategories
    return pd.DataFrame(), pd.DataFrame()

# Add new category or subcategory to the database
def add_category_or_subcategory(name, parent_category_id=None):
    conn = connect_to_db()
    if conn:
        cursor = conn.cursor()
        try:
            if parent_category_id:
                cursor.execute(
                    "INSERT INTO subcategories (category_id, name) VALUES (%s, %s) ON CONFLICT DO NOTHING;",
                    (parent_category_id, name)
                )
            else:
                cursor.execute("INSERT INTO categories (name) VALUES (%s) ON CONFLICT DO NOTHING;", (name,))
            conn.commit()
            st.success(f"{'Subcategory' if parent_category_id else 'Category'} '{name}' added successfully!")
        except Exception as e:
            st.error("Error adding new category or subcategory.")
        finally:
            cursor.close()
            conn.close()

# Update category and subcategories for transactions
def update_transaction_category(transaction_id, category_id, subcategory_ids):
    conn = connect_to_db()
    if conn:
        cursor = conn.cursor()
        try:
            category_id = int(category_id)
            cursor.execute("UPDATE all_transactions SET category_id = %s WHERE id = %s", (category_id, transaction_id))
            cursor.execute("DELETE FROM transaction_subcategories WHERE transaction_id = %s", (transaction_id,))
            for sub_id in subcategory_ids:
                cursor.execute(
                    "INSERT INTO transaction_subcategories (transaction_id, subcategory_id) VALUES (%s, %s)",
                    (transaction_id, int(sub_id))
                )
            conn.commit()
        except Exception as e:
            st.error(f"Failed to update transaction {transaction_id}.")
        finally:
            cursor.close()
            conn.close()

# Streamlit app layout
st.title("Categorize Transactions")

# Toggle to show only transactions with missing data
show_all = st.checkbox("Show All Transactions", value=False)
transactions = get_transactions_with_missing_categories(show_all=show_all)
categories, subcategories = get_categories_and_subcategories()

# Insert placeholder for "Select a Category"
categories = pd.concat([pd.DataFrame({"id": [None], "name": ["Select a Category"]}), categories], ignore_index=True)

# Progress indicator
uncategorized_count = len(transactions[transactions['category'].isnull() | transactions['subcategories'].isnull()])
st.write(f"Remaining uncategorized transactions: {uncategorized_count}")

if not transactions.empty:
    st.write("Edit each transaction’s category and subcategory:")

    # Allow users to add new categories or subcategories
    with st.expander("Add New Category or Subcategory"):
        new_category_name = st.text_input("New Category Name")
        if st.button("Add Category") and new_category_name:
            add_category_or_subcategory(new_category_name)
        
        selected_parent_category = st.selectbox("Select Parent Category for New Subcategory", categories['name'])
        parent_category_id = categories[categories['name'] == selected_parent_category]['id'].values[0]
        new_subcategory_name = st.text_input("New Subcategory Name")
        if st.button("Add Subcategory") and new_subcategory_name:
            add_category_or_subcategory(new_subcategory_name, parent_category_id)

    # User selections dictionary
    user_selections = {}

    # Display transactions in a table-like layout with dropdowns
    for index, row in transactions.iterrows():
        transaction_id = row['id']
        
        # Layout for each row
        cols = st.columns([1, 2, 1, 2, 2])
        
        # Display transaction details
        cols[0].write(transaction_id)
        cols[1].write(row['description'])
        cols[2].write(f"${row['amount']:.2f}")

        # Set default category; if not set, show "Select a Category" placeholder
        default_category = row['category'] if row['category'] else "Select a Category"
        default_category_index = int(categories[categories['name'] == default_category].index[0])
        
        selected_category = cols[3].selectbox(
            "Category",
            options=categories['name'],
            index=default_category_index,
            key=f"category_{transaction_id}"
        )
        category_id = categories.loc[categories['name'] == selected_category, 'id'].values[0]

        # Set default subcategories if available; otherwise, use an empty list
        default_subcategories = [sub for sub in row['subcategories'] if sub] if row['subcategories'] else []
        relevant_subcategories = subcategories[subcategories['category_id'] == category_id]
        selected_subcategories = cols[4].multiselect(
            "Subcategories",
            options=relevant_subcategories['name'],
            default=default_subcategories,
            key=f"subcategories_{transaction_id}"
        )
        subcategory_ids = relevant_subcategories.loc[relevant_subcategories['name'].isin(selected_subcategories), 'id'].tolist()

        # Store user selections
        user_selections[transaction_id] = {
            'category_id': category_id,
            'subcategory_ids': subcategory_ids
        }

    # Batch save button for all updates
    if st.button("Save All Changes"):
        for transaction_id, selections in user_selections.items():
            update_transaction_category(transaction_id, selections['category_id'], selections['subcategory_ids'])
        st.success("All transactions updated successfully.")
        st.experimental_rerun()
else:
    st.info("No transactions with missing categories or subcategories.")
