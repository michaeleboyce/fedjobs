// File path: apps/web/app/shared/types/Resume.ts
import { Position, PositionObject } from "./Position";
import { Organization } from "./Organization";
import { Title } from "./Title";
import { ResumeDate } from "./ResumeDate";
import { Details } from "./Details";
import { Resume as ResumeType } from "@fedjobs/types"
//TODO: this below line is silly, just refactor the whole thing and move classes to the packages

export type ResumeObject = ResumeType;
export class Resume {
    positions: Position[];
    filename: string;

    constructor(positions: Position[]) {
        this.positions = positions;
        // Generate a unique filename for each instance
        this.filename = `Resume-${Date.now()}.json`;

    }
//TODO: if there is a parse error, have it use AI to repair the XML
    static fromText(text: string): Resume {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(text, "application/xml");

            if (xmlDoc.getElementsByTagName("parsererror").length) {
                throw new Error("Invalid XML format");
            }

            const positions = Array.from(xmlDoc.getElementsByTagName("position")).map(posNode => {
                const organizationText = posNode.getElementsByTagName("organization")[0]?.textContent || '';
                const titleText = posNode.getElementsByTagName("title")[0]?.textContent || '';
                const startDate = posNode.getElementsByTagName("date")[0]?.getAttribute("startDate") || '';
                const endDate = posNode.getElementsByTagName("date")[0]?.getAttribute("endDate") || '';
                const present = posNode.getElementsByTagName("date")[0]?.getAttribute("present") === "true";

                const organization = new Organization(organizationText);
                const title = new Title(titleText);
                const date = new ResumeDate(startDate, endDate, present);

                const activities = Array.from(posNode.getElementsByTagName("activity")).map(activity => activity.textContent || '');
                const accomplishments = Array.from(posNode.getElementsByTagName("accomplishment")).map(accomplishment => accomplishment.textContent || '');
                const details = new Details(activities, accomplishments);

                return new Position(organization, title, date, details);
            });

            return new Resume(positions);
        } catch (error) {
            return Resume.fromTextWithFallbackParsing(text);
        }
    }

    static fromTextWithFallbackParsing(text: string): Resume {
        const positionRegex = /<position>(.*?)<\/position>/gs;
        const positions: Position[] = [];
        
        let match;
        while ((match = positionRegex.exec(text)) !== null) {
            try {
                const positionText = match[1];
                const organization = this.extractTagContent(positionText, "organization");
                const title = this.extractTagContent(positionText, "title");
                const startDate = this.extractAttribute(positionText, "date", "startDate");
                const endDate = this.extractAttribute(positionText, "date", "endDate");
                const present = this.extractAttribute(positionText, "date", "present") === "true";
                
                const detailsText = this.extractTagContent(positionText, "details");
                const activities = this.extractMultipleTagContents(detailsText, "activity");
                const accomplishments = this.extractMultipleTagContents(detailsText, "accomplishment");
                const details = new Details(activities, accomplishments);

                positions.push(new Position(new Organization(organization), new Title(title), new ResumeDate(startDate, endDate, present), details));
            } catch (innerError) {
                console.error("Error parsing position:", innerError);
            }
        }

        return new Resume(positions);
    }

    static extractTagContent(text: string, tagName: string): string {
        const regex = new RegExp(`<${tagName}[^>]*>(.*?)<\/${tagName}>`, 's');
        const match = regex.exec(text);
        return match ? match[1].trim() : '';
    }

    static extractMultipleTagContents(text: string, tagName: string): string[] {
        const regex = new RegExp(`<${tagName}[^>]*>(.*?)<\/${tagName}>`, 'gs');
        const contents: string[] = [];
        let match;
        while ((match = regex.exec(text)) !== null) {
            contents.push(match[1].trim());
        }
        return contents;
    }

    static extractAttribute(text: string, tagName: string, attributeName: string): string {
        const regex = new RegExp(`<${tagName}[^>]*${attributeName}="(.*?)"[^>]*>`, 's');
        const match = regex.exec(text);
        return match ? match[1].trim() : '';
    }

    toJSON(): ResumeObject {
        return {
            positions: this.positions.map(p => p.toJSON()),
            filename: this.filename
        };
    }

    static fromJSON(json: any = []): Resume {
        try {
            const positions = json.positions.map(Position.fromJSON);
            return new Resume(positions);
        } catch (error) {
            console.error("Error parsing JSON:", error);
            // Handle the error or return a default value
            return new Resume([]); // Returning an empty Resume as a fallback
        }
    }

}
