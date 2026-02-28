# secure-redact

> Client-side PII detection and redaction React component. Upload documents, automatically detect sensitive information using OCR + TensorFlow.js NLP models, review detections, and download redacted copies — **all without sending originals to any server**.

[![npm version](https://img.shields.io/npm/v/secure-redact.svg)](https://www.npmjs.com/package/secure-redact)
[![license](https://img.shields.io/npm/l/secure-redact.svg)](https://github.com/johhhnnnnyyyyy/Hack-Bell/blob/main/LICENSE)

## Features

-  **100% Client-Side** — Documents never leave the browser
- 🤖 **AI-Powered** — TensorFlow.js NLP models for semantic PII detection with pixel-perfect accuracy
- 📝 **Multi-Layer Detection** — Regex + NLP + Spatial Analysis + TensorFlow.js deep learning
-  **PDF & Image Support** — PNG, JPEG, WebP, BMP, and PDF documents
-  **Pixel-Perfect Redaction** — Word-ID based mapping for exact bounding boxes
-  **Review UI** — Interactive modal to review and toggle detections before redacting
-  **Audit Trail** — Evidence log of all detected entities and actions taken
- 🇮🇳 **Indian Documents** — Built-in support for Aadhaar, PAN, GST, IFSC, etc.

## Install

```bash
npm install secure-redact
```

## Quick Start

The component provides a complete document type selector out of the box. Users select their document type (Aadhaar, PAN, Health Report, etc.), choose which fields to keep visible, upload the file, and receive a redacted version.

```tsx
import { SecureRedact } from 'secure-redact';
import 'secure-redact/style.css';

function App() {
  const handleComplete = (maskedFile, evidence) => {
    // maskedFile: File — the redacted document ready to download/upload
    console.log('Redacted file:', maskedFile.name, maskedFile.size);

    // evidence: EvidenceLog — audit trail of detections
    console.log('Entities detected:', evidence.detectedEntities.length);

    // Download the redacted file
    const url = URL.createObjectURL(maskedFile);
    const a = document.createElement('a');
    a.href = url;
    a.download = maskedFile.name;
    a.click();
  };

  return (
    <SecureRedact
      apiKey="your-model-config-key"
      onComplete={handleComplete}
    />
  );
}
```

**That's it!** The component automatically shows:
1. **Step 1** — Document Type selector (Aadhaar Card, PAN Card, Health Report, Income Tax Return, Invoice, Bank Statement)
2. **Step 2** — Field selection (choose which fields to keep visible, everything else is redacted)
3. **Step 3** — File upload dropzone
4. **Step 4** — Review modal (preview detections, toggle individual entities)
5. **Step 5** — Returns the redacted `File` + `EvidenceLog`

## Supported Document Types

| Document | Fields |
|----------|--------|
| 🪪 **Aadhaar Card** | Name, Address, DOB, Aadhaar Number, Phone, Gender, Photo, QR Code |
| 💳 **PAN Card** | Name, Father's Name, DOB, PAN Number, Photo, Signature |
| 🏥 **Health Report** | Patient Name, Age, DOB, Doctor, Hospital, Diagnosis, Medications, Test Results, Blood Group |
| 📊 **Income Tax Return** | Name, PAN, Address, Income, Tax Amount, Assessment Year, TAN, Employer |
| 🧾 **Invoice** | Company, Customer, Address, Invoice No, Date, Amount, GST, Line Items, Bank Details |
| 🏦 **Bank Statement** | Account Holder, Account No, IFSC, Address, Transactions, Balance, Bank Name, Branch, Date |

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `apiKey` | `string` | *required* | NLP model configuration key for AI-powered detection |
| `onComplete` | `(file, evidence) => void` | *required* | Called when redaction is complete |
| `requiredFields` | `string[]` | `[]` | PII types to KEEP visible (when not using doc type UI) |
| `confidenceThreshold` | `number` | `0.5` | Minimum confidence (0-1) for PII detection |
| `maxFileSizeMB` | `number` | `25` | Maximum file size in MB |
| `showDocTypeSelector` | `boolean` | `true` | Show document type picker UI |
| `acceptedTypes` | `string[]` | Images + PDF | Accepted MIME types |
| `className` | `string` | — | Custom CSS class for root container |

## Examples

### Default (with document type selector)

```tsx
<SecureRedact
  apiKey="your-key"
  onComplete={(file, evidence) => {
    // User picks doc type → selects fields → uploads → reviews → gets redacted file
    downloadFile(file);
  }}
/>
```

### Without document type selector (developer controls fields)

```tsx
<SecureRedact
  apiKey="your-key"
  showDocTypeSelector={false}
  requiredFields={['NAME', 'DOB']}   // only keep name and DOB visible
  onComplete={(file) => uploadToServer(file)}
/>
```

### Redact everything (maximum privacy)

```tsx
<SecureRedact
  apiKey="your-key"
  showDocTypeSelector={false}
  requiredFields={[]}  // nothing kept visible
  onComplete={(file) => downloadFile(file)}
/>
```

## How It Works

```
Document Upload
    ↓
Tesseract.js OCR (browser-side)
    ↓
Multi-Layer PII Detection:
  ├── Layer 0: Regex + Checksums (Aadhaar, PAN, CC, Phone)
  ├── Layer 1: NLP Heuristics (Names, Addresses, Medical)
  ├── Layer 2: Spatial Key-Value Mapping ("Name:" → "John Doe")
  └── Layer 4: TensorFlow.js NLP Word-ID Detection (pixel-perfect)
    ↓
Interactive Review Modal
    ↓
Destructive Redaction (black rectangles)
    ↓
Redacted File + Evidence Log
```

## Evidence Log

The `evidence` object returned in `onComplete` has this structure:

```typescript
interface EvidenceLog {
  timestamp: string;           // ISO timestamp
  fileName: string;            // Original file name
  detectedEntities: Array<{
    type: PIIType;             // e.g., 'NAME', 'AADHAAR'
    confidence: number;        // 0-1 detection confidence
    action: 'masked' | 'kept_visible';
    userConfirmed: boolean;
  }>;
  requiredFields: string[];    // Fields that were kept visible
}
```

## Requirements

- **React** ≥ 18.0.0
- **TensorFlow.js** — Bundled with the package, no separate install needed
- **Tesseract.js** — Bundled with the package for OCR
- **Vite** (recommended) — Workers use `new URL(..., import.meta.url)` syntax

## License

MIT
