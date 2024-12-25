import { Document, Packer, Paragraph, TextRun } from 'docx';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { db } from "@/app/_db";
import { documents as documentsTable } from "@/app/_db/schema/documents";
import { OpenAI } from 'openai';
import { GenerationSelection } from '@/app/_types/GenerationSelection';
import { StreamingTextArray } from '@/app/_types/StreamingTextArray';
import { formatDateMMDDYYYY } from '@/app/_utils/DateUtils';

export type SaveDocumentResult = {status: 'ok', body: { url: string, documentId: number, documentName: string, generatedText: string }}|
    {status: 'error', body: {message: string}};

export abstract class EssayGenerator {
    abstract createPrompt(): string;//TODO: add optional generationSelection
    abstract createParagraphPrompt( 
        paragraphId: number,
        regenerationText: string,
        streamingTextArray: StreamingTextArray): string;
    abstract getDescription(): string; // Abstract method to be overridden by child classes
    abstract getFileNamePrefix(): string;
    protected _documentType: string;
    protected _generationSelection: GenerationSelection;

    constructor(documentType: string, generationSelection: GenerationSelection){
        this._documentType = documentType;
        this._generationSelection = generationSelection;
    }
    
    public get documentType(): string {
        return this._documentType;
    }

    protected get jobDescription(): string {
        let description = this._generationSelection.jobInfo.jobDescription;
        const job = this._generationSelection.jobInfo.job;
        if (!job) return description;
        const details = job.MatchedObjectDescriptor;
        const USAJobsDescription = [
            `${details.PositionTitle}, ${details.DepartmentName}`,
            `Location: ${details.PositionLocationDisplay}`,
            `Organization: ${details.OrganizationName}`,
            `SubAgency: ${details.SubAgency}`,
            `Grade: ${details.JobGrade?.[0].Code ?? ''}`,
            `Schedule: ${details.PositionSchedule?.[0].Name ?? ''}`,
            `Open Period: ${formatDateMMDDYYYY(details.PositionStartDate)} - ${formatDateMMDDYYYY(details.PositionEndDate)}`,
            `Qualifications: ${details.QualificationSummary}`,
            `Agency Marketing Statement: ${details.UserArea.Details.AgencyMarketingStatement}`,
            `Major Duties: ${details.UserArea.Details.MajorDuties.join(' ')}`,
            `Evaluations: ${details.UserArea.Details.Evaluations}`,
        ].join('\n');

        return `
        <userEnteredDescription> 
            ${description}
        </userEnteredDescription>
        <descriptionFromUSAJobs>
            ${USAJobsDescription}
        </descriptionFromUSAJobs`
    }
    async GenerateDocument(userId: string){
        const generatedText = await this.generateDocument();
    }
    static async SaveDocument(userId: string, generatedText: string, description: string): Promise<SaveDocumentResult> {
        const filename = `GeneratedDocument-${generateFileName()}.docx`;
        const buffer = await EssayGenerator.createWordDocumentBuffer(generatedText);

        const url = await EssayGenerator.uploadBufferToS3(buffer, filename);
        const {id, name} = await EssayGenerator.saveToDatabase(userId, url, generatedText, filename, description);

        return {status: 'ok', body: { url, documentId: id, documentName: name, generatedText }};
    }

    private async generateDocument(): Promise<string> {
        const prompt = this.createPrompt();

        try {
            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY_35 || '' });
            const response = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: "You are a helpful writer whose job is to create draft documents for job applications, including cover letters, technical core equalification, or executive core qualification essays. Your writing style show prefer showing over telling, and should be concise and very action oriented, while also providing a narrative that ties elements together conhesively." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.6
            });

            const documentText = response.choices[0]?.message?.content?.trim() ?? "No response generated.";
            return documentText;
        } catch (error) {
            console.error("Error in document generation:", error);
            throw error;
        }
    }

    private static async createWordDocumentBuffer(generatedText: string): Promise<Buffer> {
        const doc = new Document({
            sections: [{
                properties: {},
                children: generatedText.split('\n').map(paragraphText => 
                    new Paragraph({ children: [new TextRun(paragraphText)] }),
                ),
            }],
        });

        return await Packer.toBuffer(doc);
    }

    private static async uploadBufferToS3(buffer: Buffer, filename: string): Promise<string> {
        const s3Client = new S3Client({
            region: process.env.AWS_BUCKET_REGION!,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_PROD!,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
            },
        });
        const bucket = process.env.AWS_BUCKET_NAME!;
        const s3Key = `${filename}`;

        const uploadParams = {
            Bucket: bucket,
            Key: s3Key,
            Body: buffer,
            ContentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        };

        await s3Client.send(new PutObjectCommand(uploadParams));
        return `https://${bucket}.s3.${process.env.AWS_BUCKET_REGION}.amazonaws.com/${s3Key}`;
    }
    private static async saveToDatabase(userId: string, url: string, content: string, filename: string, description: string): Promise<{id: number, name: string}> {
        const result = await db
            .insert(documentsTable)
            .values({
                userId: userId,
                type: 'ecq',
                source: 'APPLICATION_GENERATED', // Assuming this is a constant for generated types
                url: url,
                content: content,
                name: filename,
                description: description, // Or any other description as needed
                isParsed: true, // Set true if the document is considered parsed already
                data: {}, // Additional data if needed
            })
            .returning();
        if (!result || result.length !== 1)
            throw new Error("Error saving object to database")

        return {id: result[0].id, name: result[0].name} ;
    }

}

function generateFileName(): string {
    const now = new Date();
    const month = (now.getMonth() + 1).toString().padStart(2, '0'); // getMonth() is 0-indexed
    const day = now.getDate().toString().padStart(2, '0');
    const year = now.getFullYear().toString().substring(2);
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');

    return `${month}-${day}-${year}-${hours}-${minutes}-${seconds}`;
}
