import { StringValueElement } from "docx";
import { AsyncCompareMethod, queryChatGPTForComparison } from "../_utils/Compare";

export type ResumeDateObject = {
    startDate: string,
    endDate: string,
    present: boolean
}

export class ResumeDate {
    startDate: string;
    endDate: string;
    present: boolean;

    constructor(startDate: string, endDate: string, present: boolean) {
        this.startDate = startDate;
        this.endDate = endDate;
        this.present = present;
    }

    toString(): string {
        const endDateStr = this.present ? "Present" : this.endDate;
        return `Date: ${this.startDate} to ${endDateStr}`;
    }

    asyncCompare: AsyncCompareMethod<ResumeDate> = async (other) => {
        try {
            const response = await queryChatGPTForComparison(this.toString(), other.toString());
            return response;
        } catch (error) {
            console.error("Comparison error:", error);
            return false;
        }
    };

    toJSON(): ResumeDateObject {
        return {
            startDate: this.startDate,
            endDate: this.endDate,
            present: this.present,
        };
    }

    static fromJSON(json: any): ResumeDate {
        try {
            if (typeof json?.startDate === 'string' && typeof json?.endDate === 'string') {
                return new ResumeDate(json.startDate, json.endDate, !!json.present);
            } else {
                throw new Error("Invalid JSON structure for ResumeDate");
            }
        } catch (error) {
            console.error("Error parsing JSON for ResumeDate:", error);
            return new ResumeDate('', '', false);
        }
    }
}
