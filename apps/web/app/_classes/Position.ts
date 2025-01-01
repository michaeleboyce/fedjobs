// File path: apps/web/app/_classes/Position.ts
import { Organization, OrganizationObject } from "./Organization";
import { Title, TitleObject } from "./Title";
import { ResumeDate, ResumeDateObject } from "./ResumeDate";
import { Details, DetailsObject } from "./Details"
import { AsyncCompareMethod, queryChatGPTForComparison } from "../_utils/Compare";
import { Position as PositionType } from "@fedjobs/types";
import { v4 as uuidv4 } from 'uuid'; // Import UUID
//TODO: this below line is silly, just refactor the whole thing and move classes to the packages
export type PositionObject = PositionType;
export class Position {
    positionUuid: string;
    organization: Organization;
    title: Title;
    date: ResumeDate;
    details: Details;
    groupId?: string;


    constructor(organization: Organization, title: Title, date: ResumeDate, details: Details, groupId?: string) {
        this.positionUuid = uuidv4();
        this.organization = organization;
        this.title = title;
        this.date = date;
        this.details = details;
    }

    toString(): string {
        return `Position: [${this.organization.toString()}, ${this.title.toString()}, ${this.date.toString()}, ${this.details.toString()}, GroupID: ${this.groupId || 'None'}]`;
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
            groupId: this.groupId,
        };
    }

    static fromJSON(json: any): Position {
        return new Position(
            Organization.fromJSON(json.organization),
            Title.fromJSON(json.title),
            ResumeDate.fromJSON(json.date),
            Details.fromJSON(json.details),
            json.groupId
            // Assign groupId if present
        );
    }
}


