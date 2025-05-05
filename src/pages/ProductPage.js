import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  deleteDoc
} from "firebase/firestore";

export default function ProductPage() {
  const navigate = useNavigate();
  const [makers, setMakers] = useState([]);
  const [types, setTypes] = useState([]);
  const [items, setItems] = useState([]);
  const [maker, setMaker] = useState("");
  const [type, setType] = useState("");
  const [item, setItem] = useState("");
  const [qty, setQty] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [currentStock, setCurrentStock] = useState([]);
  const [filteredStock, setFilteredStock] = useState([]);
  const [searchItem, setSearchItem] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [searchUser, setSearchUser] = useState("");

  const user = JSON.parse(localStorage.getItem("user"));
  const isAdmin = user?.role === "admin";

  const fetchMakers = async () => {
    const snap = await getDocs(collection(db, "itemReferences"));
    setMakers(snap.docs.map(doc => doc.id));
  };

  const fetchItemTypes = async (makerName) => {
    if (!makerName) {
      setTypes([]);
      return;
    }
    const ref = doc(db, "itemReferences", makerName);
    if (!ref.id || ref.path.split("/").length % 2 !== 0) return;
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const typeData = snap.data().types || {};
      setTypes(Object.keys(typeData));
    } else {
      setTypes([]);
    }
  };

  const fetchItems = async (makerName, typeName) => {
    if (!makerName || !typeName) {
      setItems([]);
      return;
    }
    const ref = doc(db, "itemReferences", makerName);
    if (!ref.id || ref.path.split("/").length % 2 !== 0) return;
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data().types || {};
      setItems(data[typeName] || []);
    } else {
      setItems([]);
    }
  };

  const fetchStock = async () => {
    const snap = await getDocs(collection(db, "stocks"));
    const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setCurrentStock(data);
    setFilteredStock(data);
  };

  const generateStockId = (type) => {
    const prefixes = {
      "Brandnew Mobile": "BM",
      "Refurbished Mobile": "RM",
      "Charger and Cables": "CC",
      "Brandnew Watch": "BW",
      "Refurbished Watch": "RW",
      "Speaker/Headphones/Buds": "SP",
      "Mobile Phone Casing": "MC",
      "Tempered Glasses": "TG",
      "Power Banks": "PB",
      "Other Item": "OI",
    };
    const prefix = prefixes[type] || "XX";
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    return `${prefix}${randomNum}`;
  };

  const handleSave = async () => {
    if (!maker || !type || !item || !qty || qty <= 0 || !supplierName || !supplierPhone || !unitPrice || !entryDate) {
      return alert("Please fill all fields with valid values.");
    }
    if (!makers.includes(maker)) return alert("Invalid maker selected.");
    if (!types.includes(type)) return alert("Invalid type selected.");
    if (!items.includes(item)) return alert("Invalid item selected.");

    const stockId = generateStockId(type);

    const entry = {
      maker,
      item,
      type,
      quantity: qty,
      supplierName,
      supplierPhone,
      unitPrice,
      date: entryDate,
      user: user.username,
      stockId
    };

    await setDoc(doc(db, "stocks", stockId), entry);

    alert(`This is your stock ID - ${stockId}`);

    fetchStock();

    setMaker("");
    setType("");
    setItem("");
    setQty("");
    setSupplierName("");
    setSupplierPhone("");
    setUnitPrice("");
    setEntryDate(new Date().toISOString().split("T")[0]);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this stock entry? This action cannot be undone.")) {
      return;
    }

    try {
      const stockRef = doc(db, "stocks", id);
      const stockSnap = await getDoc(stockRef);

      if (!stockSnap.exists()) {
        alert("Stock entry not found.");
        return;
      }

      const { maker, type, item } = stockSnap.data();

      // Delete stock entry from stocks collection
      await deleteDoc(stockRef);
      console.log(`Deleted stock entry with ID: ${id}`);

      // Check if there are any remaining stocks for the same item
      const allStocksSnap = await getDocs(collection(db, "stocks"));
      const allStocks = allStocksSnap.docs.map(doc => doc.data());

      const remainingStocks = allStocks.filter(
        s => s.maker === maker && s.type === type && s.item === item
      );

      console.log(`Remaining stocks: ${remainingStocks.length}`);

      // If no remaining stocks, delete the corresponding pricing document
      if (remainingStocks.length === 0) {
        const pricingId = id; // 🔥 Updated: pricing document ID = stock ID
        const pricingRef = doc(db, "pricing", pricingId);

        console.log(`Attempting to delete pricing with ID: ${pricingId}`);

        const pricingSnap = await getDoc(pricingRef);
        if (pricingSnap.exists()) {
          await deleteDoc(pricingRef);
          console.log(`Deleted pricing for ${pricingId}`);
        } else {
          console.log(`No pricing found for ${pricingId}`);
        }
      }

      fetchStock();
    } catch (error) {
      console.error("Error deleting stock or pricing:", error);
      alert("Something went wrong while deleting stock!");
    }
  };

  const logout = () => {
    localStorage.clear();
    navigate("/");
  };

  useEffect(() => {
    fetchMakers();
    fetchStock();
  }, []);

  useEffect(() => {
    const filtered = currentStock.filter(entry => {
      const matchesItem = entry.item.toLowerCase().includes(searchItem.toLowerCase()) || entry.stockId.toLowerCase().includes(searchItem.toLowerCase());
      const matchesUser = entry.user.toLowerCase().includes(searchUser.toLowerCase());
      const matchesDate = searchDate ? entry.date.slice(0, 10) === searchDate : true;
      return matchesItem && matchesUser && matchesDate;
    });
    setFilteredStock(filtered);
  }, [searchItem, searchDate, searchUser, currentStock]);

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginBottom: 10 }}>
        <button onClick={() => navigate("/dashboard")}>Go to Dashboard</button>
        <button onClick={() => navigate("/stock-summary")}>Stock Summary</button>
        <button className="red" onClick={logout}>Logout</button>
      </div>

      <h2>Product Stock Page</h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
        <select value={maker} onChange={(e) => {
          setMaker(e.target.value);
          fetchItemTypes(e.target.value);
          setType("");
          setItem("");
        }}>
          <option value="">Select Maker</option>
          {makers.map(m => <option key={m} value={m}>{m}</option>)}
        </select>

        <select value={type} onChange={(e) => {
          setType(e.target.value);
          fetchItems(maker, e.target.value);
          setItem("");
        }}>
          <option value="">Select Type</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <select value={item} onChange={e => setItem(e.target.value)}>
          <option value="">Select Item</option>
          {items.map(i => <option key={i} value={i}>{i}</option>)}
        </select>

        <input type="number" placeholder="Enter Quantity" value={qty} onChange={e => setQty(Math.max(0, e.target.value))} />
        <input type="text" placeholder="Supplier Name" value={supplierName} onChange={e => setSupplierName(e.target.value)} />
        <input type="text" placeholder="Supplier Phone" value={supplierPhone} onChange={e => setSupplierPhone(e.target.value)} />
        <input type="number" placeholder="Unit Price" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} />
        <input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} />
        <input type="text" value={user?.username} readOnly />
      </div>

      <div style={{ marginTop: 10 }}>
        <button onClick={handleSave}>Save</button>
      </div>

      {/* Search Fields */}
      <div style={{ marginTop: 30, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <input placeholder="Search by item or stock ID" value={searchItem} onChange={e => setSearchItem(e.target.value)} />
        <input type="date" value={searchDate} onChange={e => setSearchDate(e.target.value)} />
        <input placeholder="Search by user" value={searchUser} onChange={e => setSearchUser(e.target.value)} />
      </div>

      <h3 style={{ marginTop: 20 }}>Current Stock:</h3>
      <table border="1" cellPadding="6" style={{ width: "100%", marginTop: 10 }}>
        <thead>
          <tr>
            <th>Maker</th>
            <th>Type</th>
            <th>Item</th>
            <th>Qty</th>
            <th>Supplier</th>
            <th>Phone</th>
            <th>Unit Price</th>
            <th>Date</th>
            <th>User</th>
            <th>Stock ID</th>
            {isAdmin && <th>Action</th>}
          </tr>
        </thead>
        <tbody>
          {filteredStock
            .filter(entry => entry.supplierName !== "Admin") // 👈 Hides supplier=Admin
            .map(entry => (
              <tr key={entry.id}>
                <td>{entry.maker}</td>
                <td>{entry.type}</td>
                <td>{entry.item}</td>
                <td>{entry.quantity}</td>
                <td>{entry.supplierName}</td>
                <td>{entry.supplierPhone}</td>
                <td>{entry.unitPrice}</td>
                <td>{entry.date}</td>
                <td>{entry.user}</td>
                <td>{entry.stockId}</td>
                {isAdmin && (
                  <td>
                    <button className="red" onClick={() => handleDelete(entry.id)}>Delete</button>
                  </td>
                )}
              </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
