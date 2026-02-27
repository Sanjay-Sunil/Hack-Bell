import type { DetectedEntity, OCRWord, PIIType } from '../types';

interface GeminiSensitiveItem {
    text: string;
    category: string;
}

// Maps Gemini-returned category strings to our internal PIIType
const CATEGORY_MAP: Record<string, PIIType> = {
    'name': 'NAME',
    'person': 'NAME',
    'full name': 'NAME',
    'person name': 'NAME',
    'first name': 'NAME',
    'last name': 'NAME',
    'phone': 'PHONE',
    'phone number': 'PHONE',
    'mobile': 'PHONE',
    'mobile number': 'PHONE',
    'telephone': 'PHONE',
    'contact number': 'PHONE',
    'email': 'EMAIL',
    'email address': 'EMAIL',
    'address': 'ADDRESS',
    'location': 'ADDRESS',
    'residence': 'ADDRESS',
    'home address': 'ADDRESS',
    'aadhaar': 'AADHAAR',
    'aadhar': 'AADHAAR',
    'uid': 'AADHAAR',
    'aadhaar number': 'AADHAAR',
    'pan': 'PAN',
    'pan number': 'PAN',
    'permanent account number': 'PAN',
    'credit card': 'CREDIT_CARD',
    'card number': 'CREDIT_CARD',
    'debit card': 'CREDIT_CARD',
    'dob': 'DOB',
    'date of birth': 'DOB',
    'birth date': 'DOB',
    'birthday': 'DOB',
    'medical': 'MEDICAL',
    'health': 'MEDICAL',
    'diagnosis': 'MEDICAL',
    'disease': 'MEDICAL',
    'medication': 'MEDICAL',
    'medical condition': 'MEDICAL',
    'prescription': 'MEDICAL',
};

function mapCategory(category: string): PIIType {
    const lower = (category ?? '').toLowerCase().trim();
    return CATEGORY_MAP[lower] ?? 'SENSITIVE';
}

/**
 * Finds the bounding box for a sensitive string by matching it against
 * the sequence of OCR words. Tries exact sequential match, then fuzzy.
 */
function findBBoxForString(
    sensitiveText: string,
    words: OCRWord[],
    pageIndex: number
): DetectedEntity['bbox'] | null {
    const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

    const needleTokens = sensitiveText.trim().split(/\s+/);
    const needleCleaned = needleTokens.map(clean);

    // Sequential window match
    for (let i = 0; i <= words.length - needleTokens.length; i++) {
        const slice = words.slice(i, i + needleTokens.length);
        const match = slice.every((w, j) => clean(w.text) === needleCleaned[j]);

        if (match) {
            const firstW = slice[0];
            const lastW = slice[slice.length - 1];
            return {
                x: firstW.bbox.x,
                y: Math.min(...slice.map(w => w.bbox.y)),
                w: (lastW.bbox.x + lastW.bbox.w) - firstW.bbox.x,
                h: Math.max(...slice.map(w => w.bbox.y + w.bbox.h)) -
                    Math.min(...slice.map(w => w.bbox.y)),
                pageIndex,
            };
        }
    }

    // Single-word fallback
    if (needleTokens.length === 1) {
        const target = needleCleaned[0];
        const word = words.find(w => clean(w.text) === target);
        if (word) return { ...word.bbox, pageIndex };
    }

    // Partial match: find first token, then span to as many consecutive matching tokens as possible
    const firstTarget = needleCleaned[0];
    for (let i = 0; i < words.length; i++) {
        if (clean(words[i].text) !== firstTarget) continue;

        let j = 1;
        while (j < needleCleaned.length && i + j < words.length &&
            clean(words[i + j].text) === needleCleaned[j]) {
            j++;
        }

        // Accept if we matched at least half the tokens
        if (j >= Math.ceil(needleCleaned.length / 2)) {
            const slice = words.slice(i, i + j);
            const firstW = slice[0];
            const lastW = slice[slice.length - 1];
            return {
                x: firstW.bbox.x,
                y: Math.min(...slice.map(w => w.bbox.y)),
                w: (lastW.bbox.x + lastW.bbox.w) - firstW.bbox.x,
                h: Math.max(...slice.map(w => w.bbox.y + w.bbox.h)) -
                    Math.min(...slice.map(w => w.bbox.y)),
                pageIndex,
            };
        }
    }

    return null;
}

/**
 * Calls Gemini 1.5 Flash to detect all sensitive information in the OCR text.
 * Returns DetectedEntity[] with Tesseract bounding boxes mapped in.
 */
export async function runGeminiDetection(
    fullText: string,
    words: OCRWord[],
    apiKey: string,
    pageIndex: number = 0,
    onProgress?: (msg: string) => void
): Promise<DetectedEntity[]> {
    if (!apiKey || !fullText.trim()) return [];

    onProgress?.('Analyzing with Gemini AI...');

    const prompt = `You are a PII (Personally Identifiable Information) detection system. Analyze the following document text and identify ALL sensitive or private information that should be redacted.

Return ONLY a valid JSON array. Each item must have:
- "text": the EXACT text as it appears in the document (copy it verbatim)
- "category": one of: name, phone, email, address, aadhaar, pan, credit card, dob, medical — or a brief description if none fit

Do NOT include any explanation or markdown. Return raw JSON array only.

Document text:
"""
${fullText}
"""

Example output: [{"text":"Rahul Sharma","category":"name"},{"text":"9876543210","category":"phone"},{"text":"AB12C3456D","category":"pan"}]`;

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.1,
                    topP: 0.8,
                    maxOutputTokens: 2048,
                },
            }),
        }
    );

    if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`Gemini API error ${response.status}: ${errText || response.statusText}`);
    }

    const data = await response.json();
    const raw: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    // Extract JSON array from response (handles markdown code fences too)
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    let items: GeminiSensitiveItem[] = [];
    try {
        items = JSON.parse(jsonMatch[0]);
    } catch {
        console.warn('Gemini returned invalid JSON:', raw);
        return [];
    }

    const entities: DetectedEntity[] = [];
    const seenTexts = new Set<string>();

    for (const item of items) {
        if (!item.text || typeof item.text !== 'string') continue;
        const key = item.text.trim().toLowerCase();
        if (seenTexts.has(key)) continue;
        seenTexts.add(key);

        const type = mapCategory(item.category ?? '');
        const bbox = findBBoxForString(item.text.trim(), words, pageIndex);

        // If we can't locate it in OCR words, skip (can't redact without coords)
        if (!bbox) continue;

        entities.push({
            id: 'gem_' + crypto.randomUUID().substring(0, 8),
            type,
            value: item.text.trim(),
            confidence: 0.9,
            bbox,
            masked: true,
            layer: 2,
        });
    }

    return entities;
}
