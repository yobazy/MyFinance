import React, { useState } from "react";
import axios from "axios";

const FileUploader = () => {
  const [file, setFile] = useState(null);
  const [fileType, setFileType] = useState("TD");
  const [message, setMessage] = useState("");

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
      <select onChange={(e) => setFileType(e.target.value)}>
        <option value="TD">CSV for TD</option>
        <option value="Amex">XLS for Amex</option>
      </select>
      <input type="file" onChange={(e) => setFile(e.target.files[0])} />
      <button onClick={handleUpload}>Upload</button>
      <p>{message}</p>
    </div>
  );
};

export default FileUploader;
