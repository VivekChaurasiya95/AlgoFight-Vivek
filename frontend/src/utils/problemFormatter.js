/**
 * Utility functions to parse, format math TeX notations, and structure raw problem statements
 * into clean sections (Description, Input Format, Output Format, Constraints, Note).
 */

const UNICODE_SUBSCRIPTS = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
  '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  'i': 'ᵢ', 'j': 'ⱼ', 'k': 'ₖ', 'm': 'ₘ', 'n': 'ₙ',
  'p': 'ₚ', 'r': 'ᵣ', 's': 'ₛ', 't': 'ₜ', 'x': 'ₓ'
};

const UNICODE_SUPERSCRIPTS = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', '=': '⁼', 'n': 'ⁿ'
};

function replaceSubscripts(str) {
  return str.replace(/([a-zA-Z])_([0-9ijkmnprstx]+)/g, (_, base, sub) => {
    const converted = sub.split('').map(char => UNICODE_SUBSCRIPTS[char] || char).join('');
    return `${base}${converted}`;
  });
}

function replaceSuperscripts(str) {
  return str.replace(/\^([0-9\+\-=n]+)/g, (_, sup) => {
    const converted = sup.split('').map(char => UNICODE_SUPERSCRIPTS[char] || char).join('');
    return converted;
  });
}

/**
 * Converts raw TeX math strings into clean, readable math notation
 */
export function formatMathText(text) {
  if (!text || typeof text !== "string") return "";

  let formatted = text;

  // Replace TeX symbol commands
  formatted = formatted
    .replace(/\\le(q)?\b/g, "≤")
    .replace(/\\ge(q)?\b/g, "≥")
    .replace(/\\ne(q)?\b/g, "≠")
    .replace(/\\to\b|\\rightarrow\b/g, "→")
    .replace(/\\leftarrow\b/g, "←")
    .replace(/\\cdot\b|\\times\b/g, "×")
    .replace(/\\dots\b|\\ldots\b|\\cdots\b/g, "...")
    .replace(/\\infty\b/g, "∞")
    .replace(/\\in\b/g, "∈")
    .replace(/\\notin\b/g, "∉")
    .replace(/\\approx\b/g, "≈")
    .replace(/\\pmod/g, "mod")
    .replace(/\\bmod/g, "mod")
    .replace(/\\pm\b/g, "±")
    .replace(/\\mathcal\{([A-Za-z])\}/g, "$1")
    .replace(/\\text\{([^}]+)\}/g, "$1");

  // Replace superscripts like 10^9 or 2^31
  formatted = replaceSuperscripts(formatted);

  // Replace subscripts like a_1, i_k
  formatted = replaceSubscripts(formatted);

  // Clean dollar signs used for TeX inline math: $x$ -> x
  formatted = formatted.replace(/\$([^$]+)\$/g, "$1");

  // Replace escaped underscores or characters
  formatted = formatted.replace(/\\_/g, "_").replace(/\\#/g, "#");

  return formatted;
}

/**
 * Parses a raw problem statement string into structured sections:
 * - description: string[]
 * - inputFormat: string[] | null
 * - outputFormat: string[] | null
 * - constraints: string[] | null
 * - sampleCases: Array<{ input: string, output: string }>
 * - note: string[] | null
 */
export function parseProblemStatement(statementText) {
  if (!statementText || typeof statementText !== "string") {
    return {
      description: ["No description available."],
      inputFormat: null,
      outputFormat: null,
      constraints: null,
      sampleCases: [],
      note: null
    };
  }

  const cleanRaw = statementText.replace(/\r\n/g, "\n").trim();

  // Distinct section headers that appear on their own line (never in the middle of sentences)
  const headerRegex = /(?:^|\n)\s*(?:#{1,4}\s*|\*{1,2})?(Input\s*Format|Input|Output\s*Format|Output|Constraints?|Notes?|Explanations?|Examples?|Sample\s*Inputs?|Sample\s*Tests?|Sample\s*Cases?)(?:\*{1,2})?:?\s*(?=\n|$)/gi;

  const matches = [];
  let match;
  while ((match = headerRegex.exec(cleanRaw)) !== null) {
    const rawMatch = match[0];
    const headerName = match[1].trim();
    const matchOffset = rawMatch.indexOf(match[1]);
    matches.push({
      headerName,
      startIndex: match.index + matchOffset,
      endIndex: match.index + rawMatch.length
    });
  }

  if (matches.length === 0) {
    // Single block - split by double newline for paragraphs
    const paragraphs = cleanRaw
      .split(/\n\s*\n/)
      .map(p => formatMathText(p.trim()))
      .filter(Boolean);

    return {
      description: paragraphs.length ? paragraphs : [formatMathText(cleanRaw)],
      inputFormat: null,
      outputFormat: null,
      constraints: null,
      sampleCases: [],
      note: null
    };
  }

  // Find index where Examples section starts (if any)
  let examplesStartIndex = -1;
  const exampleHeaderIndex = matches.findIndex(m =>
    /^(examples?|sample\s*tests?|sample\s*cases?|sample\s*inputs?)$/i.test(m.headerName)
  );

  if (exampleHeaderIndex !== -1) {
    examplesStartIndex = matches[exampleHeaderIndex].startIndex;
  }

  let descriptionText = '';
  let inputFormatText = '';
  let outputFormatText = '';
  let constraintsText = '';
  let noteText = '';
  let examplesText = '';

  const firstHeaderIndex = matches.length > 0 ? matches[0].startIndex : cleanRaw.length;
  descriptionText = cleanRaw.substring(0, firstHeaderIndex).trim();

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const isUnderExamples = examplesStartIndex !== -1 && current.startIndex >= examplesStartIndex && i !== exampleHeaderIndex;
    const nextMatch = i + 1 < matches.length ? matches[i + 1] : null;
    const content = cleanRaw.substring(current.endIndex, nextMatch ? nextMatch.startIndex : cleanRaw.length).trim();

    const lower = current.headerName.toLowerCase();

    if (/^(examples?|sample\s*tests?|sample\s*cases?|sample\s*inputs?)$/i.test(lower)) {
      // Find where note starts (if any after examples)
      const nextNote = matches.slice(i + 1).find(m => /^(notes?|explanations?)$/i.test(m.headerName));
      const endOfExamples = nextNote ? nextNote.startIndex : cleanRaw.length;
      examplesText = cleanRaw.substring(current.endIndex, endOfExamples).trim();
    } else if (/^(notes?|explanations?)$/i.test(lower)) {
      noteText = content;
    } else if (!isUnderExamples) {
      if (/^input(\s*format)?$/i.test(lower)) {
        inputFormatText = content;
      } else if (/^output(\s*format)?$/i.test(lower)) {
        outputFormatText = content;
      } else if (/^constraints?$/i.test(lower)) {
        constraintsText = content;
      }
    }
  }

  // Parse examplesText into sample test cases: pairs of Input / Output
  const sampleCases = [];
  if (examplesText) {
    const sampleHeaderRegex = /(?:^|\n)\s*(?:#{1,4}\s*|\*{1,2})?(Input|Output)(?:\*{1,2})?:?\s*(?=\n|$)/gi;
    const sampleMatches = [];
    let sMatch;
    while ((sMatch = sampleHeaderRegex.exec(examplesText)) !== null) {
      sampleMatches.push({
        type: sMatch[1].toLowerCase() === 'input' ? 'input' : 'output',
        start: sMatch.index + sMatch[0].indexOf(sMatch[1]),
        end: sMatch.index + sMatch[0].length
      });
    }

    let currentInput = '';
    for (let k = 0; k < sampleMatches.length; k++) {
      const sm = sampleMatches[k];
      const nextSm = k + 1 < sampleMatches.length ? sampleMatches[k + 1] : null;
      const block = examplesText.substring(sm.end, nextSm ? nextSm.start : examplesText.length).trim();
      if (sm.type === 'input') {
        currentInput = block;
      } else if (sm.type === 'output') {
        sampleCases.push({
          input: currentInput,
          output: block
        });
        currentInput = '';
      }
    }
  }

  const splitParagraphs = (str) => {
    if (!str) return null;
    const list = str
      .split(/\n\s*\n/)
      .map(p => formatMathText(p.trim()))
      .filter(Boolean);
    return list.length > 0 ? list : null;
  };

  return {
    description: splitParagraphs(descriptionText) || [formatMathText(descriptionText)],
    inputFormat: splitParagraphs(inputFormatText),
    outputFormat: splitParagraphs(outputFormatText),
    constraints: splitParagraphs(constraintsText),
    sampleCases,
    note: splitParagraphs(noteText),
  };
}
