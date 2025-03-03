import { Position } from "@fedjobs/types";
import { PositionRecord } from "@fedjobs/database";

export function mapRecordToPosition(record: PositionRecord): Position {
  return {
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
    originalDocumentId: record.documentId ? record.documentId.toString() : undefined,
  };
}
