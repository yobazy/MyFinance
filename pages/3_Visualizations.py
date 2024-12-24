import streamlit as st
import pandas as pd
import numpy as np
import psycopg2
import plotly.graph_objects as go
import plotly.express as px
from psycopg2 import OperationalError
from datetime import datetime

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
    except OperationalError:
        st.warning("Unable to connect to the PostgreSQL database. Please check your database settings.")
        return None

# Query data based on timeframe, category, and source filters
def get_transaction_data(selected_categories, start_date, end_date):
    conn = connect_to_db()
    if conn is not None:
        category_filter = f"AND at.category_id IN ({', '.join(map(str, selected_categories))})" if selected_categories else ""
        
        query = f"""
        SELECT DATE_TRUNC('month', at.date) AS month, at.date, at.source, at.category_id, c.name AS category_name, at.description, at.amount
        FROM all_transactions at
        LEFT JOIN categories c ON at.category_id = c.id
        WHERE at.amount > 0  -- Exclude negative amounts
        AND at.date BETWEEN '{start_date}' AND '{end_date}'  -- Date range filter
        {category_filter}  -- Apply category filter if categories are selected
        ORDER BY month;
        """
        df = pd.read_sql(query, conn)
        conn.close()
        return df
    else:
        return pd.DataFrame()  # Return empty DataFrame if connection fails

# Fetch unique category names and IDs from the database for selection
def get_category_options():
    conn = connect_to_db()
    if conn is not None:
        query = "SELECT id, name FROM categories ORDER BY name;"
        df = pd.read_sql(query, conn)
        conn.close()
        return df
    else:
        return pd.DataFrame()  # Return empty DataFrame if connection fails

# Display combined transaction data visualization
st.title("Spending Insights Dashboard")

# Date selection for timeframe filtering
st.sidebar.header("Filters")
start_date = st.sidebar.date_input("Start Date", value=datetime(datetime.now().year, 1, 1))
end_date = st.sidebar.date_input("End Date", value=datetime.now())

# Fetch category options for filtering
category_options_df = get_category_options()
selected_categories = st.sidebar.multiselect(
    "Select Categories to Include", 
    options=category_options_df['id'], 
    format_func=lambda x: category_options_df.loc[category_options_df['id'] == x, 'name'].values[0] if x in category_options_df['id'].values else "Unknown",
    default=category_options_df['id']
)

# Allow the user to input a monthly budget goal
monthly_budget = st.sidebar.number_input("Enter Monthly Budget Goal", min_value=0, value=1000)

# Fetch the data based on selected categories and timeframe
df_transactions = get_transaction_data(selected_categories, start_date, end_date)

if not df_transactions.empty:
    # Add a dropdown for data source selection
    source_choice = st.sidebar.selectbox("Choose Data Source", options=["Combined", "TD", "Amex"])
    
    # Filter data based on source selection
    if source_choice == "TD":
        df_filtered = df_transactions[df_transactions['source'] == 'TD']
    elif source_choice == "Amex":
        df_filtered = df_transactions[df_transactions['source'] == 'Amex']
    else:
        df_filtered = df_transactions  # Combined view (all sources)

    # Insight 1: Spending Breakdown by Category (Pie Chart)
    st.subheader("Spending Breakdown by Category")
    category_totals = df_filtered.groupby('category_name')['amount'].sum().reset_index()
    fig_pie = px.pie(category_totals, values='amount', names='category_name', title='Spending Breakdown by Category')
    st.plotly_chart(fig_pie)

    # Insight 2: Monthly Spending Trend (Line Chart)
    st.subheader("Monthly Spending Trend")
    df_monthly_trend = df_filtered.groupby('month')['amount'].sum().reset_index()
    fig_line = go.Figure(go.Scatter(
        x=df_monthly_trend['month'], y=df_monthly_trend['amount'],
        mode='lines+markers', name='Monthly Spending'
    ))
    fig_line.update_layout(title="Monthly Spending Trend", xaxis_title="Month", yaxis_title="Total Amount", template="plotly_white")
    st.plotly_chart(fig_line)

    # Insight 3: Spending Consistency by Category (Standard Deviation)
    st.subheader("Spending Consistency by Category")
    category_std = df_filtered.groupby('category_name')['amount'].std().reset_index().rename(columns={"amount": "std_dev"})
    fig_bar_std = px.bar(category_std, x='category_name', y='std_dev', title="Spending Consistency (Standard Deviation by Category)")
    st.plotly_chart(fig_bar_std)

    # Insight 4: Projected Next Month Spending
    monthly_spending_trend = np.polyfit(range(len(df_monthly_trend)), df_monthly_trend['amount'], 1)
    projected_spending = monthly_spending_trend[0] * (len(df_monthly_trend) + 1) + monthly_spending_trend[1]
    st.metric("Projected Next Month Spending", f"${projected_spending:,.2f}")

    # Insight 5: High Spending Alerts
    st.subheader("High Spending Alerts")
    alert_threshold = st.sidebar.number_input("High Spending Alert Threshold", min_value=0, value=200)
    high_spending_alerts = df_filtered[df_filtered['amount'] > alert_threshold]
    st.write(high_spending_alerts[['date', 'description', 'category_name', 'amount']])

    # Insight 6: Daily Average Spending
    total_days = (end_date - start_date).days + 1
    daily_average_spending = df_filtered['amount'].sum() / total_days
    st.metric("Average Daily Spending", f"${daily_average_spending:.2f}")

    # Insight 7: Spend vs. Budget Comparison
    st.subheader("Spend vs. Budget Comparison")
    df_monthly_trend['Budget'] = monthly_budget
    df_monthly_trend['Above Budget'] = df_monthly_trend['amount'] > monthly_budget
    fig_budget_comparison = px.bar(df_monthly_trend, x='month', y=['amount', 'Budget'], barmode='group', title="Monthly Spend vs Budget")
    st.plotly_chart(fig_budget_comparison)

    # Insight 8: Spending Table by Category
    st.subheader("Spending by Category")
    spending_by_category = df_filtered.groupby('category_name')['amount'].sum().reset_index()
    spending_by_category = spending_by_category.sort_values(by='amount', ascending=False)  # Sort by amount
    st.table(spending_by_category)

    # Insight 9: Monthly Breakdown of Spending by Category
    st.subheader("Monthly Breakdown of Spending by Category")
    df_monthly_breakdown = df_filtered.pivot_table(
        index='category_name',
        columns='month',
        values='amount',
        aggfunc='sum'
    ).fillna(0)  # Replace NaN with 0 for missing months

    # Add a total column for the sum across all months
    df_monthly_breakdown['Total'] = df_monthly_breakdown.sum(axis=1)

    # Sort by total spending
    df_monthly_breakdown = df_monthly_breakdown.sort_values(by='Total', ascending=False)

    # Display the table
    st.table(df_monthly_breakdown)


    # Insight Summary
    st.subheader("Insights Summary")
    max_spending_month = df_monthly_trend.loc[df_monthly_trend['amount'].idxmax(), 'month']
    max_spending = df_monthly_trend['amount'].max()
    min_spending_month = df_monthly_trend.loc[df_monthly_trend['amount'].idxmin(), 'month']
    min_spending = df_monthly_trend['amount'].min()
    st.write(f"**Highest Spending Month**: {max_spending_month.strftime('%B %Y')} with ${max_spending:,.2f}")
    st.write(f"**Lowest Spending Month**: {min_spending_month.strftime('%B %Y')} with ${min_spending:,.2f}")

    # Display filtered transactions in a table
    st.subheader("Filtered Transactions")
    st.write(df_filtered[['date', 'description', 'category_name', 'source', 'amount']])

else:
    st.warning("No data available for visualization.")
