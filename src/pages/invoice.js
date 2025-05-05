import React, { useState, useEffect } from "react";
import {
  serverTimestamp,
  runTransaction,
  doc,
  getDocs,
  collection,
  addDoc,
  getDoc,
  query,
  where,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";

const Invoice = () => {
  const navigate = useNavigate();
  
  // State declarations
  const [makers, setMakers] = useState([]);
  const [types, setTypes] = useState([]);
  const [itemsList, setItemsList] = useState([]);
  const [stockIds, setStockIds] = useState([]);
  const [maker, setMaker] = useState("");
  const [type, setType] = useState("");
  const [item, setItem] = useState("");
  const [stockId, setStockId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState(0);
  const [originalPrice, setOriginalPrice] = useState(0);
  const [lineItems, setLineItems] = useState([]);
  const [customer, setCustomer] = useState({ name: "", phone: "", address: "" });
  const [invoiceNumber, setInvoiceNumber] = useState("Loading...");
  const [reference, setReference] = useState("");
  const [priceChanged, setPriceChanged] = useState(false);

  const user = JSON.parse(localStorage.getItem("user"));

  // Fetch initial pricing data
  useEffect(() => {
    async function fetchPricing() {
      const snap = await getDocs(collection(db, "pricing"));
      const pricingData = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const uniqueMakers = [...new Set(pricingData.map((p) => p.maker))];
      setMakers(uniqueMakers);
    }
    fetchPricing();
  }, []);

  // Fetch types based on maker
  useEffect(() => {
    async function fetchTypes() {
      const snap = await getDocs(collection(db, "pricing"));
      const filtered = snap.docs.map((d) => d.data()).filter((p) => p.maker === maker);
      const types = [...new Set(filtered.map((p) => p.type))];
      setTypes(types);
    }
    if (maker) fetchTypes();
  }, [maker]);

  // Fetch items based on maker and type
  useEffect(() => {
    async function fetchItems() {
      const snap = await getDocs(collection(db, "pricing"));
      const filtered = snap.docs
        .map((d) => d.data())
        .filter((p) => p.maker === maker && p.type === type);
      const items = [...new Set(filtered.map((p) => p.item))];
      setItemsList(items);
    }
    if (maker && type) fetchItems();
  }, [maker, type]);

  // Fetch stock IDs
  useEffect(() => {
    async function fetchStockIds() {
      if (maker && type && item) {
        const q = query(
          collection(db, "pricing"),
          where("maker", "==", maker),
          where("type", "==", type),
          where("item", "==", item)
        );
        const snap = await getDocs(q);
        const stocks = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setStockIds(stocks);
      } else {
        setStockIds([]);
      }
    }
    fetchStockIds();
  }, [maker, type, item]);

  // Generate invoice number
  useEffect(() => {
    async function getNextInvoiceNumber() {
      const counterRef = doc(db, "counters", "invoiceCounter");
      const nextInvoiceNumber = await runTransaction(db, async (transaction) => {
        const counterSnap = await transaction.get(counterRef);
        if (!counterSnap.exists()) {
          transaction.set(counterRef, { current: 10001 });
          return 10001;
        }
        const current = counterSnap.data().current || 10001;
        const next = current + 1;
        transaction.update(counterRef, { current: next });
        return next;
      });
      setInvoiceNumber(nextInvoiceNumber.toString().padStart(5, "0"));
    }
    getNextInvoiceNumber();
  }, []);

  // Handler functions
  const handleStockIdChange = async (e) => {
    const enteredId = e.target.value.trim();
    setStockId(enteredId);

    if (enteredId.length >= 7 || enteredId.toLowerCase() === "special") {
      const pricingRef = doc(db, "pricing", enteredId);
      const pricingSnap = await getDoc(pricingRef);

      if (pricingSnap.exists()) {
        const data = pricingSnap.data();
        if (!data.price || data.price <= 0) {
          alert("This item does not have a valid price. It cannot be added.");
          setMaker(""); setType(""); setItem(""); 
          setPrice(0); setOriginalPrice(0);
          return;
        }
        setMaker(data.maker || "");
        setType(data.type || "");
        setItem(data.item || "");
        setPrice(data.price);
        setOriginalPrice(data.price);
        setPriceChanged(false);
      } else if (enteredId.toLowerCase() === "special") {
        alert("Proceeding with special item");
        setMaker("Special");
        setType("Special");
        setItem("Special Item");
        setPrice(0);
        setOriginalPrice(0);
      } else {
        alert("Stock ID not found in pricing!");
        setMaker(""); setType(""); setItem(""); 
        setPrice(0); setOriginalPrice(0);
      }
    }
  };

  const handleStockSelect = async (e) => {
    const selectedId = e.target.value;
    setStockId(selectedId);

    const pricingRef = doc(db, "pricing", selectedId);
    const pricingSnap = await getDoc(pricingRef);

    if (pricingSnap.exists()) {
      const data = pricingSnap.data();
      if (!data.price || data.price <= 0) {
        alert("This item does not have a valid price. It cannot be added.");
        setMaker(""); setType(""); setItem(""); 
        setPrice(0); setOriginalPrice(0);
        return;
      }
      setMaker(data.maker || "");
      setType(data.type || "");
      setItem(data.item || "");
      setPrice(data.price);
      setOriginalPrice(data.price);
      setPriceChanged(false);
    } else {
      alert("Pricing document not found for this stock ID");
      setMaker(""); setType(""); setItem(""); 
      setPrice(0); setOriginalPrice(0);
    }
  };

  const handlePriceChange = (e) => {
    const newPrice = Number(e.target.value);
    setPrice(newPrice);
    setPriceChanged(newPrice !== originalPrice);
  };

  const addLine = () => {
    if (!maker || !type || !item || !stockId || price <= 0) {
      alert("Cannot add line with missing fields or invalid price.");
      return;
    }

    const priceChangedFlag = price !== originalPrice ? 1 : 0;

    setLineItems([
      ...lineItems,
      {
        maker,
        type,
        item,
        quantity,
        price,
        stockId,
        originalPrice,
        changed_price: priceChangedFlag,
      },
    ]);

    // Reset form fields
    setMaker("");
    setType("");
    setItem("");
    setQuantity(1);
    setPrice(0);
    setOriginalPrice(0);
    setStockId("");
    setPriceChanged(false);
  };

  const deleteLine = (index) => {
    setLineItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSave = async () => {
    if (!lineItems.length) return alert("Add at least one line item");

    const hasPriceChanges = lineItems.some((item) => item.changed_price === 1);

    const inv = {
      number: invoiceNumber,
      customer,
      reference,
      items: lineItems,
      createdAt: serverTimestamp(),
      createdBy: user?.username || "Unknown",
      has_changed_prices: hasPriceChanges ? 1 : 0,
    };

    try {
      const docRef = await addDoc(collection(db, "invoices"), inv);
      navigate(`/invoice/${docRef.id}`);
    } catch (error) {
      alert("Error saving invoice: " + error.message);
    }
  };

  // Style constants
  const labelStyle = {
    display: "block",
    marginBottom: "8px",
    fontSize: "14px",
    fontWeight: "500",
    color: "#4a5568"
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    fontSize: "14px",
    transition: "border-color 0.3s"
  };

  const selectStyle = {
    ...inputStyle,
    backgroundColor: "white",
    height: "40px"
  };

  return (
    <div style={{ 
      padding: "32px",
      minHeight: "100vh",
      backgroundColor: "#f8f9fa",
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    }}>
      {/* Header Section */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "40px",
        paddingBottom: "20px",
        borderBottom: "1px solid #e0e0e0"
      }}>
        <h1 style={{ 
          margin: 0,
          fontSize: "28px",
          color: "#2c3e50",
          fontWeight: "600"
        }}>
          Create Invoice #{invoiceNumber}
        </h1>
        <div style={{ display: "flex", gap: "16px" }}>
          <button
            style={{
              padding: "10px 20px",
              backgroundColor: "#3498db",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
              transition: "background-color 0.3s"
            }}
            onClick={() => navigate("/dashboard")}
          >
            Back to Dashboard
          </button>
          <button
            style={{
              padding: "10px 20px",
              backgroundColor: "#e74c3c",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
              transition: "background-color 0.3s"
            }}
            onClick={() => {
              localStorage.removeItem("user");
              navigate("/login");
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Customer Details Section */}
      <div style={{
        backgroundColor: "white",
        borderRadius: "12px",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05)",
        padding: "32px",
        marginBottom: "40px"
      }}>
        <h2 style={{ 
          marginTop: 0,
          marginBottom: "28px",
          fontSize: "22px",
          color: "#2c3e50",
          fontWeight: "600"
        }}>
          Customer Details
        </h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "24px"
        }}>
          <div>
            <label style={labelStyle}>Customer Name</label>
            <input
              type="text"
              value={customer.name}
              onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Phone Number</label>
            <input
              type="text"
              value={customer.phone}
              onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Address</label>
            <input
              type="text"
              value={customer.address}
              onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Reference</label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* Item Details Section */}
      <div style={{
        backgroundColor: "white",
        borderRadius: "12px",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05)",
        padding: "32px",
        marginBottom: "40px"
      }}>
        <h2 style={{ 
          marginTop: 0,
          marginBottom: "28px",
          fontSize: "22px",
          color: "#2c3e50",
          fontWeight: "600"
        }}>
          Item Details
        </h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "24px",
          marginBottom: "32px"
        }}>
          <div>
            <label style={labelStyle}>Stock ID</label>
            <input
              type="text"
              value={stockId}
              onChange={handleStockIdChange}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Maker</label>
            <select
              value={maker}
              onChange={(e) => setMaker(e.target.value)}
              style={selectStyle}
            >
              <option value="">Select Maker</option>
              {makers.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              style={selectStyle}
            >
              <option value="">Select Type</option>
              {types.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Item</label>
            <select
              value={item}
              onChange={(e) => setItem(e.target.value)}
              style={selectStyle}
            >
              <option value="">Select Item</option>
              {itemsList.map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Stock ID Selection</label>
            <select
              value={stockId}
              onChange={handleStockSelect}
              style={selectStyle}
            >
              <option value="">Select Stock ID</option>
              {stockIds.map((s) => (
                <option key={s.id} value={s.id}>{s.id}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Quantity</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Price</label>
            <input
              type="number"
              value={price}
              onChange={handlePriceChange}
              style={{
                ...inputStyle,
                backgroundColor: priceChanged ? "#fff3cd" : "white"
              }}
            />
          </div>
        </div>
        <button
          onClick={addLine}
          disabled={!maker || !type || !item || !stockId || price <= 0}
          style={{
            padding: "12px 32px",
            backgroundColor: "#3498db",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "16px",
            fontWeight: "600",
            transition: "background-color 0.3s",
            width: "100%"
          }}
        >
          Add Line Item
        </button>
      </div>

      {/* Invoice Lines Section */}
      <div style={{
        backgroundColor: "white",
        borderRadius: "12px",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05)",
        padding: "32px"
      }}>
        <h2 style={{ 
          marginTop: 0,
          marginBottom: "28px",
          fontSize: "22px",
          color: "#2c3e50",
          fontWeight: "600"
        }}>
          Invoice Lines
        </h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e0e0e0" }}>
                {["Maker", "Type", "Item", "Stock ID", "Qty", "Price", "Total", "Changed?", ""].map((header) => (
                  <th key={header} style={{ 
                    padding: "12px",
                    textAlign: "left",
                    fontWeight: "600",
                    color: "#4a5568"
                  }}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lineItems.map((li, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid #e0e0e0" }}>
                  <td style={{ padding: "12px" }}>{li.maker}</td>
                  <td style={{ padding: "12px" }}>{li.type}</td>
                  <td style={{ padding: "12px" }}>{li.item}</td>
                  <td style={{ padding: "12px" }}>{li.stockId}</td>
                  <td style={{ padding: "12px" }}>{li.quantity}</td>
                  <td style={{ padding: "12px" }}>{li.price}</td>
                  <td style={{ padding: "12px" }}>{li.quantity * li.price}</td>
                  <td style={{ padding: "12px", color: li.changed_price ? "#e53e3e" : "#38a169" }}>
                    {li.changed_price ? "Yes" : "No"}
                  </td>
                  <td style={{ padding: "12px" }}>
                    <button
                      onClick={() => deleteLine(idx)}
                      style={{
                        padding: "6px 12px",
                        backgroundColor: "#e53e3e",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer"
                      }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ 
          marginTop: "32px",
          paddingTop: "24px",
          borderTop: "2px solid #e0e0e0",
          textAlign: "right"
        }}>
          <h3 style={{ fontSize: "24px", color: "#2c3e50" }}>
            Grand Total: Rs.{lineItems.reduce((sum, it) => sum + it.quantity * it.price, 0)}
          </h3>
          <button
            onClick={handleSave}
            style={{
              padding: "12px 32px",
              backgroundColor: "#38a169",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: "600",
              transition: "background-color 0.3s"
            }}
          >
            Save Invoice
          </button>
        </div>
      </div>
    </div>
  );
};

export default Invoice;