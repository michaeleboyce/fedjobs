// File path: apps/web/app/_actions/positions/positionActions.ts
'use server';

import { authenticateUser } from "@fedjobs/utils";
// Instead of importing raw functions, import the repository class:
import { PositionRepository } from "@fedjobs/database";
import { Position } from "@fedjobs/types";

// Define response types.
type GetPositionResponse = 
  | { success: true; position: Position }
  | { success: false; error: string };

type UpdatePositionResponse = 
  | { success: true; position: Position }
  | { success: false; error: string };

// Instantiate the PositionRepository.
const positionRepo = new PositionRepository();

/**
 * Retrieves a position by its UUID.
 * Uses the repository to fetch the position record and then maps it to the Position type.
 *
 * @param uuid - The UUID of the position.
 * @returns A promise resolving to GetPositionResponse.
 */
export async function getPosition(uuid: string): Promise<GetPositionResponse> {
  // Authenticate the user.
  const user = await authenticateUser();
  if (!user) {
    return { success: false, error: "User authentication failed." };
  }

  try {
    // Fetch the position using the repository.
    const positionRecord = await positionRepo.getByUuid(uuid);
    if (!positionRecord) {
      return { success: false, error: "Position not found." };
    }

    // Map the raw database record to our Position type.
    const mappedPosition: Position = {
      positionUuid: positionRecord.positionUuid,
      organization: { name: positionRecord.organization },
      title: { title: positionRecord.title },
      date: {
        startDate: positionRecord.startDate,
        endDate: positionRecord.endDate,
        present: positionRecord.present,
      },
      details: {
        activities: positionRecord.activities,
        accomplishments: positionRecord.accomplishments,
      },
      // Optional fields: if null, set to undefined.
      originalPositionUuid: positionRecord.originalPositionUuid ?? undefined,
      similarPositionUuids: positionRecord.similarPositionUuids || [],
      approvedSimilarPositionUuids: positionRecord.approvedSimilarPositionUuids || [],
      rejectedSimilarPositionUuids: positionRecord.rejectedSimilarPositionUuids || [],
      originalDocumentId: positionRecord.documentId ? positionRecord.documentId.toString() : undefined,
    };

    return { success: true, position: mappedPosition };
  } catch (error: any) {
    console.error("Error fetching position:", error);
    return { success: false, error: "Failed to fetch position details." };
  }
}

/**
 * Updates specific fields of a position by its UUID.
 * Uses the repository method updateFields to perform the update.
 *
 * @param uuid - The UUID of the position.
 * @param updates - The fields to update.
 * @returns A promise resolving to UpdatePositionResponse.
 */
export async function updatePositionFieldsByUuid(
  uuid: string, 
  updates: Partial<Position>
): Promise<UpdatePositionResponse> {
  // Authenticate the user.
  const user = await authenticateUser();
  if (!user) {
    return { success: false, error: "User authentication failed." };
  }

  try {
    // Call repository updateFields to update similar-related fields.
    const updatedPositions = await positionRepo.updateFields(uuid, {
      similarPositionUuids: updates.similarPositionUuids,
      approvedSimilarPositionUuids: updates.approvedSimilarPositionUuids,
      rejectedSimilarPositionUuids: updates.rejectedSimilarPositionUuids,
    });

    if (!updatedPositions || updatedPositions.length === 0) {
      return { success: false, error: "Position not found." };
    }

    // Map the updated record to the Position type.
    const updatedRecord = updatedPositions[0];
    const mappedPosition: Position = {
      positionUuid: updatedRecord.positionUuid,
      organization: { name: updatedRecord.organization },
      title: { title: updatedRecord.title },
      date: {
        startDate: updatedRecord.startDate,
        endDate: updatedRecord.endDate,
        present: updatedRecord.present,
      },
      details: {
        activities: updatedRecord.activities,
        accomplishments: updatedRecord.accomplishments,
      },
      originalPositionUuid: updatedRecord.originalPositionUuid ?? undefined,
      similarPositionUuids: updatedRecord.similarPositionUuids || [],
      approvedSimilarPositionUuids: updatedRecord.approvedSimilarPositionUuids || [],
      rejectedSimilarPositionUuids: updatedRecord.rejectedSimilarPositionUuids || [],
      originalDocumentId: updatedRecord.documentId ? updatedRecord.documentId.toString() : undefined,
    };

    return { success: true, position: mappedPosition };
  } catch (error: any) {
    console.error("Error updating position:", error);
    return { success: false, error: "Failed to update position." };
  }
}
