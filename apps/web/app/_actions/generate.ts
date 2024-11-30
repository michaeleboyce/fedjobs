// 'use server'

// import { Details } from '../_classes/Details';
// import { ECQGenerator } from '../_classes/_generationClasses/ECQGenerator';
// import { Organization } from '../_classes/Organization';
// import { Position, PositionObject } from '../_classes/Position';
// import { ResumeDate } from '../_classes/ResumeDate';
// import { Title } from '../_classes/Title';
// import { DUMMY_FULL_ECQ_URL, DUMMY_FULL_ECQ_TEXT, DUMMY_FULL_ECQ_DOC_ID, DUMMY_FULL_ECQ_FILENAME } from '../_utils/Constants';
// import { JobInfo } from '../_types/JobInfo';
// import { DOCUMENT_TYPES } from '../_utils/Constants';
// import { ECQNamesType } from '../_types/ECQCompetencies';
// import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
// import { SaveDocumentResult } from '../_classes/_generationClasses/EssayGenerator';

// //export const rumtime = 'edge';

// export type GenerationResponse = {
//     status: 'success',
//     generationSelection: GenerationResult

// } | {
//     status: 'error',
//     errorMessage: ErrorMessage
// }
// export interface ErrorMessage { 
//     error: string
// }

// export interface GenerationResult { url: string; documentId: number; documentName: string, generatedText: string;  };

// export interface GenerationSelection {
//     position: PositionObject,
//     selectedActivities: string[],
//     selectedAccomplishments: string[],
//     type: typeof DOCUMENT_TYPES[number]
//     ecqShortTitle: ECQNamesType | '',
//     otherText: string,
//     jobInfo: JobInfo
//     length: number 
// }


// export async function generate (
//     isDummy: boolean, 
//     generationSelection: GenerationSelection
//     ): Promise<GenerationResponse> {

//     const { getUser, isAuthenticated} = await getKindeServerSession();
//     if (!(await isAuthenticated())){
//     //TODO: refactor these into a standard Error Object
//         return {status: 'error',
//         errorMessage: {
//             error: "Not authenticated"
//         }};
//     }

//     const user = await getUser();
//     if (!user)
//         return {status: 'error',
//         errorMessage: {
//             error: "Not authenticated"
//         }};

//     if (isDummy) {
//         // If dummy data is requested, return the dummy ECQ text and filename directly

//         return {
//             status: 'success',
//             generationSelection: {
//                 generatedText: DUMMY_FULL_ECQ_TEXT,
//                 url: DUMMY_FULL_ECQ_URL,
//                 documentId: DUMMY_FULL_ECQ_DOC_ID,
//                 documentName: DUMMY_FULL_ECQ_FILENAME
//             }
//         };
//     }

//     const { 
//         position, 
//         selectedActivities, 
//         selectedAccomplishments, 
//         ecqShortTitle, 
//         otherText,
//         jobInfo, 
//         length } = generationSelection;
    
//         // Convert the received JSON data to Position and ECQ objects
//     const positionObj =  new Position(
//         new Organization(position.organization.name),
//         new Title(position.title.title),
//         new ResumeDate(position.date.startDate, position.date.endDate, position.date.present),
//         new Details(position.details.activities, position.details.accomplishments)
//     );

//     let ecqGenerator: ECQGenerator;
//     if (generationSelection.type === 'ecq' && ecqShortTitle !== ''){
//         ecqGenerator = new ECQGenerator(positionObj, selectedActivities, selectedAccomplishments, ecqShortTitle, jobInfo, length )
//     } else {
//         return {
//             status: 'success',
//             generationSelection: {
//                 generatedText: DUMMY_FULL_ECQ_TEXT,
//                 url: DUMMY_FULL_ECQ_URL,
//                 documentId: DUMMY_FULL_ECQ_DOC_ID,
//                 documentName: DUMMY_FULL_ECQ_FILENAME
//             }
//         };
//     }
//     try {
//         // Generate ECQ text
//         const ecqGenerationResult = await ecqGenerator.generateAndSaveDocument(user.id);
        
//         // Return ECQ text and link to the document
//         return {
//             status: 'success',
//             generationSelection: {
//                 generatedText: ecqGenerationResult.generatedText,
//                 url: ecqGenerationResult.url,
//                 documentId: ecqGenerationResult.documentId,
//                 documentName: ecqGenerationResult.documentName
//             }
//         };
//       } catch (error: any) {
//         if (!(error instanceof Error))
//         return {status: 'error',
//         errorMessage: {
//             error: "Unknown error"
//         }};

//         console.error("Error generating document:", error);
//         return {status: 'error',
//         errorMessage: {
//             error: "Error generating document"
//         }};
        
//     }
// }