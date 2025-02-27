// File path: apps/web/app/_classes/Position.ts

import { Organization, OrganizationObject } from "./Organization";
import { Title, TitleObject } from "./Title";
import { ResumeDate, ResumeDateObject } from "./ResumeDate";
import { Details, DetailsObject } from "./Details";
import { AsyncCompareMethod, queryChatGPTForComparison } from "../utils/Compare";
import { Position as PositionType } from "@fedjobs/types";
import { v4 as uuidv4 } from 'uuid'; // Import UUID

export type PositionObject = PositionType;

export class Position {
    positionUuid: string;
    organization: Organization;
    title: Title;
    date: ResumeDate;
    details: Details;
    originalPositionUuid?: string;
    similarPositionUuids: string[];
    approvedSimilarPositionUuids: string[];
    rejectedSimilarPositionUuids: string[];
    originalDocumentId?: string;

    constructor(
        organization: Organization,
        title: Title,
        date: ResumeDate,
        details: Details,
        options?: {
            originalPositionUuid?: string;
            similarPositionUuids?: string[];
            approvedSimilarPositionUuids?: string[];
            rejectedSimilarPositionUuids?: string[];
            originalDocumentId?: string;
        }
    ) {
        this.positionUuid = uuidv4();
        this.organization = organization;
        this.title = title;
        this.date = date;
        this.details = details;
        this.originalPositionUuid = options?.originalPositionUuid;
        this.similarPositionUuids = options?.similarPositionUuids || [];
        this.approvedSimilarPositionUuids = options?.approvedSimilarPositionUuids || [];
        this.rejectedSimilarPositionUuids = options?.rejectedSimilarPositionUuids || [];
        this.originalDocumentId = options?.originalDocumentId;
    }

    toString(): string {
        return `Position: [${this.organization.toString()}, ${this.title.toString()}, ${this.date.toString()}, ${this.details.toString()}, OriginalPositionUUID: ${this.originalPositionUuid || 'None'}, OriginalDocumentID: ${this.originalDocumentId || 'None'}]`;
    }

    asyncCompare: AsyncCompareMethod<Position> = async (other) => {
        try {
            const response = await queryChatGPTForComparison(this.toString(), other.toString());
            return response;
        } catch (error) {
            console.error("Comparison error:", error);
            return false;
        }
    };

    toJSON(): PositionObject {
        return {
            positionUuid: this.positionUuid,
            organization: this.organization.toJSON(),
            title: this.title.toJSON(),
            date: this.date.toJSON(),
            details: this.details.toJSON(),
            originalPositionUuid: this.originalPositionUuid,
            similarPositionUuids: this.similarPositionUuids,
            approvedSimilarPositionUuids: this.approvedSimilarPositionUuids,
            rejectedSimilarPositionUuids: this.rejectedSimilarPositionUuids,
            originalDocumentId: this.originalDocumentId,
        };
    }

    static fromJSON(json: any): Position {
        return new Position(
            Organization.fromJSON(json.organization),
            Title.fromJSON(json.title),
            ResumeDate.fromJSON(json.date),
            Details.fromJSON(json.details),
            {
                originalPositionUuid: json.originalPositionUuid,
                similarPositionUuids: json.similarPositionUuids,
                approvedSimilarPositionUuids: json.approvedSimilarPositionUuids,
                rejectedSimilarPositionUuids: json.rejectedSimilarPositionUuids,
                originalDocumentId: json.originalDocumentId,
            }
        );
    }
}
