import React from 'react';
import { db, eq } from '@/app/_db';
import { documents as documentsTable } from '@/app/_db/schema/documents';
import { Resume as ResumeModel } from '@/app/_classes/Resume';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { PageClient } from '@/app/(routes)/generate/resume/[id]/PageClient';
//import ResumeProvider  from './_Providers/ResumeProvider';

export default async function Page({ params }: { params: { id: number } }) {
  const { getUser, isAuthenticated } = await getKindeServerSession();
  if (!(await isAuthenticated()))
    return <div>Sorry you are not authenticated to use this page...</div>

  const user = await getUser();
  if (!user || !user.email)
    return <div>Sorry, there was a problem getting your user information, and unfortunately, we cannot create this page</div>
  
  const docs = await db
    .select({
      id: documentsTable.id,
      data: documentsTable.data
    })
    .from(documentsTable)
    .where(eq(documentsTable.id, params.id))
    .execute();

  if (!docs || docs.length <= 0) {
    return <div>Error processing this document, resume referenced is not found!</div>;
  }

  const resume = ResumeModel.fromJSON(docs[0].data);

  return <PageClient resume={resume.toJSON()} userEmail={user.email} />;
}