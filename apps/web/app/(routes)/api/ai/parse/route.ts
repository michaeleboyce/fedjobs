import { OpenAIStream, StreamingTextResponse } from 'ai';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { db, eq } from "@/app/_db";
import { parsings as parsingsTable } from '@/app/_db/schema/parsings';
import parseDocument from '@/app/defer/parseDocument';
import { Document } from '@/app/_db/schema/documents';


// IMPORTANT! Set the runtime to edge
export const runtime = 'edge';


export async function POST(req: Request): Promise<Response> {
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
  const doc: Document = await req.json();
  await parseDocument(doc.content, doc.id, doc.userId);

  //TODO: Need to unify return responses
  return Response.json(
    {status: 'ok',
    message: 'Parse started.'})
}


// export async function GET(req: Request): Promise<Response> {
//   // Extract the `prompt` from the body of the request
//   const { isAuthenticated, getUser } = await getKindeServerSession();
//   if (!(await isAuthenticated())) {
//     return Response.json({
//       status: 'error',
//       message: 'Could not authenticate'
//     })
//   };
//   const user = await getUser();
//   if (!user) {
//     return Response.json({
//       status: 'error',
//       message: 'Could not find user'
//     })
//   }
//   const documentId: number  = await req.json();
//   const parsings = await db
//     .select()
//     .from(parsingsTable)
//     .where(eq(parsingsTable.documentId, documentId));

//   if (parsings.length !== 0){
//     return Response.json({
//       status: 'error',
//       message: `Returned ${parsings.length} parsings`
//     })
//   }
//   const parsing = parsings[0];
//   if (parsing.isComplete){
//     return Response.json({
//       status : 'complete',
//       percent: 100,
//       message: 'Successfully completed' 
//     });
//   } else {
//     return Response.json({
//       status: 'pending',
//       percent: parsing.analysisPercent,
//       message: 'Analysis in progress'
//     });
//   }
// }

