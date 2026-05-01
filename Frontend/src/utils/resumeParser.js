/**
 * resumeParser.js
 * Client-side resume text extraction.
 * Supports PDF (via pdf.js) and plain-text (.txt) files.
 * All processing is in-browser — nothing is uploaded to a server.
 *
 * Token-efficiency strategy:
 *  1. Extract raw text from each page.
 *  2. Collapse excessive whitespace / blank lines.
 *  3. Hard-cap at MAX_CHARS characters (≈ 750–1 000 tokens) so
 *     the context window impact is bounded and predictable.
 */

const MAX_CHARS = 3500; // ~875 tokens – enough to capture key resume content

/**
 * Collapses runs of blank lines, trims each line, and removes noise.
 * @param {string} raw
 * @returns {string}
 */
function cleanText(raw) {
    return raw
        .split('\n')
        .map((l) => l.trim())
        .filter((l, i, arr) => {
            // Allow at most one consecutive blank line
            if (l === '') return arr[i - 1] !== '';
            return true;
        })
        .join('\n')
        .trim();
}

/**
 * Extract text from a PDF File object using pdf.js (pdfjs-dist).
 * @param {File} file
 * @returns {Promise<string>}
 */
async function extractFromPdf(file) {
    // Dynamic import keeps pdf.js out of the critical bundle path
    const pdfjsLib = await import('pdfjs-dist');

    // Point the worker to the bundled worker file shipped with pdfjs-dist
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.mjs',
        import.meta.url
    ).href;

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    const pageTexts = [];
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        // Join items with a space; preserve newlines from transform data
        const pageText = content.items
            .map((item) => ('str' in item ? item.str : ''))
            .join(' ');
        pageTexts.push(pageText);
    }

    return pageTexts.join('\n');
}

/**
 * Extract text from a plain-text File object.
 * @param {File} file
 * @returns {Promise<string>}
 */
function extractFromTxt(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result || '');
        reader.onerror = () => reject(new Error('Could not read file.'));
        reader.readAsText(file);
    });
}

/**
 * Parse a resume file and return cleaned, capped plain text.
 *
 * @param {File} file  – PDF or TXT
 * @returns {Promise<{ text: string; truncated: boolean; charCount: number }>}
 */
export async function parseResume(file) {
    if (!file) throw new Error('No file provided.');

    const ext = file.name.split('.').pop()?.toLowerCase();
    let raw = '';

    if (ext === 'pdf') {
        raw = await extractFromPdf(file);
    } else if (ext === 'txt') {
        raw = await extractFromTxt(file);
    } else {
        throw new Error('Unsupported file type. Please upload a PDF or TXT file.');
    }

    const cleaned = cleanText(raw);
    const truncated = cleaned.length > MAX_CHARS;
    const text = truncated ? cleaned.slice(0, MAX_CHARS) : cleaned;

    return { text, truncated, charCount: text.length };
}
