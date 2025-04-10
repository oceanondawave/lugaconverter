import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";

// --- Audio Setup ---
const uploadSound = new Audio("/uploaded.mp3");
const completedSound = new Audio("/completed.mp3");
// const errorSound = new Audio('/error.mp3');

// ---> FIX: Set Volume to Maximum <---
// The volume property ranges from 0.0 (silent) to 1.0 (maximum)
uploadSound.volume = 1.0;
completedSound.volume = 1.0;
// if (errorSound) errorSound.volume = 1.0; // Set error sound volume too if using

// Preload audio
const usePreloadAudio = () => {
  useEffect(() => {
    uploadSound.load();
    completedSound.load();
    // if (errorSound) errorSound.load();
  }, []);
};

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const fileInputRef = useRef(null);

  usePreloadAudio(); // Call preload hook

  // --- Helper function to safely play audio ---
  const playAudio = (audioElement) => {
    // Ensure volume is still max (usually not necessary unless changed elsewhere)
    // audioElement.volume = 1.0;
    audioElement.currentTime = 0;
    audioElement.play().catch((error) => {
      console.error(`Error playing audio ${audioElement.src}:`, error);
    });
  };

  // --- handleFileChange ---
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setMessage("");
      playAudio(uploadSound); // Plays when file is selected
    } else {
      setSelectedFile(null);
      setMessage("");
    }
  };

  // --- Modified handleSubmit ---
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!selectedFile) {
      setMessage("Please select a .docx file first.");
      setMessageType("danger");
      return;
    }

    if (!selectedFile.name.toLowerCase().endsWith(".docx")) {
      setMessage("Invalid file type. Only .docx is allowed.");
      setMessageType("danger");
      return;
    }

    // --- Get original filename and prepare the new download filename ---
    const originalFilename = selectedFile.name;
    const lastDotIndex = originalFilename.lastIndexOf(".");
    const baseName =
      lastDotIndex > 0
        ? originalFilename.substring(0, lastDotIndex)
        : originalFilename;
    const downloadFilename = `${baseName}_normalized.docx`; // Use the constructed name

    // --- Set state for UI feedback and start processing ---
    setIsProcessing(true);
    setMessage("Uploading and processing...");
    setMessageType("info");

    const formData = new FormData();
    formData.append("file", selectedFile);

    const backendUrl = "http://localhost:5001/process";

    try {
      const response = await axios.post(backendUrl, formData, {
        responseType: "blob",
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      // --- Handle successful response ---
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;

      // --- Set the constructed filename for download ---
      link.setAttribute("download", downloadFilename);

      document.body.appendChild(link);
      link.click(); // Trigger download
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      // --- Play Completed Sound ---
      playAudio(completedSound);

      // Update UI message for success
      setMessage("File processed successfully! Download started.");
      setMessageType("success");
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; // Clear the file input
      }
    } catch (error) {
      // --- Handle errors ---
      console.error("Error uploading file:", error);
      let errorMsg = "An error occurred during processing.";
      if (error.response && error.response.data) {
        if (
          error.response.data instanceof Blob &&
          error.response.data.type === "application/json"
        ) {
          try {
            const errJson = JSON.parse(await error.response.data.text());
            errorMsg = errJson.error || errorMsg;
          } catch (parseError) {
            /* Ignore */
          }
        } else if (typeof error.response.data === "object") {
          errorMsg = error.response.data.error || errorMsg;
        }
      } else if (error.request) {
        errorMsg =
          "Could not connect to the server. Please ensure it is running.";
      }
      setMessage(errorMsg);
      setMessageType("danger");
      // if (errorSound) playAudio(errorSound);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    // --- JSX remains the same ---
    <div className="container mt-5">
      <h1 className="mb-4">Luga Converter</h1>
      <p>
        Upload a .docx file to convert its text content from Unicode NFD to NFC.
      </p>
      <p className="text-success small">
        I am Ocean Kid, and Luga is my lovely girlfriend and she is visually
        impaired. I created this tool to support visually impaired individuals
        in reading content from .docx files, which are often difficult for
        screen readers like NVDA to process because they use Unicode NFD instead
        of NFC. Thank you for using this tool! Contact me at:
        minh.ngntri@gmail.com.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label htmlFor="fileInput" className="form-label">
            Select .docx file:
          </label>
          <input
            type="file"
            className="form-control"
            id="fileInput"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            disabled={isProcessing}
          />
        </div>

        {message && (
          <div className={`alert alert-${messageType}`} role="alert">
            {message}
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary"
          disabled={!selectedFile || isProcessing}
        >
          {isProcessing ? (
            <>
              <span
                className="spinner-border spinner-border-sm me-2"
                role="status"
                aria-hidden="true"
              ></span>
              Processing...
            </>
          ) : (
            "Upload and Process"
          )}
        </button>
      </form>
    </div>
  );
}

export default App;
