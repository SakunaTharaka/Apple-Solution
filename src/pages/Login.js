import React, { useState } from "react";
import { db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import logoapple from "../img/logoapple.png";       // Main logo
import logowayne from "../img/logowayne.ico";       // Small .ico logo for footer

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const styles = {
    loginContainer: {
      width: "100%",
      maxWidth: "400px",
      padding: "40px",
      background: "white",
      borderRadius: "8px",
      boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)",
      margin: "0 auto",
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
    },
    loginHeader: {
      marginBottom: "30px",
      textAlign: "center",
    },
    logoContainer: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: "20px",
    },
    title: {
      fontSize: "26px",
      fontWeight: "bold",
      color: "#333",
    },
    subtitle: {
      fontSize: "14px",
      color: "#666",
      marginTop: "5px",
    },
    loginForm: {
      display: "flex",
      flexDirection: "column",
      gap: "20px",
    },
    formGroup: {
      display: "flex",
      flexDirection: "column",
      gap: "6px",
    },
    label: {
      fontSize: "14px",
      color: "#444",
      fontWeight: "500",
    },
    input: {
      width: "100%",
      padding: "12px 16px",
      fontSize: "16px",
      border: "1px solid #ddd",
      borderRadius: "6px",
      outline: "none",
      transition: "border-color 0.3s, box-shadow 0.3s",
    },
    loginButton: {
      backgroundColor: "#4a90e2",
      color: "white",
      border: "none",
      padding: "14px",
      fontSize: "16px",
      fontWeight: "bold",
      borderRadius: "6px",
      cursor: "pointer",
      transition: "background-color 0.3s",
      marginTop: "10px",
    },
    errorMessage: {
      color: "#e74c3c",
      fontSize: "14px",
      marginTop: "15px",
      textAlign: "center",
      backgroundColor: "rgba(231, 76, 60, 0.1)",
      padding: "10px",
      borderRadius: "4px",
      borderLeft: "3px solid #e74c3c",
    },
    footer: {
      marginTop: "30px",
      textAlign: "center",
      fontSize: "13px",
      color: "#666",
    },
    logoImage: {
      height: "50px",
      marginRight: "12px",
    },
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const q = query(
        collection(db, "users"),
        where("username", "==", username),
        where("password", "==", password)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const userData = snapshot.docs[0].data();
        localStorage.setItem(
          "user",
          JSON.stringify({
            username: userData.username,
            role: userData.role,
          })
        );
        navigate("/dashboard", { replace: true });
      } else {
        setError("Invalid username or password");
      }
    } catch (err) {
      console.error(err);
      setError("Login failed. Please try again.");
    }
  };

  return (
    <div style={styles.loginContainer}>
      <div style={styles.loginHeader}>
        <div style={styles.logoContainer}>
          <img src={logoapple} alt="Logo" style={styles.logoImage} />
          <h1 style={styles.title}>Apple Solution</h1>
        </div>
        <p style={styles.subtitle}>Sign in to access your account</p>
      </div>

      <form style={styles.loginForm} onSubmit={handleLogin}>
        <div style={styles.formGroup}>
          <label style={styles.label} htmlFor="username">Username</label>
          <input
            id="username"
            style={styles.input}
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label} htmlFor="password">Password</label>
          <input
            id="password"
            style={styles.input}
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button style={styles.loginButton} type="submit">
          Login
        </button>

        {error && <div style={styles.errorMessage}>{error}</div>}
      </form>

      <div style={styles.footer}>
        <img
          src={logowayne}
          alt="Wayne logo"
          style={{ height: "14px", verticalAlign: "middle", marginRight: "6px" }}
        />
        © {new Date().getFullYear()} Wayne Systems Pvt Ltd. All rights reserved.
      </div>
    </div>
  );
}
