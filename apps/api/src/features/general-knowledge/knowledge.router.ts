import { Hono } from 'hono';
import { embedKnowledge } from './knowledge.controller';

export const KnowledgeRouter = new Hono();

// POST /api/knowledge/embed - Add general financial knowledge with embeddings
KnowledgeRouter.post('/embed', embedKnowledge);