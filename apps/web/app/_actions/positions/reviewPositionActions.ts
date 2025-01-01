// File path: apps/web/app/_actions/positions/reviewPositionActions.ts
'use server';

import { authenticateUser } from "@fedjobs/utils";
import { 
  getPositionsByUserId, 
  updatePositionByUuid, 
  deletePositionByUuid, 
  getDocumentById 
} from '@fedjobs/database'; // Assuming getDocumentById exists
import { Position as DBPosition } from '@fedjobs/database';
import { Position as SharedPosition } from "@fedjobs/types";
import { vectorizePosition } from '@fedjobs/utils';

type GetUnapprovedPositionsResponse =
  | { success: true; positions: SharedPosition[] }
  | { success: false; error: string };

type ApprovePositionResponse =
  | { success: true; position: SharedPosition }
  | { success: false; error: string };

type RejectPositionResponse =
  | { success: true; message: string }
  | { success: false; error: string };

/**
 * Fetches all unapproved positions for the authenticated user.
 */
export async function getUnapprovedPositions(): Promise<GetUnapprovedPositionsResponse> {
  const user = await authenticateUser();

  if (!user) {
    return { success: false, error: "User authentication failed." };
  }

  const dbPositions: DBPosition[] = await getPositionsByUserId(user.id);
  const unapprovedPositions = dbPositions
    .filter((pos) => !pos.isApproved)
    .map((pos) => ({
      positionUuid: pos.positionUuid,
      organization: { name: pos.organization },
      title: { title: pos.title },
      date: {
        startDate: pos.startDate,
        endDate: pos.endDate,
        present: pos.present,
      },
      details: {
        activities: pos.activities as string[],
        accomplishments: pos.accomplishments as string[],
      },
    }));

  return { success: true, positions: unapprovedPositions };
}

/**
 * Approves a position by its UUID.
 * @param positionUuid - The UUID of the position to approve.
 */
export async function approvePosition(positionUuid: string): Promise<ApprovePositionResponse> {
  const user = await authenticateUser();

  if (!user) {
    return { success: false, error: "User authentication failed." };
  }

  try {
    const updatedPositions = await updatePositionByUuid(positionUuid, { isApproved: true });

    if (updatedPositions.length === 0) {
      return { success: false, error: "Position not found." };
    }

    const pos: DBPosition = updatedPositions[0];
    const approvedPosition: SharedPosition = {
      positionUuid: pos.positionUuid,
      organization: { name: pos.organization },
      title: { title: pos.title },
      date: {
        startDate: pos.startDate,
        endDate: pos.endDate,
        present: pos.present,
      },
      details: {
        activities: pos.activities as string[],
        accomplishments: pos.accomplishments as string[],
      },
    };

    // Fetch the document to get the filename
    const document = await getDocumentById(pos.documentId);
    if (!document) {
      console.error("Document not found for positionUuid:", positionUuid);
      return { success: false, error: "Associated document not found." };
    }

    const filename = document.name;

    // Vectorize the approved position
    await vectorizePosition(approvedPosition, filename, user.id);

    return { success: true, position: approvedPosition };
  } catch (error: any) {
    console.error("Error approving position:", error);
    return { success: false, error: "Failed to approve position." };
  }
}

/**
 * Rejects a position by its UUID.
 * @param positionUuid - The UUID of the position to reject.
 */
export async function rejectPosition(positionUuid: string): Promise<RejectPositionResponse> {
  const user = await authenticateUser();

  if (!user) {
    return { success: false, error: "User authentication failed." };
  }

  try {
    await deletePositionByUuid(positionUuid);
    return { success: true, message: "Position rejected and deleted." };
  } catch (error: any) {
    console.error("Error rejecting position:", error);
    return { success: false, error: "Failed to reject position." };
  }
}
