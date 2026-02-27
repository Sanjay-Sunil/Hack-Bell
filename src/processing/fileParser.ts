/**
 * Parses a File object and returns an ArrayBuffer along with file metadata.
 */
export interface ParsedFile {
    buffer: ArrayBuffer;
    type: 'image' | 'pdf';
    mimeType: string;
    name: string;
    size: number;
}

const IMAGE_TYPES = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/bmp',
    'image/tiff',
];

const PDF_TYPES = ['application/pdf'];

export function isValidFileType(file: File): boolean {
    return [...IMAGE_TYPES, ...PDF_TYPES].includes(file.type);
}

export function getFileCategory(mimeType: string): 'image' | 'pdf' | null {
    if (IMAGE_TYPES.includes(mimeType)) return 'image';
    if (PDF_TYPES.includes(mimeType)) return 'pdf';
    return null;
}

export async function parseFile(file: File): Promise<ParsedFile> {
    const category = getFileCategory(file.type);
    if (!category) {
        throw new Error(`Unsupported file type: ${file.type}`);
    }

    const buffer = await file.arrayBuffer();

    return {
        buffer,
        type: category,
        mimeType: file.type,
        name: file.name,
        size: file.size,
    };
}

/**
 * Formats file size in human-readable format.
 */
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
