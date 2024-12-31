// File path: apps/web/app/(routes)/api/ai/generate/tcq/paragraph/route.ts
import { NextRequest} from 'next/server';
import { callApi } from '@/app/(routes)/api/ai/generate/(utils)/callApi';
import { TCQGenerator } from '@/app/_classes/_generationClasses/TCQGenerator';

export const runtime = 'edge';

export async function POST(request: NextRequest){
    return callApi(request, (GenerationSelection) => new TCQGenerator(GenerationSelection), true);
}
