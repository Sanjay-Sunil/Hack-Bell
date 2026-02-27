import type { DetectedEntity, OCRWord } from '../types';
import { findAllRegexMatches } from './regex';
import { verhoeffValidate, luhnValidate, panValidate } from './checksums';

/**
 * Layer 1: Deterministic PII Detection
 * Runs regex matchers and validates with cryptographic checksums.
 * All matches are high-confidence (1.0 for checksum-validated).
 */
export function runLayer1Detection(
    fullText: string,
    words: OCRWord[],
    pageIndex: number = 0
): DetectedEntity[] {
    const regexMatches = findAllRegexMatches(fullText);
    const entities: DetectedEntity[] = [];

    for (const match of regexMatches) {
        let confidence = 0.85;
        let valid = true;

        switch (match.type) {
            case 'AADHAAR':
                valid = verhoeffValidate(match.value);
                confidence = valid ? 1.0 : 0.6;
                break;
            case 'CREDIT_CARD':
                valid = luhnValidate(match.value);
                confidence = valid ? 1.0 : 0.5;
                break;
            case 'PAN':
                valid = panValidate(match.value);
                confidence = valid ? 1.0 : 0.7;
                break;
            case 'PHONE':
                confidence = 0.9;
                break;
        }

        if (!valid && confidence < 0.5) continue;

        // Map text position to bounding boxes
        const bbox = mapTextToBBox(match.startIndex, match.endIndex, fullText, words, pageIndex);

        entities.push({
            id: 'l1_' + crypto.randomUUID().substring(0, 8),
            type: match.type,
            value: match.raw,
            confidence,
            bbox,
            masked: true,
            layer: 1,
        });
    }

    return entities;
}

/**
 * Maps a text range to an approximate bounding box from OCR words.
 */
function mapTextToBBox(
    startIdx: number,
    endIdx: number,
    fullText: string,
    words: OCRWord[],
    pageIndex: number
): DetectedEntity['bbox'] {
    // Build a position map for words
    let currentPos = 0;
    const matchingWords: OCRWord[] = [];

    for (const word of words) {
        const wordStart = fullText.indexOf(word.text, currentPos);
        const wordEnd = wordStart + word.text.length;

        if (wordEnd > startIdx && wordStart < endIdx) {
            matchingWords.push(word);
        }

        currentPos = wordEnd;
        if (wordStart > endIdx) break;
    }

    if (matchingWords.length === 0) {
        // Fallback: approximate position
        return { x: 0, y: 0, w: 100, h: 20, pageIndex };
    }

    const minX = Math.min(...matchingWords.map(w => w.bbox.x));
    const minY = Math.min(...matchingWords.map(w => w.bbox.y));
    const maxX = Math.max(...matchingWords.map(w => w.bbox.x + w.bbox.w));
    const maxY = Math.max(...matchingWords.map(w => w.bbox.y + w.bbox.h));

    return {
        x: minX,
        y: minY,
        w: maxX - minX,
        h: maxY - minY,
        pageIndex,
    };
}
