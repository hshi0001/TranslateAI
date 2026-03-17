export type BlueprintSectionKey =
  | "ideaSummary"
  | "targetUsers"
  | "coreProblem"
  | "mvpFeatures"
  | "userFlow"
  | "techStack"
  | "projectStructure"
  | "developmentRoadmap"
  | "cursorPrompts";

export interface Blueprint {
  id: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  rawIdea: string;
  content: string;
}

export interface BlueprintVersion extends Blueprint {
  changesSummary?: string;
  label?: string; // human-readable version name, e.g. "v2 – Simplified MVP"
}

export interface Idea {
  id: string;
  label: string;
  createdAt: string;
  updatedAt: string;
  versions: BlueprintVersion[];
}

export interface AppState {
  currentIdeaId?: string;
  ideas: Idea[];
}

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

