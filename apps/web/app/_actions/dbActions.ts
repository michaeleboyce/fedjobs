'use server'
import { ResumeObject } from "../_classes/Resume";
import { db, eq } from "@/app/_db";
import { documents as documentsTable, Document} from "@/app/_db/schema/documents";
import { parsings as parsingsTable, Parsing } from "@/app/_db/schema/parsings"
//export const runtime = 'edge';

export async function updateDocWithResumeJSON(documentId: number, json: ResumeObject){
    const updatedId: {updatedId: number}[] = await db
        .update(documentsTable)
        .set({
            isParsed: true,
            data: json
        })
        .where(eq(documentsTable.id, documentId))
        .returning({updatedId: documentsTable.id})
        .execute();
    return updatedId;
}

export async function getParsingsByDocId(documentId: number){
    const parsings = await db
        .select()
        .from(parsingsTable)
        .where(eq(parsingsTable.documentId, documentId))
    return parsings;
}