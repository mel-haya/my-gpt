import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { generateEmbeddings } from "./embedding";

interface SemanticChunk {
  content: string;
  embedding: number[];
  startIndex: number;
  endIndex: number;
}

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 300, // Slightly larger base chunks for better semantic context
  chunkOverlap: 50,
  separators: ["\n\n", "\n", ". ", "! ", "? ", " ", ""],
});

/**
 * Calculate cosine similarity between two embedding vectors
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Merge semantically similar adjacent chunks using actual embeddings
 */
function mergeSemanticChunks(
  chunks: SemanticChunk[], 
  similarityThreshold: number = 0.5,
  maxChunkSize: number = 1000
): string[] {
  if (chunks.length <= 1) {
    return chunks.map(chunk => chunk.content);
  }
  
  const mergedChunks: string[] = [];
  let currentChunk = chunks[0];
  
  for (let i = 1; i < chunks.length; i++) {
    const similarity = cosineSimilarity(currentChunk.embedding, chunks[i].embedding);
    
    // Merge if similar and within size limit
    const potentialMerged = currentChunk.content + "\n" + chunks[i].content;
    
    if (similarity > similarityThreshold && potentialMerged.length <= maxChunkSize) {
      // Create merged chunk with averaged embedding
      const mergedEmbedding = currentChunk.embedding.map((val, idx) => 
        (val + chunks[i].embedding[idx]) / 2
      );
      
      currentChunk = {
        content: potentialMerged,
        embedding: mergedEmbedding,
        startIndex: currentChunk.startIndex,
        endIndex: chunks[i].endIndex,
      };
    } else {
      mergedChunks.push(currentChunk.content);
      currentChunk = chunks[i];
    }
  }
  
  // Don't forget the last chunk
  mergedChunks.push(currentChunk.content);
  
  return mergedChunks;
}

/**
 * Semantic chunking algorithm using real embeddings for better semantic understanding
 */
export async function chunkContent(content: string): Promise<string[]> {
  try {
    // Handle empty or very short content
    if (!content || content.trim().length < 100) {
      return content ? [content.trim()] : [];
    }
    
    // First pass: Create base chunks using recursive splitter
    const baseChunks = await textSplitter.splitText(content);
    
    if (baseChunks.length <= 1) {
      return baseChunks;
    }
    
    // Generate embeddings for all chunks
    console.log(`Generating embeddings for ${baseChunks.length} chunks...`);
    const embeddings = await generateEmbeddings(baseChunks);
    
    // Create semantic chunks with embeddings
    const semanticChunks: SemanticChunk[] = baseChunks.map((chunk, index) => ({
      content: chunk,
      embedding: embeddings[index],
      startIndex: index,
      endIndex: index,
    }));
    
    // Merge semantically similar chunks using embedding similarity
    const finalChunks = mergeSemanticChunks(semanticChunks, 0.6, 1000);
    
    // Ensure no chunk is too small (unless it's the only one)
    const filteredChunks = finalChunks.filter((chunk) => 
      chunk.trim().length >= 50 || finalChunks.length === 1
    );
    
    console.log(`Semantic chunking complete: ${baseChunks.length} → ${filteredChunks.length} chunks`);
    return filteredChunks.length > 0 ? filteredChunks : baseChunks;
    
  } catch (error) {
    console.error("Error during semantic text chunking:", error);
    // Fallback to simple character-based chunking
    try {
      console.log("Falling back to character-based chunking...");
      const fallbackSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });
      return await fallbackSplitter.splitText(content);
    } catch (fallbackError) {
      console.error("Fallback chunking also failed:", fallbackError);
      return [];
    }
  }
}
