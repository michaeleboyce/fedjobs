import { AsyncCompareMethod, queryChatGPTForComparison } from "../_utils/Compare";

export type OrganizationObject = {
    name: string
}

export class Organization {
    name: string;

    constructor(name: string) {
        this.name = name;
    }

    toString(): string {
        return `Organization: ${this.name}`;
    }

    asyncCompare: AsyncCompareMethod<Organization> = async (other) => {
        try {
            const response = await queryChatGPTForComparison(this.toString(), other.toString());
            return response;
        } catch (error) {
            console.error("Comparison error:", error);
            return false;
        }
    };

    toJSON(): OrganizationObject {
        return {
            name: this.name,
        };
    }

    static fromJSON(json: any): Organization {
        try {
            return new Organization(json.organization);
        } catch (error) {
            console.error("Error parsing JSON for Organization:", error);
            return new Organization('');
        }
    }
}
