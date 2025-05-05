import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  Timestamp,
  doc,
  getDoc,
  deleteDoc,
  updateDoc,
  setDoc,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";

export default function DeviceRepairing() {
  // State declarations
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [address, setAddress] = useState("");
  const [maker, setMaker] = useState("");
  const [model, setModel] = useState("");
  const [imei, setIMEI] = useState("");
  const [remarks, setRemarks] = useState("");
  const [malfunction, setMalfunction] = useState("");
  const [startDate, setStartDate] = useState("");
  const [handoverDate, setHandoverDate] = useState("");
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [totalPayment, setTotalPayment] = useState("");
  const [assignedTechnician, setAssignedTechnician] = useState("");
  const [makers, setMakers] = useState([]);
  const [models, setModels] = useState([]);
  const [serviceTasks, setServiceTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [newHandoverDate, setNewHandoverDate] = useState("");
  const [searchText, setSearchText] = useState("");
  const [filterByStartDate, setFilterByStartDate] = useState(false);
  const [filterByHandoverDate, setFilterByHandoverDate] = useState(false);
  const [exactDate, setExactDate] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    fetchMakers();
    fetchExistingTasks();
    fetchUsers();

    const storedUser = JSON.parse(localStorage.getItem("user"));
    setIsAdmin(storedUser?.role === "admin");
  }, []);

  const fetchMakers = async () => {
    const snap = await getDocs(collection(db, "itemReferences"));
    const makerNames = snap.docs.map((doc) => doc.id);
    setMakers(makerNames);
  };

  const fetchModelsForMaker = async (selectedMaker) => {
    setMaker(selectedMaker);
    setModel("");
    if (!selectedMaker) {
      setModels([]);
      return;
    }

    const docRef = doc(db, "itemReferences", selectedMaker);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      const types = data.types || {};
      const brandNew = types["Brandnew Mobile"] || [];
      const refurbished = types["Refurbished Mobile"] || [];
      const mergedModels = Array.from(new Set([...brandNew, ...refurbished]));
      setModels(mergedModels);
    } else {
      setModels([]);
    }
  };

  const fetchExistingTasks = async () => {
    const snap = await getDocs(collection(db, "serviceTasks"));
    const tasks = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setServiceTasks(tasks);
  };

  const fetchUsers = async () => {
    const snap = await getDocs(collection(db, "users"));
    const userList = snap.docs.map((doc) => doc.id);
    setUsers(userList);
  };

  const handleStartJob = async () => {
    if (
      !customerName ||
      !customerPhone ||
      !address ||
      !maker ||
      !model ||
      !remarks ||
      !malfunction ||
      !startDate ||
      !handoverDate ||
      !advanceAmount ||
      !totalPayment ||
      !assignedTechnician
    ) {
      alert("Please fill in all required fields.");
      return;
    }

    const storedUser = JSON.parse(localStorage.getItem("user"));
    const currentUser = storedUser?.username || storedUser?.email || "Unknown";

    const counterRef = doc(db, "counters", "serviceJobCounter");
    let nextInvoiceNumber = 1001;

    try {
      const counterSnap = await getDoc(counterRef);
      if (counterSnap.exists()) {
        const data = counterSnap.data();
        nextInvoiceNumber = (data.current || 1000) + 1;
        await updateDoc(counterRef, { current: nextInvoiceNumber });
      } else {
        await setDoc(counterRef, { current: nextInvoiceNumber });
      }
    } catch (error) {
      console.error("Error generating invoice number:", error);
      alert("Failed to generate invoice number.");
      return;
    }

    const taskData = {
      invoiceNumber: nextInvoiceNumber,
      customerName,
      customerPhone,
      address,
      maker,
      model,
      imei,
      remarks,
      malfunction,
      startDate,
      handoverDate,
      advanceAmount: parseFloat(advanceAmount),
      totalPayment: parseFloat(totalPayment),
      createdAt: Timestamp.now(),
      createdBy: currentUser,
      assignedTechnician,
      taskCompleted: 0,
    };

    try {
      const docRef = await addDoc(collection(db, "serviceTasks"), taskData);
      navigate(`/ServiceJobView/${docRef.id}`);
    } catch (error) {
      console.error("Error starting service task:", error);
      alert("Error starting service task.");
    }
  };

  const handleDeleteTask = async (id) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      await deleteDoc(doc(db, "serviceTasks", id));
      fetchExistingTasks();
    } catch (error) {
      alert("Error deleting task.");
    }
  };

  const handleCompleteTask = async (id) => {
    if (!window.confirm("Are you sure you want to mark this task as completed and all payment settled?")) return;
    try {
      await updateDoc(doc(db, "serviceTasks", id), {
        taskCompleted: 1,
        taskCompletedAt: Timestamp.now(),
      });
      fetchExistingTasks();
    } catch (error) {
      alert("Error completing task.");
    }
  };

  const openExtendModal = (taskId) => {
    setSelectedTaskId(taskId);
    setShowExtendModal(true);
  };

  const handleConfirmExtend = async () => {
    if (!newHandoverDate) {
      alert("Please select a new date and time.");
      return;
    }

    try {
      await updateDoc(doc(db, "serviceTasks", selectedTaskId), {
        handoverDate: newHandoverDate,
      });
      fetchExistingTasks();
      setShowExtendModal(false);
      setSelectedTaskId(null);
      setNewHandoverDate("");
    } catch (error) {
      alert("Error updating date.");
    }
  };

  const calculateTimeRemaining = (handoverDate) => {
    const now = new Date();
    const end = new Date(handoverDate);
    const diffMs = end - now;
    if (diffMs <= 0) return "Overdue";
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
    return `${days} day(s), ${hours} hour(s)`;
  };

  const filteredTasks = serviceTasks.filter((task) => {
    const matchesSearch =
      task.customerName?.toLowerCase().includes(searchText.toLowerCase()) ||
      task.invoiceNumber?.toString().includes(searchText);

    let matchesDate = true;
    if (exactDate) {
      const taskDate = filterByStartDate 
        ? task.startDate?.split('T')[0] 
        : filterByHandoverDate 
        ? task.handoverDate?.split('T')[0] 
        : null;
      
      matchesDate = taskDate === exactDate;
    }

    return matchesSearch && matchesDate;
  });

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
          Service Management
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
              transition: "background-color 0.3s",
              fontWeight: "500"
            }}
            onClick={() => navigate("/Dashboard")}
          >
            Dashboard
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
              transition: "background-color 0.3s",
              fontWeight: "500"
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

      {/* New Task Form */}
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
          New Service Task
        </h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "24px",
          marginBottom: "32px"
        }}>
          {[
            { label: "Customer Name *", state: customerName, setter: setCustomerName, type: "text" },
            { label: "Customer Phone *", state: customerPhone, setter: setCustomerPhone, type: "tel" },
            { label: "Address *", state: address, setter: setAddress, type: "text" },
            { label: "IMEI (Optional)", state: imei, setter: setIMEI, type: "text" },
            { label: "Start Date *", state: startDate, setter: setStartDate, type: "date" },
            { label: "Handover Date *", state: handoverDate, setter: setHandoverDate, type: "datetime-local" },
            { label: "Advance Amount *", state: advanceAmount, setter: setAdvanceAmount, type: "number" },
            { label: "Total Payment *", state: totalPayment, setter: setTotalPayment, type: "number" },
          ].map((field, index) => (
            <div key={index}>
              <label style={labelStyle}>{field.label}</label>
              <input
                type={field.type}
                value={field.state}
                onChange={(e) => field.setter(e.target.value)}
                style={inputStyle}
              />
            </div>
          ))}
          
          <div>
            <label style={labelStyle}>Maker *</label>
            <select
              value={maker}
              onChange={(e) => fetchModelsForMaker(e.target.value)}
              style={selectStyle}
            >
              <option value="">Select Maker</option>
              {makers.map((mkr) => (
                <option key={mkr} value={mkr}>{mkr}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label style={labelStyle}>Model *</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              style={selectStyle}
            >
              <option value="">Select Model</option>
              {models.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Assign Technician *</label>
            <select
              value={assignedTechnician}
              onChange={(e) => setAssignedTechnician(e.target.value)}
              style={selectStyle}
            >
              <option value="">Select Technician</option>
              {users.map((user) => (
                <option key={user} value={user}>{user}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gap: "24px", marginBottom: "32px" }}>
          {[
            { label: "Malfunction Description *", state: malfunction, setter: setMalfunction },
            { label: "Remarks *", state: remarks, setter: setRemarks }
          ].map((field, index) => (
            <div key={index}>
              <label style={labelStyle}>{field.label}</label>
              <textarea
                value={field.state}
                onChange={(e) => field.setter(e.target.value)}
                style={textAreaStyle}
              />
            </div>
          ))}
        </div>

        <button
          onClick={handleStartJob}
          style={primaryButtonStyle}
        >
          Start New Job
        </button>
      </div>

      {/* Current Tasks Section */}
      <div style={{
        backgroundColor: "white",
        borderRadius: "12px",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05)",
        padding: "32px"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
          <h3 style={{ margin: 0, fontSize: "20px", color: "#2c3e50", fontWeight: "600" }}>
            Active Service Tasks
          </h3>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <input
              type="text"
              placeholder="Search jobs..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={searchInputStyle}
            />
            <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
              <label style={filterLabelStyle}>
                <input
                  type="checkbox"
                  checked={filterByStartDate}
                  onChange={() => {
                    setFilterByStartDate(!filterByStartDate);
                    setFilterByHandoverDate(false);
                    setExactDate("");
                  }}
                />
                Start Date
              </label>
              <label style={filterLabelStyle}>
                <input
                  type="checkbox"
                  checked={filterByHandoverDate}
                  onChange={() => {
                    setFilterByHandoverDate(!filterByHandoverDate);
                    setFilterByStartDate(false);
                    setExactDate("");
                  }}
                />
                Handover Date
              </label>
              {(filterByStartDate || filterByHandoverDate) && (
                <input
                  type="date"
                  value={exactDate}
                  onChange={(e) => setExactDate(e.target.value)}
                  style={dateInputStyle}
                />
              )}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gap: "16px" }}>
          {filteredTasks.map((task) => {
            const isOverdue = calculateTimeRemaining(task.handoverDate) === "Overdue";
            const isCompleted = task.taskCompleted === 1;
            const needsAttention = isOverdue && !isCompleted;

            return (
              <div key={task.id} style={taskCardStyle(needsAttention, isCompleted)}>
                {isCompleted && (
                  <div style={completedBadgeStyle}>
                    TASK COMPLETED
                    <div style={completedDateStyle}>
                      {task.taskCompletedAt?.toDate().toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                )}

                <div style={taskHeaderStyle}>
                  <div>
                    <div style={customerInfoStyle}>
                      <span style={customerNameStyle}>{task.customerName}</span>
                      <span style={invoiceBadgeStyle}>
                        #{task.invoiceNumber}
                      </span>
                    </div>
                    <div style={deviceInfoStyle}>
                      {task.maker} {task.model} • {task.assignedTechnician || "Unassigned"}
                    </div>
                  </div>
                  <div style={timeInfoStyle}>
                    <div style={deadlineStyle(needsAttention)}>
                      {new Date(task.handoverDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                    <div style={statusStyle(needsAttention, isCompleted)}>
                      {isCompleted ? "COMPLETED" : 
                       needsAttention ? "OVERDUE" : 
                       `Remaining: ${calculateTimeRemaining(task.handoverDate)}`}
                    </div>
                  </div>
                </div>
                <div style={actionButtonContainer}>
                  <button
                    onClick={() => navigate(`/ServiceJobView/${task.id}`)}
                    style={viewDetailsButton}
                  >
                    View Details
                  </button>
                  {!isCompleted && (
                    <button
                      onClick={() => handleCompleteTask(task.id)}
                      style={completeButton}
                    >
                      Complete Job
                    </button>
                  )}
                  {!isCompleted && isAdmin && (
                    <>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        style={deleteButton}
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => openExtendModal(task.id)}
                        style={extendButton}
                      >
                        Extend Date
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Extend Date Modal */}
      {showExtendModal && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h3 style={{ marginTop: 0, marginBottom: "20px" }}>Extend Deadline</h3>
            <input
              type="datetime-local"
              value={newHandoverDate}
              onChange={(e) => setNewHandoverDate(e.target.value)}
              style={dateTimeInputStyle}
            />
            <div style={modalButtonContainer}>
              <button
                style={cancelButton}
                onClick={() => setShowExtendModal(false)}
              >
                Cancel
              </button>
              <button
                style={confirmButton}
                onClick={handleConfirmExtend}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Style constants (remain the same as in your original file)
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

const textAreaStyle = {
  ...inputStyle,
  minHeight: "100px"
};

const primaryButtonStyle = {
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
};

const searchInputStyle = {
  padding: "8px 12px",
  border: "1px solid #e2e8f0",
  borderRadius: "6px",
  fontSize: "14px",
  width: "200px"
};

const filterLabelStyle = {
  fontSize: "14px",
  display: "flex",
  alignItems: "center",
  gap: "6px"
};

const dateInputStyle = {
  padding: "6px 8px",
  border: "1px solid #e2e8f0",
  borderRadius: "4px",
  fontSize: "14px"
};

const taskCardStyle = (needsAttention, isCompleted) => ({
  padding: "20px",
  backgroundColor: needsAttention ? "#fff5f5" : "#f8fafc",
  borderRadius: "8px",
  borderLeft: `4px solid ${isCompleted ? "#3498db" : needsAttention ? "#ff6b6b" : "#3498db"}`,
  position: "relative",
});

const completedBadgeStyle = {
  position: "absolute",
  top: "10px",
  right: "10px",
  backgroundColor: "#e74c3c",
  color: "white",
  padding: "4px 8px",
  borderRadius: "4px",
  fontSize: "12px",
  fontWeight: "bold",
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end"
};

const completedDateStyle = {
  fontSize: "10px",
  fontWeight: "normal"
};

const taskHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center"
};

const customerInfoStyle = {
  display: "flex",
  alignItems: "center",
  gap: "12px"
};

const customerNameStyle = {
  fontSize: "18px",
  fontWeight: "600"
};

const invoiceBadgeStyle = {
  fontSize: "12px",
  backgroundColor: "#e2e8f0",
  padding: "4px 8px",
  borderRadius: "4px"
};

const deviceInfoStyle = {
  color: "#718096",
  fontSize: "14px"
};

const timeInfoStyle = {
  textAlign: "right"
};

const deadlineStyle = (needsAttention) => ({
  color: needsAttention ? "#e53e3e" : "#4a5568",
  fontWeight: "500"
});

const statusStyle = (needsAttention, isCompleted) => ({
  fontSize: "14px",
  color: needsAttention ? "#e53e3e" : isCompleted ? "#38a169" : "#2d3748"
});

const actionButtonContainer = {
  display: "flex",
  gap: "12px",
  borderTop: "1px solid #edf2f7",
  paddingTop: "12px",
  marginTop: "12px"
};

const baseButton = {
  padding: "8px 16px",
  color: "white",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
  fontSize: "14px",
  transition: "background-color 0.3s"
};

const viewDetailsButton = {
  ...baseButton,
  backgroundColor: "#3498db"
};

const completeButton = {
  ...baseButton,
  backgroundColor: "#2ecc71"
};

const deleteButton = {
  ...baseButton,
  backgroundColor: "#e53e3e"
};

const extendButton = {
  ...baseButton,
  backgroundColor: "#2d3748"
};

const modalOverlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000
};

const modalContentStyle = {
  backgroundColor: "white",
  padding: "24px",
  borderRadius: "8px",
  width: "400px",
  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"
};

const dateTimeInputStyle = {
  width: "100%",
  padding: "10px",
  border: "1px solid #e2e8f0",
  borderRadius: "6px",
  marginBottom: "20px"
};

const modalButtonContainer = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "12px"
};

const cancelButton = {
  padding: "8px 16px",
  backgroundColor: "#e2e8f0",
  color: "#2d3748",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: "500"
};

const confirmButton = {
  ...cancelButton,
  backgroundColor: "#3498db",
  color: "white"
};