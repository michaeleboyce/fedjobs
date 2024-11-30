import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { db, eq } from "@/app/_db";
import { parsings as parsingsTable } from '@/app/_db/schema/parsings';
import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }  // Note: URL params are always strings
): Promise<Response> {
    const id = parseInt(params.id); // Convert string to number
    
    const { isAuthenticated, getUser } = await getKindeServerSession();
    if (!(await isAuthenticated())) {
      return Response.json({
        status: 'error',
        message: 'Could not authenticate'
      });
    }

    const user = await getUser();
    if (!user) {
      return Response.json({
        status: 'error',
        message: 'Could not find user'
      });
    }

    const parsings = await db
      .select()
      .from(parsingsTable)
      .where(eq(parsingsTable.documentId, id));
  
    if (parsings.length === 0) {  // Fixed the logic here - was checking for !== 0
      return Response.json({
        status: 'error',
        message: `No parsings found`
      });
    }

    const parsing = parsings[0];
    if (parsing.isComplete) {
      return Response.json({
        status: 'complete',
        percent: 100,
        message: 'Successfully completed' 
      });
    } else {
      return Response.json({
        status: 'pending',
        percent: parsing.analysisPercent,
        message: 'Analysis in progress'
      });
    }
}