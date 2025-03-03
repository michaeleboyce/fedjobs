'use server';

import { authenticateUser } from "@fedjobs/utils";
import { PositionRepository } from "@fedjobs/database";
import { Position } from "@fedjobs/types";
import { mapRecordToPosition } from "@/app/features/positions/utils/positionMapper";

type GetPositionResponse = 
  | { success: true; position: Position }
  | { success: false; error: string };

type UpdatePositionResponse = 
  | { success: true; position: Position }
  | { success: false; error: string };

const positionRepo = new PositionRepository();

async function requireAuth(): Promise<any> {
  const user = await authenticateUser();
  if (!user) throw new Error("User authentication failed.");
  return user;
}

export async function getPosition(uuid: string): Promise<GetPositionResponse> {
  try {
    await requireAuth();
    const positionRecord = await positionRepo.getByUuid(uuid);
    if (!positionRecord) {
      return { success: false, error: "Position not found." };
    }
    const mappedPosition = mapRecordToPosition(positionRecord);
    return { success: true, position: mappedPosition };
  } catch (error: any) {
    console.error("Error fetching position:", error);
    return { success: false, error: "Failed to fetch position details." };
  }
}

export async function updatePositionFieldsByUuid(
  uuid: string, 
  updates: Partial<Position>
): Promise<UpdatePositionResponse> {
  try {
    await requireAuth();
    const updatedPositions = await positionRepo.updateFields(uuid, {
      similarPositionUuids: updates.similarPositionUuids,
      approvedSimilarPositionUuids: updates.approvedSimilarPositionUuids,
      rejectedSimilarPositionUuids: updates.rejectedSimilarPositionUuids,
      title: updates.title ? updates.title.title : undefined,
      organization: updates.organization ? updates.organization.name : undefined,
      startDate: updates.date ? updates.date.startDate : undefined,
      endDate: updates.date ? updates.date.endDate : undefined,
      present: updates.date ? updates.date.present : undefined,
      activities: updates.details ? updates.details.activities : undefined,
      accomplishments: updates.details ? updates.details.accomplishments : undefined,
    });

    if (!updatedPositions || updatedPositions.length === 0) {
      return { success: false, error: "Position not found." };
    }

    const mappedPosition = mapRecordToPosition(updatedPositions[0]);
    return { success: true, position: mappedPosition };
  } catch (error: any) {
    console.error("Error updating position:", error);
    return { success: false, error: "Failed to update position." };
  }
}
