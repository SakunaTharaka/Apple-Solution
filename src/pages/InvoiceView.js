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
    <div className="invoice-container">
      <style>{`
        @media print {
          @page { margin: 0; }
          body { 
            margin: 0 !important; 
            padding: 2mm !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print { display: none !important; }
          .invoice-container { 
            box-shadow: none;
            margin: 0;
            padding: 0;
            width: 100% !important;
          }
          .header, .section, table, .footer {
            width: 100% !important;
          }
        }
        
        body {
          background: #fff;
        }
        
        .invoice-container {
          width: 140mm;
          min-height: 200mm;
          margin: 0 auto;
          padding: 10mm;
          font-family: 'Arial', sans-serif;
          font-size: 12pt;
          color: #000;
          background: white;
          box-shadow: 0 0 5px rgba(0,0,0,0.1);
        }
        
        .header {
          text-align: center;
          margin-bottom: 8mm;
          border-bottom: 2px solid #000;
          padding-bottom: 4mm;
        }
        
        .header h1 {
          font-size: 20pt;
          margin: 2mm 0;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        
        .header p {
          margin: 1mm 0;
          font-size: 11pt;
        }
        
        .section {
          margin: 5mm 0;
        }
        
        .section-title {
          font-weight: bold;
          font-size: 13pt;
          margin-bottom: 3mm;
          border-bottom: 1px solid #000;
          padding-bottom: 1mm;
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: auto 1fr;
          column-gap: 3mm;
          row-gap: 1mm;
          margin: 2mm 0;
        }
        
        .label {
          font-weight: bold;
          white-space: nowrap;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 5mm 0;
          font-size: 11pt;
        }
        
        th {
          background: #000 !important;
          color: #fff !important;
          font-weight: bold;
          padding: 2mm;
          text-align: left;
          border: 1px solid #000;
        }
        
        td {
          padding: 2mm;
          border: 1px solid #000;
          vertical-align: top;
        }
        
        .grand-total {
          font-weight: bold;
          font-size: 14pt;
          text-align: right;
          margin-top: 5mm;
          padding-top: 3mm;
          border-top: 2px solid #000;
        }
        
        .footer {
          text-align: center;
          margin-top: 10mm;
          padding-top: 3mm;
          border-top: 1px solid #000;
          font-size: 10pt;
        }
        
        /* EXACT BUTTON STYLES FROM ORIGINAL CODE */
        .no-print {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-bottom: 20px;
        }
        
        .no-print button {
          /* No custom styles - matches browser default buttons */
        }
      `}</style>

      <div className="header">
        <h1>APPLE SOLUTIONS</h1>
        <p>No.503/1 Dadugama, Ja-Ela</p>
        <p>Call us: 070 223 5199</p>
      </div>

      <div className="no-print">
        <button onClick={() => navigate("/dashboard")}>Back to Dashboard</button>
        <button onClick={() => window.print()}>Print Invoice</button>
      </div>

      <div className="section">
        <div className="section-title">INVOICE DETAILS</div>
        <div className="info-grid">
          <span className="label">Invoice #:</span>
          <span>{invoice.number || "-"}</span>
          
          <span className="label">Date:</span>
          <span>{invoice.createdAt ? invoice.createdAt.toDate().toLocaleString() : "N/A"}</span>
          
          <span className="label">Issued By:</span>
          <span>{invoice.createdBy || "N/A"}</span>
          
          {invoice.reference && (
            <>
              <span className="label">Reference:</span>
              <span>{invoice.reference}</span>
            </>
          )}
        </div>
      </div>

      <div className="section">
        <div className="section-title">CUSTOMER INFORMATION</div>
        <div className="info-grid">
          <span className="label">Name:</span>
          <span>{invoice.customer?.name || "N/A"}</span>
          
          <span className="label">Phone:</span>
          <span>{invoice.customer?.phone || "N/A"}</span>
          
          <span className="label">Address:</span>
          <span>{invoice.customer?.address || "N/A"}</span>
        </div>
      </div>

      <div className="section">
        <div className="section-title">ITEMS</div>
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
      </div>

      <div className="grand-total">
        Grand Total: Rs.{grandTotal.toLocaleString()}
      </div>

      <div className="footer">
        <p><strong>Thank you for your business!</strong></p>
        <p>System by Wayne Systems</p>
        <p>Mobile: 078 722 3407 (Sakuna)</p>
      </div>
    </div>
  );
}