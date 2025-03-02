// File path: apps/web/app/features/resume/components/ResumePageManager.tsx
'use client'
import { ResumeObject } from '@/app/shared/types/Resume';
import { Resume as ResumeComponent } from '@/app/features/resume/components/ResumeView';

type ResumePageManagerProps = {
    resume: ResumeObject;
  };
export const ResumePageManager: React.FC<ResumePageManagerProps> = async ({resume}) => {
    return (
        <ResumeComponent resume={resume} onSelectionChange={() => {}} isViewOnly={true} />
    )
}