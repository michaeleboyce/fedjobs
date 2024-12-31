// File path: apps/web/app/(routes)/api/ai/generate/other/paragraph/route.ts
import { NextRequest} from 'next/server';
import { callApi } from '@/app/(routes)/api/ai/generate/(utils)/callApi';
import { OtherGenerator } from '@/app/_classes/_generationClasses/OtherGenerator';

export const runtime = 'edge';

export async function POST(request: NextRequest){
    return callApi(request, (generationSelection) => new OtherGenerator(generationSelection), false);
}
