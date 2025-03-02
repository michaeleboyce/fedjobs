// File path: apps/web/app/(routes)/resume/[id]/page.tsx
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { DocumentRepository } from '@fedjobs/database'; // Use the repository abstraction
import { Resume } from '@/app/shared/types/Resume';
import { notFound } from 'next/navigation';
import { ResumePageManager } from '@/app/features/resume/components/ResumePageManager';

// Update the props type so that params is a Promise containing the id.
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Await the params promise to extract the id value.
  const { id } = await params;
  
  // Retrieve session and user details
  const session = await getKindeServerSession();
  const user = await session.getUser();
  if (!user) {
    return notFound();
  }
  
  // Retrieve the document via the DocumentRepository with user ID check
  const documentRepo = new DocumentRepository();
  const doc = await documentRepo.getById(Number(id), user.id);
  if (!doc) {
    return notFound();
  }

  // Convert the document data into a Resume model and render the page manager
  const resume = Resume.fromJSON(doc.data);
  return <ResumePageManager resume={resume.toJSON()} />;
}
