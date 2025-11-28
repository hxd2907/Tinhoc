export enum Language {
  CPP = 'C++',
  PYTHON = 'Python'
}

export interface UploadedFile {
  name: string;
  type: string; // MIME type
  data: string; // Base64 data (without prefix for API, with prefix for preview)
  previewUrl: string;
}

export interface TestCase {
  input: string;
  output: string;
}

export interface SolutionResult {
  markdown: string; // Detailed explanation
  rawCode: string;  // Clean code
  testCases: TestCase[]; // List of 20 test cases
}

export enum AppState {
  IDLE,
  ANALYZING,
  SOLVED,
  ERROR
}