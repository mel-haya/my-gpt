import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

export const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 200,
  chunkOverlap: 20,
  separators: [" "],
});

export async function chunkContent(content: string): Promise<string[]> {
  const chunks = await textSplitter.splitText(content);
  return chunks;
}
