import { z } from 'zod';
import type { getWeather } from './ai/tools/get-weather';
import type { createDocument } from './ai/tools/create-document';
import type { updateDocument } from './ai/tools/update-document';
import type { requestSuggestions } from './ai/tools/request-suggestions';
import type { listRepos } from './ai/tools/list-repos';
import type { listFiles } from './ai/tools/list-files';
import type { readFile } from './ai/tools/read-file';
import type { InferUITool, UIMessage } from 'ai';

import type { ArtifactKind } from '@/components/artifact';
import type { Suggestion } from './db/schema';
import type { listGoogleDriveFiles } from './ai/tools/list-google-drive-files';
import type { readGoogleDoc } from './ai/tools/read-google-doc';
import type { readGoogleSheet } from './ai/tools/read-google-sheet';

export type DataPart = { type: 'append-message'; message: string };

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

type weatherTool = InferUITool<typeof getWeather>;
type createDocumentTool = InferUITool<ReturnType<typeof createDocument>>;
type updateDocumentTool = InferUITool<ReturnType<typeof updateDocument>>;
type requestSuggestionsTool = InferUITool<
  ReturnType<typeof requestSuggestions>
>;
type listReposTool = InferUITool<typeof listRepos>;
type listFilesTool = InferUITool<typeof listFiles>;
type readFileTool = InferUITool<typeof readFile>;
type listGoogleDriveFilesTool = InferUITool<ReturnType<typeof listGoogleDriveFiles>>;
type readGoogleDocTool = InferUITool<ReturnType<typeof readGoogleDoc>>;
type readGoogleSheetTool = InferUITool<ReturnType<typeof readGoogleSheet>>;

export type ChatTools = {
  getWeather: weatherTool;
  createDocument: createDocumentTool;
  updateDocument: updateDocumentTool;
  requestSuggestions: requestSuggestionsTool;
  listRepos: listReposTool;
  listFiles: listFilesTool;
  readFile: readFileTool;
  listGoogleDriveFiles: listGoogleDriveFilesTool;
  readGoogleDoc: readGoogleDocTool;
  readGoogleSheet: readGoogleSheetTool;
};

export type CustomUIDataTypes = {
  textDelta: string;
  imageDelta: string;
  sheetDelta: string;
  codeDelta: string;
  suggestion: Suggestion;
  appendMessage: string;
  id: string;
  title: string;
  kind: ArtifactKind;
  clear: null;
  finish: null;
};

export type ChatMessage = UIMessage<
  MessageMetadata,
  CustomUIDataTypes,
  ChatTools
>;

export interface Attachment {
  name: string;
  url: string;
  contentType: string;
}
