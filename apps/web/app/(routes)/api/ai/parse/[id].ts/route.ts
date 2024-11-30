import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { db, eq } from "@/app/_db";
import { parsings as parsingsTable } from '@/app/_db/schema/parsings';

export async function GET({params } : {params: {id: number}}): Promise<Response> {
    // Extract the `prompt` from the body of the request
    const { isAuthenticated, getUser } = await getKindeServerSession();
    if (!(await isAuthenticated())) {
      return Response.json({
        status: 'error',
        message: 'Could not authenticate'
      })
    };
    const user = await getUser();
    if (!user) {
      return Response.json({
        status: 'error',
        message: 'Could not find user'
      })
    }
    const parsings = await db
      .select()
      .from(parsingsTable)
      .where(eq(parsingsTable.documentId, params.id));
  
    if (parsings.length !== 0){
      return Response.json({
        status: 'error',
        message: `Returned ${parsings.length} parsings`
      })
    }
    const parsing = parsings[0];
    if (parsing.isComplete){
      return Response.json({
        status : 'complete',
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
  