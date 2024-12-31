// File path: apps/web/app/(routes)/api/ai/generate/ecq/route.ts
import { ECQGenerator } from '@/app/_classes/_generationClasses/ECQGenerator';
import { NextRequest} from 'next/server';
import { callApi } from '../(utils)/callApi';
import { GenerationSelection } from '@/app/_types/GenerationSelection';

export const runtime = 'edge';
export async function POST(request: NextRequest){
    return callApi(request, (generationSelection) => {
        const selection: GenerationSelection = generationSelection
        return new ECQGenerator(selection.docInfo.ecqShortTitle, selection);
    }, false);
}