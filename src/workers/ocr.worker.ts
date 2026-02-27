// ─── Worker Message Types (self-contained for worker scope) ─────────────────

interface BBox {
    x: number;
    y: number;
    w: number;
    h: number;
    pageIndex: number;
}

interface OCRWordResult {
    text: string;
    confidence: number;
    bbox: BBox;
}

interface TesseractWord {
    text: string;
    confidence: number;
    bbox: {
        x0: number;
        y0: number;
        x1: number;
        y1: number;
    };
}

let tesseractWorker: import('tesseract.js').Worker | null = null;

async function initTesseract(): Promise<import('tesseract.js').Worker> {
    if (tesseractWorker) return tesseractWorker;
    const Tesseract = await import('tesseract.js');
    tesseractWorker = await Tesseract.createWorker('eng', undefined, {
        logger: (m: { status: string; progress: number }) => {
            self.postMessage({
                type: 'OCR_PROGRESS',
                progress: m.progress,
                message: m.status,
            });
        },
    });
    return tesseractWorker;
}

self.onmessage = async (e: MessageEvent) => {
    const { type, fileBuffer, fileType, pageIndex } = e.data;

    if (type !== 'OCR_START') return;

    try {
        const worker = await initTesseract();

        let imageSource: string | Blob;
        if (fileType === 'application/pdf') {
            // For PDF, we receive an already-rendered image buffer
            imageSource = new Blob([fileBuffer], { type: 'image/png' });
        } else {
            imageSource = new Blob([fileBuffer], { type: fileType });
        }

        const result = await worker.recognize(imageSource);
        const words: OCRWordResult[] = [];

        if (result.data && 'words' in result.data) {
            for (const word of (result.data.words as TesseractWord[])) {
                words.push({
                    text: word.text,
                    confidence: word.confidence / 100,
                    bbox: {
                        x: word.bbox.x0,
                        y: word.bbox.y0,
                        w: word.bbox.x1 - word.bbox.x0,
                        h: word.bbox.y1 - word.bbox.y0,
                        pageIndex: pageIndex ?? 0,
                    },
                });
            }
        }

        const fullText = result.data.text;

        self.postMessage({
            type: 'OCR_RESULT',
            words,
            fullText,
            pageIndex: pageIndex ?? 0,
        });
    } catch (error) {
        self.postMessage({
            type: 'OCR_ERROR',
            error: error instanceof Error ? error.message : 'OCR processing failed',
        });
    }
};
