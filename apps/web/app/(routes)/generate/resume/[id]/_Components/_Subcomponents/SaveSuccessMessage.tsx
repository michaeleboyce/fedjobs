import React from 'react';

type SaveSuccessMessageProps = {
    saveSuccessMessage: string;
    saveResult: { url: string; message: string };
    clearMessage: () => void;
};

const SaveSuccessMessage: React.FC<SaveSuccessMessageProps> = ({ saveSuccessMessage, saveResult, clearMessage }) => (
    <div className="save-success-message">
        {saveResult.url ? <a href={saveResult.url} target="_blank" rel="noopener noreferrer">{saveSuccessMessage}</a> : saveSuccessMessage}
        <button onClick={clearMessage}>x</button>
    </div>
);

export default SaveSuccessMessage;
