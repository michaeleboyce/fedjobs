// File path: apps/web/app/(routes)/api/ai/generate/cover_letter/paragraph/route.ts
import { NextRequest} from 'next/server';
import { CoverLetterGenerator } from '@/app/_classes/_generationClasses/CoverLetterGenerator';
import { callApi } from '../../(utils)/callApi';

export const runtime = 'nodejs';


export async function POST(request: NextRequest){
    return callApi(request, (generationSelection) => new CoverLetterGenerator(generationSelection), true);
}
