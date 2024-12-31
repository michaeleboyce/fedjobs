// File path: packages/types/src/ECQCompetencies.ts
export type ECQCompetency = {
  title: string;
  shortTitle: string;
  definition: string;
  attributes: {
    title: string;
    description: string;
  }[];
  essays: string[];
};

export type ECQNamesType =
  | "Leading Change"
  | "Leading People"
  | "Results Driven"
  | "Business Acumen"
  | "Building Coalitions";

export type ECQNamesTypeWithEmptyString = ECQNamesType | "";
