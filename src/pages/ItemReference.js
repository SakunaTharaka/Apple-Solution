import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc
} from "firebase/firestore";

export default function ItemReference() {
  const navigate = useNavigate();

  const [makerInput, setMakerInput] = useState("");
  const [typeInput, setTypeInput] = useState("");
  const [productInput, setProductInput] = useState("");
  const [allMakers, setAllMakers] = useState([]);
  const [selectedMaker, setSelectedMaker] = useState("");
  const [makerData, setMakerData] = useState({});
  const [editingKey, setEditingKey] = useState("");
  const [newNames, setNewNames] = useState({});
  const [searchText, setSearchText] = useState("");

  const fetchMakers = async () => {
    const snap = await getDocs(collection(db, "itemReferences"));
    setAllMakers(snap.docs.map(d => d.id));
  };

  const fetchMakerData = async (makerId) => {
    setSelectedMaker(makerId);
    setSearchText(""); // Clear search on maker switch
    const d = await getDoc(doc(db, "itemReferences", makerId));
    setMakerData(d.exists() ? d.data().types || {} : {});
  };

  const addMaker = async () => {
    if (!makerInput.trim()) return alert("Enter a maker name");
    await setDoc(doc(db, "itemReferences", makerInput.trim()), { types: {} });
    setMakerInput("");
    fetchMakers();
  };

  const addProduct = async () => {
    if (!selectedMaker || !typeInput.trim() || !productInput.trim()) {
      return alert("Fill maker, type & product");
    }

    const ref = doc(db, "itemReferences", selectedMaker);
    const d = await getDoc(ref);
    const types = (d.data().types || {});
    const updates = { ...types };

    const addUnique = (category, name) => {
      updates[category] = Array.from(
        new Set([...(updates[category] || []), name])
      );
    };

    const mainType = typeInput.trim();
    const productName = productInput.trim();

    // Add main product only
    addUnique(mainType, productName);

    // Removed the logic that automatically adds Refurbished Mobile, Mobile Phone Casing, and Tempered Glass for Brandnew Mobile or Refurbished Mobile or Watches.

    await updateDoc(ref, { types: updates });

    setTypeInput("");
    setProductInput("");
    fetchMakerData(selectedMaker);
  };

  const deleteProduct = async (typeKey, prod) => {
    const ref = doc(db, "itemReferences", selectedMaker);
    const updatedList = makerData[typeKey].filter(p => p !== prod);
    let updatedTypes = { ...makerData };
    if (updatedList.length === 0) {
      delete updatedTypes[typeKey];
    } else {
      updatedTypes[typeKey] = updatedList;
    }
    await updateDoc(ref, { types: updatedTypes });
    fetchMakerData(selectedMaker);
  };

  const startRenaming = (typeKey, oldName) => {
    const key = `${typeKey}|${oldName}`;
    setEditingKey(key);
    setNewNames({ ...newNames, [key]: oldName });
  };

  const confirmRename = async (typeKey, oldName) => {
    const key = `${typeKey}|${oldName}`;
    const newName = (newNames[key] || "").trim();
    if (!newName) return alert("Name cannot be empty");

    const ref = doc(db, "itemReferences", selectedMaker);
    const updatedList = makerData[typeKey].map(p =>
      p === oldName ? newName : p
    );
    const updatedTypes = { ...makerData, [typeKey]: updatedList };
    await updateDoc(ref, { types: updatedTypes });

    setEditingKey("");
    fetchMakerData(selectedMaker);
  };

  const cancelRename = () => {
    setEditingKey("");
  };

  useEffect(() => {
    fetchMakers();
  }, []);

  const logout = () => {
    localStorage.clear();
    navigate("/", { replace: true });
  };

  const goBackToDashboard = () => {
    navigate("/dashboard", { replace: true });
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ position: 'absolute', top: 20, right: 20 }}>
        <button onClick={goBackToDashboard} style={{ marginRight: 10 }}>
          Go Back to Dashboard
        </button>
        <button onClick={logout} style={{ backgroundColor: 'red', color: 'white' }}>
          Logout
        </button>
      </div>

      <h2>🛠 Item Reference (Admin Only)</h2>

      {/* Add new maker */}
      <div style={{ marginBottom: 20 }}>
        <input
          placeholder="New Maker"
          value={makerInput}
          onChange={e => setMakerInput(e.target.value)}
        />
        <button onClick={addMaker}>Add Maker</button>
      </div>

      <h3>Makers</h3>
      <div style={{ marginBottom: 20 }}>
        {allMakers.map((m) => (
          <button
            key={m}
            onClick={() => fetchMakerData(m)}
            style={{
              margin: 4,
              padding: '5px 10px',
              backgroundColor: selectedMaker === m ? "#007bff" : "#ccc",
              color: selectedMaker === m ? "white" : "black",
              border: "none",
              borderRadius: 4,
              cursor: "pointer"
            }}
          >
            {m}
          </button>
        ))}
      </div>

      {selectedMaker && (
        <>
          <h3>Products for: {selectedMaker}</h3>

          {/* Search Bar */}
          <div style={{ marginBottom: 20 }}>
            <input
              placeholder="🔍 Search Product"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: "100%", maxWidth: 400, padding: 6 }}
            />
          </div>

          {/* Add new product */}
          <div style={{ marginBottom: 20 }}>
            <select
              value={typeInput}
              onChange={e => setTypeInput(e.target.value)}
              style={{ marginRight: 10 }}
            >
              <option value="">Select Type</option>
              <option value="Brandnew Mobile">Brandnew Mobile</option>
              <option value="Refurbished Mobile">Refurbished Mobile</option>
              <option value="Charger and Cables">Charger and Cables</option>
              <option value="Brandnew Watch">Brandnew Watch</option>
              <option value="Refurbished Watch">Refurbished Watch</option>
              <option value="Speaker/Headphones/Buds">Speaker/Headphones/Buds</option>
              <option value="Mobile Phone Casing">Mobile Phone Casing</option>
              <option value="Tempered Glasses">Tempered Glasses</option>
              <option value="Power Banks">Power Banks</option>
              <option value="batteries">Batteries</option>
              <option value="Other item">Other item</option>
            </select>
            <input
              placeholder="Product Name"
              value={productInput}
              onChange={e => setProductInput(e.target.value)}
              style={{ marginRight: 10 }}
            />
            <button onClick={addProduct}>Add Product</button>
          </div>

          {/* Product Table */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 2fr 1fr 1fr',
              gap: '10px',
              alignItems: 'center',
              fontWeight: 'bold',
              borderBottom: '2px solid black',
              paddingBottom: '8px',
              marginBottom: '10px'
            }}
          >
            <div>Type</div>
            <div>Product Name</div>
            <div>Rename</div>
            <div>Delete</div>
          </div>

          {Object.entries(makerData).map(([typeKey, products]) => {
            const filteredProducts = products.filter(p =>
              p.toLowerCase().includes(searchText.toLowerCase())
            );
            if (filteredProducts.length === 0) return null;

            return filteredProducts.map((p) => {
              const key = `${typeKey}|${p}`;
              const isEditing = editingKey === key;
              return (
                <div
                  key={key}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 2fr 1fr 1fr',
                    gap: '10px',
                    alignItems: 'center',
                    marginBottom: '8px'
                  }}
                >
                  <div>{typeKey}</div>
                  <div>
                    {isEditing ? (
                      <input
                        value={newNames[key] || ""}
                        onChange={e =>
                          setNewNames({ ...newNames, [key]: e.target.value })
                        }
                        style={{ width: "90%" }}
                      />
                    ) : (
                      p
                    )}
                  </div>
                  <div>
                    {isEditing ? (
                      <>
                        <button onClick={() => confirmRename(typeKey, p)}>✅</button>
                        <button onClick={cancelRename}>❌</button>
                      </>
                    ) : (
                      <button onClick={() => startRenaming(typeKey, p)}>📝 Rename</button>
                    )}
                  </div>
                  <div>
                    <button
                      onClick={() => deleteProduct(typeKey, p)}
                      style={{ backgroundColor: 'red', color: 'white' }}
                    >
                       Delete
                    </button>
                  </div>
                </div>
              );
            });
          })}
        </>
      )}
    </div>
  );
}
