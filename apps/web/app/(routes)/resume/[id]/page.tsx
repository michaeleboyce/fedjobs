// File path: apps/web/app/(routes)/resume/[id]/page.tsx
// /apps/web/app/(routes)/resume/[id]/page.tsx

import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { getDocumentById } from "@fedjobs/database";
import { Resume } from "@/app/_classes/Resume";
import { notFound } from "next/navigation";
import { ResumePageManager } from "./_Components/ResumePageManager";
// Dynamically import the client component with a named export

export default async function Page({ params }: { params: Promise<{ id: string }> })
{
  const { id } = await params;
  const { getUser } = await getKindeServerSession();
  const user = await getUser();

  if (!user) {
    return notFound();
  }

  const doc = await getDocumentById(Number(id), user.id);

  if (!doc) {
    return notFound();
  }

  const resume = Resume.fromJSON(doc.data);

  return <ResumePageManager resume={resume.toJSON()} />;
}
