// File path: apps/web/app/_actions/positions/reviewPositionActions.ts
'use server';

import { authenticateUser } from "@fedjobs/utils";
// Import repository classes
import { PositionRepository, DocumentRepository, PositionRecord } from "@fedjobs/database";
// Import types from our type package.
import { Position } from "@fedjobs/types";
import { v4 as uuidv4 } from 'uuid';

// Define response types.
type GetAllPositionsResponse =
  | { success: true; employmentHistory: Position[]; otherPositions: Position[] }
  | { success: false; error: string };

type AddToEmploymentHistoryResponse =
  | { success: true; position: Position }
  | { success: false; error: string };

type RejectPositionResponse =
  | { success: true; message: string }
  | { success: false; error: string };

type RemoveFromEmploymentHistoryResponse =
  | { success: true; message: string }
  | { success: false; error: string };

// Instantiate repository objects.
const positionRepo = new PositionRepository();
const documentRepo = new DocumentRepository();

/**
 * Helper function to map a PositionRecord (raw DB record) to our Position type.
 * Note: Our Position type nests title, organization, date, and details while the DB stores them as flat strings/arrays.
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
  originalPositionUuid: record.originalPositionUuid ?? undefined,
  similarPositionUuids: record.similarPositionUuids || [],
  approvedSimilarPositionUuids: record.approvedSimilarPositionUuids || [],
  rejectedSimilarPositionUuids: record.rejectedSimilarPositionUuids || [],
  // Convert documentId (number) to string if present.
  originalDocumentId: record.documentId ? record.documentId.toString() : undefined,
});

/**
 * Fetches all positions for the authenticated user, separating those marked as employment history.
 */
export async function getAllPositions(): Promise<GetAllPositionsResponse> {
  const user = await authenticateUser();
  if (!user) {
    return { success: false, error: "User authentication failed." };
  }

  try {
    const dbPositions = await positionRepo.getByUserId(user.id);
    const employmentHistoryPositions = dbPositions
      .filter(pos => pos.isEmploymentHistory)
      .map(pos => mapPositionRecordToPosition(pos));
    const otherPositions = dbPositions
      .filter(pos => !pos.isEmploymentHistory)
      .map(pos => mapPositionRecordToPosition(pos));

    return { success: true, employmentHistory: employmentHistoryPositions, otherPositions };
  } catch (error: any) {
    console.error("Error fetching positions:", error);
    return { success: false, error: "Failed to fetch positions." };
  }
}

/**
 * Adds a position to employment history by copying an existing position record,
 * generating a new UUID, and marking it as employment history.
 */
export async function addToEmploymentHistory(positionUuid: string): Promise<AddToEmploymentHistoryResponse> {
  const user = await authenticateUser();
  if (!user) {
    return { success: false, error: "User authentication failed." };
  }

  try {
    const position = await positionRepo.getByUuid(positionUuid);
    if (!position) {
      return { success: false, error: "Position not found." };
    }

    // Build a new position data object that matches the flat DB schema.
    const newPositionData = {
      positionUuid: uuidv4(), // New UUID
      userId: user.id,
      documentId: position.documentId,
      organization: position.organization, // expecting a string in DB (the repo handles this)
      title: position.title,               // expecting a string in DB
      startDate: position.startDate,
      endDate: position.endDate,
      present: position.present,
      activities: position.activities,
      accomplishments: position.accomplishments,
      isEmploymentHistory: true,
      originalPositionUuid: position.positionUuid,
      similarPositionUuids: [...(position.similarPositionUuids || [])],
      approvedSimilarPositionUuids: [...(position.approvedSimilarPositionUuids || [])],
      rejectedSimilarPositionUuids: [...(position.rejectedSimilarPositionUuids || [])],
    };

    const newPosition = await positionRepo.insert(newPositionData);
    const mappedPosition = mapPositionRecordToPosition(newPosition);
    return { success: true, position: mappedPosition };
  } catch (error: any) {
    console.error("Error adding position to employment history:", error);
    return { success: false, error: "Failed to add position to employment history." };
  }
}

/**
 * Removes a position from employment history.
 */
export async function removeFromEmploymentHistory(positionUuid: string): Promise<RemoveFromEmploymentHistoryResponse> {
  const user = await authenticateUser();
  if (!user) {
    return { success: false, error: "User authentication failed." };
  }
  try {
    const position = await positionRepo.getByUuid(positionUuid);
    if (!position) {
      return { success: false, error: "Position not found." };
    }
    if (!position.isEmploymentHistory) {
      return { success: false, error: "Position is not part of Employment History." };
    }
    await positionRepo.deleteByUuid(positionUuid);
    return { success: true, message: "Position removed from Employment History." };
  } catch (error: any) {
    console.error("Error removing position from employment history:", error);
    return { success: false, error: "Failed to remove position from Employment History." };
  }
}

/**
 * Rejects a position by deleting it.
 */
export async function rejectPosition(positionUuid: string): Promise<RejectPositionResponse> {
  const user = await authenticateUser();
  if (!user) {
    return { success: false, error: "User authentication failed." };
  }
  try {
    await positionRepo.deleteByUuid(positionUuid);
    return { success: true, message: "Position rejected and deleted." };
  } catch (error: any) {
    console.error("Error rejecting position:", error);
    return { success: false, error: "Failed to reject position." };
  }
}

/**
 * Approves a similar position by updating both current and similar positions.
 */
export async function approveSimilarPosition(
  currentPositionUuid: string,
  similarPositionUuid: string
): Promise<{ success: boolean; error?: string }> {
  const user = await authenticateUser();
  if (!user) {
    return { success: false, error: "User authentication failed." };
  }
  try {
    const currentPos = await positionRepo.getByUuid(currentPositionUuid);
    const similarPos = await positionRepo.getByUuid(similarPositionUuid);
    if (!currentPos || !similarPos) {
      return { success: false, error: "One or both positions not found." };
    }
    // For current position, remove the similar UUID from similarPositionUuids and add to approvedSimilarPositionUuids.
    const updatedCurrentSimilar = (currentPos.similarPositionUuids || []).filter(uuid => uuid !== similarPositionUuid);
    const updatedCurrentApproved = [...(currentPos.approvedSimilarPositionUuids || []), similarPositionUuid];
    await positionRepo.updateFields(currentPositionUuid, {
      approvedSimilarPositionUuids: updatedCurrentApproved,
      similarPositionUuids: updatedCurrentSimilar,
    });
    // For similar position, perform the inverse update.
    const updatedSimilarApproved = [...(similarPos.approvedSimilarPositionUuids || []), currentPositionUuid];
    const updatedSimilarSimilar = (similarPos.similarPositionUuids || []).filter(uuid => uuid !== currentPositionUuid);
    await positionRepo.updateFields(similarPositionUuid, {
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
 * Rejects a similar position by updating both positions to add the rejection.
 */
export async function rejectSimilarPosition(
  currentPositionUuid: string,
  similarPositionUuid: string
): Promise<{ success: boolean; error?: string }> {
  const user = await authenticateUser();
  if (!user) {
    return { success: false, error: "User authentication failed." };
  }
  try {
    const currentPos = await positionRepo.getByUuid(currentPositionUuid);
    const similarPos = await positionRepo.getByUuid(similarPositionUuid);
    if (!currentPos || !similarPos) {
      return { success: false, error: "One or both positions not found." };
    }
    const updatedCurrentSimilar = (currentPos.similarPositionUuids || []).filter(uuid => uuid !== similarPositionUuid);
    const updatedCurrentRejected = [...(currentPos.rejectedSimilarPositionUuids || []), similarPositionUuid];
    await positionRepo.updateFields(currentPositionUuid, {
      rejectedSimilarPositionUuids: updatedCurrentRejected,
      similarPositionUuids: updatedCurrentSimilar,
    });
    const updatedSimilarRejected = [...(similarPos.rejectedSimilarPositionUuids || []), currentPositionUuid];
    const updatedSimilarSimilar = (similarPos.similarPositionUuids || []).filter(uuid => uuid !== currentPositionUuid);
    await positionRepo.updateFields(similarPositionUuid, {
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
 * Updates any field of a position. Since the database stores some fields in a flat structure,
 * we need to transform nested fields (like title, organization, date, details) into their corresponding DB columns.
 */
export async function updatePosition(
  positionUuid: string,
  updatedFields: Partial<Position>
): Promise<{ success: boolean; error?: string }> {
  const user = await authenticateUser();
  if (!user) {
    return { success: false, error: "User authentication failed." };
  }

  try {
    // Prepare a flat update object matching the DB columns.
    const dataToUpdate: {
      title?: string;
      organization?: string;
      startDate?: string;
      endDate?: string;
      present?: boolean;
      activities?: string[];
      accomplishments?: string[];
    } = {};

    if (updatedFields.title) {
      // Extract the string value from Title.
      dataToUpdate.title = updatedFields.title.title;
    }
    if (updatedFields.organization) {
      // Extract the string value from Organization.
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

    // Use repository method to update the fields.
    await positionRepo.updateFields(positionUuid, dataToUpdate);
    return { success: true };
  } catch (error: any) {
    console.error("Error updating position:", error);
    return { success: false, error: "Failed to update position." };
  }
}
