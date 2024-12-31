// File path: apps/web/app/(routes)/generate/resume/[id]/_Components/AdditionalInfoBox.tsx
'use client';
import React from 'react';
import { DocumentInfo } from './_Subcomponents/_AdditionalInfoBox/DocumentInfo';
import { JobInfoInput } from './_Subcomponents/_AdditionalInfoBox/JobInfoInput';
import { useGenerationContext } from '../_Providers/GenerationProvider';

type AdditionalInfoBoxProps = {
    showIsDummy: boolean;
};

export const AdditionalInfoBox: React.FC<AdditionalInfoBoxProps> = ({ showIsDummy }) => {
    const { otherInfo, setOtherInfo } = useGenerationContext(); 

    return (
        <div className="upload-section bg-white p-4 border border-gray-200 rounded-lg">
            <div className="upload-card flex flex-col items-start">
                <h3 className="text-lg font-semibold mb-4">Information for Generation</h3>
                <JobInfoInput />
                <DocumentInfo showIsDummy={showIsDummy}/>
                
                <h4 className="text-md font-semibold mb-4">Other Information</h4>
                <textarea
                    value={otherInfo}
                    onChange={(e) => setOtherInfo(e.target.value)}
                    placeholder="Please add other information about the document you need to provide, such as additional instructions, etc."
                    className="mb-4 w-full text-base p-2 border border-gray-300 rounded-md bg-white"
                />
            </div>
        </div>
    );
};

