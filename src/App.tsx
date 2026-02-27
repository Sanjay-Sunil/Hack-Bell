import React, { useState } from 'react';
import { SecureUploader } from './components/SecureUploader';
import type { EvidenceLog } from './types';
import './index.css';

const REQUIRED_FIELDS = ['NAME', 'ADDRESS'];

const App: React.FC = () => {
  const [result, setResult] = useState<{
    file: File | null;
    evidence: EvidenceLog | null;
  }>({ file: null, evidence: null });

  const handleUpload = (maskedFile: File, evidenceBlob: string) => {
    const evidence: EvidenceLog = JSON.parse(evidenceBlob);
    setResult({ file: maskedFile, evidence });
  };

  return (
    <div className="demo-root">
      <header className="demo-header">
        <h1 className="demo-title">SecureUploader</h1>
        <p className="demo-description">
          Client-side PII detection and redaction. Upload a document to automatically
          identify and mask sensitive information before it leaves your browser.
        </p>
        <div className="demo-required-fields">
          {REQUIRED_FIELDS.map(field => (
            <span key={field} className="demo-field-tag">
              {field}
            </span>
          ))}
          <span className="demo-field-tag" style={{ background: '#f0f1f4', color: '#5c5f6a', borderColor: '#e2e4e9' }}>
            Required Fields (kept visible)
          </span>
        </div>
      </header>

      <div className="demo-uploader">
        <SecureUploader
          requiredFields={REQUIRED_FIELDS}
          confidenceThreshold={0.5}
          onUpload={handleUpload}
          maxFileSizeMB={25}
        />
      </div>

      {result.evidence && (
        <div className="demo-output">
          <h2 className="demo-output-title">Processing Result</h2>
          <div className="demo-output-card">
            <div className="demo-output-field">
              <span className="demo-output-label">File</span>
              <span className="demo-output-value">
                {result.file?.name} ({(result.file?.size ?? 0 / 1024).toFixed(1)} bytes)
              </span>
            </div>
            <div className="demo-output-field">
              <span className="demo-output-label">Processed</span>
              <span className="demo-output-value">
                {result.evidence.timestamp}
              </span>
            </div>
            <div className="demo-output-field">
              <span className="demo-output-label">Entities</span>
              <span className="demo-output-value">
                {result.evidence.detectedEntities.length} detected
                {' / '}
                {result.evidence.detectedEntities.filter(e => e.action === 'masked').length} masked
              </span>
            </div>
            {result.evidence.detectedEntities.map((entity, i) => (
              <div key={i} className="demo-output-field">
                <span className="demo-output-label">{entity.type}</span>
                <span className="demo-output-value">
                  {entity.action === 'masked' ? 'Redacted' : 'Kept visible'}
                  {' '}({Math.round(entity.confidence * 100)}% confidence)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
