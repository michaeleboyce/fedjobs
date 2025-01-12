// File path: apps/web/app/(routes)/generate/_Components/_Subcomponents/RegenerationTools.tsx
import React from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrashAlt } from "@fortawesome/free-solid-svg-icons";

type RegenerationToolsProps = {
    paragraphId: number;
    regenerationText: string;
    setRegenerationText: React.Dispatch<React.SetStateAction<string>>;
    onRegenerateParagraph: (paragraphId?: number, regenerationText?: string) => Promise<void>;
    onParagraphDelete: (id: number) => void;
};

const RegenerationTools: React.FC<RegenerationToolsProps> = ({
    paragraphId,
    regenerationText,
    setRegenerationText,
    onRegenerateParagraph,
    onParagraphDelete
}) => {
    return (
        <div className="regeneration-tools mt-2">
            <textarea
                value={regenerationText}
                onChange={(e) =>{
                    e.stopPropagation(); 
                    setRegenerationText(e.target.value);
                }}
                className="w-full p-2 border border-gray-300 rounded mb-2"
            />
            <div className="flex justify-start items-center mt-2">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onRegenerateParagraph(paragraphId, regenerationText);
                    }}
                    disabled={regenerationText === ''}
                    className={`bg-blue-500 ${regenerationText !== '' ? `hover:bg-blue-700` : ''} text-white font-bold py-2 px-4 rounded`}
                >
                    Regenerate
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onParagraphDelete(paragraphId);
                    }}
                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded flex items-center ml-2"
                >
                    <FontAwesomeIcon icon={faTrashAlt} className="mr-2" />
                    Delete
                </button>
            </div>
        </div>
    );
};

export default RegenerationTools;
