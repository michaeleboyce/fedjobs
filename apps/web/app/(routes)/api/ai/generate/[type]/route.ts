// File path: apps/web/app/(routes)/api/ai/generate/[type]/route.ts
import { NextRequest } from 'next/server';
import { callApi } from '../(utils)/callApi';

// Import all generators
import { ECQGenerator } from '@/app/features/generation/generators/ECQGenerator';
import { TCQGenerator } from '@/app/features/generation/generators/TCQGenerator';
import { CoverLetterGenerator } from '@/app/features/generation/generators/CoverLetterGenerator';
import { ResumeGenerator } from '@/app/features/generation/generators/ResumeGenerator';
import { OtherGenerator } from '@/app/features/generation/generators/OtherGenerator';
import { DocumentType } from '@fedjobs/types';

export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const returnedParams = await params; 
  const type = returnedParams.type as DocumentType; 
  
  // Map document types to their generator factories
  const generatorMap = {
    'ecq': (generationSelection: any) => {
      return new ECQGenerator(generationSelection.docInfo.ecqShortTitle, generationSelection);
    },
    'tcq': (generationSelection: any) => new TCQGenerator(generationSelection),
    'cover_letter': (generationSelection: any) => new CoverLetterGenerator(generationSelection),
    'resume': (generationSelection: any) => new ResumeGenerator(generationSelection),
    'other': (generationSelection: any) => new OtherGenerator(generationSelection),
  } as const;
  
  // Check if this is a paragraph regeneration route
  const isParagraph = request.url.includes('/paragraph');
  
  // Use the appropriate generator factory based on the type
  const generatorFactory = generatorMap[type];
  
  if (!generatorFactory) {
    return new Response(JSON.stringify({ error: `Unsupported document type: ${type}` }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  return callApi(request, generatorFactory, isParagraph);
}