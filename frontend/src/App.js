import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";

// --- Translations Object --- (Keep as before)
const translations = {
  en: {
    /* ... en translations ... */ title: "Luga Converter",
    description:
      "Upload a .docx file to convert its text content from Unicode NFD to NFC.",
    authorCredit:
      "I am Ocean Kid, and Luga is my lovely girlfriend and she is visually impaired. I created this tool to support visually impaired individuals in reading content from .docx files, which are often difficult for screen readers like NVDA to process because they use Unicode NFD instead of NFC. Thank you for using this tool! Contact me at: minh.ngntri@gmail.com.",
    languageSelectLabel: "Ngôn ngữ/Language:",
    languageNameVI: "Tiếng Việt",
    languageNameEN: "English",
    selectFileLabel: "Select .docx file:",
    submitButton: "Upload and Process",
    processingButton: "Processing...",
    selectFileFirst: "Please select a .docx file first.",
    invalidFileType: "Invalid file type. Only .docx is allowed.",
    uploading: "Uploading and processing...",
    success: "File processed successfully! Download started.",
    errorConnect:
      "Could not connect to the server. Please ensure it is running.",
    errorProcess: "An error occurred during processing.",
    errorResponse: "An error occurred: {error}",
  },
  vi: {
    /* ... vi translations ... */ title: "Bộ chuyển đổi Luga",
    description:
      "Tải lên tệp .docx để chuyển đổi nội dung văn bản từ Unicode NFD sang NFC.",
    authorCredit:
      "Tôi là Ocean Kid, và Luga là bạn gái đáng yêu của tôi, cô ấy là người khiếm thị. Tôi tạo ra công cụ này để hỗ trợ người khiếm thị đọc nội dung từ các tệp .docx, vốn thường khó khăn cho các trình đọc màn hình như NVDA xử lý vì chúng sử dụng Unicode NFD thay vì NFC. Cảm ơn bạn đã sử dụng công cụ này! Liên hệ với tôi tại: minh.ngntri@gmail.com.",
    languageSelectLabel: "Ngôn ngữ/Language:",
    languageNameVI: "Tiếng Việt",
    languageNameEN: "English",
    selectFileLabel: "Chọn tệp .docx:",
    submitButton: "Tải lên và Xử lý",
    processingButton: "Đang xử lý...",
    selectFileFirst: "Vui lòng chọn một tệp .docx trước.",
    invalidFileType: "Loại tệp không hợp lệ. Chỉ cho phép .docx.",
    uploading: "Đang tải lên và xử lý...",
    success: "Tệp đã được xử lý thành công! Quá trình tải xuống đã bắt đầu.",
    errorConnect:
      "Không thể kết nối đến máy chủ. Vui lòng đảm bảo máy chủ đang chạy.",
    errorProcess: "Đã xảy ra lỗi trong quá trình xử lý.",
    errorResponse: "Đã xảy ra lỗi: {error}",
  },
};

// --- Audio Setup for Both Languages ---
const uploadSoundEN = new Audio("/uploaded.mp3");
const completedSoundEN = new Audio("/completed.mp3");
const uploadSoundVI = new Audio("/uploaded_vi.mp3"); // Vietnamese version
const completedSoundVI = new Audio("/completed_vi.mp3"); // Vietnamese version

// Set Volume for all audio files
uploadSoundEN.volume = 1.0;
completedSoundEN.volume = 1.0;
uploadSoundVI.volume = 1.0;
completedSoundVI.volume = 1.0;

// Preload all audio files
const usePreloadAudio = () => {
  useEffect(() => {
    uploadSoundEN.load();
    completedSoundEN.load();
    uploadSoundVI.load();
    completedSoundVI.load();
  }, []);
};

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [messageKey, setMessageKey] = useState("");
  const [messageErrorDetail, setMessageErrorDetail] = useState("");
  const [messageType, setMessageType] = useState("info");
  const fileInputRef = useRef(null);
  const [language, setLanguage] = useState("vi"); // Default to Vietnamese

  usePreloadAudio();

  // --- Helper function to get translated string --- (Keep as before)
  const t = (key, errorDetail = "") => {
    let translated =
      translations[language]?.[key] || translations["en"]?.[key] || key;
    if (key === "errorResponse" && errorDetail) {
      translated = translated.replace("{error}", errorDetail);
    }
    return translated;
  };

  // Helper function to play audio (no change needed here)
  const playAudio = (audioElement) => {
    audioElement.currentTime = 0;
    audioElement.play().catch((error) => {
      console.error(`Error playing audio ${audioElement.src}:`, error);
    });
  };

  // --- Modified handleFileChange ---
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setMessageKey("");
      setMessageErrorDetail("");

      // --- Play language-specific upload sound ---
      if (language === "vi") {
        playAudio(uploadSoundVI);
      } else {
        playAudio(uploadSoundEN);
      }
    } else {
      setSelectedFile(null);
      setMessageKey("");
      setMessageErrorDetail("");
    }
  };

  // Language change handler (Keep as before)
  const handleLanguageChange = (event) => {
    setLanguage(event.target.value);
    setMessageKey("");
    setMessageErrorDetail("");
  };

  // --- Modified handleSubmit ---
  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessageKey("");
    setMessageErrorDetail("");

    if (!selectedFile) {
      /* ... validation ... */
      setMessageKey("selectFileFirst");
      setMessageType("danger");
      return;
    }
    if (!selectedFile.name.toLowerCase().endsWith(".docx")) {
      /* ... validation ... */
      setMessageKey("invalidFileType");
      setMessageType("danger");
      return;
    }

    const originalFilename = selectedFile.name;
    const lastDotIndex = originalFilename.lastIndexOf(".");
    const baseName =
      lastDotIndex > 0
        ? originalFilename.substring(0, lastDotIndex)
        : originalFilename;
    const downloadFilename = `${baseName}_normalized.docx`;

    setIsProcessing(true);
    setMessageKey("uploading");
    setMessageType("info");

    const formData = new FormData();
    formData.append("file", selectedFile);
    const backendUrl = "http://localhost:5001/process";

    try {
      const response = await axios.post(backendUrl, formData, {
        responseType: "blob",
        headers: { "Content-Type": "multipart/form-data" },
      });

      // ... (download link creation logic remains the same) ...
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", downloadFilename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      // --- Play language-specific completed sound ---
      if (language === "vi") {
        playAudio(completedSoundVI);
      } else {
        playAudio(completedSoundEN);
      }

      setMessageKey("success");
      setMessageType("success");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      // ... (error handling remains the same) ...
      console.error("Error uploading file:", error);
      let errorMsgKey = "errorProcess";
      let detail = "";
      if (error.response && error.response.data) {
        /* ... error parsing ... */
        if (
          error.response.data instanceof Blob &&
          error.response.data.type === "application/json"
        ) {
          try {
            const errJson = JSON.parse(await error.response.data.text());
            detail = errJson.error || "";
            if (detail) errorMsgKey = "errorResponse";
          } catch (parseError) {}
        } else if (typeof error.response.data === "object") {
          detail = error.response.data.error || "";
          if (detail) errorMsgKey = "errorResponse";
        }
      } else if (error.request) {
        errorMsgKey = "errorConnect";
      }
      setMessageKey(errorMsgKey);
      setMessageErrorDetail(detail);
      setMessageType("danger");
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Render the message using the key --- (Keep as before)
  const message = messageKey ? t(messageKey, messageErrorDetail) : "";

  return (
    // --- JSX Structure Remains the Same ---
    <div className="container mt-5">
      {/* Language Selector */}
      <div className="mb-3 d-flex justify-content-end align-items-center">
        <label htmlFor="languageSelect" className="form-label me-2 fw-bold">
          {t("languageSelectLabel")}
        </label>
        <select
          id="languageSelect"
          className="form-select form-select-sm"
          style={{ width: "auto" }}
          value={language}
          onChange={handleLanguageChange}
          disabled={isProcessing}
        >
          <option value="vi">{t("languageNameVI")}</option>
          <option value="en">{t("languageNameEN")}</option>
        </select>
      </div>

      {/* Translated UI Elements */}
      <h1 className="mb-4">{t("title")}</h1>
      <p>{t("description")}</p>
      <p className="text-success small">{t("authorCredit")}</p>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label htmlFor="fileInput" className="form-label">
            {t("selectFileLabel")}
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

        {/* Translated Message */}
        {message && (
          <div className={`alert alert-${messageType}`} role="alert">
            {message}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!selectedFile || isProcessing}
        >
          {isProcessing ? (
            <>
              {" "}
              <span
                className="spinner-border spinner-border-sm me-2"
                role="status"
                aria-hidden="true"
              ></span>{" "}
              {t("processingButton")}{" "}
            </>
          ) : (
            t("submitButton")
          )}
        </button>
      </form>
    </div>
  );
}

export default App;
