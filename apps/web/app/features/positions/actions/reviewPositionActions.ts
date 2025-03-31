// File path: apps/web/app/features/positions/actions/reviewPositionActions.ts
'use server';

import { authenticateUser } from "@fedjobs/utils";
import { PositionRepository, DocumentRepository, PositionRecord } from "@fedjobs/database";
import { Position } from "@fedjobs/types";
import { v4 as uuidv4 } from 'uuid';
import { mapRecordToPosition } from "../utils/positionMapper";

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

const positionRepo = new PositionRepository();
const documentRepo = new DocumentRepository();

export async function getAllPositions(): Promise<GetAllPositionsResponse> {
  try {
    const user = await authenticateUser();
    if (!user) {
      return { success: false, error: "User authentication failed." };
    }
    const positions = await positionRepo.getByUserIdOptimized(user.id);
    const employmentHistory: Position[] = [];
    const otherPositions: Position[] = [];
    for (const pos of positions) {
      const mapped = mapRecordToPosition(pos);
      if (pos.isEmploymentHistory) {
        employmentHistory.push(mapped);
      } else {
        otherPositions.push(mapped);
      }
    }
    return { success: true, employmentHistory, otherPositions };
  } catch (error: any) {
    console.error("Error fetching positions:", error);
    return { success: false, error: "Failed to fetch positions." };
  }
}

export async function addToEmploymentHistory(positionUuid: string): Promise<AddToEmploymentHistoryResponse> {
  try {
    const user = await authenticateUser();
    if (!user) {
      return { success: false, error: "User authentication failed." };
    }
    const position = await positionRepo.getByUuid(positionUuid);
    if (!position) {
      return { success: false, error: "Position not found." };
    }
    const newPositionData = {
      positionUuid: uuidv4(),
      userId: user.id,
      documentId: position.documentId,
      organization: position.organization,
      title: position.title,
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
    const mappedPosition = mapRecordToPosition(newPosition);
    return { success: true, position: mappedPosition };
  } catch (error: any) {
    console.error("Error adding position to employment history:", error);
    return { success: false, error: "Failed to add position to employment history." };
  }
}

export async function removeFromEmploymentHistory(positionUuid: string): Promise<RemoveFromEmploymentHistoryResponse> {
  try {
    const user = await authenticateUser();
    if (!user) {
      return { success: false, error: "User authentication failed." };
    }
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

export async function rejectPosition(positionUuid: string): Promise<RejectPositionResponse> {
  try {
    const user = await authenticateUser();
    if (!user) {
      return { success: false, error: "User authentication failed." };
    }
    await positionRepo.deleteByUuid(positionUuid);
    return { success: true, message: "Position rejected and deleted." };
  } catch (error: any) {
    console.error("Error rejecting position:", error);
    return { success: false, error: "Failed to reject position." };
  }
}

export async function approveSimilarPosition(
  currentPositionUuid: string,
  similarPositionUuid: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await authenticateUser();
    if (!user) {
      return { success: false, error: "User authentication failed." };
    }
    const currentPos = await positionRepo.getByUuid(currentPositionUuid);
    const similarPos = await positionRepo.getByUuid(similarPositionUuid);
    if (!currentPos || !similarPos) {
      return { success: false, error: "One or both positions not found." };
    }
    const updatedCurrentSimilar = (currentPos.similarPositionUuids || []).filter(uuid => uuid !== similarPositionUuid);
    const updatedCurrentApproved = [...(currentPos.approvedSimilarPositionUuids || []), similarPositionUuid];
    await positionRepo.updateFields(currentPositionUuid, {
      approvedSimilarPositionUuids: updatedCurrentApproved,
      similarPositionUuids: updatedCurrentSimilar,
    });
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

export async function rejectSimilarPosition(
  currentPositionUuid: string,
  similarPositionUuid: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await authenticateUser();
    if (!user) {
      return { success: false, error: "User authentication failed." };
    }
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

export async function updatePosition(
  positionUuid: string,
  updatedFields: Partial<Position>
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await authenticateUser();
    if (!user) {
      return { success: false, error: "User authentication failed." };
    }
    const dataToUpdate: any = {};
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
    await positionRepo.updateFields(positionUuid, dataToUpdate);
    return { success: true };
  } catch (error: any) {
    console.error("Error updating position:", error);
    return { success: false, error: "Failed to update position." };
  }
}
