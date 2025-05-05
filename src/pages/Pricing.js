import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  setDoc,
  doc
} from "firebase/firestore";

export default function Pricing() {
  const [stockItems, setStockItems] = useState([]);
  const [pricingMap, setPricingMap] = useState({});
  const [selected, setSelected] = useState({ stockId: "" });
  const [price, setPrice] = useState("");
  const [user] = useState(JSON.parse(localStorage.getItem("user")));

  // Load stock and pricing
  const fetchStockAndPricing = async () => {
    const stockSnap = await getDocs(collection(db, "stocks"));
    const stockList = stockSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const pricingSnap = await getDocs(collection(db, "pricing"));
    const pricingData = {};
    pricingSnap.docs.forEach((d) => {
      pricingData[d.id] = d.data();
    });

    setStockItems(stockList);
    setPricingMap(pricingData);
  };

  useEffect(() => {
    fetchStockAndPricing();
  }, []);

  const handleSave = async () => {
    if (!selected.stockId || !price) {
      return alert("Please select an item and enter a price");
    }

    const stockItem = stockItems.find(i => i.id === selected.stockId);
    if (!stockItem) {
      return alert("Invalid stock item selected");
    }

    await setDoc(doc(db, "pricing", selected.stockId), {
      maker: stockItem.maker,
      type: stockItem.type,
      item: stockItem.item,
      price: parseFloat(price),
      updatedBy: user.username,
      updatedAt: new Date().toLocaleString()
    });

    setPrice("");
    setSelected({ stockId: "" });
    fetchStockAndPricing();
  };

  // List of stock IDs that should not show the "Edit" button
  const noEditStockIds = ["XX61544", "XX69206", "XX74297"];

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <button onClick={() => window.location.href = "/dashboard"}>Go to Dashboard</button>
        <button 
          onClick={() => { localStorage.clear(); window.location.href = "/" }}
          style={{ backgroundColor: "red", color: "white" }}
        >Logout</button>
      </div>

      <h2>🛒 Set Selling Price</h2>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
        gap: 10,
        marginTop: 20
      }}>
        <select
          value={selected.stockId}
          onChange={e => setSelected({ stockId: e.target.value })}
        >
          <option value="">Select Stock Item</option>
          {stockItems.map(item => (
            <option key={item.id} value={item.id}>
              {item.maker} - {item.type} - {item.item} (Stock ID: {item.id})
            </option>
          ))}
        </select>

        <input
          type="number"
          placeholder="Selling Price"
          value={price}
          onChange={e => setPrice(e.target.value)}
        />

        <button onClick={handleSave}>Save Price</button>
      </div>

      <h3 style={{ marginTop: 30 }}>📦 Item Prices</h3>
      <table border="1" cellPadding="6" style={{ width: "100%", marginTop: 10 }}>
        <thead>
          <tr>
            <th>Stock ID</th>
            <th>Maker</th>
            <th>Type</th>
            <th>Item</th>
            <th>Buying Price</th>
            <th>Selling Price</th>
            <th>Edited By</th>
            <th>Edit</th>
          </tr>
        </thead>
        <tbody>
          {stockItems.map(item => {
            const priceInfo = pricingMap[item.id];
            const selling = priceInfo?.price || 0;
            const editedBy = priceInfo?.updatedBy || "-";

            return (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.maker}</td>
                <td>{item.type}</td>
                <td>{item.item}</td>
                <td>Rs.{item.unitPrice}</td>
                <td>{selling === 0 ? <span style={{ color: "red" }}>🔴</span> : `Rs.${selling}`}</td>
                <td>{editedBy}</td>
                <td>
                  {/* Conditionally hide the "Edit" button based on stock ID */}
                  {!noEditStockIds.includes(item.id) && (
                    <button onClick={() => setSelected({ stockId: item.id })}>Edit</button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}