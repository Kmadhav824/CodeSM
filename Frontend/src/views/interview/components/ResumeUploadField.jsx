import React, { useRef, useState, useCallback } from 'react';
import { parseResume } from '../../utils/resumeParser.js';

/**
 * ResumeUploadField
 * Drop-zone + file-picker that extracts text from a PDF/TXT resume client-side
 * and calls onParsed({ text, truncated, charCount }) or onError(message).
 *
 * Props:
 *   resumeText   {string}    – current extracted text ('' if none)
 *   onParsed     {Function}  – called with { text, truncated, charCount }
 *   onClear      {Function}  – called when user removes the resume
 *   isParsing    {boolean}   – parent-controlled loading state
 *   setIsParsing {Function}  – setter for above
 */
export function ResumeUploadField({ resumeText, onParsed, onClear, isParsing, setIsParsing }) {
    const inputRef = useRef(null);
    const [dragOver, setDragOver] = useState(false);
    const [parseError, setParseError] = useState('');
    const [fileName, setFileName] = useState('');
    const [truncated, setTruncated] = useState(false);
    const [charCount, setCharCount] = useState(0);

    const processFile = useCallback(
        async (file) => {
            if (!file) return;
            setParseError('');
            setIsParsing(true);
            try {
                const result = await parseResume(file);
                setFileName(file.name);
                setTruncated(result.truncated);
                setCharCount(result.charCount);
                onParsed(result);
            } catch (err) {
                setParseError(err.message || 'Failed to parse resume.');
            } finally {
                setIsParsing(false);
            }
        },
        [onParsed, setIsParsing]
    );

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
        // Reset so the same file can be re-selected
        e.target.value = '';
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) processFile(file);
    };

    const handleClear = () => {
        setFileName('');
        setTruncated(false);
        setCharCount(0);
        setParseError('');
        onClear();
    };

    const hasResume = Boolean(resumeText && resumeText.trim());

    return (
        <div className="space-y-2">
            {/* Label row */}
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-100 mb-2">
                <span className="text-base leading-none opacity-90">📄</span>
                <span>Resume</span>
                <span className="ml-1 text-xs font-normal text-gray-400 rounded-full border border-white/10 bg-black/20 px-2 py-0.5">
                    optional
                </span>
            </div>

            {hasResume ? (
                /* ── Parsed state ─────────────────────────────────────── */
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.07] px-4 py-3 flex items-start gap-3 shadow-[0_4px_20px_-12px_rgba(16,185,129,0.3)]">
                    {/* Icon */}
                    <div className="mt-0.5 shrink-0 h-8 w-8 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-sm">
                        ✅
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-emerald-300 truncate" title={fileName}>
                            {fileName || 'Resume loaded'}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                            {charCount.toLocaleString()} characters extracted
                            {truncated && (
                                <span className="ml-1.5 text-amber-400">
                                    · Preview capped for token efficiency
                                </span>
                            )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                            Questions will be tailored to your resume
                        </div>
                    </div>

                    {/* Clear */}
                    <button
                        type="button"
                        onClick={handleClear}
                        title="Remove resume"
                        className="shrink-0 mt-0.5 rounded-lg p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    >
                        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                        </svg>
                    </button>
                </div>
            ) : (
                /* ── Drop zone ────────────────────────────────────────── */
                <div
                    role="button"
                    tabIndex={0}
                    aria-label="Upload resume — drag and drop or click to browse"
                    className={`relative w-full rounded-2xl border-2 border-dashed transition-all cursor-pointer group
                        ${dragOver
                            ? 'border-cyan-400/70 bg-cyan-400/[0.07] shadow-[0_0_0_4px_rgba(34,211,238,0.1)]'
                            : 'border-white/15 bg-[#0b1220]/40 hover:border-cyan-400/40 hover:bg-cyan-400/[0.04]'
                        }
                        ${isParsing ? 'pointer-events-none opacity-60' : ''}
                    `}
                    onClick={() => inputRef.current?.click()}
                    onKeyDown={(e) => e.key === 'Enter' || e.key === ' ' ? inputRef.current?.click() : undefined}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                >
                    <div className="py-6 px-4 flex flex-col items-center gap-2 text-center">
                        {isParsing ? (
                            <>
                                {/* Spinner */}
                                <div className="h-9 w-9 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />
                                <p className="text-sm text-cyan-300 font-medium mt-1">Parsing resume…</p>
                                <p className="text-xs text-gray-500">Extracting text client-side</p>
                            </>
                        ) : (
                            <>
                                {/* Upload icon */}
                                <div className="h-10 w-10 rounded-2xl border border-white/10 bg-white/[0.05] flex items-center justify-center text-xl group-hover:border-cyan-400/30 group-hover:bg-cyan-400/[0.06] transition-all">
                                    📤
                                </div>
                                <div>
                                    <p className="text-sm text-gray-200 font-medium">
                                        Drop your resume or{' '}
                                        <span className="text-cyan-400 underline decoration-dashed underline-offset-2">
                                            browse
                                        </span>
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5">PDF or TXT · max 10 MB</p>
                                </div>
                                <div className="text-[11px] text-gray-600 border border-white/8 bg-black/20 rounded-full px-3 py-1">
                                    Parsed locally — nothing uploaded to a server
                                </div>
                            </>
                        )}
                    </div>

                    <input
                        ref={inputRef}
                        id="resume-upload-input"
                        type="file"
                        accept=".pdf,.txt"
                        className="sr-only"
                        onChange={handleFileChange}
                        aria-label="Upload resume file"
                    />
                </div>
            )}

            {/* Parse error */}
            {parseError && (
                <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/[0.08] px-3 py-2 text-xs text-red-300">
                    <span className="mt-0.5 shrink-0">⚠️</span>
                    <span>{parseError}</span>
                </div>
            )}

            {/* Helper hint */}
            {!hasResume && !parseError && (
                <p className="text-xs text-gray-500">
                    Upload your resume to get interview questions tailored to your actual experience and skills.
                </p>
            )}
        </div>
    );
}
