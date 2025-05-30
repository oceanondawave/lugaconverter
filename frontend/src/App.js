import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay, faPause } from "@fortawesome/free-solid-svg-icons";

// --- Translations Object ---
const translations = {
  en: {
    title: "Luga Converter",
    description:
      "Upload a .docx file to convert its text content from Unicode NFD to NFC.",
    // ---> MODIFIED: Added placeholder and new email key <---
    authorCredit:
      "Hi there, I am Ocean Kid, and Luga is my lovely girlfriend, she is visually impaired. I created this tool to support visually impaired individuals in reading content from .docx files, which are often difficult for screen readers like NVDA to process because those documents use Unicode NFD instead of NFC (you can listen to the explanation below). Thank you for using this tool! Contact me at: {emailLink}.",
    authorEmail: "minh.ngntri@gmail.com", // New key
    // --- END MODIFIED ---
    explanationButtonLabel:
      "Listen to the explanation about Unicode NFD/NFC (select to play or pause)",
    warningTitle: "Note and Usage Instructions:",
    warningPoint1:
      "Free, free, free — and always will be. This is a community-supported tool. If you come across any other tool that copies this one and charges a fee, it's not the official version. Please report it to me immediately.",
    warningPoint2:
      "Only .docx files are supported. You cannot upload files with other extensions. If your .doc file doesn't upload, please save it as a .docx file (for example, using 'Save As' in Microsoft Word) and try uploading again.",
    warningPoint3:
      "Your file data is completely secure. The tool only processes and returns the result — I cannot view or store your data in any form.",
    warningPoint4:
      "Please upload a .docx file. Once selected successfully, you’ll hear a confirmation sound. Then click the button to upload and process. After processing, the new file will be automatically downloaded, and you’ll hear another confirmation sound. It’s very fast and fully automated! The new file will include '[lugaconverter]' at the end of its name.",
    warningPoint5:
      "The website may be slow if there are many users accessing it at the same time. Since I'm using a free service, this might happen occasionally — please be patient and try again later!",
    processWarning: "Choose File to Process",
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
    title: "Bộ chuyển đổi Luga",
    description:
      "Tải lên tệp .docx để chuyển đổi nội dung văn bản từ Unicode NFD sang NFC.",
    // ---> MODIFIED: Added placeholder and new email key <---
    authorCredit:
      "Xin chào, tớ là Ocean Kid, và Luga là cô bạn gái đáng yêu của tớ, cô ấy là người bị suy giảm thị lực. Tớ tạo ra công cụ này để hỗ trợ người bị suy giảm thị lực đọc nội dung từ các tệp .docx, vốn thường gây khó khăn cho các trình đọc màn hình như NVDA khi xử lý vì những văn bản đó sử dụng Unicode NFD thay vì NFC (cậu có thể nghe giải thích ở dưới). Cảm ơn cậu đã sử dụng công cụ này! Liên hệ với tớ tại: {emailLink}.",
    authorEmail: "minh.ngntri@gmail.com", // New key
    // --- END MODIFIED ---
    explanationButtonLabel:
      "Nghe giải thích về Unicode NFD/NFC (chọn để nghe hoặc tạm dừng)",
    warningTitle: "Lưu ý và Cách Sử dụng:",
    warningPoint1:
      "Miễn phí, miễn phí, miễn phí và sẽ luôn như vậy. Đây là công cụ hỗ trợ cộng đồng, nếu cậu thấy công cụ nào khác sao chép lại công cụ này của tớ và thu phí, đó không phải bản chính thức và hãy báo cáo ngay cho tớ nhé.",
    warningPoint2:
      "Chỉ hỗ trợ tệp .docx, cậu không thể tải lên tệp nào có phần mở rộng khác. Nếu cậu thấy tệp .doc của cậu không tải lên được thì hãy lưu lại dưới dạng .docx (như dùng chức năng 'Save As' trong Microsoft Word) sau đó thử tải lên lại nhé.",
    warningPoint3:
      "Dữ liệu về tệp của cậu tuyệt đối an toàn vì công cụ chỉ xử lý và trả về - tớ hoàn toàn không đọc được và không lưu trữ lại dưới bất kỳ hình thức nào.",
    warningPoint4:
      "Hãy tải lên tệp .docx, sau khi chọn thành công cậu sẽ nghe thấy âm thanh xác nhận. Sau đó hãy nhấn nút để tải lên và xử lý. Sau khi xử lý xong tệp mới sẽ được tự động tải về và cậu cũng sẽ nghe âm thanh xác nhận. Tốc độ rất nhanh và hoàn toàn tự động! Tệp mới của cậu sẽ có đuôi '[lugaconverter]' ở tên tệp.",
    warningPoint5:
      "Trang web có thể bị chậm nếu có nhiều người truy cập và sử dụng. Vì tớ sử dụng dịch vụ miễn phí nên điều này hoàn toàn có thể xảy ra - cậu hãy thông cảm và thử lại sau một lúc nhé!",
    processWarning: "Chọn Tệp để Xử lý",
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

// --- Audio Setup --- (Same as before)
const uploadSoundEN = new Audio("/uploaded.mp3");
const completedSoundEN = new Audio("/completed.mp3");
const uploadSoundVI = new Audio("/uploaded_vi.mp3");
const completedSoundVI = new Audio("/completed_vi.mp3");
const explanationSoundEN = new Audio("/explanation.mp3");
const explanationSoundVI = new Audio("/explanation_vi.mp3");

// Set Volume (Same as before)
uploadSoundEN.volume = 1.0;
completedSoundEN.volume = 1.0;
uploadSoundVI.volume = 1.0;
completedSoundVI.volume = 1.0;
explanationSoundEN.volume = 1.0;
explanationSoundVI.volume = 1.0;

// Preload all audio files (Same as before)
const usePreloadAudio = () => {
  useEffect(() => {
    uploadSoundEN.load();
    completedSoundEN.load();
    uploadSoundVI.load();
    completedSoundVI.load();
    explanationSoundEN.load();
    explanationSoundVI.load();
  }, []);
};

// Function to fully stop explanation sounds (Same as before)
const stopAndResetExplanationSounds = (setStateCallback) => {
  explanationSoundEN.pause();
  explanationSoundEN.currentTime = 0;
  explanationSoundVI.pause();
  explanationSoundVI.currentTime = 0;
  if (setStateCallback) setStateCallback(false);
};

function App() {
  // --- State variables (Same as before) ---
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [messageKey, setMessageKey] = useState("");
  const [messageErrorDetail, setMessageErrorDetail] = useState("");
  const [messageType, setMessageType] = useState("info");
  const fileInputRef = useRef(null);
  const [language, setLanguage] = useState("vi");
  const [isExplanationPlaying, setIsExplanationPlaying] = useState(false);

  usePreloadAudio();

  // Translation helper (Same as before)
  const t = (key, errorDetail = "") => {
    let translated =
      translations[language]?.[key] || translations["en"]?.[key] || key;
    if (key === "errorResponse" && errorDetail)
      translated = translated.replace("{error}", errorDetail);
    return translated;
  };

  // Audio pause/stop helpers (Same as before)
  const pauseSpecificAudio = (audioElement) => {
    audioElement.pause();
  };
  const stopAndResetAudio = (audioElement) => {
    audioElement.pause();
    audioElement.currentTime = 0;
  };

  // Effect for 'ended' event (Same as before)
  useEffect(() => {
    const handleAudioEnd = () => {
      setIsExplanationPlaying(false);
    };
    explanationSoundEN.addEventListener("ended", handleAudioEnd);
    explanationSoundVI.addEventListener("ended", handleAudioEnd);
    return () => {
      explanationSoundEN.removeEventListener("ended", handleAudioEnd);
      explanationSoundVI.removeEventListener("ended", handleAudioEnd);
    };
  }, []);

  // File change handler (Same as before)
  const handleFileChange = (event) => {
    stopAndResetExplanationSounds(setIsExplanationPlaying);
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setMessageKey("");
      setMessageErrorDetail("");
      const uploadSound = language === "vi" ? uploadSoundVI : uploadSoundEN;
      uploadSound.currentTime = 0;
      uploadSound
        .play()
        .catch((e) => console.error("Error playing upload sound:", e));
    } else {
      setSelectedFile(null);
      setMessageKey("");
      setMessageErrorDetail("");
    }
  };

  // Language change handler (Same as before)
  const handleLanguageChange = (event) => {
    stopAndResetExplanationSounds(setIsExplanationPlaying);
    setLanguage(event.target.value);
    setMessageKey("");
    setMessageErrorDetail("");
  };

  // Explanation button handler (Same as before)
  const handlePlayExplanation = () => {
    const currentExplanationSound =
      language === "vi" ? explanationSoundVI : explanationSoundEN;
    const otherExplanationSound =
      language === "vi" ? explanationSoundEN : explanationSoundVI;
    if (isExplanationPlaying) {
      pauseSpecificAudio(currentExplanationSound);
      setIsExplanationPlaying(false);
    } else {
      stopAndResetAudio(uploadSoundEN);
      stopAndResetAudio(completedSoundEN);
      stopAndResetAudio(uploadSoundVI);
      stopAndResetAudio(completedSoundVI);
      stopAndResetAudio(otherExplanationSound);
      currentExplanationSound
        .play()
        .catch((e) => console.error("Error playing explanation:", e));
      setIsExplanationPlaying(true);
    }
  };

  // Form submit handler (Same as before)
  const handleSubmit = async (event) => {
    event.preventDefault();
    stopAndResetExplanationSounds(setIsExplanationPlaying);
    setMessageKey("");
    setMessageErrorDetail("");

    if (!selectedFile) {
      setMessageKey("selectFileFirst");
      setMessageType("danger");
      return;
    }
    if (!selectedFile.name.toLowerCase().endsWith(".docx")) {
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
    const downloadFilename = `${baseName} [lugaconverter].docx`;
    const formData = new FormData();
    formData.append("file", selectedFile);
    // ---> Use process.env for backend URL <---
    const backendUrl = (process.env.REACT_APP_BACKEND_URL || "") + "/process"; // Add fallback for safety

    setIsProcessing(true);
    setMessageKey("uploading");
    setMessageType("info");

    try {
      const response = await axios.post(backendUrl, formData, {
        responseType: "blob",
        headers: { "Content-Type": "multipart/form-data" },
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", downloadFilename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      const completionSound =
        language === "vi" ? completedSoundVI : completedSoundEN;
      completionSound.currentTime = 0;
      completionSound
        .play()
        .catch((e) => console.error("Error playing completion sound:", e));

      setMessageKey("success");
      setMessageType("success");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Error uploading file:", error);
      let errorMsgKey = "errorProcess";
      let detail = "";
      if (error.response && error.response.data) {
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

  const message = messageKey ? t(messageKey, messageErrorDetail) : "";

  // ---> Function to render author credit with link <---
  const renderAuthorCredit = () => {
    const fullText = t("authorCredit");
    const email = t("authorEmail"); // Assumes 'authorEmail' key exists in translations
    const placeholder = "{emailLink}"; // The placeholder used in authorCredit string
    const parts = fullText.split(placeholder);

    if (parts.length === 2 && email) {
      // Check if email exists too
      return (
        <>
          {parts[0]} {/* Text before placeholder */}
          <a href={`mailto:${email}`} target="_blank" rel="noopener noreferrer">
            {email}
          </a>{" "}
          {/* Mailto link */}
          {parts[1]} {/* Text after placeholder */}
        </>
      );
    } else {
      // Fallback if placeholder or email is missing
      return fullText;
    }
  };

  return (
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

      {/* UI Elements */}
      <h1 className="mb-4">{t("title")}</h1>
      <p>{t("description")}</p>

      {/* ---> MODIFIED: Use renderAuthorCredit function <--- */}
      <p className="text-success small">{renderAuthorCredit()}</p>

      {/* Explanation Button */}
      <div className="text-center my-3">
        <button
          type="button"
          className={`btn btn-sm ${
            isExplanationPlaying ? "btn-secondary" : "btn-success"
          }`}
          onClick={handlePlayExplanation}
          disabled={isProcessing}
        >
          <FontAwesomeIcon
            icon={isExplanationPlaying ? faPause : faPlay}
            className="me-2"
          />
          {t("explanationButtonLabel")}
        </button>
      </div>

      {/* Warning Section */}
      <div className="alert alert-warning mt-3" role="alert">
        <h4 className="alert-heading">{t("warningTitle")}</h4>
        <ul>
          <li>{t("warningPoint1")}</li>
          <li>{t("warningPoint2")}</li>
          <li>{t("warningPoint3")}</li>
          <li>{t("warningPoint4")}</li>
          <li>{t("warningPoint5")}</li>
        </ul>
      </div>

      <div className="alert alert-info mt-3" role="alert">
        <h4 className="alert-heading">{t("processWarning")}</h4>
        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4">
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
    </div>
  );
}

export default App;
