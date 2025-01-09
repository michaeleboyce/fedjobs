// File path: apps/web/app/_actions/positions/positionActions.ts
// File: apps/web/app/_actions/positions/positionActions.ts
'use server';

import { authenticateUser } from "@fedjobs/utils";
import { getPositionByUuid } from '@fedjobs/database';
import { Position } from "@fedjobs/types";

type GetPositionResponse = 
  | { success: true; position: Position }
  | { success: false; error: string };

export async function getPosition(uuid: string): Promise<GetPositionResponse> {
  const user = await authenticateUser();

  if (!user) {
    return { success: false, error: "User authentication failed." };
  }

  try {
    const position = await getPositionByUuid(uuid);
    if (!position) {
      return { success: false, error: "Position not found." };
    }

    // Map to Position type
    const mappedPosition: Position = {
      positionUuid: position.positionUuid,
      organization: { name: position.organization },
      title: { title: position.title },
      date: {
        startDate: position.startDate,
        endDate: position.endDate,
        present: position.present,
      },
      details: {
        activities: position.activities,
        accomplishments: position.accomplishments,
      },
      originalPositionUuid: position.originalPositionUuid ?? undefined,
      similarPositionUuids: position.similarPositionUuids || [],
      approvedSimilarPositionUuids: position.approvedSimilarPositionUuids || [],
      rejectedSimilarPositionUuids: position.rejectedSimilarPositionUuids || [],
      originalDocumentId: position.documentId?.toString()
    };

    return { success: true, position: mappedPosition };
  } catch (error: any) {
    console.error("Error fetching position:", error);
    return { success: false, error: "Failed to fetch position details." };
  }
}