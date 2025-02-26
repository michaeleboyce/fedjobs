// File path: apps/web/app/(routes)/api/ai/generate/[type]/paragraph/route.ts
import { NextRequest } from 'next/server';
import { callApi } from '../../(utils)/callApi';

// Import all generators
import { ECQGenerator } from '@/app/_classes/_generationClasses/ECQGenerator';
import { TCQGenerator } from '@/app/_classes/_generationClasses/TCQGenerator';
import { CoverLetterGenerator } from '@/app/_classes/_generationClasses/CoverLetterGenerator';
import { ResumeGenerator } from '@/app/_classes/_generationClasses/ResumeGenerator';
import { OtherGenerator } from '@/app/_classes/_generationClasses/OtherGenerator';
import { DocumentType } from '@fedjobs/types';

export const runtime = 'nodejs';
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params;
  
  // Map document types to their generator factories
  const generatorMap = {
    'ecq': (generationSelection: any) =>
      new ECQGenerator(generationSelection.docInfo.ecqShortTitle, generationSelection),
    'tcq': (generationSelection: any) => new TCQGenerator(generationSelection),
    'cover_letter': (generationSelection: any) => new CoverLetterGenerator(generationSelection),
    'resume': (generationSelection: any) => new ResumeGenerator(generationSelection),
    'other': (generationSelection: any) => new OtherGenerator(generationSelection),
  } as const;

  const generatorFactory = generatorMap[type as keyof typeof generatorMap];

  if (!generatorFactory) {
    return new Response(
      JSON.stringify({ error: `Unsupported document type: ${type}` }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return callApi(request, generatorFactory, true);
}
