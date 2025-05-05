import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function InvoiceView() {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);

  useEffect(() => {
    async function fetchInvoice() {
      const snap = await getDoc(doc(db, "invoices", invoiceId));
      if (snap.exists()) setInvoice(snap.data());
    }
    fetchInvoice();
  }, [invoiceId]);

  if (!invoice) return <p>Loading invoice...</p>;

  const items = invoice.items || [];
  const grandTotal = items.reduce((sum, it) => sum + it.quantity * it.price, 0);

  return (
    <div style={{ padding: 20, fontFamily: "Arial, sans-serif" }}>
      {/* Print-friendly styles */}
      <style>{`
        @media print {
          .no-print {
            display: none;
          }
          body {
            margin: 0;
            padding: 0;
            font-size: 12pt;
            color: #000;
          }
          table {
            page-break-inside: avoid;
          }
        }
        h1, h2, h3, p {
          margin: 5px 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        th, td {
          border: 1px solid #000;
          padding: 8px;
          text-align: left;
        }
        th {
          background-color: #000;
          color: #fff;
          font-weight: bold;
        }
      `}</style>

      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 28 }}>Apple Solutions Mobile Shop</h1>
        <p>No.503/1 Dadugama, Ja-Ela</p>
        <p>Call us: 070 223 5199</p>
      </div>

      <div className="no-print" style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginBottom: 20 }}>
        <button onClick={() => navigate("/dashboard")}>Back to Dashboard</button>
        <button onClick={() => window.print()}>Print Invoice</button>
      </div>

      <div style={{ marginBottom: 20 }}>
        <h2>Invoice #{invoice.number || "-"}</h2>
        <p><strong>Issued by:</strong> {invoice.createdBy || "N/A"}</p>
        <p><strong>Issued date:</strong> {invoice.createdAt ? invoice.createdAt.toDate().toLocaleString() : "N/A"}</p>
        {invoice.reference && (
          <p><strong>Reference:</strong> {invoice.reference}</p>
        )}
      </div>

      <div style={{ marginBottom: 20 }}>
        <h3>Customer Details</h3>
        <p><strong>Name:</strong> {invoice.customer?.name || "N/A"}</p>
        <p><strong>Phone:</strong> {invoice.customer?.phone || "N/A"}</p>
        <p><strong>Address:</strong> {invoice.customer?.address || "N/A"}</p>
      </div>

      <table>
        <thead>
          <tr>
            <th>SID</th>
            <th>Maker</th>
            <th>Type</th>
            <th>Item</th>
            <th>Qty</th>
            <th>Price (Rs.)</th>
            <th>Total (Rs.)</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={i}>
              <td>{it.stockId || "-"}</td>
              <td>{it.maker || "-"}</td>
              <td>{it.type || "-"}</td>
              <td>{it.item || "-"}</td>
              <td>{it.quantity}</td>
              <td>{it.price.toLocaleString()}</td>
              <td>{(it.quantity * it.price).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ textAlign: "right", marginTop: 20 }}>
        Grand Total: Rs.{grandTotal.toLocaleString()}
      </h2>

      <div style={{ marginTop: 40, textAlign: "center" }}>
        <p><strong>Thank you for your business!</strong></p>
        <p>System by Wayne Systems</p>
        <p>Mobile: 078 722 3407 (Sakuna)</p>
      </div>
    </div>
  );
}
