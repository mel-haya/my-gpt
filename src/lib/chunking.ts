import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

export const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 500, // Reduced from 500 to be safer
  chunkOverlap: 30,
  separators: ["\n\n", "\n", " ", ""], // Better separators
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
