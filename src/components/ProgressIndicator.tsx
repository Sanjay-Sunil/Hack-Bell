import React from 'react';
import type { ProcessingStage } from '../types';

interface ProgressIndicatorProps {
    stage: ProcessingStage;
    progress: number;
    message: string;
}

const STAGES: { key: ProcessingStage; label: string }[] = [
    { key: 'loading', label: 'Loading' },
    { key: 'ocr', label: 'Text Extraction' },
    { key: 'detection', label: 'PII Detection' },
    { key: 'review', label: 'Review' },
];

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
    stage,
    progress,
    message,
}) => {
    const stageIndex = STAGES.findIndex(s => s.key === stage);

    return (
        <div className="su-progress-container">
            <div className="su-progress-steps">
                {STAGES.map((s, i) => {
                    let status: 'done' | 'active' | 'pending' = 'pending';
                    if (i < stageIndex) status = 'done';
                    else if (i === stageIndex) status = 'active';

                    return (
                        <div key={s.key} className="su-progress-step-wrapper">
                            <div className={`su-progress-step su-progress-step--${status}`}>
                                <div className="su-progress-dot">
                                    {status === 'done' ? (
                                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                            <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    ) : status === 'active' ? (
                                        <div className="su-progress-pulse" />
                                    ) : null}
                                </div>
                                <span className="su-progress-label">{s.label}</span>
                            </div>
                            {i < STAGES.length - 1 && (
                                <div className={`su-progress-line su-progress-line--${i < stageIndex ? 'done' : 'pending'}`} />
                            )}
                        </div>
                    );
                })}
            </div>

            {stage === 'ocr' && (
                <div className="su-progress-bar-wrapper">
                    <div className="su-progress-bar">
                        <div
                            className="su-progress-bar-fill"
                            style={{ width: `${Math.round(progress * 100)}%` }}
                        />
                    </div>
                    <span className="su-progress-percent">{Math.round(progress * 100)}%</span>
                </div>
            )}

            <p className="su-progress-message">{message}</p>
        </div>
    );
};
