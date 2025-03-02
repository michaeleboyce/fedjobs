// File path: apps/web/app/features/generation/types/index.ts
export * from './DocumentInfo';
export * from './ECQCompetencies';
export * from './GeneratedDocumentInformation';
export * from './GenerationSelection';
export * from './StreamingTextArray';

export type PositionSelectionState = Record<string, {
    selectedActivities: number[];
    selectedAccomplishments: number[]
}>;