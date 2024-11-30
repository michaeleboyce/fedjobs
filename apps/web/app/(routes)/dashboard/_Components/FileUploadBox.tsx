'use client';
import React, { useState } from "react";
import { processFile } from "../../../_actions/files/fileActions";
import { Document } from '@/app/_db/schema/documents';
import { ProcessDocumentResponse } from "@/app/_types/FunctionReturns";

type FileUploaderProps = { 
  addDocument: (newDocument: Document) => void;
  processDocumentFromFormData: (formData: FormData) => Promise<ProcessDocumentResponse>;
}


const FileUploadBox: React.FC<FileUploaderProps> = ({addDocument, processDocumentFromFormData}) => {
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState("resume"); // default to 'resume'
  const [uploadStatus, setUploadStatus] = useState("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [useDummyData, setUseDummyData] = useState<boolean>(false);
  const [description, setDescription] = useState("");
  const [shouldAddToKnowledgeBank, setShouldAddToKnowledgeBank] = useState(true);


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  async function handleUpload(event: React.MouseEvent) {
    event.preventDefault();

    if (!file) {
      console.error("No file selected");
      return;
    }

    let dotCount = 0;
    const interval = setInterval(() => {
      dotCount = (dotCount + 1) % 4;
      setUploadStatus(`Uploading${".".repeat(dotCount)}`);
    }, 500); // Update every 500 milliseconds
    try {
      const data = new FormData();
      data.append('file', file);
      let text: string;
      const response = await processDocumentFromFormData(data);
      if (response.success){
        text = response.success.text;
      } else {
        if (response.failure.isInvalidDocType){
          const errorMsg = 'Invalid document type, please only upload a PDF or Word Document - sorry!';
          window.alert(errorMsg);
          throw new Error(errorMsg);
        } else {
          throw new Error(response.failure.message);
        }
      }
      const result = await processFile(data, shouldAddToKnowledgeBank, documentType, description, text);
      if (result.success){
        addDocument(result.success.document);
      }
      console.log(result);
    } catch (error) {
      console.error(error);
    } finally {
      clearInterval(interval); // Clear the interval when upload is done
      setIsLoading(false);
      setUploadStatus(""); // Reset upload status
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
          onChange={(e) => setDocumentType(e.target.value)}
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
