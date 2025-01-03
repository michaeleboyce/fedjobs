// File path: apps/web/app/_actions/positions/reviewPositionActions.ts

'use server';

import { authenticateUser } from "@fedjobs/utils";
import { 
  getPositionByUuid, 
  insertPosition,
  deletePositionByUuid, 
  getPositionsByUserId,
  getDocumentById,
  updatePositionFields
} from '@fedjobs/database';
import { PositionRecord, NewPositionRecord } from '@fedjobs/database';
import { Position } from "@fedjobs/types";
import { v4 as uuidv4 } from 'uuid';
import { db, eq } from '@fedjobs/database';
import { positions as positionsTable } from '@fedjobs/database';

/* Existing types and functions remain unchanged */

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
 * Helper function to map PositionRecord to Position
 */
const mapPositionRecordToPosition = (record: PositionRecord): Position => ({
  positionUuid: record.positionUuid,
  organization: { name: record.organization },
  title: { title: record.title },
  date: {
    startDate: record.startDate,
    endDate: record.endDate,
    present: record.present,
  },
  details: {
    activities: record.activities,
    accomplishments: record.accomplishments,
  },
  originalPositionUuid: record.originalPositionUuid ?? undefined, // Convert null to undefined
  similarPositionUuids: record.similarPositionUuids || [],
  approvedSimilarPositionUuids: record.approvedSimilarPositionUuids || [],
  rejectedSimilarPositionUuids: record.rejectedSimilarPositionUuids || [],
  originalDocumentId: record.documentId !== null ? record.documentId.toString() : undefined, // Convert number to string or undefined
});

/**
 * Fetches all positions for the authenticated user, separated into employment history and others.
 */
export async function getAllPositions(): Promise<GetAllPositionsResponse> {
  const user = await authenticateUser();

  if (!user) {
    return { success: false, error: "User authentication failed." };
  }

  const dbPositions: PositionRecord[] = await getPositionsByUserId(user.id);

  const employmentHistoryPositions = dbPositions
    .filter(pos => pos.isEmploymentHistory)
    .map(pos => mapPositionRecordToPosition(pos));

  const otherPositions = dbPositions
    .filter(pos => !pos.isEmploymentHistory)
    .map(pos => {
      const sharedPos = mapPositionRecordToPosition(pos);
      return {
        ...sharedPos,
        originalDocumentId: pos.documentId !== null ? pos.documentId.toString() : undefined,
      };
    });

  return { success: true, employmentHistory: employmentHistoryPositions, otherPositions };
}

/**
 * Adds a position to employment history by copying it and carrying over its similar positions.
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

    // Create a new position with a new UUID
    const newPositionData: Partial<NewPositionRecord> = {
      positionUuid: uuidv4(), // Generate new UUID
      userId: user.id,
      documentId: position.documentId, // Carry over the document ID if applicable
      organization: position.organization,
      title: position.title,
      startDate: position.startDate,
      endDate: position.endDate,
      present: position.present,
      activities: position.activities,
      accomplishments: position.accomplishments,
      isEmploymentHistory: true, // Mark as Employment History
      originalPositionUuid: position.positionUuid, // Reference to the original position
      similarPositionUuids: [...(position.similarPositionUuids || [])],
      approvedSimilarPositionUuids: [...(position.approvedSimilarPositionUuids || [])],
      rejectedSimilarPositionUuids: [...(position.rejectedSimilarPositionUuids || [])],
    };

    const newPosition = await insertPosition(newPositionData as NewPositionRecord);

    // Map to Position
    const sharedPosition: Position = mapPositionRecordToPosition(newPosition);

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

/**
 * Approves a similar position by adding its UUID to approvedSimilarPositionUuids
 * and removing it from similarPositionUuids.
 */
export async function approveSimilarPosition(currentPositionUuid: string, similarPositionUuid: string): Promise<{ success: boolean; error?: string }> {
  const user = await authenticateUser();

  if (!user) {
    return { success: false, error: "User authentication failed." };
  }

  try {
    // Fetch current position
    const currentPos = await getPositionByUuid(currentPositionUuid);
    if (!currentPos) {
      return { success: false, error: "Current position not found." };
    }

    // Fetch similar position
    const similarPos = await getPositionByUuid(similarPositionUuid);
    if (!similarPos) {
      return { success: false, error: "Similar position not found." };
    }

    // Update the current position
    const updatedCurrentSimilar = (currentPos.similarPositionUuids || []).filter(uuid => uuid !== similarPositionUuid);
    const updatedCurrentApproved = [...(currentPos.approvedSimilarPositionUuids || []), similarPositionUuid];

    await updatePositionFields(currentPositionUuid, {
      approvedSimilarPositionUuids: updatedCurrentApproved,
      similarPositionUuids: updatedCurrentSimilar,
    });

    // Update the similar position
    const updatedSimilarApproved = [...(similarPos.approvedSimilarPositionUuids || []), currentPositionUuid];
    const updatedSimilarSimilar = (similarPos.similarPositionUuids || []).filter(uuid => uuid !== currentPositionUuid);

    await updatePositionFields(similarPositionUuid, {
      approvedSimilarPositionUuids: updatedSimilarApproved,
      similarPositionUuids: updatedSimilarSimilar,
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error approving similar position:", error);
    return { success: false, error: "Failed to approve similar position." };
  }
}

/**
 * Rejects a similar position by adding its UUID to rejectedSimilarPositionUuids
 * and removing it from similarPositionUuids.
 */
export async function rejectSimilarPosition(currentPositionUuid: string, similarPositionUuid: string): Promise<{ success: boolean; error?: string }> {
  const user = await authenticateUser();

  if (!user) {
    return { success: false, error: "User authentication failed." };
  }

  try {
    // Fetch current position
    const currentPos = await getPositionByUuid(currentPositionUuid);
    if (!currentPos) {
      return { success: false, error: "Current position not found." };
    }

    // Fetch similar position
    const similarPos = await getPositionByUuid(similarPositionUuid);
    if (!similarPos) {
      return { success: false, error: "Similar position not found." };
    }

    // Update the current position
    const updatedCurrentSimilar = (currentPos.similarPositionUuids || []).filter(uuid => uuid !== similarPositionUuid);
    const updatedCurrentRejected = [...(currentPos.rejectedSimilarPositionUuids || []), similarPositionUuid];

    await updatePositionFields(currentPositionUuid, {
      rejectedSimilarPositionUuids: updatedCurrentRejected,
      similarPositionUuids: updatedCurrentSimilar,
    });

    // Update the similar position
    const updatedSimilarRejected = [...(similarPos.rejectedSimilarPositionUuids || []), currentPositionUuid];
    const updatedSimilarSimilar = (similarPos.similarPositionUuids || []).filter(uuid => uuid !== currentPositionUuid);

    await updatePositionFields(similarPositionUuid, {
      rejectedSimilarPositionUuids: updatedSimilarRejected,
      similarPositionUuids: updatedSimilarSimilar,
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error rejecting similar position:", error);
    return { success: false, error: "Failed to reject similar position." };
  }
}

/**
 * Updates any field of a position.
 * @param positionUuid - The UUID of the position to update.
 * @param updatedFields - The fields to update.
 */
export async function updatePosition(positionUuid: string, updatedFields: Partial<Position>): Promise<{ success: boolean; error?: string }> {
  const user = await authenticateUser();

  if (!user) {
    return { success: false, error: "User authentication failed." };
  }

  try {
    // Prepare the data to update
    const dataToUpdate: Partial<PositionRecord> = {};

    if (updatedFields.title) {
      dataToUpdate.title = updatedFields.title.title;
    }
    if (updatedFields.organization) {
      dataToUpdate.organization = updatedFields.organization.name;
    }
    if (updatedFields.date) {
      dataToUpdate.startDate = updatedFields.date.startDate;
      dataToUpdate.endDate = updatedFields.date.endDate;
      dataToUpdate.present = updatedFields.date.present;
    }
    if (updatedFields.details) {
      dataToUpdate.activities = updatedFields.details.activities;
      dataToUpdate.accomplishments = updatedFields.details.accomplishments;
    }

    // Update the position
    await updatePositionFields(positionUuid, dataToUpdate);

    return { success: true };
  } catch (error: any) {
    console.error("Error updating position:", error);
    return { success: false, error: "Failed to update position." };
  }
}
