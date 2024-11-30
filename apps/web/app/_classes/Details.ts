import { AsyncCompareMethod, queryChatGPTForComparison } from "../_utils/Compare";

export type DetailsObject = {
    activities: string[],
    accomplishments: string[]
}
export class Details {
    activities: string[];
    accomplishments: string[];

    constructor(activities: string[], accomplishments: string[]) {
        this.activities = activities;
        this.accomplishments = accomplishments;
    }

    toString(): string {
        return `Details: Activities [${this.activities.join(", ")}], Accomplishments [${this.accomplishments.join(", ")}]`;
    }

    asyncCompare: AsyncCompareMethod<Details> = async (other) => {
        try {
            const response = await queryChatGPTForComparison(this.toString(), other.toString());
            return response;
        } catch (error) {
            console.error("Comparison error:", error);
            return false;
        }
    };

    toJSON(): DetailsObject {
        return {
            activities: this.activities,
            accomplishments: this.accomplishments,
        };
    }
    
    static fromJSON(json: any): Details {
        try {
            if (Array.isArray(json?.activities) && Array.isArray(json?.accomplishments)) {
                return new Details(json.activities, json.accomplishments);
            } else {
                throw new Error("Invalid JSON structure for Details");
            }
        } catch (error) {
            console.error("Error parsing JSON for Details:", error);
            return new Details([], []);
        }
    }
}

