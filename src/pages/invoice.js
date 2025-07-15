import React, { useState, useEffect, useRef } from "react";
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
  const [allItems, setAllItems] = useState([]);
  const [lineItems, setLineItems] = useState([]);
  const [customer, setCustomer] = useState({ name: "", phone: "", address: "" });
  const [invoiceNumber, setInvoiceNumber] = useState("Loading...");
  const [reference, setReference] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState(0);
  const [originalPrice, setOriginalPrice] = useState(0);
  const [priceChanged, setPriceChanged] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [selectedItemDisplay, setSelectedItemDisplay] = useState("");
  
  const itemInputRef = useRef(null);
  const qtyInputRef = useRef(null);
  const priceInputRef = useRef(null);

  const user = JSON.parse(localStorage.getItem("user"));

  // Fetch all items
  useEffect(() => {
    async function fetchItems() {
      const snap = await getDocs(collection(db, "pricing"));
      const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllItems(items);
    }
    fetchItems();
  }, []);

  // Generate invoice number
  useEffect(() => {
    async function getNextInvoiceNumber() {
      // Check if we already have a pending invoice number
      const pendingInvoiceNumber = sessionStorage.getItem("pendingInvoiceNumber");
      if (pendingInvoiceNumber) {
        setInvoiceNumber(pendingInvoiceNumber);
        return;
      }

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
      
      const formattedNumber = nextInvoiceNumber.toString().padStart(5, "0");
      setInvoiceNumber(formattedNumber);
      sessionStorage.setItem("pendingInvoiceNumber", formattedNumber);
    }
    getNextInvoiceNumber();
  }, []);

  // Search items when itemSearch changes
  useEffect(() => {
    if (!itemSearch) {
      setSearchResults([]);
      setActiveIndex(-1);
      return;
    }
    
    const term = itemSearch.toLowerCase();
    const results = allItems.filter(item => 
      (item.maker && item.maker.toLowerCase().includes(term)) ||
      (item.type && item.type.toLowerCase().includes(term)) ||
      (item.item && item.item.toLowerCase().includes(term)) ||
      (item.id && item.id.toLowerCase().includes(term))
    ).slice(0, 5);
    
    setSearchResults(results);
    setActiveIndex(-1);
  }, [itemSearch, allItems]);

  // Handle keyboard navigation in search results
  const handleKeyDown = (e) => {
    if (searchResults.length === 0) return;
    
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(prev => (prev < searchResults.length - 1 ? prev + 1 : 0));
    } 
    else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : searchResults.length - 1));
    } 
    else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < searchResults.length) {
        handleItemSelect(searchResults[activeIndex]);
      }
    }
  };

  // Handle item selection
  const handleItemSelect = (item) => {
    if (!item.price || item.price <= 0) {
      alert("This item does not have a valid price. It cannot be added.");
      return;
    }
    
    // Set the display text for the selected item
    const displayText = `${item.maker} ${item.type} ${item.item}`;
    setItemSearch(displayText);
    setSelectedItemDisplay(displayText);
    
    setPrice(item.price);
    setOriginalPrice(item.price);
    setPriceChanged(false);
    
    // Close the dropdown
    setSearchResults([]);
    
    // Focus quantity field
    setTimeout(() => {
      if (qtyInputRef.current) {
        qtyInputRef.current.focus();
        qtyInputRef.current.select();
      }
    }, 10);
  };

  // Handle price change
  const handlePriceChange = (e) => {
    const newPrice = Number(e.target.value);
    setPrice(newPrice);
    setPriceChanged(newPrice !== originalPrice);
  };

  // Handle key press in form fields
  const handleFieldKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      // If in price field, add the line
      if (e.target === priceInputRef.current) {
        addLine();
      }
      // If in quantity field, focus price field
      else if (e.target === qtyInputRef.current) {
        priceInputRef.current.focus();
        priceInputRef.current.select();
      }
    }
  };

  // Add line item
  const addLine = () => {
    if (quantity <= 0) {
      alert("Quantity must be greater than 0");
      return;
    }
    
    if (!itemSearch || price <= 0) {
      alert("Cannot add line with missing fields or invalid price.");
      return;
    }
    
    // Find the selected item
    const selectedItem = allItems.find(item => 
      `${item.maker} ${item.type} ${item.item}` === selectedItemDisplay
    );
    
    if (!selectedItem) {
      alert("Please select a valid item from the list");
      return;
    }
    
    const priceChangedFlag = price !== selectedItem.price ? 1 : 0;
    
    setLineItems([
      ...lineItems,
      {
        maker: selectedItem.maker || "Unknown",
        type: selectedItem.type || "Unknown",
        item: selectedItem.item || "Unknown",
        quantity,
        price,
        stockId: selectedItem.id,
        originalPrice: selectedItem.price,
        changed_price: priceChangedFlag,
      },
    ]);

    // Reset form fields
    setItemSearch("");
    setSelectedItemDisplay("");
    setQuantity(1);
    setPrice(0);
    setOriginalPrice(0);
    setPriceChanged(false);
    setSearchResults([]);
    setActiveIndex(-1);
    
    // Focus back to item search
    setTimeout(() => {
      if (itemInputRef.current) {
        itemInputRef.current.focus();
      }
    }, 10);
  };

  // Delete line item
  const deleteLine = (index) => {
    setLineItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Save invoice
  const handleSave = async () => {
    if (!lineItems.length) return alert("Add at least one line item");
    
    // Clear pending invoice number from session storage
    sessionStorage.removeItem("pendingInvoiceNumber");

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

  return (
    <div style={{ 
      padding: "16px",
      paddingBottom: "120px", // Add padding for fixed footer
      minHeight: "100vh",
      backgroundColor: "#f8f9fa",
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    }}>
      {/* Header Section */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "16px",
        paddingBottom: "16px",
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

      {/* Customer and Item Details Section */}
      <div style={{
        backgroundColor: "white",
        borderRadius: "12px",
        boxShadow: "0 6px 12px rgba(0, 0, 0, 0.08)",
        padding: "20px",
        marginBottom: "12px",
        position: "relative",
        border: "2px solid #e8f4f8"
      }}>
        <h2 style={{ 
          marginTop: 0,
          marginBottom: "18px",
          fontSize: "20px",
          color: "#2c3e50",
          fontWeight: "600"
        }}>
          Customer and Item Details
        </h2>
        
        {/* Customer Details */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "12px",
          marginBottom: "20px"
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

        {/* Separator line */}
        <div style={{
          height: "1px",
          backgroundColor: "#e0e0e0",
          marginBottom: "18px"
        }}></div>

        {/* Item Details */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "12px",
          marginBottom: "12px"
        }}>
          <div style={{ position: "relative" }}>
            <label style={labelStyle}>Search Item</label>
            <input
              type="text"
              ref={itemInputRef}
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              style={inputStyle}
              placeholder="Type item name or stock ID"
              autoFocus
            />
            
            {searchResults.length > 0 && (
              <div style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                zIndex: 100,
                backgroundColor: "white",
                border: "1px solid #e2e8f0",
                borderRadius: "6px",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                maxHeight: "300px",
                overflowY: "auto"
              }}>
                {searchResults.map((item, index) => (
                  <div
                    key={item.id}
                    style={{
                      padding: "10px 12px",
                      cursor: "pointer",
                      backgroundColor: index === activeIndex ? "#f0f7ff" : "white",
                      borderBottom: "1px solid #f0f0f0"
                    }}
                    onClick={() => handleItemSelect(item)}
                  >
                    <div style={{ fontWeight: "500", marginBottom: "4px" }}>
                      {item.maker} {item.type} {item.item}
                    </div>
                    <div style={{ color: "#38a169", fontSize: "13px" }}>
                      Stock ID: {item.id}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div>
            <label style={labelStyle}>Quantity</label>
            <input
              type="number"
              ref={qtyInputRef}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              onKeyDown={handleFieldKeyPress}
              min="1"
              style={inputStyle}
              placeholder="Press Enter to go to Price"
            />
          </div>
          
          <div>
            <label style={labelStyle}>Price (Rs.)</label>
            <input
              type="number"
              ref={priceInputRef}
              value={price}
              onChange={handlePriceChange}
              onKeyDown={handleFieldKeyPress}
              style={{
                ...inputStyle,
                backgroundColor: priceChanged ? "#fff3cd" : "white"
              }}
              placeholder="Press Enter to add item"
            />
          </div>
        </div>
        
        {/* Instruction for quick entry */}
        <div style={{
          textAlign: "center",
          color: "#718096",
          fontSize: "13px",
          marginTop: "6px",
          padding: "6px",
          backgroundColor: "#f7fafc",
          borderRadius: "6px"
        }}>
          Tip: Press Enter in Price field to add item and start next entry
        </div>
      </div>

      {/* Invoice Lines Section */}
      <div style={{
        backgroundColor: "white",
        borderRadius: "12px",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05)",
        padding: "20px",
        marginBottom: "20px"
      }}>
        <h2 style={{ 
          marginTop: 0,
          marginBottom: "16px",
          fontSize: "20px",
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
      </div>

      {/* Fixed Footer with Grand Total and Save Button */}
      <div style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "white",
        borderTop: "2px solid #e0e0e0",
        boxShadow: "0 -4px 6px rgba(0, 0, 0, 0.1)",
        padding: "20px 32px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        zIndex: 1000
      }}>
        <h3 style={{ 
          fontSize: "24px", 
          color: "#2c3e50",
          margin: 0,
          fontWeight: "600"
        }}>
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
  );
};

export default Invoice;