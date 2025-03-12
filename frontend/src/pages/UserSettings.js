import React, { useState } from "react";
import axios from "axios";

const UserSettings = () => {
  const [message, setMessage] = useState("");

  const handleResetDatabase = async () => {
    try {
      const response = await axios.post("http://127.0.0.1:8000/api/reset-database/");
      setMessage(response.data.message);
    } catch (error) {
      setMessage("Failed to reset database.");
    }
  };

  return (
    <div>
      <h2>User Settings</h2>
      
      <button onClick={handleResetDatabase} style={{ backgroundColor: "red", color: "white" }}>
        Reset Database
      </button>

      <p>{message}</p>
    </div>
  );
};

export default UserSettings;
