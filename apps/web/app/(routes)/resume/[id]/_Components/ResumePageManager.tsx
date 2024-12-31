// File path: apps/web/app/(routes)/resume/[id]/_Components/ResumePageManager.tsx
'use client'
import { ResumeObject } from '@/app/_classes/Resume';
import { Resume as ResumeComponent } from '@/app/_components/Resume';

type ResumePageManagerProps = {
    resume: ResumeObject;
  };
export const ResumePageManager: React.FC<ResumePageManagerProps> = async ({resume}) => {
    return (
        <ResumeComponent resume={resume} onSelectionChange={() => {}} isViewOnly={true} />
    )
}