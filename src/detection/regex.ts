import type { PIIType } from '../types';

export interface RegexMatch {
    type: PIIType;
    value: string;
    startIndex: number;
    endIndex: number;
    raw: string;
}

// ─── Aadhaar: 4-4-4 digit format ───────────────────────────────────────────

const AADHAAR_REGEX = /\b(\d{4}[\s\-]?\d{4}[\s\-]?\d{4})\b/g;

export function findAadhaar(text: string): RegexMatch[] {
    const matches: RegexMatch[] = [];
    let match;

    AADHAAR_REGEX.lastIndex = 0;
    while ((match = AADHAAR_REGEX.exec(text)) !== null) {
        const raw = match[1];
        const digits = raw.replace(/\D/g, '');
        if (digits.length === 12 && !/^0/.test(digits) && !/^1/.test(digits)) {
            matches.push({
                type: 'AADHAAR',
                value: digits,
                startIndex: match.index,
                endIndex: match.index + match[0].length,
                raw,
            });
        }
    }

    return matches;
}

// ─── PAN: ABCDE1234F ───────────────────────────────────────────────────────

const PAN_REGEX = /\b([A-Z]{5}[0-9]{4}[A-Z])\b/g;

export function findPAN(text: string): RegexMatch[] {
    const matches: RegexMatch[] = [];
    let match;

    PAN_REGEX.lastIndex = 0;
    while ((match = PAN_REGEX.exec(text)) !== null) {
        matches.push({
            type: 'PAN',
            value: match[1],
            startIndex: match.index,
            endIndex: match.index + match[0].length,
            raw: match[1],
        });
    }

    return matches;
}

// ─── Credit Card: 13-19 digits ──────────────────────────────────────────────

const CREDIT_CARD_REGEX = /\b(\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{1,7})\b/g;

export function findCreditCards(text: string): RegexMatch[] {
    const matches: RegexMatch[] = [];
    let match;

    CREDIT_CARD_REGEX.lastIndex = 0;
    while ((match = CREDIT_CARD_REGEX.exec(text)) !== null) {
        const raw = match[1];
        const digits = raw.replace(/\D/g, '');
        if (digits.length >= 13 && digits.length <= 19) {
            matches.push({
                type: 'CREDIT_CARD',
                value: digits,
                startIndex: match.index,
                endIndex: match.index + match[0].length,
                raw,
            });
        }
    }

    return matches;
}

// ─── Indian Phone Numbers ───────────────────────────────────────────────────

const PHONE_REGEX = /(?:\+91[\s\-]?|0)?([6-9]\d{4}[\s\-]?\d{5})\b/g;

export function findPhoneNumbers(text: string): RegexMatch[] {
    const matches: RegexMatch[] = [];
    let match;

    PHONE_REGEX.lastIndex = 0;
    while ((match = PHONE_REGEX.exec(text)) !== null) {
        const raw = match[0];
        const digits = raw.replace(/\D/g, '');
        // Indian mobile numbers are 10 digits (or 12 with +91)
        if (digits.length >= 10 && digits.length <= 12) {
            matches.push({
                type: 'PHONE',
                value: digits,
                startIndex: match.index,
                endIndex: match.index + match[0].length,
                raw,
            });
        }
    }

    return matches;
}

// ─── Run All Regex Matchers ─────────────────────────────────────────────────

export function findAllRegexMatches(text: string): RegexMatch[] {
    return [
        ...findAadhaar(text),
        ...findPAN(text),
        ...findCreditCards(text),
        ...findPhoneNumbers(text),
    ];
}
