// File path: apps/web/app/(routes)/generate/page.tsx
// File: apps/web/app/(routes)/generate/page.tsx

import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";
import { getAllPositions } from "@/app/_actions/positions/reviewPositionActions";
import { GenerationProvider } from "./_Providers/GenerationProvider";
import { UnifiedGenerationManager } from "./UnifiedGenerationManager";
import { PositionsProvider } from "@/app/_components/PositionCard/Context/PositionsContext";

export default async function GeneratePage() {
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
    <PositionsProvider>
    <GenerationProvider>
      <UnifiedGenerationManager
        employmentHistory={employmentHistory}
        otherPositions={otherPositions}
        userEmail={user.email ?? ""}
      />
    </GenerationProvider>
    </PositionsProvider>
  );
}
