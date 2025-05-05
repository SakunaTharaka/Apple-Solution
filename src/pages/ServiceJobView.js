import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function ServiceJobView() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchTask() {
      if (!jobId) {
        setError("No job ID found in URL.");
        return;
      }

      try {
        const docRef = doc(db, "serviceTasks", jobId);
        const snap = await getDoc(docRef);

        if (snap.exists()) {
          setTask(snap.data());
        } else {
          setError("No service job found.");
        }
      } catch (err) {
        console.error("Error fetching service job:", err);
        setError("Error fetching service job.");
      }
    }

    fetchTask();
  }, [jobId]);

  if (error)
    return (
      <div className="error-container">
        <div className="error-message">⚠️ {error}</div>
      </div>
    );

  if (!task)
    return (
      <div className="loading-container">
        <div className="loading-text">Loading service job...</div>
        <small>Job ID: {jobId}</small>
      </div>
    );

  return (
    <div className="service-job-container">
      <style>{`
        @media print {
          @page {
            margin: 20px;
            size: auto;
          }
          .no-print {
            display: none !important;
          }
          .service-job-container {
            padding: 0 !important;
          }
          .header, .section {
            box-shadow: none !important;
            border: 1px solid #ddd !important;
          }
          * {
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
            color: #000 !important;
          }
        }

        .service-job-container {
          max-width: 1000px;
          margin: 20px auto;
          padding: 30px;
          font-family: 'Helvetica Neue', Arial, sans-serif;
          background: #fff;
        }

        .header {
          text-align: center;
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 2px solid #e0e0e0;
        }

        .company-name {
          font-size: 28px;
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 8px;
          letter-spacing: 1px;
        }

        .company-info {
          font-size: 14px;
          color: #666;
          line-height: 1.5;
        }

        .grid-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 25px;
          margin-bottom: 25px;
        }

        .section {
          background: #fcfcfc;
          padding: 25px;
          border-radius: 8px;
          border: 1px solid #eee;
        }

        .section-title {
          font-size: 18px;
          font-weight: 600;
          color: #2c3e50;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 2px solid #3498db;
        }

        .detail-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
          padding: 8px 0;
          border-bottom: 1px solid #f0f0f0;
        }

        .detail-item:last-child {
          border-bottom: none;
        }

        .detail-label {
          font-weight: 500;
          color: #666;
          min-width: 140px;
        }

        .detail-value {
          color: #333;
          text-align: right;
          flex: 1;
          max-width: 200px;
        }

        .payment-highlight {
          color: #27ae60;
          font-weight: 600;
        }

        .button-group {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-bottom: 30px;
        }

        .print-button {
          background: #3498db;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.3s;
        }

        .print-button:hover {
          background: #2980b9;
        }

        .footer {
          text-align: center;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px solid #e0e0e0;
          color: #666;
          font-size: 14px;
        }

        .error-container, .loading-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 200px;
          flex-direction: column;
        }

        .error-message {
          color: #e74c3c;
          font-weight: 500;
          font-size: 18px;
        }

        .loading-text {
          font-size: 16px;
          color: #333;
          margin-bottom: 8px;
        }
      `}</style>

      <div className="header">
        <div className="company-name">Apple Solutions Mobile Shop</div>
        <div className="company-info">
          <div>No.503/1 Dadugama, Ja-Ela</div>
          <div>📞 070 223 5199 | Find Us on Facebook </div>
        </div>
      </div>

      <div className="button-group no-print">
        <button className="print-button" onClick={() => navigate("/device-repairing")}>
          Back to Repairs
        </button>
        <button className="print-button" onClick={() => navigate("/dashboard")}>
          Dashboard
        </button>
        <button className="print-button" onClick={() => window.print()}>
          🖨️ Print Receipt
        </button>
      </div>

      <div className="grid-container">
        <div className="section">
          <h2 className="section-title">Service Overview</h2>
          <div className="detail-item">
            <span className="detail-label">Job Number:</span>
            <span className="detail-value">{task.invoiceNumber || "N/A"}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Start Date:</span>
            <span className="detail-value">
              {task.createdAt?.toDate().toLocaleDateString()}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Handover Date:</span>
            <span className="detail-value">{task.handoverDate}</span>
          </div>
        </div>

        <div className="section">
          <h2 className="section-title">Customer Information</h2>
          <div className="detail-item">
            <span className="detail-label">Name:</span>
            <span className="detail-value">{task.customerName}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Phone:</span>
            <span className="detail-value">{task.customerPhone}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Address:</span>
            <span className="detail-value">{task.address}</span>
          </div>
        </div>
      </div>

      <div className="grid-container">
        <div className="section">
          <h2 className="section-title">Device Details</h2>
          <div className="detail-item">
            <span className="detail-label">Manufacturer:</span>
            <span className="detail-value">{task.maker}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Model:</span>
            <span className="detail-value">{task.model}</span>
          </div>
          {task.imei && (
            <div className="detail-item">
              <span className="detail-label">IMEI:</span>
              <span className="detail-value">{task.imei}</span>
            </div>
          )}
          <div className="detail-item">
            <span className="detail-label">Issue:</span>
            <span className="detail-value">{task.malfunction}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Remarks:</span>
            <span className="detail-value">{task.remarks}</span>
          </div>
        </div>

        <div className="section">
          <h2 className="section-title">Financial Details</h2>
          <div className="detail-item">
            <span className="detail-label">Total Cost:</span>
            <span className="detail-value payment-highlight">
              Rs. {task.totalPayment?.toLocaleString()}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Advance Paid:</span>
            <span className="detail-value">
              Rs. {task.advanceAmount?.toLocaleString()}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Balance Due:</span>
            <span className="detail-value payment-highlight">
              Rs. {(task.totalPayment - task.advanceAmount)?.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <div className="section">
        <h2 className="section-title">Staff Information</h2>
        <div className="grid-container">
          <div className="detail-item">
            <span className="detail-label">Created By:</span>
            <span className="detail-value">{task.createdBy || "N/A"}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Technician:</span>
            <span className="detail-value">{task.assignedTechnician || "N/A"}</span>
          </div>
        </div>
      </div>

      <div className="footer">
        <div style={{ marginBottom: 15 }}>Thank you for choosing Apple Solutions!</div>
        <div style={{ fontSize: 12 }}>
          System by Wayne Solutions |  078 722 3407 (Sakuna)
          <br />
          {new Date().toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}