import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AdminPanel from "./pages/AdminPanel";
import ItemReference from "./pages/ItemReference";
import ProductPage from "./pages/ProductPage";
import Pricing from "./pages/Pricing";
import StockSummary from "./pages/StockSummary";
import Invoice from "./pages/invoice"; // lowercase for consistency
import InvoiceView from "./pages/InvoiceView";
import Sales from "./pages/sales";
import Finance from "./pages/Finance";
import DeviceRepairing from "./pages/DeviceRepairing";
import ServiceJobView from "./pages/ServiceJobView"; // ✅ make sure this path and file name are correct

// Role-based protection
const ProtectedRoute = ({ element, role }) => {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) return <Navigate to="/" replace />; // Not logged in
  if (role && user.role !== role) return <Navigate to="/dashboard" replace />; // Not authorized
  return element;
};

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />

        {/* Protected Routes (all logged-in users) */}
        <Route path="/dashboard" element={<ProtectedRoute element={<Dashboard />} />} />
        <Route path="/product-page" element={<ProtectedRoute element={<ProductPage />} />} />
        <Route path="/stock-summary" element={<ProtectedRoute element={<StockSummary />} />} />
        <Route path="/invoice" element={<ProtectedRoute element={<Invoice />} />} />
        <Route path="/invoice/:invoiceId" element={<ProtectedRoute element={<InvoiceView />} />} />
        <Route path="/sales" element={<ProtectedRoute element={<Sales />} />} />
        <Route path="/finance" element={<ProtectedRoute element={<Finance />} />} />
        <Route path="/device-repairing" element={<ProtectedRoute element={<DeviceRepairing />} />} />
        <Route path="/ServiceJobView/:jobId" element={<ServiceJobView />} />

        {/* ✅ Correct dynamic route for viewing a service job */}
        <Route path="/service-job/:id" element={<ProtectedRoute element={<ServiceJobView />} />} />

        {/* Admin-Only Routes */}
        <Route path="/admin" element={<ProtectedRoute element={<AdminPanel />} role="admin" />} />
        <Route path="/item-reference" element={<ProtectedRoute element={<ItemReference />} role="admin" />} />
        <Route path="/pricing" element={<ProtectedRoute element={<Pricing />} role="admin" />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}