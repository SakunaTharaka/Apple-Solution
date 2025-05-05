import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  setDoc,
  doc,
  deleteDoc,
} from "firebase/firestore";

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ username: "", password: "", role: "user" });
  const navigate = useNavigate();

  const fetchUsers = async () => {
    const snapshot = await getDocs(collection(db, "users"));
    const userList = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setUsers(userList);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async () => {
    if (!newUser.username || !newUser.password) {
      return alert("Fill all fields");
    }
    const newDoc = doc(db, "users", newUser.username);
    await setDoc(newDoc, newUser);
    setNewUser({ username: "", password: "", role: "user" });
    fetchUsers();
    alert("User added");
  };

  const toggleRole = async (user) => {
    const updatedRole = user.role === "admin" ? "user" : "admin";
    await setDoc(doc(db, "users", user.username), {
      ...user,
      role: updatedRole,
    });
    fetchUsers();
  };

  const deleteUser = async (username) => {
    if (window.confirm(`Delete user "${username}"?`)) {
      await deleteDoc(doc(db, "users", username));
      fetchUsers();
    }
  };

  const logout = () => {
    localStorage.clear();
    navigate("/");
  };

  return (
    <div style={{ 
      padding: "20px", 
      width: "100vw",
      height: "100vh",
      overflow: "auto",
      boxSizing: "border-box",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif"
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "30px",
        borderBottom: "1px solid #e0e0e0",
        paddingBottom: "15px"
      }}>
        <h1 style={{ 
          fontSize: "28px", 
          fontWeight: "600", 
          margin: 0,
          display: "flex",
          alignItems: "center"
        }}>
          <span style={{ marginRight: "10px" }}>👤</span> 
          Admin Panel
        </h1>
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            style={{
              backgroundColor: "#007bff", 
              color: "white", 
              padding: "8px 16px", 
              border: "none", 
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              display: "flex",
              alignItems: "center"
            }}
            onClick={() => navigate("/dashboard")}
          >
            Go to Dashboard
          </button>
          <button
            style={{
              backgroundColor: "#dc3545", 
              color: "white", 
              padding: "8px 16px", 
              border: "none", 
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              display: "flex",
              alignItems: "center"
            }}
            onClick={logout}
          >
            Logout
          </button>
        </div>
      </div>

      <div style={{
        backgroundColor: "#f8f9fa",
        padding: "25px",
        borderRadius: "8px",
        marginBottom: "25px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
      }}>
        <h2 style={{ 
          fontSize: "20px", 
          fontWeight: "500", 
          marginTop: 0,
          marginBottom: "20px",
          display: "flex",
          alignItems: "center"
        }}>
          <span style={{ marginRight: "10px" }}>➕</span>
          Add New User
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px", marginBottom: "15px" }}>
          <input
            style={{ 
              padding: "10px 12px",
              borderRadius: "4px",
              border: "1px solid #ddd",
              fontSize: "14px",
              width: "100%",
              boxSizing: "border-box"
            }}
            placeholder="Username"
            value={newUser.username}
            onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
          />
          <input
            style={{ 
              padding: "10px 12px",
              borderRadius: "4px",
              border: "1px solid #ddd",
              fontSize: "14px",
              width: "100%",
              boxSizing: "border-box"
            }}
            type="password"
            placeholder="Password"
            value={newUser.password}
            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
          />
          <select
            style={{ 
              padding: "10px 12px",
              borderRadius: "4px",
              border: "1px solid #ddd",
              fontSize: "14px",
              width: "100%",
              boxSizing: "border-box",
              backgroundColor: "white"
            }}
            value={newUser.role}
            onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            style={{
              backgroundColor: "#28a745",
              color: "white",
              padding: "10px 16px",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500"
            }}
            onClick={handleAddUser}
          >
            Add User
          </button>
        </div>
      </div>

      <div style={{
        backgroundColor: "white",
        borderRadius: "8px",
        padding: "25px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
      }}>
        <h2 style={{ 
          fontSize: "20px", 
          fontWeight: "500", 
          marginTop: 0,
          marginBottom: "20px",
          display: "flex",
          alignItems: "center"
        }}>
          <span style={{ marginRight: "10px" }}>👥</span>
          User Management
        </h2>
        
        <div style={{ overflowX: "auto" }}>
          <table style={{ 
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "14px",
          }}>
            <thead>
              <tr style={{ backgroundColor: "#f8f9fa" }}>
                <th style={{ 
                  textAlign: "left", 
                  padding: "12px 15px", 
                  borderBottom: "2px solid #dee2e6",
                  fontWeight: "600"
                }}>Username</th>
                <th style={{ 
                  textAlign: "left", 
                  padding: "12px 15px", 
                  borderBottom: "2px solid #dee2e6",
                  fontWeight: "600"
                }}>Role</th>
                <th style={{ 
                  textAlign: "right", 
                  padding: "12px 15px", 
                  borderBottom: "2px solid #dee2e6",
                  fontWeight: "600"
                }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan="3" style={{ 
                    textAlign: "center", 
                    padding: "20px",
                    color: "#6c757d"
                  }}>
                    No users found. Add a new user to get started.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} style={{ 
                    borderBottom: "1px solid #dee2e6",
                    backgroundColor: users.indexOf(user) % 2 === 0 ? "#ffffff" : "#f8f9fa"
                  }}>
                    <td style={{ padding: "12px 15px" }}>{user.username}</td>
                    <td style={{ padding: "12px 15px" }}>
                      <span style={{
                        display: "inline-block",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: "500",
                        backgroundColor: user.role === "admin" ? "#17a2b8" : "#6c757d",
                        color: "white"
                      }}>
                        {user.role}
                      </span>
                    </td>
                    <td style={{ 
                      padding: "12px 15px", 
                      textAlign: "right" 
                    }}>
                      <button
                        style={{
                          backgroundColor: user.role === "admin" ? "#6c757d" : "#ffc107",
                          color: user.role === "admin" ? "white" : "black",
                          border: "none",
                          borderRadius: "4px",
                          padding: "6px 12px",
                          marginRight: "8px",
                          cursor: "pointer",
                          fontSize: "13px"
                        }}
                        onClick={() => toggleRole(user)}
                      >
                        {user.role === "admin" ? "Demote to User" : "Promote to Admin"}
                      </button>
                      <button
                        style={{
                          backgroundColor: "#dc3545",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          padding: "6px 12px",
                          cursor: "pointer",
                          fontSize: "13px"
                        }}
                        onClick={() => deleteUser(user.username)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
