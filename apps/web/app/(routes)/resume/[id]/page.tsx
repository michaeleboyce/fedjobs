// /apps/web/app/(routes)/resume/[id]/page.tsx

'use server';
import { redirect } from 'next/navigation';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';

import { getDocumentById } from '@fedjobs/database';
import { Resume } from '@/app/_classes/Resume';
import { ResumePageManager } from './_Components/ResumePageManager';

export default async function Page({ params }: { params: { id: number } }) {
  const { isAuthenticated, getUser } = await getKindeServerSession();
  const authenticated = await isAuthenticated();
  const user = await getUser();

  if (!authenticated) {
    redirect('/api/auth/signin');
  }

  if (!user || !user.id) {
    return <div>Error retrieving user information</div>;
  }
  const loadedParams = await params;
  // Now getDocumentById returns a single Document (or undefined).
  const doc = await getDocumentById(loadedParams.id, user.id);
  if (!doc) {
    return <div>Error: resume not found or you don&apos;t have permission</div>;
  }

  // doc is an object, so doc.data is valid:
  const resume = Resume.fromJSON(doc.data);
  return <ResumePageManager resume={resume.toJSON()} />;
}
