// File path: packages/utils/src/Helpers/groupHelper.ts
// // packages/utils/src/helpers/groupHelper.ts

// import { findRelevantSentences, getEmbeddings } from '@/app/_actions/vectorize/vectorizeActions';
// import { updatePositionByUuid, getPositionByUuid } from '@fedjobs/database';
// import { Position } from '@fedjobs/types';
// import { v4 as uuidv4 } from 'uuid';
// import { createSharedPosition } from './positionHelper';

// /**
//  * Groups similar positions by updating their groupIds based on vector similarity.
//  * @param position - The position to group.
//  * @param userId - The user ID for filtering.
//  * @param similarityThreshold - The similarity score threshold.
//  */
// export async function groupSimilarPositions(position: Position, userId: string, similarityThreshold: number = 0.75): Promise<void> {
//   // Find similar positions
//   const similarPositions = await findRelevantSentences(
//     `${position.title.title} at ${position.organization.name} ${position.details.activities.join(' ')}`,
//     userId,
//     topK = 5,
//     scoreThreshold = similarityThreshold
//   );

//   if (similarPositions.length === 0) {
//     // No similar positions found, assign a new groupId
//     const newGroupId = uuidv4();
//     await updatePositionByUuid(position.positionUuid, { groupId: newGroupId });
//     return;
//   }

//   // Collect existing groupIds from similar positions
//   const existingGroupIds = similarPositions
//     .map(pos => pos.metadata.groupId)
//     .filter((groupId): groupId is string => typeof groupId === 'string');

//   let targetGroupId: string;

//   if (existingGroupIds.length > 0) {
//     // If similar positions already have a groupId, use the first one
//     targetGroupId = existingGroupIds[0];
//   } else {
//     // If no similar positions have a groupId, create a new one
//     targetGroupId = uuidv4();
//   }

//   // Assign the target groupId to the current position
//   await updatePositionByUuid(position.positionUuid, { groupId: targetGroupId });

//   // Assign the same groupId to all similar positions
//   for (const similarPos of similarPositions) {
//     await updatePositionByUuid(similarPos.id, { groupId: targetGroupId });
//   }
// }
