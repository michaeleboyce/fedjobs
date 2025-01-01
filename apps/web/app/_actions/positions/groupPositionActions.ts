// File path: apps/web/app/_actions/positions/groupPositionActions.ts
'use server';

import { authenticateUser } from "@fedjobs/utils";
import { 
  getPositionByUuid, 
  updatePositionByUuid, 
  getPositionsByGroupId 
} from '@fedjobs/database';
import { v4 as uuidv4 } from 'uuid';
import { Position as SharedPosition } from "@fedjobs/types";

type GroupPositionResponse =
  | { success: true; message: string }
  | { success: false; error: string };

/**
 * Creates a new group and assigns the specified positions to it.
 * @param positionUuids - Array of position UUIDs to group.
 */
export async function createGroup(positionUuids: string[]): Promise<GroupPositionResponse> {
  const user = await authenticateUser();

  if (!user) {
    return { success: false, error: "User authentication failed." };
  }

  const groupId = uuidv4();

  try {
    for (const uuid of positionUuids) {
      const position = await getPositionByUuid(uuid);
      if (!position) {
        return { success: false, error: `Position with UUID ${uuid} not found.` };
      }

      await updatePositionByUuid(uuid, { groupId });
    }

    return { success: true, message: "Positions successfully grouped." };
  } catch (error: any) {
    console.error("Error creating group:", error);
    return { success: false, error: "Failed to create group." };
  }
}

/**
 * Removes a position from its group.
 * @param positionUuid - The UUID of the position to remove from the group.
 */
export async function removeFromGroup(positionUuid: string): Promise<GroupPositionResponse> {
  const user = await authenticateUser();

  if (!user) {
    return { success: false, error: "User authentication failed." };
  }

  try {
    const position = await getPositionByUuid(positionUuid);
    if (!position) {
      return { success: false, error: "Position not found." };
    }

    await updatePositionByUuid(positionUuid, { groupId: null });

    return { success: true, message: "Position successfully removed from the group." };
  } catch (error: any) {
    console.error("Error removing position from group:", error);
    return { success: false, error: "Failed to remove position from group." };
  }
}
