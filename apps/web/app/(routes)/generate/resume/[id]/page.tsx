import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";
import { DocumentRepository } from "@fedjobs/database";
import { Resume as ResumeModel } from "@/app/_classes/Resume";
import { DocumentGenerationManager } from "../../DocumentGenerationManager";
import { GenerationProvider } from "@/app/(routes)/generate/_Providers/GenerationProvider";
import { getAllPositions } from "@/app/_actions/positions/reviewPositionActions";

export default async function ResumeGenerationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const docId = Number(id);

  const { isAuthenticated, getUser } = await getKindeServerSession();
  if (!(await isAuthenticated())) {
    redirect("/api/auth/signin");
  }

  const user = await getUser();
  if (!user?.email) {
    return <div>Error retrieving user information</div>;
  }

  const documentRepo = new DocumentRepository();
  const docRecord = await documentRepo.getById(docId);
  if (!docRecord) {
    return <div>Error processing this document, resume referenced is not found!</div>;
  }

  // Get employment history and other positions to handle similar positions
  const positionsResponse = await getAllPositions();
  if (!positionsResponse.success) {
    return <div>Error: {positionsResponse.error}</div>;
  }

  const { employmentHistory, otherPositions } = positionsResponse;
  const resume = ResumeModel.fromJSON(docRecord.data);

  return (
    <GenerationProvider>
      <DocumentGenerationManager
        employmentHistory={employmentHistory}
        otherPositions={otherPositions}
        resume={resume.toJSON()}
        userEmail={user.email}
      />
    </GenerationProvider>
  );
}