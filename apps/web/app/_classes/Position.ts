import { Organization, OrganizationObject } from "./Organization";
import { Title, TitleObject } from "./Title";
import { ResumeDate, ResumeDateObject } from "./ResumeDate";
import { Details, DetailsObject } from "./Details"
import { AsyncCompareMethod, queryChatGPTForComparison } from "../_utils/Compare";
export type PositionObject = {
    organization: OrganizationObject,
    title: TitleObject,
    date: ResumeDateObject,
    details: DetailsObject
}
export class Position {
    organization: Organization;
    title: Title;
    date: ResumeDate;
    details: Details;

    constructor(organization: Organization, title: Title, date: ResumeDate, details: Details) {
        this.organization = organization;
        this.title = title;
        this.date = date;
        this.details = details;
    }

    toString(): string {
        return `Position: [${this.organization.toString()}, ${this.title.toString()}, ${this.date.toString()}, ${this.details.toString()}]`;
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
            organization: this.organization.toJSON(),
            title: this.title.toJSON(),
            date: this.date.toJSON(),
            details: this.details.toJSON(),
        };
    }

    static fromJSON(json: any): Position {
        return new Position(
            Organization.fromJSON(json.organization),
            Title.fromJSON(json.title),
            ResumeDate.fromJSON(json.date),
            Details.fromJSON(json.details)
        );
    }
}
