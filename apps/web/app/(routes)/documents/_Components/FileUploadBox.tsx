// File path: apps/web/app/(routes)/documents/_Components/FileUploadBox.tsx
"use client";
import React, { useState } from "react";
import { processFile } from "../../../_actions/files/fileActions";
import { DocumentRecord } from "@fedjobs/database";
import { ProcessDocumentResponse } from "@/app/_types/FunctionReturns";
import { DocumentType } from "@fedjobs/types";
import axios from "axios";

//TODO: Ensure that the API_URL is standard across the application
console.log("process.env.NEXT_PUBLIC_VERCEL_ENV", process.env.NEXT_PUBLIC_VERCEL_ENV);
const API_URL = process.env.NEXT_PUBLIC_VERCEL_ENV === "production" ? "https://fedjobs-api-production.up.railway.app" : "http://localhost:3001"; // Adjust port as needed

type FileUploaderProps = {
  addDocument: (newDocument: DocumentRecord) => void;
  processDocumentFromFormData: (
    formData: FormData
  ) => Promise<ProcessDocumentResponse>;
};

const FileUploadBox: React.FC<FileUploaderProps> = ({
  addDocument,
  processDocumentFromFormData,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType>("resume"); // default to 'resume'
  const [uploadStatus, setUploadStatus] = useState("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [useDummyData, setUseDummyData] = useState<boolean>(false);
  const [description, setDescription] = useState("");
  const [shouldAddToKnowledgeBank, setShouldAddToKnowledgeBank] =
    useState(true);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
  const ALLOWED_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Validate file size
      if (selectedFile.size > MAX_FILE_SIZE) {
        alert('File is too large. Maximum size is 10MB');
        e.target.value = ''; // Reset input
        return;
      }
      
      // Validate file type
      if (!ALLOWED_TYPES.includes(selectedFile.type)) {
        alert('Invalid file type. Only PDF and Word documents are allowed.');
        e.target.value = ''; // Reset input
        return;
      }
      
      setFile(selectedFile);
    }
  };
  async function handleUpload(event: React.MouseEvent) {
    event.preventDefault();
    console.log("Uploading file...");
  
    if (!file) {
      alert("Please select a file first");
      return;
    }
    console.log("process.env.NEXT_PUBLIC_VERCEL_ENV", process.env.NEXT_PUBLIC_VERCEL_ENV);

  
    setIsLoading(true);
    let dotCount = 0;
    const interval = setInterval(() => {
      dotCount = (dotCount + 1) % 4;
      setUploadStatus(`Uploading${".".repeat(dotCount)}`);
    }, 500);
    console.log("Reached past setInterval")

    try {
      //#region This is the code to upload a document to parse it from word/PDF into text
      const formData = new FormData();
      formData.append('file', file);
      console.log("API_URL", API_URL);
      const response = await axios.post(`${API_URL}/api/parse/document`, formData, {
        // Add timeout and show upload progress
        timeout: 30000,
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || file.size));
          console.log(percentCompleted)
          if (percentCompleted % 5 === 0) {
            setUploadStatus(`Uploading: ${percentCompleted}%`);
          }
        },
      });
  
      const data = response.data;
      //#endregion
      //#region this code actually processes the text data of the file. TODO: Probably passing the text to and from the client makes no sense and should be saved somewhere. 
      const { text, type } = data;
      const result = await processFile(formData, shouldAddToKnowledgeBank, documentType, description, text);
      
      if ("success" in result) {
        // This is the success branch
        addDocument(result.success.document);
      } else {
        // This is the failure branch
        throw new Error(result.failure || "Failed to process file");
      }
      //#endregion
    } catch (error) {
      console.error(error);
      console.debug(JSON.stringify(error, null, 2));
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 413) {
          alert('File is too large. Maximum size is 10MB');
        } else if (error.response?.data?.message) {
          alert(error.response.data.message);
        } else if (error.code === 'ECONNABORTED') {
          alert('Upload timed out. Please try again.');
        } else {
          alert('An error occurred while uploading the file. Please try again.');
        }
      } else {
        alert('An unexpected error occurred. Please try again.');
      }
      console.error('Upload error:', error);
    } finally {
      clearInterval(interval);
      setIsLoading(false);
      setUploadStatus("");
      // Optional: Reset file input
      setFile(null);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    }
  }
  return (
    <div className="upload-section bg-white p-4 border border-gray-200 rounded-lg">
      <div className="upload-card flex flex-col items-start">
        <h3 className="text-lg font-semibold mb-4">Upload Resume</h3>
        <input
          type="file"
          onChange={handleFileChange}
          disabled={isLoading}
          className="mb-4 text-sm text-gray-700"
        />
        <div className="flex items-center mb-4">
          <input
            type="checkbox"
            checked={useDummyData}
            onChange={(e) => setUseDummyData(e.target.checked)}
            disabled={isLoading}
            className="mr-2"
          />
          <span>Use Dummy Data</span>
        </div>
        <div className="flex items-center mb-4">
          <input
            type="checkbox"
            checked={shouldAddToKnowledgeBank}
            onChange={(e) => setShouldAddToKnowledgeBank(e.target.checked)}
            disabled={isLoading}
            className="mr-2"
          />
          <span>Add to Knowledge Bank</span>
        </div>
        <select
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value as DocumentType)}
          className="mb-4 w-full text-base p-2 border border-gray-300 rounded-md bg-white"
        >
          <option value="resume">Resume</option>
          <option value="cover_letter">Cover Letter</option>
          <option value="ecq">Executive Core Qualifications</option>
          <option value="tcq">Technical Qualifications</option>
          <option value="other">Other</option>
        </select>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter description"
          className="mb-4 w-full text-base p-2 border border-gray-300 rounded-md bg-white"
        />
        <button
          className="selection-button mt-2 self-start"
          onClick={handleUpload}
          disabled={isLoading || uploadStatus !== ""}
        >
          {uploadStatus || "Upload"}
        </button>
      </div>
    </div>
  );
};

export default FileUploadBox;
