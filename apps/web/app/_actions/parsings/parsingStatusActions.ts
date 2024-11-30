'use server'
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { db, eq } from "@/app/_db";
import { parsings as parsingsTable } from '@/app/_db/schema/parsings';
import { ParseResponse } from '@/app/_types/ParseResponse';

export async function getParsingStatus(documentId: number): Promise<ParseResponse> {
    // Extract the `prompt` from the body of the request
    const { isAuthenticated, getUser } = await getKindeServerSession();
    if (!(await isAuthenticated())) {
      return {
        status: 'error',
        percent: 0,
        message: 'Could not authenticate'
      }
    };
    const user = await getUser();
    if (!user) {
      return {
        status: 'error',
        percent: 0,
        message: 'Could not find user'
      };
    }
    const parsings = await db
      .select()
      .from(parsingsTable)
      .where(eq(parsingsTable.documentId, documentId));
  
    if (parsings.length !== 1){
      return {
        status: 'error',
        percent: 0,
        message: `Returned ${parsings.length} parsings`
      }
    }
    const parsing = parsings[0];
    return parsing.isComplete ?
     {
        status : 'complete',
        percent: 100,
        message: 'Successfully completed' 
      } : 
      {
        status: 'pending',
        percent: parsing.analysisPercent,
        message: 'Analysis in progress'
      };
  }
  