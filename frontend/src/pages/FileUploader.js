import React, { useState } from "react";
import axios from "axios";

const FileUploader = () => {
  const [file, setFile] = useState(null);
  const [fileType, setFileType] = useState("csv"); // Default to CSV
  const [message, setMessage] = useState("");

  const handleFileTypeChange = (event) => {
    setFileType(event.target.value);
    };

  const handleUpload = async () => {
    if (!file) {
      setMessage("Please select a file.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("file_type", fileType);

    try {
      const response = await axios.post("http://127.0.0.1:8000/api/upload/", formData);
      setMessage(response.data.message);
    } catch (error) {
      setMessage("Upload failed.");
    }
  };

  return (
    <div>
      <h2>Upload TD CSV or Amex XLS</h2>
      <select onChange={handleFileTypeChange} value={fileType}>
        <option value="TD">CSV for TD</option>
        <option value="Amex">XLS for Amex</option>
      </select>
      {/* File Input (Dynamically Restricts File Types) */}
      <input
        type="file"
        accept={fileType === "csv" ? ".csv" : ".xls,.xlsx"}
      />
      <button onClick={handleUpload}>Upload</button>
      <p>{message}</p>
    </div>
  );
};

export default FileUploader;
