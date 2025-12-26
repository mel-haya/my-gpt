import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

export const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 500, // Adjusted chunk size to get more context per chunk
  chunkOverlap: 50, // Increased overlap for better context retention
  separators: ["\n\n", "\n", " ", ""],
});

export async function chunkContent(content: string): Promise<string[]> {
  try{
    const chunks = await textSplitter.splitText(content);
    return chunks;
  }
  catch(error){
    console.error("Error during text chunking:", error);
    return [];
  }
}
