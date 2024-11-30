import { NextRequest} from 'next/server';
import { CoverLetterGenerator } from '@/app/_classes/_generationClasses/CoverLetterGenerator';
import { callApi } from '../../(utils)/callApi';

export const runtime = 'edge';


export async function POST(request: NextRequest){
    return callApi(request, (generationSelection) => new CoverLetterGenerator(generationSelection), true);
}
