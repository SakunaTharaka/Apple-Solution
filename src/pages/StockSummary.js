import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function StockSummary() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState([]);

  const fetchData = async () => {
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

    const keys = new Set([
      ...Object.keys(stockTotals),
      ...Object.keys(invoiceTotals),
    ]);

    const result = Array.from(keys).map((key) => {
      const [maker, type, item] = key.split("|");
      const total = stockTotals[key] || 0;
      const invoiced = invoiceTotals[key] || 0;
      const available = total - invoiced;
      return {
        maker,
        type,
        item,
        total: total === invoiced ? 0 : total,
        invoiced: total === invoiced ? 0 : invoiced,
        available,
      };
    });

    const filteredResult = result.filter((item) => item.total !== 9999999);

    // ✅ Save low-stock items to localStorage (25% rule)
    const lowStockItems = filteredResult.filter(
      (item) => item.total > 0 && item.available <= item.total * 0.25
    );
    localStorage.setItem("lowStockWarnings", JSON.stringify(lowStockItems));

    setSummary(filteredResult);
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      {/* Navigation Buttons */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 10,
          marginBottom: 10,
        }}
      >
        <button onClick={() => navigate("/dashboard")}>Go to Dashboard</button>
        <button onClick={() => navigate("/product-page")}>
          Go to Stock Page
        </button>
        <button
          onClick={() => {
            localStorage.clear();
            navigate("/");
          }}
          style={{
            backgroundColor: "#e74c3c",
            color: "white",
            border: "none",
            padding: "6px 12px",
            cursor: "pointer",
            borderRadius: 4,
          }}
        >
          Logout
        </button>
      </div>

      <h2>📦 Available Stock Summary</h2>

      <table border="1" cellPadding="6" style={{ width: "100%", marginTop: 20 }}>
        <thead>
          <tr>
            <th>Maker</th>
            <th>Type</th>
            <th>Item</th>
            <th>Added Stock</th>
            <th>Invoiced</th>
            <th>Available</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {summary.map(({ maker, type, item, total, invoiced, available }) => (
            <tr key={`${maker}-${type}-${item}`}>
              <td>{maker}</td>
              <td>{type}</td>
              <td>{item}</td>
              <td>{total}</td>
              <td>{invoiced}</td>
              <td>{available}</td>
              <td>
                {available <= 0 ? (
                  <span style={{ color: "red" }}>🔴</span>
                ) : (
                  <span style={{ color: "green" }}>🟢</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
