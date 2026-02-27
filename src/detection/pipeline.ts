import type { DetectedEntity, OCRWord } from '../types';
import { runLayer1Detection } from './layer1';
import { WorkerPool } from '../workers/WorkerPool';

/**
 * Unified Detection Pipeline
 * Merges Layer 1 (deterministic) and Layer 2 (heuristic NER) results.
 * Deduplicates overlapping detections and filters by confidence threshold.
 */
export async function runDetectionPipeline(
    fullText: string,
    words: OCRWord[],
    workerPool: WorkerPool,
    confidenceThreshold: number = 0.5,
    requiredFields: string[] = [],
    pageIndex: number = 0
): Promise<DetectedEntity[]> {
    // Run Layer 1 synchronously (fast regex + checksums)
    const layer1Entities = runLayer1Detection(fullText, words, pageIndex);

    // Run Layer 2 via NLP worker (heuristic NER)
    let layer2Entities: DetectedEntity[] = [];
    try {
        layer2Entities = await workerPool.runNLP(fullText, words, pageIndex);
    } catch (err) {
        console.warn('Layer 2 NLP detection failed:', err);
    }

    // Merge results
    const allEntities = [...layer1Entities, ...layer2Entities];

    // Deduplicate overlapping detections (prefer higher confidence)
    const deduped = deduplicateEntities(allEntities);

    // Filter by confidence threshold
    const filtered = deduped.filter(e => e.confidence >= confidenceThreshold);

    // Mark required fields as unmasked
    for (const entity of filtered) {
        if (requiredFields.includes(entity.type)) {
            entity.masked = false;
        }
    }

    return filtered;
}

/**
 * Remove overlapping detections, keeping the one with higher confidence.
 */
function deduplicateEntities(entities: DetectedEntity[]): DetectedEntity[] {
    // Sort by confidence descending
    const sorted = [...entities].sort((a, b) => b.confidence - a.confidence);
    const result: DetectedEntity[] = [];

    for (const entity of sorted) {
        const overlaps = result.some(existing =>
            existing.bbox.pageIndex === entity.bbox.pageIndex &&
            boxesOverlap(existing.bbox, entity.bbox, 0.5)
        );

        if (!overlaps) {
            result.push(entity);
        }
    }

    return result;
}

/**
 * Check if two bounding boxes overlap by more than the given threshold.
 */
function boxesOverlap(
    a: DetectedEntity['bbox'],
    b: DetectedEntity['bbox'],
    threshold: number
): boolean {
    const overlapX = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
    const overlapY = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
    const overlapArea = overlapX * overlapY;
    const minArea = Math.min(a.w * a.h, b.w * b.h);

    return minArea > 0 && overlapArea / minArea > threshold;
}
