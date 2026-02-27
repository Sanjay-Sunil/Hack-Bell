// ─── Verhoeff Algorithm for Aadhaar Validation ──────────────────────────────

const verhoeffMultiplication: number[][] = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
    [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
    [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
    [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
    [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
    [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
    [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
    [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
    [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];

const verhoeffPermutation: number[][] = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
    [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
    [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
    [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
    [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
    [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
    [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

export function verhoeffValidate(num: string): boolean {
    const digits = num.replace(/\D/g, '');
    if (digits.length !== 12) return false;

    let c = 0;
    const len = digits.length;
    for (let i = 0; i < len; i++) {
        const digit = parseInt(digits[len - i - 1]);
        const perm = verhoeffPermutation[i % 8][digit];
        c = verhoeffMultiplication[c][perm];
    }
    return c === 0;
}

// ─── Luhn Algorithm for Credit Card Validation ──────────────────────────────

export function luhnValidate(num: string): boolean {
    const digits = num.replace(/\D/g, '');
    if (digits.length < 13 || digits.length > 19) return false;

    let sum = 0;
    let alternate = false;

    for (let i = digits.length - 1; i >= 0; i--) {
        let n = parseInt(digits[i]);
        if (alternate) {
            n *= 2;
            if (n > 9) n -= 9;
        }
        sum += n;
        alternate = !alternate;
    }

    return sum % 10 === 0;
}

// ─── PAN Validation ─────────────────────────────────────────────────────────

export function panValidate(pan: string): boolean {
    // PAN format: ABCDE1234F
    // 5 uppercase letters + 4 digits + 1 uppercase letter
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
    if (!panRegex.test(pan)) return false;

    // 4th character indicates holder type
    const fourthChar = pan[3];
    const validTypes = 'ABCFGHLJPT';
    return validTypes.includes(fourthChar);
}
