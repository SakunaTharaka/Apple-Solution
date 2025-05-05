import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import "./Dashboard.css";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [todayInvoiceCount, setTodayInvoiceCount] = useState(0);
  const [todaySalesRevenue, setTodaySalesRevenue] = useState(0);
  const [itemsSalesToday, setItemsSalesToday] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [showWarning, setShowWarning] = useState(true);
  const [dueRepairs, setDueRepairs] = useState([]);
  const [showRepairWarning, setShowRepairWarning] = useState(true);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser) {
      navigate("/", { replace: true });
    } else {
      setUser(storedUser);
      fetchTodayInvoices();
      fetchLowStockItems();
      fetchDueRepairs();
    }
  }, [navigate]);

  const fetchTodayInvoices = async () => {
    try {
      setIsLoading(true);
      const today = new Date();

      // Helper function to check if a date is today in UTC+5:30 timezone
      const isTodayInUTC530 = (date) => {
        if (!date) return false;
        const adjustedDate = new Date(date.getTime() + 330 * 60000); // Add 5h30m
        const adjustedToday = new Date(today.getTime() + 330 * 60000);
        return (
          adjustedDate.getUTCFullYear() === adjustedToday.getUTCFullYear() &&
          adjustedDate.getUTCMonth() === adjustedToday.getUTCMonth() &&
          adjustedDate.getUTCDate() === adjustedToday.getUTCDate()
        );
      };

      // Fetch invoices
      const invoicesRef = collection(db, "invoices");
      const invoiceSnapshot = await getDocs(invoicesRef);

      let todayCount = 0;
      let totalRevenueFromInvoices = 0;
      let totalItemsSold = 0;

      invoiceSnapshot.forEach((doc) => {
        const invoiceData = doc.data();
        if (invoiceData.createdAt?.toDate) {
          const createdDate = invoiceData.createdAt.toDate();
          if (isTodayInUTC530(createdDate)) {
            todayCount++;
            if (Array.isArray(invoiceData.items)) {
              invoiceData.items.forEach((item) => {
                const price = Number(item.price) || 0;
                const quantity = Number(item.quantity) || 0;
                totalRevenueFromInvoices += price * quantity;
                totalItemsSold += quantity;
              });
            }
          }
        }
      });

      // Fetch serviceTasks
      const serviceTasksRef = collection(db, "serviceTasks");
      const serviceTasksSnapshot = await getDocs(serviceTasksRef);
      let totalAdvanceFromServiceTasks = 0;
      let totalCompletedPayments = 0;

      serviceTasksSnapshot.forEach((doc) => {
        const taskData = doc.data();
        
        // Check for advance payments from today's created tasks
        if (taskData.createdAt?.toDate) {
          const createdDate = taskData.createdAt.toDate();
          if (isTodayInUTC530(createdDate)) {
            const advanceAmount = Number(taskData.advanceAmount) || 0;
            totalAdvanceFromServiceTasks += advanceAmount;
          }
        }
        
        // Check for completed payments from today's completed tasks
        if (taskData.taskCompleted === 1 && taskData.taskCompletedAt) {
          let completedDate;
          if (taskData.taskCompletedAt?.toDate) {
            completedDate = taskData.taskCompletedAt.toDate();
          } else if (typeof taskData.taskCompletedAt === 'string') {
            completedDate = new Date(taskData.taskCompletedAt);
          }
          
          if (completedDate && isTodayInUTC530(completedDate)) {
            const totalPayment = Number(taskData.totalPayment) || 0;
            const advanceAmount = Number(taskData.advanceAmount) || 0;
            // Only add the remaining amount (total - advance)
            totalCompletedPayments += (totalPayment - advanceAmount);
          }
        }
      });

      // Combine totals: invoices + service advances + completed payments
      const combinedTotal = totalRevenueFromInvoices + 
                          totalAdvanceFromServiceTasks + 
                          totalCompletedPayments;

      setTodayInvoiceCount(todayCount);
      setTodaySalesRevenue(combinedTotal);
      setItemsSalesToday(totalItemsSold);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setIsLoading(false);
    }
  };

  const fetchLowStockItems = async () => {
    try {
      const stockSnap = await getDocs(collection(db, "stocks"));
      const invoiceSnap = await getDocs(collection(db, "invoices"));

      const stockTotals = {};
      stockSnap.docs.forEach((doc) => {
        const { maker, type, item, quantity } = doc.data();
        const key = `${maker}|${type}|${item}`;
        stockTotals[key] = (stockTotals[key] || 0) + parseInt(quantity);
      });

      const invoiceTotals = {};
      invoiceSnap.docs.forEach((doc) => {
        const { items = [] } = doc.data();
        items.forEach(({ maker, type, item, quantity }) => {
          const key = `${maker}|${type}|${item}`;
          invoiceTotals[key] = (invoiceTotals[key] || 0) + parseInt(quantity);
        });
      });

      const result = [];
      for (const key of new Set([
        ...Object.keys(stockTotals),
        ...Object.keys(invoiceTotals),
      ])) {
        const [maker, type, item] = key.split("|");
        const total = stockTotals[key] || 0;
        const invoiced = invoiceTotals[key] || 0;
        const available = total - invoiced;

        if (total !== 0 && available <= total * 0.25) {
          result.push({ maker, type, item, total, available });
        }
      }

      setLowStockItems(result);
    } catch (error) {
      console.error("Error fetching stock:", error);
    }
  };

  const fetchDueRepairs = async () => {
    try {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      
      const tasksRef = collection(db, "serviceTasks");
      const snapshot = await getDocs(tasksRef);
      
      const dueTasks = [];
      
      snapshot.forEach((doc) => {
        const taskData = doc.data();
        const handoverDate = taskData.handoverDate?.toDate 
          ? taskData.handoverDate.toDate()
          : new Date(taskData.handoverDate);

        const taskDate = new Date(handoverDate);
        taskDate.setUTCHours(0, 0, 0, 0);

        if (
          taskDate.getTime() === today.getTime() &&
          Number(taskData.taskCompleted) === 0
        ) {
          dueTasks.push({
            id: doc.id,
            customerName: taskData.customerName || "Unknown Customer",
            deviceModel: taskData.model || "Unknown Device",
            handoverDate: taskDate.toLocaleDateString("en-GB"),
          });
        }
      });
      
      setDueRepairs(dueTasks);
    } catch (error) {
      console.error("Error fetching repairs:", error);
    }
  };

  const logout = () => {
    localStorage.clear();
    navigate("/", { replace: true });
  };

  if (!user) return <p>Loading...</p>;

  const isAdmin = user.role === "admin";

  const formattedRevenue = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(todaySalesRevenue);

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">
              <img
                src="/img/logoapple.png"
                alt="Logo"
                className="sidebar-logo"
              />
            </div>
            <span className="app-name">
              Apple
              <br />
              Solutions
            </span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <ul>
            <li className="nav-item dashboard-label">
              <div className="nav-label">
                <i className="nav-icon home-icon"></i>
                <span>Dashboard</span>
              </div>
            </li>
            <li className="nav-item">
              <button onClick={() => navigate("/sales")}>
                <i className="nav-icon reports-icon"></i>
                <span>Sales and Reports</span>
              </button>
            </li>
            <li className="nav-item">
              <button onClick={() => navigate("/product-page")}>
                <i className="nav-icon dashboard-icon"></i>
                <span>Stock Maintain</span>
              </button>
            </li>
            <li className="nav-item">
              <button onClick={() => navigate("/device-repairing")}>
                <i className="nav-icon repair-icon"></i>
                <span>Device Repairing</span>
              </button>
            </li>
            {isAdmin && (
              <>
                <li className="nav-item">
                  <button onClick={() => navigate("/admin")}>
                    <i className="nav-icon admin-icon"></i>
                    <span>Admin Panel</span>
                  </button>
                </li>
                <li className="nav-item">
                  <button onClick={() => navigate("/item-reference")}>
                    <i className="nav-icon item-icon"></i>
                    <span>Item Reference</span>
                  </button>
                </li>
                <li className="nav-item">
                  <button onClick={() => navigate("/pricing")}>
                    <i className="nav-icon pricing-icon"></i>
                    <span>Pricing</span>
                  </button>
                </li>
                <li className="nav-item">
                  <button onClick={() => navigate("/finance")}>
                    <i className="nav-icon finance-icon"></i>
                    <span>Finance</span>
                  </button>
                </li>
              </>
            )}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <button className="add-button" onClick={() => navigate("/invoice")}>
            <i className="plus-icon">+</i>
            <span>New Invoice</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="header">
          <h1>Hello, {user.username}!</h1>
          <button
            onClick={logout}
            className="logout-button"
          >
            Logout
          </button>
        </div>

        <div className="warnings-container">
          {showWarning && lowStockItems.length > 0 && (
            <div className="stock-warning">
              ⚠️ <strong>Low Stock Alert:</strong>
              <ul>
                {lowStockItems.map(({ maker, type, item }, index) => (
                  <li key={index}>
                    {maker} {type} {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setShowWarning(false)}
                className="close-warning"
              >
                ×
              </button>
            </div>
          )}

          {showRepairWarning && dueRepairs.length > 0 && (
            <div className="repair-notification">
              ⚠️ <strong>Repairs Due Today ({dueRepairs.length})</strong>
              <ul>
                {dueRepairs.map((repair) => (
                  <li key={repair.id}>
                    <button
                      className="repair-link"
                      onClick={() => navigate(`/ServiceJobView/${repair.id}`)}
                    >
                      {repair.deviceModel}
                    </button>
                    <span className="repair-details">
                      {repair.customerName} • {repair.handoverDate}
                    </span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setShowRepairWarning(false)}
                className="close-notification"
              >
                ×
              </button>
            </div>
          )}
        </div>

        <div className="dashboard-stats">
          <div className="stat-card">
            <div className="stat-info">
              <h2>{isLoading ? "Loading..." : itemsSalesToday}</h2>
              <p>Items Sold Today</p>
            </div>
            <div className="stat-icon yellow">
              <i className="chart-icon"></i>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-info">
              <h2>{isLoading ? "Loading..." : `Rs.${formattedRevenue}`}</h2>
              <p>Today's Revenue</p>
            </div>
            <div className="stat-icon blue">
              <i className="revenue-icon"></i>
            </div>
          </div>
        </div>

        <div className="action-buttons">
          <button onClick={() => navigate("/product-page")}>
            Manage Stock
          </button>
          <button onClick={() => navigate("/invoice")}>
            Create Invoice
          </button>
          {isAdmin && (
            <button onClick={() => navigate("/device-repairing")}>
              Repair Center
            </button>
          )}
        </div>

        {isAdmin && (
          <div className="admin-section">
            <h2>Admin Tools</h2>
            <div className="admin-buttons">
              <button onClick={() => navigate("/add-user")}>
                Manage Users
              </button>
              <button onClick={() => navigate("/item-reference")}>
                Edit References
              </button>
              <button onClick={() => navigate("/pricing")}>
                Update Prices
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}