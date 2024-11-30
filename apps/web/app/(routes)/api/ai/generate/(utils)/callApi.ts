import { CoverLetterGenerator } from '@/app/_classes/_generationClasses/CoverLetterGenerator';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { GenerationSelection } from '@/app/_types/GenerationSelection';
import { callAndStreamAIResponse } from '../(utils)/callAndStream';
import { StreamingTextArray } from '@/app/_types/StreamingTextArray';
import { EssayGenerator } from '@/app/_classes/_generationClasses/EssayGenerator';

export const runtime = 'edge';

export async function callApi(request: NextRequest, createEssayGenerator: (generationSelection: GenerationSelection) => EssayGenerator, isParagraph: boolean){
    // Extract the `prompt` from the body of the request
    const { isAuthenticated, getUser } = await getKindeServerSession();
    //TODO: Make next response.error meaningful
    if (!(await isAuthenticated())) return NextResponse.error();
    const user = await getUser();
    if (!(user)) return NextResponse.error();
    const { generationSelection, streamingTextArray, paragraphId, regenerationText}: { 
        generationSelection: GenerationSelection,
        streamingTextArray: StreamingTextArray,
        paragraphId: number,
        regenerationText: string
    } = await request.json();    
    let prompt: string;
    let generator = createEssayGenerator(generationSelection);
    if (isParagraph){
        prompt = generator.createParagraphPrompt(
            paragraphId,
            regenerationText,
            streamingTextArray,
            );
    } else {
        prompt = generator.createPrompt();
    }
    return await callAndStreamAIResponse(
        prompt,
        user.id,
        generator.documentType,
        isParagraph,
        0.2,
        4096 
    );
}
