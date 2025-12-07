/**
 * Checkpoint Repository with Vector Search Support
 */

import { CheckpointModel, ICheckpoint } from '../models/checkpoint';
import { Checkpoint } from '../../shared/types/checkpoint';
import { VectorSearchService, VectorSearchResult } from '../services/vector-search';

export class CheckpointRepository {
  private vectorSearch: VectorSearchService;

  constructor() {
    this.vectorSearch = new VectorSearchService('openai');
  }

  async create(checkpoint: Checkpoint): Promise<ICheckpoint> {
    // Use vector search service to create with embeddings
    return await this.vectorSearch.storeCheckpointWithEmbeddings(checkpoint);
  }

  async findById(checkPointId: string): Promise<ICheckpoint | null> {
    return await CheckpointModel.findOne({ checkPointId }).select(
      '-questionEmbedding -answerEmbedding'
    );
  }

  async findBySession(sessionId: string): Promise<ICheckpoint[]> {
    return await CheckpointModel.find({ sessionId })
      .sort({ createTimeStamp: -1 })
      .select('-questionEmbedding -answerEmbedding');
  }

  async findByUser(userId: string, limit: number = 50): Promise<ICheckpoint[]> {
    return await CheckpointModel.find({ userId })
      .sort({ createTimeStamp: -1 })
      .limit(limit)
      .select('-questionEmbedding -answerEmbedding');
  }

  async update(checkPointId: string, updates: Partial<Checkpoint>): Promise<ICheckpoint | null> {
    return await CheckpointModel.findOneAndUpdate({ checkPointId }, updates, {
      new: true,
    }).select('-questionEmbedding -answerEmbedding');
  }

  async delete(checkPointId: string): Promise<boolean> {
    const result = await CheckpointModel.deleteOne({ checkPointId });
    return result.deletedCount > 0;
  }

  /**
   * Semantic search across checkpoints
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
    return await this.vectorSearch.semanticSearch(query, userId, options);
  }

  /**
   * Find similar checkpoints to a given checkpoint
   */
  async findSimilar(checkpointId: string, limit: number = 5): Promise<VectorSearchResult[]> {
    return await this.vectorSearch.findSimilar(checkpointId, limit);
  }

  /**
   * Search checkpoints by text (fallback when vector search unavailable)
   */
  async textSearch(
    query: string,
    userId: string,
    options: {
      limit?: number;
      sessionId?: string;
    } = {}
  ): Promise<ICheckpoint[]> {
    const { limit = 10, sessionId } = options;

    const filter: any = {
      userId,
      $text: { $search: query },
    };

    if (sessionId) {
      filter.sessionId = sessionId;
    }

    return await CheckpointModel.find(filter, {
      score: { $meta: 'textScore' },
    })
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit)
      .select('-questionEmbedding -answerEmbedding');
  }
}
