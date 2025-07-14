import './sales.css';
import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  deleteDoc,
  doc
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function Sales() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [allInvoices, setAllInvoices] = useState([]);
  const [searchDate, setSearchDate] = useState("");
  const [searchUser, setSearchUser] = useState("");

  const user = JSON.parse(localStorage.getItem("user")) || {};
  const isAdmin = user.role === "admin";

  const fetchInvoices = async () => {
    const q = query(collection(db, "invoices"), orderBy("createdAt", "desc"), limit(50));
    const snapshot = await getDocs(q);
    const invoicesWithFlags = [];

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const id = docSnap.id;
      const hasMismatch = data.has_changed_prices === 1;
      const reference = data.reference || ""; // fetch reference field
      invoicesWithFlags.push({ id, ...data, hasMismatch, reference });
    }

    setAllInvoices(invoicesWithFlags);
    setInvoices(invoicesWithFlags);
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  useEffect(() => {
    let filtered = [...allInvoices];

    if (searchDate) {
      filtered = filtered.filter(inv => {
        const dateObj = inv.createdAt?.toDate
          ? inv.createdAt.toDate()
          : new Date(inv.createdAt);
        const invoiceDateLocal = dateObj.toLocaleDateString("en-CA"); // "YYYY-MM-DD"
        return invoiceDateLocal === searchDate;
      });
    }

    if (searchUser) {
      const term = searchUser.toLowerCase();
      filtered = filtered.filter(
        inv =>
          inv.createdBy?.toLowerCase().includes(term) ||
          String(inv.number).toLowerCase().includes(term)
      );
    }

    setInvoices(filtered);
  }, [searchDate, searchUser, allInvoices]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this invoice?")) return;
    await deleteDoc(doc(db, "invoices", id));
    fetchInvoices();
  };

  // Function to open invoice in new tab
  const openInvoiceInNewTab = (id) => {
    window.open(`/invoice/${id}`, '_blank', 'noopener,noreferrer');
  };

  const grandTotal = searchDate
    ? invoices.reduce((total, inv) => {
        const invoiceTotal = inv.items?.reduce(
          (sum, item) => sum + item.quantity * item.price,
          0
        ) ?? 0;
        return total + invoiceTotal;
      }, 0)
    : 0;

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <button onClick={() => navigate("/dashboard")}>Dashboard</button>
        <button className="red" onClick={() => { localStorage.clear(); navigate("/") }}>
          Logout
        </button>
      </div>

      <h2>🧾 Sales – Recent Invoices</h2>

      <div style={{ margin: "20px 0", display: "flex", gap: "10px" }}>
        <div>
          <label>Date:&nbsp;</label>
          <input
            type="date"
            value={searchDate}
            onChange={(e) => setSearchDate(e.target.value)}
          />
        </div>
        <div>
          <label>Search:&nbsp;</label>
          <input
            type="text"
            placeholder="Invoice number or user"
            value={searchUser}
            onChange={(e) => setSearchUser(e.target.value)}
          />
        </div>
      </div>

      <table border="1" cellPadding="6" style={{ width: "100%", marginTop: 20 }}>
        <thead>
          <tr>
            <th>Invoice #</th>
            <th>Created By</th>
            <th>Customer</th>
            <th>Date</th>
            <th>Reference</th>
            <th>Total</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr key={inv.id}>
              <td>
                {inv.number}
                {inv.hasMismatch && (
                  <span style={{ color: "gold", fontSize: 39, fontWeight: "bold" }}> •</span>
                )}
              </td>
              <td>{inv.createdBy || "Unknown"}</td>
              <td>{inv.customer?.name || "-"}</td>
              <td>
                {inv.createdAt
                  ? (inv.createdAt.toDate
                      ? inv.createdAt.toDate().toLocaleString()
                      : new Date(inv.createdAt).toLocaleString())
                  : "N/A"}
              </td>
              <td>{inv.reference || "-"}</td>
              <td>
                {inv.items?.reduce((sum, it) => sum + it.quantity * it.price, 0) ?? 0}
              </td>
              <td style={{ display: "flex", gap: "5px" }}>
                {/* Updated to open in new tab */}
                <button onClick={() => openInvoiceInNewTab(inv.id)}>View</button>
                {isAdmin && (
                  <button className="red" onClick={() => handleDelete(inv.id)}>
                    Delete
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {searchDate && (
        <div style={{ marginTop: 20, fontWeight: "bold", fontSize: "18px" }}>
          Grand Total for {searchDate}: Rs.{grandTotal.toLocaleString()}
        </div>
      )}
    </div>
  );
}