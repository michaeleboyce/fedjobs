// File path: apps/web/app/(routes)/api/ai/generate/ecq/paragraph/route.ts
import { ECQGenerator } from '@/app/_classes/_generationClasses/ECQGenerator';
import { NextRequest} from 'next/server';
import { callApi } from '../../(utils)/callApi';

export const runtime = 'edge';

export async function POST(request: NextRequest){
    return callApi(request, (generationSelection) => {
        const {ecqShortTitle} = generationSelection.docInfo;
        return new ECQGenerator(ecqShortTitle, generationSelection);
    }, true);
}