import { sql} from "drizzle-orm";
import { db, eq } from "../index";
import { documents as documentsTable } from "../schema/documents";

export const preparedDocsByUserId = db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.userId, sql.placeholder('id')))
    .prepare('get_docs_by_user_id');

export const preparedDocsById = db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.id, sql.placeholder('id')))
    .prepare('get_docs_by_id');
    
export type Result = Awaited<ReturnType<typeof preparedDocsByUserId.execute>>[0];
export type IdResult = Awaited<ReturnType<typeof preparedDocsById.execute>>[0];

