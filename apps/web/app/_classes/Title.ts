import { AsyncCompareMethod, queryChatGPTForComparison } from "../_utils/Compare";
export type TitleObject = {
    title: string
}
export class Title {
    title: string;

    constructor(title: string) {
        this.title = title;
    }

    toString(): string {
        return `Title: ${this.title}`;
    }

    asyncCompare: AsyncCompareMethod<Title> = async (other) => {
        try {
            const response = await queryChatGPTForComparison(this.toString(), other.toString());
            return response;
        } catch (error) {
            console.error("Comparison error:", error);
            return false;
        }
    };
    
    toJSON(): TitleObject {
        return {
            title: this.title,
        };
    }
    
    static fromJSON(json: any): Title {
        try {
            if (typeof json?.title === 'string') {
                return new Title(json.title);
            } else {
                throw new Error("Invalid JSON structure for Title");
            }
        } catch (error) {
            console.error("Error parsing JSON for Title:", error);
            return new Title('');
        }
    }
}