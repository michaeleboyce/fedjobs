// File path: apps/web/app/(routes)/jobs/page.tsx
// apps/web/app/(routes)/jobs/page.tsx
import React from 'react';
import { Metadata } from 'next';
import JobBoard from '../../features/jobs/components/JobBoard';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';

export const metadata: Metadata = {
  title: 'Jobs | FedJobs',
  description: 'Find and track job opportunities',
};

export default async function JobsPage() {
  const { getUser } = getKindeServerSession();
  const user = await getUser();
  
  if (!user || !user.id) {
    return (
      <div className="p-8 text-center">
        <p>Please sign in to view jobs.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 h-[calc(100vh-64px)]">
      <JobBoard userId={user.id} />
    </div>
  );
}