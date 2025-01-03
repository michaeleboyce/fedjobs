// File path: apps/web/app/_actions/positions/reviewPositionActions.ts
// apps/web/app/_actions/positions/reviewPositionActions.ts

'use server';

import { authenticateUser } from "@fedjobs/utils";
import { 
  getPositionByUuid, 
  insertPosition,
  updatePositionByUuid, 
  deletePositionByUuid, 
  getPositionsByUserId,
  getDocumentById
} from '@fedjobs/database'; // Ensure getDocumentById is implemented
import { PositionRecord, NewPositionRecord } from '@fedjobs/database';
import { Position } from "@fedjobs/types";
import { vectorizePosition } from '@fedjobs/utils';
import { v4 as uuidv4 } from 'uuid';
import { createSharedPosition } from '@fedjobs/utils';
import { groupSimilarPositions } from '@fedjobs/utils'; // Import the grouping function

type GetAllPositionsResponse =
  | { success: true; employmentHistory: Position[]; otherPositions: Position[] }
  | { success: false; error: string };

type AddToEmploymentHistoryResponse =
  | { success: true; position: Position }
  | { success: false; error: string };

type RejectPositionResponse =
  | { success: true; message: string }
  | { success: false; error: string };

/**
 * Fetches all positions for the authenticated user, separated into employment history and others.
 */
export async function getAllPositions(): Promise<GetAllPositionsResponse> {
  const user = await authenticateUser();

  if (!user) {
    return { success: false, error: "User authentication failed." };
  }

  const dbPositions: PositionRecord[] = await getPositionsByUserId(user.id);

  const employmentHistoryPositions = dbPositions.filter(pos => pos.isEmploymentHistory).map(pos => createSharedPosition(pos));

  const otherPositions = dbPositions.filter(pos => !pos.isEmploymentHistory).map(pos => {
    const sharedPos = createSharedPosition(pos);
    return {
      ...sharedPos,
      originalDocumentId: pos.documentId,
    };
  });

  return { success: true, employmentHistory: employmentHistoryPositions, otherPositions };
}

/**
 * Adds a position to employment history by copying it and grouping similar positions.
 * @param positionUuid - The UUID of the position to add to employment history
 */
export async function addToEmploymentHistory(positionUuid: string): Promise<AddToEmploymentHistoryResponse> {
  const user = await authenticateUser();

  if (!user) {
    return { success: false, error: "User authentication failed." };
  }

  try {
    const position = await getPositionByUuid(positionUuid);
    if (!position) {
      return { success: false, error: "Position not found." };
    }

    // Create a new position
    const newPositionData: Partial<NewPositionRecord> = {
      positionUuid: uuidv4(), // Generate new UUID
      userId: user.id,
      documentId: null, // Not tied to any document
      organization: position.organization,
      title: position.title,
      startDate: position.startDate,
      endDate: position.endDate,
      present: position.present,
      activities: position.activities,
      accomplishments: position.accomplishments,
      isEmploymentHistory: true,
      originalPositionUuid: position.positionUuid,
      // groupId: position.groupId, // Retain groupId if needed
    };

    const newPosition = await insertPosition(newPositionData as NewPositionRecord);

    // Vectorize the new position
    // Fetch the original document's name
    let filename = '';
    if (position.documentId) {
      const originalDocument = await getDocumentById(position.documentId);
      if (originalDocument) {
        filename = originalDocument.name;
      }
    }

    const sharedPosition: Position = createSharedPosition(newPosition);

    await vectorizePosition(sharedPosition, user.id); // Adjust parameters as needed

    // Group similar positions
    await groupSimilarPositions(sharedPosition, user.id);

    return { success: true, position: sharedPosition };
  } catch (error: any) {
    console.error("Error adding position to employment history:", error);
    return { success: false, error: "Failed to add position to employment history." };
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
