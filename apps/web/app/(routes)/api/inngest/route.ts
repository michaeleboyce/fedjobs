import { serve } from 'inngest/next';
import { inngest } from '@/app/_inngest/client';
import { createBuildResumeJSONJob } from '@/app/_inngest/functions';

// Create an API that serves zero functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    createBuildResumeJSONJob
  ],
});