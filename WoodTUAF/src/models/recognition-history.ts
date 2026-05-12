export type RecognitionHistoryRecord = {
  id: string;
  recognizedAt: string;
  inputImageUri?: string | null;
  resultImagePath?: unknown;
  resultName: string;
  confidence?: number | null;
  extraInfo?: Record<string, unknown> | null;
};
