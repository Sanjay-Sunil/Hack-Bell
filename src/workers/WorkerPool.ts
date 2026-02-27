import type { OCRResponse, NLPResponse, OCRWord, DetectedEntity } from '../types';

type WorkerCallback = (response: OCRResponse | NLPResponse) => void;

export class WorkerPool {
    private ocrWorker: Worker | null = null;
    private nlpWorker: Worker | null = null;
    private ocrCallbacks: Map<string, WorkerCallback> = new Map();
    private nlpCallbacks: Map<string, WorkerCallback> = new Map();
    private progressCallback: ((progress: number, message: string) => void) | null = null;

    setProgressCallback(cb: (progress: number, message: string) => void): void {
        this.progressCallback = cb;
    }

    private initOCRWorker(): Worker {
        if (this.ocrWorker) return this.ocrWorker;
        this.ocrWorker = new Worker(
            new URL('./ocr.worker.ts', import.meta.url),
            { type: 'module' }
        );
        this.ocrWorker.onmessage = (e: MessageEvent<OCRResponse>) => {
            const data = e.data;
            if (data.type === 'OCR_PROGRESS' && this.progressCallback) {
                this.progressCallback(data.progress ?? 0, 'Processing document...');
                return;
            }
            // Resolve any pending callback
            for (const [id, cb] of this.ocrCallbacks) {
                cb(data);
                this.ocrCallbacks.delete(id);
                break;
            }
        };
        return this.ocrWorker;
    }

    private initNLPWorker(): Worker {
        if (this.nlpWorker) return this.nlpWorker;
        this.nlpWorker = new Worker(
            new URL('./nlp.worker.ts', import.meta.url),
            { type: 'module' }
        );
        this.nlpWorker.onmessage = (e: MessageEvent<NLPResponse>) => {
            for (const [id, cb] of this.nlpCallbacks) {
                cb(e.data);
                this.nlpCallbacks.delete(id);
                break;
            }
        };
        return this.nlpWorker;
    }

    async runOCR(
        fileBuffer: ArrayBuffer,
        fileType: string,
        pageIndex: number = 0
    ): Promise<{ words: OCRWord[]; fullText: string }> {
        const worker = this.initOCRWorker();
        const id = crypto.randomUUID();

        return new Promise((resolve, reject) => {
            this.ocrCallbacks.set(id, (response) => {
                const r = response as OCRResponse;
                if (r.type === 'OCR_ERROR') {
                    reject(new Error(r.error));
                } else if (r.type === 'OCR_RESULT') {
                    resolve({
                        words: r.words ?? [],
                        fullText: r.fullText ?? '',
                    });
                }
            });

            // Transfer the buffer (zero-copy)
            const bufferCopy = fileBuffer.slice(0);
            worker.postMessage(
                { type: 'OCR_START', fileBuffer: bufferCopy, fileType, pageIndex },
                [bufferCopy]
            );
        });
    }

    async runNLP(
        text: string,
        words: OCRWord[],
        pageIndex: number = 0
    ): Promise<DetectedEntity[]> {
        const worker = this.initNLPWorker();
        const id = crypto.randomUUID();

        return new Promise((resolve, reject) => {
            this.nlpCallbacks.set(id, (response) => {
                const r = response as NLPResponse;
                if (r.type === 'NLP_ERROR') {
                    reject(new Error(r.error));
                } else {
                    resolve((r.entities ?? []) as DetectedEntity[]);
                }
            });

            worker.postMessage({ type: 'NLP_ANALYZE', text, words, pageIndex });
        });
    }

    terminate(): void {
        this.ocrWorker?.terminate();
        this.nlpWorker?.terminate();
        this.ocrWorker = null;
        this.nlpWorker = null;
        this.ocrCallbacks.clear();
        this.nlpCallbacks.clear();
    }
}
