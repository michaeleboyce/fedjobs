import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { DocumentRepository } from '@fedjobs/database'; // Use the repository abstraction
import { Resume } from '@/app/_classes/Resume';
import { notFound } from 'next/navigation';
import { ResumePageManager } from './_Components/ResumePageManager';

export default async function Page({ params }: { params: { id: string } }) {
  const { id } = params;
  
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
