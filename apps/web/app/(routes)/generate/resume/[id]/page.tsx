'use server';

import React from 'react';
import { DocumentRepository } from '@fedjobs/database'; // Using repository instead of direct DB calls
import { Resume as ResumeModel } from '@/app/_classes/Resume';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { PageClient } from '@/app/(routes)/generate/resume/[id]/PageClient';

export default async function Page({ params }: { params: { id: string } }) {
  // Destructure the dynamic parameter
  const { id } = params;
  const docId = Number(id);

  // Retrieve the session and verify authentication
  const session = await getKindeServerSession();
  if (!(await session.isAuthenticated())) {
    return <div>Sorry you are not authenticated to use this page...</div>;
  }
  const user = await session.getUser();
  if (!user?.email) {
    return (
      <div>
        Sorry, there was a problem getting your user information, and unfortunately, we cannot create this page.
      </div>
    );
  }

  // Use the DocumentRepository to retrieve the document record
  const documentRepo = new DocumentRepository();
  const docRecord = await documentRepo.getById(docId);
  if (!docRecord) {
    return <div>Error processing this document, resume referenced is not found!</div>;
  }

  // Transform the document data into a Resume model
  const resume = ResumeModel.fromJSON(docRecord.data);
  return <PageClient resume={resume.toJSON()} userEmail={user.email} />;
}
