// File path: apps/web/app/(routes)/generate/page.tsx
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";
import { getAllPositions } from "@/app/features/positions/actions/reviewPositionActions";
import { DocumentGeneration } from "@/app/features/generation/components/DocumentGeneration";

export default async function GeneratePage() {
  //TODO: Refactor authnetication into a server
  const { isAuthenticated, getUser } = await getKindeServerSession();
  if (!(await isAuthenticated())) {
    redirect("/api/auth/signin");
  }

  const user = await getUser();
  if (!user?.id) {
    return <div>Error retrieving user info</div>;
  }

  // Safely handle the result from getAllPositions
  const positionsResponse = await getAllPositions();
  if (!positionsResponse.success) {
    return <div>Error: {positionsResponse.error}</div>;
  }

  const { employmentHistory, otherPositions } = positionsResponse;

  return (
    <DocumentGeneration
      employmentHistory={employmentHistory}
      otherPositions={otherPositions}
      userEmail={user.email ?? ""}
    />
  );
}