import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, getDocs, query, where, Timestamp, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import dayjs from "dayjs";

export default function Finance() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(null);
  const [activeTab, setActiveTab] = useState("expenses");

  const [newCategory, setNewCategory] = useState("");
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format("YYYY-MM"));
  const [selectedCategory, setSelectedCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [expenses, setExpenses] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [revenue, setRevenue] = useState(0);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    setIsAdmin(storedUser?.role === "admin");
  }, []);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchExpenses();
    fetchRevenue();
  }, [selectedMonth]);

  const fetchCategories = async () => {
    const snapshot = await getDocs(collection(db, "expensesCat"));
    const catList = snapshot.docs.map(doc => doc.data().name);
    setExpenseCategories(catList);
  };

  const fetchExpenses = async () => {
    const [year, month] = selectedMonth.split("-");
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    const q = query(
      collection(db, "expenses"),
      where("date", ">=", Timestamp.fromDate(start)),
      where("date", "<=", Timestamp.fromDate(end))
    );

    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setExpenses(data);
  };

  const fetchRevenue = async () => {
    const [year, month] = selectedMonth.split("-");
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    try {
      const invoicesQuery = query(
        collection(db, "invoices"),
        where("createdAt", ">=", Timestamp.fromDate(start)),
        where("createdAt", "<=", Timestamp.fromDate(end))
      );
      const invoicesSnapshot = await getDocs(invoicesQuery);
      
      const invoicesTotal = invoicesSnapshot.docs.reduce((sum, doc) => {
        const inv = doc.data();
        const itemsTotal = (inv.items || []).reduce((acc, item) => {
          const price = Number(item.price || 0);
          const quantity = Number(item.quantity || 0);
          return acc + (price * quantity);
        }, 0);
        return sum + itemsTotal;
      }, 0);

      const serviceTasksQuery = query(
        collection(db, "serviceTasks"),
        where("createdAt", ">=", Timestamp.fromDate(start)),
        where("createdAt", "<=", Timestamp.fromDate(end))
      );
      const tasksSnapshot = await getDocs(serviceTasksQuery);
      
      const tasksTotal = tasksSnapshot.docs.reduce((sum, doc) => {
        const task = doc.data();
        if (task.taskCompleted === 1) {
          return sum + Number(task.totalPayment || 0);
        }
        return sum + Number(task.advanceAmount || 0);
      }, 0);

      setRevenue(invoicesTotal + tasksTotal);
    } catch (error) {
      console.error("Error fetching revenue data:", error);
      setRevenue(0);
    }
  };

  const addCategory = async () => {
    if (!newCategory.trim()) return;
    await addDoc(collection(db, "expensesCat"), { name: newCategory.trim() });
    alert("Category added successfully");
    setNewCategory("");
    fetchCategories();
  };

  const addExpense = async () => {
    if (!selectedCategory || !amount) return;
    await addDoc(collection(db, "expenses"), {
      category: selectedCategory,
      amount: parseFloat(amount),
      description,
      date: Timestamp.now()
    });
    setSelectedCategory("");
    setAmount("");
    setDescription("");
    fetchExpenses();
  };

  const deleteExpense = async (id) => {
    if (window.confirm("Are you sure you want to delete this expense?")) {
      await deleteDoc(doc(db, "expenses", id));
      fetchExpenses();
    }
  };

  const handleMonthChange = (e) => {
    setSelectedMonth(e.target.value);
  };

  const getMonthRange = () => {
    const [year, month] = selectedMonth.split("-");
    const first = new Date(year, month - 1, 1);
    const last = new Date(year, month, 0);
    return `${first.toLocaleDateString()} - ${last.toLocaleDateString()}`;
  };

  const logOut = () => {
    localStorage.clear();
    navigate("/login");
  };

  const goToDashboard = () => {
    navigate("/dashboard");
  };

  const filteredExpenses = expenses.filter((e) => {
    const query = searchQuery.toLowerCase();
    return (
      e.category.toLowerCase().includes(query) ||
      e.description.toLowerCase().includes(query)
    );
  });

  const totalExpenses = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const profit = revenue - totalExpenses;

  if (isAdmin === null) return <div className="loading">Checking access...</div>;
  if (!isAdmin) return <h2 className="access-denied">Access Denied: Admins Only</h2>;

  return (
    <div className="finance-container">
      <header className="finance-header">
        <h1>Finance Management</h1>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={goToDashboard}>
            Dashboard
          </button>
          <button className="btn btn-danger" onClick={logOut}>
            Log Out
          </button>
        </div>
      </header>

      <main className="finance-content">
        <div className="tabs">
          <button
            onClick={() => setActiveTab("expenses")}
            className={`tab-btn ${activeTab === "expenses" ? "active" : ""}`}
          >
            Add Expenses
          </button>
          <button
            onClick={() => setActiveTab("statistics")}
            className={`tab-btn ${activeTab === "statistics" ? "active" : ""}`}
          >
            View Statistics and Profits
          </button>
        </div>

        <div className="tab-content">
          {activeTab === "expenses" && (
            <div className="expenses-tab">
              <section className="card">
                <h2>Add New Expense Category</h2>
                <div className="form-group">
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Category Name"
                    className="form-input"
                  />
                  <button className="btn btn-primary" onClick={addCategory}>
                    Add Category
                  </button>
                </div>
              </section>

              <section className="card">
                <div className="month-selector">
                  <label>Select Month: </label>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={handleMonthChange}
                    className="form-input"
                  />
                  <p className="date-range">Selected Range: {getMonthRange()}</p>
                </div>
              </section>

              <section className="card">
                <h2>Add Expense</h2>
                <div className="expense-form">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="form-input"
                  >
                    <option value="">Select Category</option>
                    {expenseCategories.map((cat, i) => (
                      <option key={i} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="Amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="form-input"
                  />
                  <input
                    type="text"
                    placeholder="Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="form-input"
                  />
                  <button className="btn btn-primary" onClick={addExpense}>
                    Add Expense
                  </button>
                </div>
              </section>

              <section className="card">
                <h2>Expenses for {getMonthRange()}</h2>
                <input
                  type="text"
                  placeholder="Search by category or description"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />

                {filteredExpenses.length === 0 ? (
                  <p className="no-results">No matching expenses found.</p>
                ) : (
                  <>
                    <div className="expenses-list">
                      {filteredExpenses.map((e) => (
                        <div key={e.id} className="expense-item">
                          <div className="expense-header">
                            <div>
                              <strong>{e.category}</strong>
                              <span className="expense-amount">Rs. {e.amount.toFixed(2)}</span>
                            </div>
                            <button 
                              className="btn btn-danger btn-sm"
                              onClick={() => deleteExpense(e.id)}
                            >
                              Delete
                            </button>
                          </div>
                          {e.description && (
                            <p className="expense-description">{e.description}</p>
                          )}
                          <div className="expense-date">
                            {e.date?.toDate()?.toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="expenses-total">
                      <h3>Total: Rs. {totalExpenses.toFixed(2)}</h3>
                    </div>
                  </>
                )}
              </section>
            </div>
          )}

          {activeTab === "statistics" && (
            <div className="statistics-tab">
              <section className="card">
                <div className="month-selector">
                  <label>Select Month: </label>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={handleMonthChange}
                    className="form-input"
                  />
                  <p className="date-range">Selected Range: {getMonthRange()}</p>
                </div>
              </section>

              <div className="stats-grid">
                <div className="stat-card profit-card">
                  <h3>💰 Profit</h3>
                  <p className="stat-value">Rs. {profit.toFixed(2)}</p>
                  <p className="stat-meta">
                    {profit >= 0 ? "Positive" : "Negative"} this month
                  </p>
                </div>

                <div className="stat-card expenses-card">
                  <h3>💸 Expenses</h3>
                  <p className="stat-value">Rs. {totalExpenses.toFixed(2)}</p>
                  <p className="stat-meta">
                    {expenses.length} expense{expenses.length !== 1 ? "s" : ""} recorded
                  </p>
                </div>

                <div className="stat-card revenue-card">
                  <h3>📈 Revenue</h3>
                  <p className="stat-value">Rs. {revenue.toFixed(2)}</p>
                  <p className="stat-meta">
                    Total income generated
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// Add this CSS to your stylesheet
const styles = `
  html, body, #root {
    height: 100%;
    margin: 0;
  }

  .finance-container {
    min-height: 100vh;
    max-width: 100%;
    padding: 20px;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    color: #333;
    background-color: #f5f7fa;
  }

  .finance-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
    padding: 15px 20px;
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  }

  .finance-header h1 {
    font-size: 28px;
    color: #2c3e50;
    margin: 0;
  }

  .header-actions {
    display: flex;
    gap: 10px;
  }

  .tabs {
    display: flex;
    justify-content: center;
    gap: 20px;
    margin-bottom: 30px;
  }

  .tab-btn {
    padding: 12px 24px;
    border: none;
    border-radius: 6px;
    background-color: #3498db;
    color: white;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 16px;
  }

  .tab-btn:hover {
    background-color: #2980b9;
    transform: translateY(-2px);
  }

  .tab-btn.active {
    background-color: #2c3e50;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  .card {
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
    padding: 25px;
    margin-bottom: 25px;
  }

  .form-group {
    display: flex;
    gap: 10px;
    margin-bottom: 15px;
  }

  .form-input {
    padding: 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    flex: 1;
    font-size: 14px;
  }

  .btn {
    padding: 12px 20px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    transition: all 0.2s;
    font-size: 14px;
  }

  .btn-primary {
    background-color: #3498db;
    color: white;
  }

  .btn-primary:hover {
    background-color: #2980b9;
  }

  .btn-secondary {
    background-color: #95a5a6;
    color: white;
  }

  .btn-secondary:hover {
    background-color: #7f8c8d;
  }

  .btn-danger {
    background-color: #e74c3c;
    color: white;
  }

  .btn-danger:hover {
    background-color: #c0392b;
  }

  .btn-sm {
    padding: 8px 12px;
    font-size: 13px;
  }

  .search-input {
    width: 100%;
    padding: 12px;
    margin-bottom: 20px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
  }

  .expenses-list {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .expense-item {
    padding: 15px;
    border: 1px solid #eee;
    border-radius: 6px;
    background: #f9f9f9;
  }

  .expense-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .expense-amount {
    font-weight: bold;
    color: #e74c3c;
    margin-left: 10px;
  }

  .expense-description {
    margin: 8px 0;
    color: #666;
    font-size: 14px;
  }

  .expense-date {
    font-size: 12px;
    color: #999;
    margin-top: 5px;
  }

  .expenses-total {
    margin-top: 20px;
    padding-top: 15px;
    border-top: 1px solid #eee;
    text-align: right;
    font-size: 18px;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
    margin-top: 20px;
  }

  .stat-card {
    padding: 25px;
    border-radius: 8px;
    color: white;
  }

  .profit-card {
    background: linear-gradient(135deg, #2ecc71, #27ae60);
  }

  .expenses-card {
    background: linear-gradient(135deg, #e74c3c, #c0392b);
  }

  .revenue-card {
    background: linear-gradient(135deg, #3498db, #2980b9);
  }

  .stat-value {
    font-size: 32px;
    font-weight: bold;
    margin: 10px 0;
  }

  .stat-meta {
    opacity: 0.9;
    font-size: 14px;
    margin: 0;
  }

  .month-selector {
    display: flex;
    align-items: center;
    gap: 15px;
    margin-bottom: 15px;
  }

  .date-range {
    color: #7f8c8d;
    font-size: 14px;
    margin: 5px 0 0;
  }

  .no-results {
    text-align: center;
    color: #7f8c8d;
    padding: 20px;
  }

  .loading {
    text-align: center;
    padding: 50px;
    font-size: 18px;
  }

  .access-denied {
    text-align: center;
    color: #e74c3c;
    padding: 50px;
  }

  @media (max-width: 768px) {
    .finance-header {
      flex-direction: column;
      gap: 15px;
      align-items: flex-start;
    }

    .tabs {
      flex-direction: column;
    }

    .form-group {
      flex-direction: column;
    }

    .month-selector {
      flex-direction: column;
      align-items: flex-start;
    }

    .expense-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 10px;
    }
  }
`;

// Inject styles
const styleElement = document.createElement("style");
styleElement.innerHTML = styles;
document.head.appendChild(styleElement);