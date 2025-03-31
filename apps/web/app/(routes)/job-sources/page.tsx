// File path: apps/web/app/(routes)/job-sources/page.tsx
// apps/web/app/(routes)/job-sources/page.tsx
import React from 'react';
import { Metadata } from 'next';
import JobSourceManager from '../../features/jobs/components/JobSourceManager';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';

export const metadata: Metadata = {
  title: 'Job Sources | FedJobs',
  description: 'Manage your job search sources',
};

export default async function JobSourcesPage() {
  const { getUser } = getKindeServerSession();
  const user = await getUser();
  
  if (!user || !user.id) {
    return (
      <div className="p-8 text-center">
        <p>Please sign in to manage job sources.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <h1 className="text-2xl font-bold mb-6">Job Sources</h1>
      <p className="mb-6 text-gray-600">
        Add and manage websites that you want to track for job postings. The system will automatically
        scan these sites and extract job information based on your preferences.
      </p>
      
      <JobSourceManager userId={user.id} />
    </div>
  );
}