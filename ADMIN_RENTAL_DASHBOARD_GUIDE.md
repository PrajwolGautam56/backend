# Admin Rental Dashboard Guide

This guide explains how to integrate the new admin rental dashboard endpoints into your frontend application.

## Overview

The admin rental dashboard provides comprehensive statistics and detailed breakdowns for rental management:

1. **Dashboard Overview** - Summary statistics and key metrics
2. **Dues Breakdown** - Detailed view of pending and overdue payments
3. **Monthly Collection** - Payment records organized by month

## API Endpoints

### 1. Get Rental Dashboard
**Endpoint:** `GET /api/rentals/dashboard`  
**Authentication:** Required (Admin only)  
**Description:** Returns comprehensive dashboard statistics including total rented items, monthly payments, total dues, and breakdowns.

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_rented_items": 45,
      "total_active_rentals": 12,
      "total_monthly_revenue": 125000,
      "total_deposits": 50000,
      "total_pending_amount": 25000,
      "total_overdue_amount": 15000,
      "total_paid_amount": 85000,
      "total_due_amount": 40000,
      "pending_count": 8,
      "overdue_count": 5
    },
    "monthly_payments": [
      {
        "month": "2025-01",
        "total": 25000,
        "count": 5
      }
    ],
    "dues_breakdown": {
      "total_dues": 13,
      "total_amount": 40000,
      "by_customer": [
        {
          "customer_name": "John Doe",
          "customer_email": "john@example.com",
          "customer_phone": "+1234567890",
          "rental_id": "RNT-2025-001",
          "items": [
            {
              "product_name": "Sofa Set",
              "quantity": 1,
              "monthly_price": 5000
            }
          ],
          "monthly_rent": 5000,
          "pending_months": [
            {
              "month": "2025-02",
              "amount": 5000,
              "dueDate": "2025-02-07T00:00:00.000Z"
            }
          ],
          "overdue_months": [
            {
              "month": "2025-01",
              "amount": 5000,
              "dueDate": "2025-01-07T00:00:00.000Z",
              "daysOverdue": 15
            }
          ],
          "total_pending": 5000,
          "total_overdue": 5000,
          "total_due": 10000
        }
      ],
      "all_dues": [
        {
          "rental_id": "RNT-2025-001",
          "customer_name": "John Doe",
          "customer_email": "john@example.com",
          "customer_phone": "+1234567890",
          "month": "2025-01",
          "amount": 5000,
          "dueDate": "2025-01-07T00:00:00.000Z",
          "status": "Overdue",
          "daysOverdue": 15,
          "items": [
            {
              "product_name": "Sofa Set",
              "quantity": 1,
              "monthly_price": 5000
            }
          ],
          "monthly_rent": 5000
        }
      ]
    },
    "monthly_collection": [
      {
        "month": "2025-01",
        "month_name": "January 2025",
        "total_collected": 25000,
        "payments_count": 5,
        "average_payment": 5000
      }
    ]
  }
}
```

### 2. Get Dues Breakdown
**Endpoint:** `GET /api/rentals/dues-breakdown`  
**Authentication:** Required (Admin only)  
**Query Parameters:**
- `status` (optional): Filter by status (`Pending` or `Overdue`)
- `month` (optional): Filter by month (format: `YYYY-MM`, e.g., `2025-01`)
- `customer_email` (optional): Filter by customer email

**Description:** Returns detailed breakdown of all pending and overdue payments with customer and item information.

**Example Request:**
```
GET /api/rentals/dues-breakdown?status=Overdue&month=2025-01
```

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "total_dues": 13,
    "total_amount": 40000,
    "pending_count": 8,
    "overdue_count": 5,
    "dues": [
      {
        "rental_id": "RNT-2025-001",
        "customer_name": "John Doe",
        "customer_email": "john@example.com",
        "customer_phone": "+1234567890",
        "customer_address": "123 Main St",
        "month": "2025-01",
        "month_name": "January 2025",
        "amount": 5000,
        "dueDate": "2025-01-07T00:00:00.000Z",
        "status": "Overdue",
        "daysOverdue": 15,
        "items": [
          {
            "product_name": "Sofa Set",
            "product_type": "Furniture",
            "quantity": 1,
            "monthly_price": 5000,
            "deposit": 10000
          }
        ],
        "monthly_rent": 5000,
        "rental_start_date": "2025-01-01T00:00:00.000Z",
        "rental_end_date": "2025-12-31T00:00:00.000Z"
      }
    ]
  }
}
```

### 3. Get Monthly Collection
**Endpoint:** `GET /api/rentals/monthly-collection`  
**Authentication:** Required (Admin only)  
**Query Parameters:**
- `month` (optional): Filter by specific month (format: `YYYY-MM`)
- `year` (optional): Filter by year (format: `YYYY`)

**Description:** Returns detailed monthly collection records with payment details.

**Example Request:**
```
GET /api/rentals/monthly-collection?year=2025
```

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "monthly_collection": [
      {
        "month": "2025-01",
        "month_name": "January 2025",
        "total_collected": 25000,
        "payments_count": 5,
        "customers_count": 5,
        "rentals_count": 5,
        "average_payment": 5000,
        "payments": [
          {
            "rental_id": "RNT-2025-001",
            "customer_name": "John Doe",
            "customer_email": "john@example.com",
            "amount": 5000,
            "paidDate": "2025-01-05T00:00:00.000Z",
            "paymentMethod": "UPI",
            "items": [
              {
                "product_name": "Sofa Set",
                "monthly_price": 5000
              }
            ]
          }
        ]
      }
    ],
    "summary": {
      "total_months": 12,
      "total_collected": 300000,
      "average_monthly": 25000
    }
  }
}
```

## Frontend Integration Example (React/TypeScript)

### 1. Dashboard Component

```typescript
import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface DashboardSummary {
  total_rented_items: number;
  total_active_rentals: number;
  total_monthly_revenue: number;
  total_deposits: number;
  total_pending_amount: number;
  total_overdue_amount: number;
  total_paid_amount: number;
  total_due_amount: number;
  pending_count: number;
  overdue_count: number;
}

interface DashboardData {
  summary: DashboardSummary;
  monthly_payments: Array<{
    month: string;
    total: number;
    count: number;
  }>;
  dues_breakdown: {
    total_dues: number;
    total_amount: number;
    by_customer: Array<any>;
    all_dues: Array<any>;
  };
  monthly_collection: Array<{
    month: string;
    month_name: string;
    total_collected: number;
    payments_count: number;
    average_payment: number;
  }>;
}

const RentalDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDuesDetails, setShowDuesDetails] = useState(false);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        'http://localhost:3030/api/rentals/dashboard',
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      setDashboardData(response.data.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading dashboard...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!dashboardData) return <div>No data available</div>;

  const { summary, dues_breakdown, monthly_collection } = dashboardData;

  return (
    <div className="rental-dashboard">
      <h1>Rental Management Dashboard</h1>

      {/* Summary Cards */}
      <div className="summary-grid">
        <div className="stat-card">
          <h3>Total Rented Items</h3>
          <p className="stat-value">{summary.total_rented_items}</p>
        </div>
        <div className="stat-card">
          <h3>Active Rentals</h3>
          <p className="stat-value">{summary.total_active_rentals}</p>
        </div>
        <div className="stat-card">
          <h3>Monthly Revenue</h3>
          <p className="stat-value">₹{summary.total_monthly_revenue.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <h3>Total Deposits</h3>
          <p className="stat-value">₹{summary.total_deposits.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <h3>Total Paid</h3>
          <p className="stat-value success">₹{summary.total_paid_amount.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <h3>Total Dues</h3>
          <p className="stat-value warning" onClick={() => setShowDuesDetails(!showDuesDetails)}>
            ₹{summary.total_due_amount.toLocaleString()}
          </p>
          <small>
            {summary.pending_count} Pending, {summary.overdue_count} Overdue
          </small>
        </div>
      </div>

      {/* Dues Details (Expandable) */}
      {showDuesDetails && (
        <DuesBreakdownView 
          totalAmount={dues_breakdown.total_amount}
          byCustomer={dues_breakdown.by_customer}
          allDues={dues_breakdown.all_dues}
        />
      )}

      {/* Monthly Collection */}
      <MonthlyCollectionView collection={monthly_collection} />
    </div>
  );
};

export default RentalDashboard;
```

### 2. Dues Breakdown Component

```typescript
import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface DuesBreakdownViewProps {
  totalAmount: number;
  byCustomer: Array<any>;
  allDues: Array<any>;
}

const DuesBreakdownView: React.FC<DuesBreakdownViewProps> = ({
  totalAmount,
  byCustomer,
  allDues
}) => {
  const [filteredDues, setFilteredDues] = useState(allDues);
  const [filter, setFilter] = useState<'all' | 'pending' | 'overdue'>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);

  useEffect(() => {
    let filtered = allDues;
    if (filter === 'pending') {
      filtered = allDues.filter(d => d.status === 'Pending');
    } else if (filter === 'overdue') {
      filtered = allDues.filter(d => d.status === 'Overdue');
    }
    if (selectedCustomer) {
      filtered = filtered.filter(d => d.customer_email === selectedCustomer);
    }
    setFilteredDues(filtered);
  }, [filter, selectedCustomer, allDues]);

  return (
    <div className="dues-breakdown">
      <h2>Dues Breakdown</h2>
      <div className="filters">
        <button 
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          All ({allDues.length})
        </button>
        <button 
          className={filter === 'pending' ? 'active' : ''}
          onClick={() => setFilter('pending')}
        >
          Pending ({allDues.filter(d => d.status === 'Pending').length})
        </button>
        <button 
          className={filter === 'overdue' ? 'active' : ''}
          onClick={() => setFilter('overdue')}
        >
          Overdue ({allDues.filter(d => d.status === 'Overdue').length})
        </button>
      </div>

      {/* Grouped by Customer */}
      <div className="dues-by-customer">
        <h3>Grouped by Customer</h3>
        {byCustomer.map((customer, idx) => (
          <div 
            key={idx} 
            className="customer-dues-card"
            onClick={() => setSelectedCustomer(
              selectedCustomer === customer.customer_email ? null : customer.customer_email
            )}
          >
            <div className="customer-header">
              <div>
                <h4>{customer.customer_name}</h4>
                <p>{customer.customer_email} • {customer.customer_phone}</p>
                <p>Rental ID: {customer.rental_id}</p>
              </div>
              <div className="amounts">
                <div className="amount-item">
                  <span>Pending: ₹{customer.total_pending.toLocaleString()}</span>
                </div>
                <div className="amount-item overdue">
                  <span>Overdue: ₹{customer.total_overdue.toLocaleString()}</span>
                </div>
                <div className="amount-item total">
                  <span>Total Due: ₹{customer.total_due.toLocaleString()}</span>
                </div>
              </div>
            </div>
            
            {selectedCustomer === customer.customer_email && (
              <div className="customer-details">
                <div className="items-list">
                  <h5>Rented Items:</h5>
                  {customer.items.map((item: any, i: number) => (
                    <div key={i} className="item">
                      {item.product_name} (Qty: {item.quantity}) - 
                      ₹{item.monthly_price.toLocaleString()}/month
                    </div>
                  ))}
                </div>
                
                {customer.pending_months.length > 0 && (
                  <div className="pending-months">
                    <h5>Pending Months:</h5>
                    {customer.pending_months.map((month: any, i: number) => (
                      <div key={i} className="month-item">
                        {month.month} - ₹{month.amount.toLocaleString()} 
                        (Due: {new Date(month.dueDate).toLocaleDateString()})
                      </div>
                    ))}
                  </div>
                )}
                
                {customer.overdue_months.length > 0 && (
                  <div className="overdue-months">
                    <h5>Overdue Months:</h5>
                    {customer.overdue_months.map((month: any, i: number) => (
                      <div key={i} className="month-item overdue">
                        {month.month} - ₹{month.amount.toLocaleString()} 
                        (Due: {new Date(month.dueDate).toLocaleDateString()}, 
                        {month.daysOverdue} days overdue)
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* All Dues List */}
      <div className="all-dues-list">
        <h3>All Dues ({filteredDues.length})</h3>
        <table>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Month</th>
              <th>Amount</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Items</th>
            </tr>
          </thead>
          <tbody>
            {filteredDues.map((due, idx) => (
              <tr key={idx} className={due.status.toLowerCase()}>
                <td>
                  <div>
                    <strong>{due.customer_name}</strong>
                    <br />
                    <small>{due.customer_email}</small>
                  </div>
                </td>
                <td>{due.month_name || due.month}</td>
                <td>₹{due.amount.toLocaleString()}</td>
                <td>{new Date(due.dueDate).toLocaleDateString()}</td>
                <td>
                  <span className={`status-badge ${due.status.toLowerCase()}`}>
                    {due.status}
                    {due.daysOverdue && ` (${due.daysOverdue} days)`}
                  </span>
                </td>
                <td>
                  <ul>
                    {due.items.map((item: any, i: number) => (
                      <li key={i}>{item.product_name} (Qty: {item.quantity})</li>
                    ))}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DuesBreakdownView;
```

### 3. Monthly Collection Component

```typescript
import React, { useState } from 'react';

interface MonthlyCollectionViewProps {
  collection: Array<{
    month: string;
    month_name: string;
    total_collected: number;
    payments_count: number;
    average_payment: number;
  }>;
}

const MonthlyCollectionView: React.FC<MonthlyCollectionViewProps> = ({ collection }) => {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [monthDetails, setMonthDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchMonthDetails = async (month: string) => {
    if (selectedMonth === month && monthDetails) {
      setSelectedMonth(null);
      setMonthDetails(null);
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:3030/api/rentals/monthly-collection?month=${month}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      setMonthDetails(response.data.data);
      setSelectedMonth(month);
    } catch (err: any) {
      console.error('Error fetching month details:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="monthly-collection">
      <h2>Monthly Collection Records</h2>
      <div className="collection-grid">
        {collection.map((month, idx) => (
          <div 
            key={idx} 
            className="month-card"
            onClick={() => fetchMonthDetails(month.month)}
          >
            <h3>{month.month_name}</h3>
            <div className="month-stats">
              <div className="stat">
                <span className="label">Total Collected:</span>
                <span className="value">₹{month.total_collected.toLocaleString()}</span>
              </div>
              <div className="stat">
                <span className="label">Payments:</span>
                <span className="value">{month.payments_count}</span>
              </div>
              <div className="stat">
                <span className="label">Average:</span>
                <span className="value">₹{month.average_payment.toLocaleString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Month Details Modal/Expansion */}
      {selectedMonth && monthDetails && (
        <div className="month-details">
          <h3>Payment Details for {monthDetails.monthly_collection[0]?.month_name}</h3>
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Rental ID</th>
                <th>Amount</th>
                <th>Payment Date</th>
                <th>Method</th>
                <th>Items</th>
              </tr>
            </thead>
            <tbody>
              {monthDetails.monthly_collection[0]?.payments.map((payment: any, idx: number) => (
                <tr key={idx}>
                  <td>
                    <div>
                      <strong>{payment.customer_name}</strong>
                      <br />
                      <small>{payment.customer_email}</small>
                    </div>
                  </td>
                  <td>{payment.rental_id}</td>
                  <td>₹{payment.amount.toLocaleString()}</td>
                  <td>{new Date(payment.paidDate).toLocaleDateString()}</td>
                  <td>{payment.paymentMethod}</td>
                  <td>
                    <ul>
                      {payment.items.map((item: any, i: number) => (
                        <li key={i}>{item.product_name}</li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MonthlyCollectionView;
```

## CSS Styling Example

```css
.rental-dashboard {
  padding: 20px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  text-align: center;
}

.stat-card h3 {
  margin: 0 0 10px 0;
  color: #666;
  font-size: 14px;
  font-weight: 500;
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  color: #333;
  cursor: pointer;
}

.stat-value.success {
  color: #28a745;
}

.stat-value.warning {
  color: #ffc107;
}

.dues-breakdown {
  margin-top: 30px;
  background: white;
  padding: 20px;
  border-radius: 8px;
}

.filters {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.filters button {
  padding: 8px 16px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
}

.filters button.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.customer-dues-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 15px;
  cursor: pointer;
  transition: box-shadow 0.2s;
}

.customer-dues-card:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.customer-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.amounts {
  display: flex;
  flex-direction: column;
  gap: 5px;
  text-align: right;
}

.amount-item {
  padding: 5px 10px;
  border-radius: 4px;
  background: #f8f9fa;
}

.amount-item.overdue {
  background: #fff3cd;
  color: #856404;
}

.amount-item.total {
  background: #d1ecf1;
  font-weight: bold;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.status-badge.pending {
  background: #fff3cd;
  color: #856404;
}

.status-badge.overdue {
  background: #f8d7da;
  color: #721c24;
}

.monthly-collection {
  margin-top: 30px;
}

.collection-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.month-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  cursor: pointer;
  transition: transform 0.2s;
}

.month-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

.month-stats {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 15px;
}

.month-stats .stat {
  display: flex;
  justify-content: space-between;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 4px;
}

.month-stats .label {
  color: #666;
}

.month-stats .value {
  font-weight: bold;
  color: #333;
}
```

## Key Features

1. **Interactive Dashboard**
   - Click on "Total Dues" to expand and see detailed breakdown
   - Filter dues by status (All, Pending, Overdue)
   - Group dues by customer for easier management

2. **Dues Management**
   - View all dues in a table format
   - See customer details, items, and payment status
   - Identify overdue payments with days overdue count
   - Click on customer cards to see detailed month-by-month breakdown

3. **Monthly Collection Tracking**
   - View collection summary for each month
   - Click on a month card to see detailed payment records
   - See which customers paid, when, and how much
   - Track payment methods and items

4. **Responsive Design**
   - Grid layouts that adapt to screen size
   - Mobile-friendly tables and cards
   - Expandable sections for detailed views

## Usage Tips

1. **Dashboard Overview**: Use the summary cards to get a quick overview of rental operations
2. **Dues Management**: Click on "Total Dues" to see who owes what and when
3. **Customer Focus**: Use the "Grouped by Customer" view to see all dues for a specific customer
4. **Monthly Analysis**: Click on monthly collection cards to see detailed payment records
5. **Filtering**: Use query parameters in the dues breakdown endpoint to filter by status, month, or customer

## Error Handling

Always handle errors gracefully:

```typescript
try {
  const response = await axios.get('/api/rentals/dashboard', {
    headers: { Authorization: `Bearer ${token}` }
  });
  // Handle success
} catch (error: any) {
  if (error.response?.status === 401) {
    // Redirect to login
  } else if (error.response?.status === 403) {
    // Show "Admin access required" message
  } else {
    // Show generic error message
  }
}
```

## Next Steps

1. Integrate with payment reminder functionality
2. Add export to CSV/PDF functionality
3. Add date range filters for monthly collection
4. Implement real-time updates using WebSockets (optional)
5. Add charts and graphs for visual analytics (using libraries like Chart.js or Recharts)

