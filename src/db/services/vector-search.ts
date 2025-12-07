/**
 * Vector Search Service
 * Handles embeddings generation and semantic search in MongoDB
 */

import axios from 'axios';
import { CheckpointModel, ICheckpoint } from '../models/checkpoint';

export interface VectorSearchResult {
  checkpoint: ICheckpoint;
  score: number;
}

export class VectorSearchService {
  private embeddingProvider: 'openai' | 'local';

  constructor(embeddingProvider: 'openai' | 'local' = 'openai') {
    this.embeddingProvider = embeddingProvider;
  }

  /**
   * Generate embedding vector for text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (this.embeddingProvider === 'openai') {
      return await this.generateOpenAIEmbedding(text);
    } else {
      return await this.generateLocalEmbedding(text);
    }
  }

  /**
   * Generate embedding using OpenAI API
   */
  private async generateOpenAIEmbedding(text: string): Promise<number[]> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required for embeddings');
    }

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/embeddings',
        {
          model: 'text-embedding-3-small',
          input: text,
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.data[0].embedding;
    } catch (error: any) {
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }

  /**
   * Generate embedding using local model
   */
  private async generateLocalEmbedding(text: string): Promise<number[]> {
    // Placeholder for local embedding model
    // Could use sentence-transformers via Python bridge or ONNX runtime
    const endpoint = process.env.EMBEDDING_ENDPOINT || 'http://localhost:8001/embeddings';

    try {
      const response = await axios.post(endpoint, {
        text,
      });

      return response.data.embedding;
    } catch (error: any) {
      throw new Error(`Failed to generate local embedding: ${error.message}`);
    }
  }

  /**
   * Perform semantic search using MongoDB Atlas Vector Search
   */
  async semanticSearch(
    query: string,
    userId: string,
    options: {
      limit?: number;
      sessionId?: string;
      minScore?: number;
    } = {}
  ): Promise<VectorSearchResult[]> {
    const { limit = 10, sessionId, minScore = 0.7 } = options;

    // Generate query embedding
    const queryEmbedding = await this.generateEmbedding(query);

    // Build aggregation pipeline for vector search
    const pipeline: any[] = [
      {
        $vectorSearch: {
          index: 'checkpoint_vector_index',
          path: 'questionEmbedding',
          queryVector: queryEmbedding,
          numCandidates: 100,
          limit: limit * 2, // Get more candidates for filtering
        },
      },
      {
        $addFields: {
          score: { $meta: 'vectorSearchScore' },
        },
      },
      {
        $match: {
          userId,
          ...(sessionId && { sessionId }),
          score: { $gte: minScore },
        },
      },
      {
        $limit: limit,
      },
      {
        $project: {
          questionEmbedding: 0,
          answerEmbedding: 0,
        },
      },
    ];

    try {
      const results = await CheckpointModel.aggregate(pipeline);

      return results.map((doc) => ({
        checkpoint: doc as ICheckpoint,
        score: doc.score,
      }));
    } catch (error: any) {
      // Fallback to text search if vector search is not available
      console.warn('Vector search failed, falling back to text search:', error.message);
      return await this.textSearchFallback(query, userId, { limit, sessionId });
    }
  }

  /**
   * Fallback text search when vector search is unavailable
   */
  private async textSearchFallback(
    query: string,
    userId: string,
    options: {
      limit?: number;
      sessionId?: string;
    } = {}
  ): Promise<VectorSearchResult[]> {
    const { limit = 10, sessionId } = options;

    const filter: any = {
      userId,
      $text: { $search: query },
    };

    if (sessionId) {
      filter.sessionId = sessionId;
    }

    const results = await CheckpointModel.find(filter, {
      score: { $meta: 'textScore' },
    })
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit)
      .select('-questionEmbedding -answerEmbedding');

    return results.map((doc) => ({
      checkpoint: doc,
      score: (doc as any).score || 0,
    }));
  }

  /**
   * Store checkpoint with embeddings
   */
  async storeCheckpointWithEmbeddings(
    checkpointData: Partial<ICheckpoint>
  ): Promise<ICheckpoint> {
    // Generate embeddings for question and answer
    const questionEmbedding = await this.generateEmbedding(checkpointData.question || '');
    const answerEmbedding = await this.generateEmbedding(checkpointData.answer || '');

    // Create checkpoint with embeddings
    const checkpoint = new CheckpointModel({
      ...checkpointData,
      questionEmbedding,
      answerEmbedding,
    });

    await checkpoint.save();

    // Return without embedding fields
    return await CheckpointModel.findById(checkpoint._id).select(
      '-questionEmbedding -answerEmbedding'
    ) as ICheckpoint;
  }

  /**
   * Find similar checkpoints
   */
  async findSimilar(
    checkpointId: string,
    limit: number = 5
  ): Promise<VectorSearchResult[]> {
    // Get the checkpoint
    const checkpoint = await CheckpointModel.findOne({ checkPointId: checkpointId }).select(
      '+questionEmbedding'
    );

    if (!checkpoint || !checkpoint.questionEmbedding) {
      throw new Error('Checkpoint not found or has no embedding');
    }

    // Search using the checkpoint's embedding
    const pipeline: any[] = [
      {
        $vectorSearch: {
          index: 'checkpoint_vector_index',
          path: 'questionEmbedding',
          queryVector: checkpoint.questionEmbedding,
          numCandidates: 50,
          limit: limit + 1, // +1 to exclude the checkpoint itself
        },
      },
      {
        $addFields: {
          score: { $meta: 'vectorSearchScore' },
        },
      },
      {
        $match: {
          checkPointId: { $ne: checkpointId }, // Exclude the source checkpoint
        },
      },
      {
        $limit: limit,
      },
      {
        $project: {
          questionEmbedding: 0,
          answerEmbedding: 0,
        },
      },
    ];

    const results = await CheckpointModel.aggregate(pipeline);

    return results.map((doc) => ({
      checkpoint: doc as ICheckpoint,
      score: doc.score,
    }));
  }
}
