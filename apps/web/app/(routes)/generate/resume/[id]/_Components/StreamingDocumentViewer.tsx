import React, { useState, useEffect } from "react";
import { faCheck, faPen, faTrashAlt } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { StreamingTextArray } from "@/app/_types/StreamingTextArray";
import RegenerationTools from "./_Subcomponents/RegenerationTools";
import { ParagraphControls } from "./_Subcomponents/ParagraphControls";

type StreamingDocumentViewerProps = {
  documentName: string;
  streamingTextArray: StreamingTextArray;
  isStreamingComplete: boolean;
  onSave: (paragraphs: string[]) => void;
  saveResult: { url: string; message: string };
  onRegenerateParagraph: (
    paragraphId?: number,
    regenerationText?: string
  ) => Promise<void>;
  onParagraphDelete: (id: number) => void;
  onMoveParagraph: (index: number, direction: "up" | "down") => void;
  selectedParagraph: number | null; // New prop
  onSelectParagraph: (id: number | null) => void; 
  onParagraphTextUpdate: (paragraphId: number, newText: string) => void;

};

const StreamingDocumentViewer: React.FC<StreamingDocumentViewerProps> = ({
  documentName,
  streamingTextArray,
  isStreamingComplete,
  onSave,
  saveResult,
  onRegenerateParagraph,
  onParagraphDelete,
  onMoveParagraph,
  selectedParagraph,
  onSelectParagraph,
  onParagraphTextUpdate
}) => {
  const [regenerationText, setRegenerationText] = useState<string>("");
  const [isDocumentEditable, setIsDocumentEditable] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string>("");
  const [saveStatus, setSaveStatus] = useState("idle"); // 'idle', 'saving', 'saved', 'error'
  const [dynamicSaveMessage, setDynamicSaveMessage] = useState("");
  const [editMode, setEditMode] = useState<{ [key: number]: boolean }>({});

  useEffect(() => {
    if (streamingTextArray.length > 0) {
      setIsDocumentEditable(isStreamingComplete);
    }
  }, [streamingTextArray, isStreamingComplete]);

  useEffect(() => {
    setSaveSuccessMessage(saveResult.message);
  }, [saveResult]);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined = undefined;
    if (saveStatus === "saving") {
      let dotCount = 0;
      interval = setInterval(() => {
        setDynamicSaveMessage(`Saving${".".repeat((dotCount % 3) + 1)}`);
        dotCount++;
      }, 500); // Update every 500ms
    } else {
      clearInterval(interval);
      if (saveStatus === "saved") {
        setDynamicSaveMessage("Document Successfully Saved");
      }
      if (saveStatus === "error") {
        setDynamicSaveMessage("Error occurred while saving");
      }
    }
    return () => clearInterval(interval);
  }, [saveStatus]);

  const toggleEditMode = (paragraphId: number) => {
    setEditMode(prev => ({ ...prev, [paragraphId]: !prev[paragraphId] }));
  };

  const handleCompleteEdit = (paragraphId: number) => {
    toggleEditMode(paragraphId);
    // You might want to call any additional logic when editing is complete
  };
  
  const handleSave = async () => {
    setSaveStatus("saving");
    await onSave(streamingTextArray.map((paragraph) => paragraph.text));
    setSaveStatus("saved");
    setIsDocumentEditable(false);
  };

  const handleUpdate = () => {
    setIsDocumentEditable(true);
    setSaveSuccessMessage("");
  };

  const handleParagraphClick = (
    index: number,
    event: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    let target = event.target as HTMLElement;

    while (target) {
      if (target.tagName === "TEXTAREA") {
        return;
      }
      if (target.parentElement) {
        target = target.parentElement;
      } else {
        break;
      }
    }
    setRegenerationText("");
    onSelectParagraph(selectedParagraph === index ? null : index);
  };

  const handleTextChange = (id: number, text: string) => {
    onParagraphTextUpdate(id, text);
  };

  return (
    <div className="my-4 p-4 border border-gray-300 rounded shadow-lg">
      <h2 className="text-2xl font-semibold mb-4">{documentName}</h2>

      <div className="text-left text-gray-700">
        {streamingTextArray.map((paragraph, index) => (
          <div
            key={paragraph.id}
            className={`paragraph-box p-2 my-2 rounded ${
              isDocumentEditable ? "hover:bg-gray-100" : ""
            } ${selectedParagraph === index ? "highlighted" : ""}`}
            onClick={(e) => handleParagraphClick(index, e)}
          >
            {isDocumentEditable && (
              <ParagraphControls
                index={index}
                onMoveParagraph={onMoveParagraph}
              />
            )}
            {editMode[paragraph.id] ? (
              <textarea
                value={paragraph.text}
                onChange={(e) => {
                  e.stopPropagation();
                  handleTextChange(paragraph.id, e.target.value);
                }}
                className="textarea-editable"

              />
            ) : (
              <p>{paragraph.text}</p>
            )}
            {isDocumentEditable && <div className="edit-controls">
              <FontAwesomeIcon
                icon={editMode[paragraph.id] ? faCheck : faPen}
                onClick={(e) =>{
                  e.stopPropagation();
                  editMode[paragraph.id]
                    ? handleCompleteEdit(paragraph.id)
                    : toggleEditMode(paragraph.id)
                }}
              />
            </div>}
            {isDocumentEditable && selectedParagraph === index && (
              <RegenerationTools
                paragraphId={paragraph.id}
                regenerationText={regenerationText}
                setRegenerationText={setRegenerationText}
                onRegenerateParagraph={onRegenerateParagraph}
                onParagraphDelete={onParagraphDelete}
              />
            )}
          </div>
        ))}
      </div>

      {isDocumentEditable && (
        <button
          onClick={() => handleSave()}
          disabled={saveStatus === "saving"}
          className={`bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mt-4 ${
            saveStatus === "saving" ? "opacity-50" : ""
          }`}
        >
          {saveStatus === "saving" ? dynamicSaveMessage : "Save"}
        </button>
      )}
      {!isDocumentEditable && (
        <button
          onClick={handleUpdate}
          className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded mt-4"
        >
          Update
        </button>
      )}
      {saveSuccessMessage && (
        <div className="save-success-message">
          {saveResult.url ? (
            <a href={saveResult.url} target="_blank">
              {saveSuccessMessage}
            </a>
          ) : (
            saveSuccessMessage
          )}
          <button onClick={() => setSaveSuccessMessage("")}>x</button>
        </div>
      )}
    </div>
  );
};

export default StreamingDocumentViewer;
