'use server';

import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { ParsingRepository } from '@fedjobs/database'; // Using the repository instead of direct DB calls
import { ParseResponse } from '@/app/features/documents/types/ParseResponse';

export async function getParsingStatus(documentId: number): Promise<ParseResponse> {
  // Retrieve the session and validate authentication
  const session = await getKindeServerSession();
  if (!(await session.isAuthenticated())) {
    return {
      status: 'error',
      percent: 0,
      message: 'Could not authenticate'
    };
  }
  const user = await session.getUser();
  if (!user) {
    return {
      status: 'error',
      percent: 0,
      message: 'Could not find user'
    };
  }
  
  // Use the ParsingRepository to retrieve parsing records by documentId
  const parsingRepo = new ParsingRepository();
  const parsings = await parsingRepo.getParsingsByDocumentId(documentId);

  if (parsings.length !== 1) {
    return {
      status: 'error',
      percent: 0,
      message: `Returned ${parsings.length} parsings`
    };
  }
  
  const parsing = parsings[0];
  return parsing.isComplete
    ? {
        status: 'complete',
        percent: 100,
        message: 'Successfully completed'
      }
    : {
        status: 'pending',
        percent: parsing.analysisPercent,
        message: 'Analysis in progress'
      };
}
