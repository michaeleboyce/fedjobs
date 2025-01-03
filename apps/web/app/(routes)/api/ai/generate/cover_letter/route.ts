// File path: apps/web/app/(routes)/api/ai/generate/cover_letter/route.ts
import { CoverLetterGenerator } from '@/app/_classes/_generationClasses/CoverLetterGenerator';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { GenerationSelection } from '@/app/_types/GenerationSelection';
import { callAndStreamAIResponse } from '../(utils)/callAndStream';
import { callApi } from '../(utils)/callApi';

export const runtime = 'nodejs';

export async function POST(request: NextRequest){
    return callApi(request, (generationSelection) => new CoverLetterGenerator(generationSelection), false);
}