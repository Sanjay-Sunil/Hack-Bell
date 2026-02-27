// ─── NLP Worker: Heuristic NER Engine ───────────────────────────────────────

interface BBox {
    x: number;
    y: number;
    w: number;
    h: number;
    pageIndex: number;
}

interface OCRWordInput {
    text: string;
    confidence: number;
    bbox: BBox;
}

interface EntityResult {
    id: string;
    type: string;
    value: string;
    confidence: number;
    bbox: BBox;
    masked: boolean;
    layer: 2;
}

// ─── Dictionaries ───────────────────────────────────────────────────────────

const COMMON_FIRST_NAMES = new Set([
    'aarav', 'aditi', 'aditya', 'akash', 'amit', 'amita', 'ananya', 'anil', 'anita', 'anjali',
    'ankita', 'arjun', 'arun', 'aruna', 'ashok', 'bhavna', 'chandra', 'deepak', 'deepika', 'dev',
    'devika', 'dhruv', 'dinesh', 'divya', 'ganesh', 'gaurav', 'geeta', 'hari', 'harish', 'indira',
    'isha', 'jagdish', 'kamala', 'karan', 'kavita', 'kishore', 'krishna', 'kumar', 'lakshmi', 'mahesh',
    'manish', 'meera', 'mohan', 'mohit', 'nandini', 'naresh', 'neha', 'nikhil', 'nisha', 'pankaj',
    'pooja', 'prakash', 'priya', 'rahul', 'rajesh', 'rajiv', 'raman', 'ramesh', 'rani', 'ravi',
    'rekha', 'rohit', 'sachin', 'sandeep', 'sanjay', 'sapna', 'saroj', 'seema', 'shanti', 'sharma',
    'shivani', 'shobha', 'shreya', 'sita', 'sneha', 'sunil', 'sunita', 'suresh', 'swati', 'tanvi',
    'usha', 'varun', 'vijay', 'vikram', 'vinod', 'vishal', 'vivek', 'yash', 'yogesh',
    'john', 'james', 'robert', 'michael', 'william', 'david', 'richard', 'joseph', 'thomas', 'charles',
    'mary', 'patricia', 'jennifer', 'linda', 'elizabeth', 'barbara', 'susan', 'jessica', 'sarah', 'karen',
    'mohammed', 'ahmed', 'ali', 'hassan', 'hussein', 'omar', 'fatima', 'aisha', 'zainab', 'khadija',
]);

const COMMON_LAST_NAMES = new Set([
    'sharma', 'verma', 'gupta', 'singh', 'kumar', 'patel', 'joshi', 'mishra', 'agarwal', 'mehta',
    'reddy', 'rao', 'nair', 'menon', 'pillai', 'iyer', 'iyengar', 'mukherjee', 'chatterjee', 'banerjee',
    'das', 'bose', 'sen', 'ghosh', 'roy', 'dutta', 'sinha', 'jain', 'shah', 'desai',
    'kulkarni', 'patil', 'deshpande', 'kaur', 'gill', 'bajwa', 'chopra', 'kapoor', 'malhotra', 'khanna',
    'saxena', 'pandey', 'tiwari', 'dubey', 'trivedi', 'dwivedi', 'shukla', 'chauhan', 'yadav', 'thakur',
    'smith', 'johnson', 'williams', 'brown', 'jones', 'davis', 'miller', 'wilson', 'moore', 'taylor',
]);

const INDIAN_STATES = new Set([
    'andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh', 'goa', 'gujarat',
    'haryana', 'himachal pradesh', 'jharkhand', 'karnataka', 'kerala', 'madhya pradesh',
    'maharashtra', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 'odisha', 'punjab', 'rajasthan',
    'sikkim', 'tamil nadu', 'telangana', 'tripura', 'uttar pradesh', 'uttarakhand', 'west bengal',
    'delhi', 'chandigarh', 'puducherry', 'jammu and kashmir', 'ladakh',
]);

const MEDICAL_TERMS = new Set([
    'diabetes', 'hypertension', 'asthma', 'cancer', 'HIV', 'AIDS', 'tuberculosis', 'TB',
    'hepatitis', 'malaria', 'dengue', 'cholesterol', 'thyroid', 'arthritis', 'epilepsy',
    'pneumonia', 'bronchitis', 'anemia', 'leukemia', 'lymphoma', 'insulin', 'metformin',
    'blood pressure', 'heart disease', 'kidney disease', 'liver disease', 'lung disease',
    'chemotherapy', 'radiation', 'surgery', 'biopsy', 'diagnosis', 'prognosis', 'prescription',
    'medication', 'dosage', 'allergic', 'allergy', 'positive', 'negative', 'report', 'pathology',
    'radiology', 'MRI', 'CT scan', 'X-ray', 'ultrasound', 'ECG', 'EKG',
    'patient', 'hospital', 'clinic', 'doctor', 'physician', 'surgeon',
]);

const ADDRESS_KEYWORDS = new Set([
    'road', 'rd', 'street', 'st', 'avenue', 'ave', 'lane', 'ln', 'nagar', 'colony', 'sector',
    'block', 'plot', 'flat', 'floor', 'building', 'bldg', 'apartment', 'apt', 'house', 'no',
    'near', 'opposite', 'opp', 'behind', 'beside', 'next to', 'main', 'cross', 'layout',
    'extension', 'extn', 'phase', 'village', 'town', 'city', 'district', 'taluk', 'tehsil',
    'post', 'pin', 'pincode', 'zip',
]);

// ─── Detection Functions ────────────────────────────────────────────────────

function generateId(): string {
    return 'nlp_' + Math.random().toString(36).substring(2, 11);
}

function detectNames(words: OCRWordInput[]): EntityResult[] {
    const entities: EntityResult[] = [];

    for (let i = 0; i < words.length; i++) {
        const word = words[i].text.replace(/[^a-zA-Z]/g, '').toLowerCase();
        if (word.length < 2) continue;

        const isFirstName = COMMON_FIRST_NAMES.has(word);
        const isLastName = COMMON_LAST_NAMES.has(word);

        if (isFirstName || isLastName) {
            // Check for full name (first + last)
            let fullName = words[i].text;
            let bbox = { ...words[i].bbox };
            let confidence = 0.65;

            if (i + 1 < words.length) {
                const nextWord = words[i + 1].text.replace(/[^a-zA-Z]/g, '').toLowerCase();
                const nextIsName = COMMON_FIRST_NAMES.has(nextWord) || COMMON_LAST_NAMES.has(nextWord);

                if (nextIsName) {
                    fullName += ' ' + words[i + 1].text;
                    bbox.w = (words[i + 1].bbox.x + words[i + 1].bbox.w) - bbox.x;
                    confidence = 0.82;
                    i++; // Skip next word
                }
            }

            // Check for three-part names
            if (i + 1 < words.length) {
                const nextWord = words[i + 1].text.replace(/[^a-zA-Z]/g, '').toLowerCase();
                if (COMMON_LAST_NAMES.has(nextWord)) {
                    fullName += ' ' + words[i + 1].text;
                    bbox.w = (words[i + 1].bbox.x + words[i + 1].bbox.w) - bbox.x;
                    confidence = 0.88;
                    i++;
                }
            }

            // Capitalize check: names should start with uppercase
            if (words[i - (fullName.split(' ').length - 1)]?.text[0]?.match(/[A-Z]/)) {
                confidence += 0.05;
            }

            entities.push({
                id: generateId(),
                type: 'NAME',
                value: fullName,
                confidence: Math.min(confidence, 0.95),
                bbox,
                masked: true,
                layer: 2,
            });
        }
    }

    return entities;
}

function detectAddresses(words: OCRWordInput[]): EntityResult[] {
    const entities: EntityResult[] = [];
    const fullText = words.map(w => w.text).join(' ').toLowerCase();

    // PIN code pattern (6 digits)
    const pinRegex = /\b\d{6}\b/g;
    let match;

    while ((match = pinRegex.exec(fullText)) !== null) {
        const pin = parseInt(match[0]);
        if (pin >= 110001 && pin <= 855117) {
            // Valid Indian PIN range
            const wordIndex = findWordIndexForPosition(words, match.index, fullText);
            if (wordIndex >= 0) {
                // Look backwards for address context
                const start = Math.max(0, wordIndex - 8);
                const addressWords = words.slice(start, wordIndex + 1);
                const hasAddressKeyword = addressWords.some(w =>
                    ADDRESS_KEYWORDS.has(w.text.toLowerCase().replace(/[^a-z]/g, ''))
                );

                if (hasAddressKeyword || addressWords.length >= 3) {
                    const firstWord = addressWords[0];
                    const lastWord = addressWords[addressWords.length - 1];
                    entities.push({
                        id: generateId(),
                        type: 'ADDRESS',
                        value: addressWords.map(w => w.text).join(' '),
                        confidence: hasAddressKeyword ? 0.78 : 0.55,
                        bbox: {
                            x: firstWord.bbox.x,
                            y: Math.min(...addressWords.map(w => w.bbox.y)),
                            w: (lastWord.bbox.x + lastWord.bbox.w) - firstWord.bbox.x,
                            h: Math.max(...addressWords.map(w => w.bbox.y + w.bbox.h)) - Math.min(...addressWords.map(w => w.bbox.y)),
                            pageIndex: firstWord.bbox.pageIndex,
                        },
                        masked: true,
                        layer: 2,
                    });
                }
            }
        }
    }

    // State name detection
    for (const state of INDIAN_STATES) {
        const stateWords = state.split(' ');
        for (let i = 0; i <= words.length - stateWords.length; i++) {
            const candidate = words.slice(i, i + stateWords.length)
                .map(w => w.text.toLowerCase().replace(/[^a-z ]/g, ''))
                .join(' ');
            if (candidate === state) {
                const firstW = words[i];
                const lastW = words[i + stateWords.length - 1];
                entities.push({
                    id: generateId(),
                    type: 'ADDRESS',
                    value: words.slice(i, i + stateWords.length).map(w => w.text).join(' '),
                    confidence: 0.72,
                    bbox: {
                        x: firstW.bbox.x,
                        y: firstW.bbox.y,
                        w: (lastW.bbox.x + lastW.bbox.w) - firstW.bbox.x,
                        h: Math.max(firstW.bbox.h, lastW.bbox.h),
                        pageIndex: firstW.bbox.pageIndex,
                    },
                    masked: true,
                    layer: 2,
                });
            }
        }
    }

    return entities;
}

function detectMedical(words: OCRWordInput[]): EntityResult[] {
    const entities: EntityResult[] = [];

    for (let i = 0; i < words.length; i++) {
        const word = words[i].text.toLowerCase().replace(/[^a-z]/g, '');
        if (MEDICAL_TERMS.has(word) || MEDICAL_TERMS.has(words[i].text)) {
            entities.push({
                id: generateId(),
                type: 'MEDICAL',
                value: words[i].text,
                confidence: 0.75,
                bbox: { ...words[i].bbox },
                masked: true,
                layer: 2,
            });
        }

        // Multi-word medical terms
        if (i + 1 < words.length) {
            const twoWord = words[i].text + ' ' + words[i + 1].text;
            if (MEDICAL_TERMS.has(twoWord.toLowerCase())) {
                entities.push({
                    id: generateId(),
                    type: 'MEDICAL',
                    value: twoWord,
                    confidence: 0.8,
                    bbox: {
                        x: words[i].bbox.x,
                        y: words[i].bbox.y,
                        w: (words[i + 1].bbox.x + words[i + 1].bbox.w) - words[i].bbox.x,
                        h: Math.max(words[i].bbox.h, words[i + 1].bbox.h),
                        pageIndex: words[i].bbox.pageIndex,
                    },
                    masked: true,
                    layer: 2,
                });
                i++;
            }
        }
    }

    return entities;
}

function detectEmail(words: OCRWordInput[]): EntityResult[] {
    const entities: EntityResult[] = [];
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    for (const word of words) {
        if (emailRegex.test(word.text)) {
            entities.push({
                id: generateId(),
                type: 'EMAIL',
                value: word.text,
                confidence: 0.95,
                bbox: { ...word.bbox },
                masked: true,
                layer: 2,
            });
        }
    }

    return entities;
}

function detectDOB(words: OCRWordInput[]): EntityResult[] {
    const entities: EntityResult[] = [];
    const fullText = words.map(w => w.text).join(' ');

    // Date patterns: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
    const dateRegex = /\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})\b/g;
    let match;

    while ((match = dateRegex.exec(fullText)) !== null) {
        const day = parseInt(match[1]);
        const month = parseInt(match[2]);
        const year = parseInt(match[3]);

        if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1920 && year <= 2010) {
            // Check surrounding context for DOB keywords
            const contextStart = Math.max(0, match.index - 30);
            const context = fullText.substring(contextStart, match.index).toLowerCase();
            const isDOB = /\b(dob|date of birth|birth date|born|birthday|d\.o\.b)\b/.test(context);

            const wordIndex = findWordIndexForPosition(words, match.index, fullText);
            if (wordIndex >= 0) {
                // Span across date words
                const dateWords = [];
                let pos = match.index;
                for (let j = wordIndex; j < words.length && pos < match.index + match[0].length; j++) {
                    dateWords.push(words[j]);
                    pos += words[j].text.length + 1;
                }

                if (dateWords.length > 0) {
                    const firstW = dateWords[0];
                    const lastW = dateWords[dateWords.length - 1];
                    entities.push({
                        id: generateId(),
                        type: 'DOB',
                        value: match[0],
                        confidence: isDOB ? 0.9 : 0.6,
                        bbox: {
                            x: firstW.bbox.x,
                            y: firstW.bbox.y,
                            w: (lastW.bbox.x + lastW.bbox.w) - firstW.bbox.x,
                            h: Math.max(...dateWords.map(w => w.bbox.h)),
                            pageIndex: firstW.bbox.pageIndex,
                        },
                        masked: true,
                        layer: 2,
                    });
                }
            }
        }
    }

    return entities;
}

function findWordIndexForPosition(words: OCRWordInput[], charPos: number, fullText: string): number {
    let currentPos = 0;
    for (let i = 0; i < words.length; i++) {
        const wordStart = fullText.indexOf(words[i].text, currentPos);
        if (wordStart <= charPos && charPos < wordStart + words[i].text.length) {
            return i;
        }
        currentPos = wordStart + words[i].text.length;
    }
    return -1;
}

// ─── Main Message Handler ───────────────────────────────────────────────────

self.onmessage = (e: MessageEvent) => {
    const { type, words, pageIndex } = e.data;

    if (type !== 'NLP_ANALYZE') return;

    try {
        const allEntities: EntityResult[] = [
            ...detectNames(words),
            ...detectAddresses(words),
            ...detectMedical(words),
            ...detectEmail(words),
            ...detectDOB(words),
        ];

        // Set correct page index
        for (const entity of allEntities) {
            entity.bbox.pageIndex = pageIndex ?? 0;
        }

        self.postMessage({
            type: 'NLP_RESULT',
            entities: allEntities,
        });
    } catch (error) {
        self.postMessage({
            type: 'NLP_ERROR',
            error: error instanceof Error ? error.message : 'NLP analysis failed',
        });
    }
};
