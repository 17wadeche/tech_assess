const columnAliases = {
  complaintId: ['pe - pli #', 'pe pli #', 'complaint id', 'complaint #', 'record id'],
  product: ['product description - pe pli', 'product description', 'product'],
  lot: ['serial/lot # - pe pli', 'serial/lot #', 'serial lot', 'lot', 'serial'],
  serialNumber: ['serial number – pe pli', 'serial number - pe pli', 'serial number', 'serial'],
  lotNumber: ['lot number – pe pli', 'lot number - pe pli', 'lot number', 'lot'],
  interfaceDetails: ['interface details - pe', 'interface details'],
  briefDescription: ['brief description – pe', 'brief description - pe', 'brief description'],
  updateDetails: ['interface update details - pe', 'interface update details'],
  description: ['event description - pe', 'event description', 'description', 'narrative'],
  eventContext: ['event context', 'event context - pe'],
  codeDescription: ['code/llt desc - pe pli', 'code/llt desc', 'code description'],
  complaint: ['complaint? - pe', 'complaint?'],
  reportable: ['reportable?', 'reportable? - pe pli', 'reportable', 'reportable - pe pli'],
  returned: ['product returned to mdt? – pe pli', 'product returned to mdt? - pe pli', 'product returned to mdt?', 'product returned', 'returned'],
  noReturnRationale: ['rationale for no return – pe pli', 'rationale for no return - pe pli', 'rationale for no return', 'no return rationale'],
  labeledSingleUse: ['labeled for single use – pe pli pm', 'labeled for single use - pe pli pm', 'labeled for single use'],
  rfr: ['rfr', 'reason for review', 'review finding reason'],
  lotBasedProduct: ['product is a lot-based product', 'lot-based product', 'lot based product']
};

function normalizeHeader(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function splitDelimitedLine(line, delimiter) {
  const cells = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function detectDelimiter(text) {
  const firstLine = text.split(/\r?\n/).find(line => line.trim()) || '';
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  return tabCount > commaCount ? '\t' : ',';
}

export function parseDelimitedComplaints(text) {
  const delimiter = detectDelimiter(text);
  const lines = text.split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) return [];
  const headers = splitDelimitedLine(lines[0], delimiter).map(normalizeHeader);
  const indexes = Object.fromEntries(Object.entries(columnAliases).map(([field, aliases]) => {
    const index = headers.findIndex(header => aliases.includes(header));
    return [field, index];
  }));

  return lines.slice(1).map((line, rowIndex) => {
    const cells = splitDelimitedLine(line, delimiter);
    const get = field => indexes[field] >= 0 ? cells[indexes[field]] || '' : '';
    return {
      rowNumber: rowIndex + 2,
      complaintId: get('complaintId'),
      product: get('product'),
      lot: get('lot') || get('lotNumber') || get('serialNumber'),
      serialNumber: get('serialNumber'),
      lotNumber: get('lotNumber'),
      briefDescription: get('briefDescription'),
      interfaceDetails: get('interfaceDetails'),
      eventContext: get('eventContext'),
      codeDescription: get('codeDescription'),
      noReturnRationale: get('noReturnRationale'),
      labeledSingleUse: get('labeledSingleUse'),
      rfr: get('rfr'),
      lotBasedProduct: /^y|yes|true$/i.test(get('lotBasedProduct')),
      description: [get('description'), get('briefDescription'), get('interfaceDetails'), get('updateDetails'), get('eventContext'), get('codeDescription')].filter(Boolean).join(' '),
      outcome: get('codeDescription'),
      patientImpact: /death|injur|hospital|intervention|surgery|medical|patient/i.test(`${get('description')} ${get('codeDescription')} ${get('updateDetails')}`),
      lotKnown: Boolean(get('lot') || get('lotNumber') || get('serialNumber')) && !/^unknown$/i.test(get('lot') || get('lotNumber') || get('serialNumber')),
      returned: get('returned') ? /^y|yes|true$/i.test(get('returned')) : undefined,
      reportable: get('reportable') ? /^y|yes|true$/i.test(get('reportable')) : undefined,
      raw: Object.fromEntries(headers.map((header, index) => [header, cells[index] || '']))
    };
  }).filter(row => row.complaintId || row.description || row.product);
}

export function summarizeBatch(rows, evaluator) {
  return rows.map(row => {
    const evaluation = evaluator(row);
    const results = Array.isArray(evaluation) ? evaluation : evaluation.results;
    const required = Array.isArray(evaluation) ? results.filter(result => result.recommendation === 'Required') : evaluation.required;
    const consider = Array.isArray(evaluation) ? results.filter(result => result.recommendation === 'Consider') : evaluation.consider;
    return {
      ...row,
      results,
      required,
      consider,
      highestScore: results[0]?.score || 0,
      decision: Array.isArray(evaluation) ? (required.length ? 'DHR needed' : consider.length ? 'DHR should be considered' : 'No DHR indicated from current facts') : evaluation.decision,
      confidence: Array.isArray(evaluation) ? (results[0]?.confidence || results[0]?.score || 0) : evaluation.confidence,
      confidenceLevel: Array.isArray(evaluation) ? (results[0]?.confidenceLevel || '') : evaluation.confidenceLevel,
      riskSignals: Array.isArray(evaluation) ? [] : evaluation.riskSignals,
      recommendedAssessments: required.map(result => result.name).join('; ') || 'No required assessment from current facts',
      considerAssessments: consider.map(result => result.name).join('; '),
      rationaleSummary: results.map(result => `${result.name}: ${result.recommendation}${result.rationales?.length ? ` — ${result.rationales.join('; ')}` : ''}`).join(' | ')
    };
  });
}

export function toCsv(rows) {
  const headers = ['Row', 'Complaint ID', 'Product', 'Lot/Serial', 'Decision', 'Confidence', 'Confidence Level', 'DHR Needed', 'Consider', 'Top Score', 'Why'];
  const escape = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const body = rows.map(row => [row.rowNumber, row.complaintId, row.product, row.lot, row.decision, row.confidence, row.confidenceLevel, row.recommendedAssessments, row.considerAssessments, row.highestScore, row.rationaleSummary].map(escape).join(','));
  return [headers.map(escape).join(','), ...body].join('\n');
}

function textDecoder() {
  return new TextDecoder('utf-8');
}

function readUint16(view, offset) {
  return view.getUint16(offset, true);
}

function readUint32(view, offset) {
  return view.getUint32(offset, true);
}

function decodeXmlEntities(value) {
  return String(value || '')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&amp;', '&');
}

function stripTags(value) {
  return decodeXmlEntities(String(value || '').replace(/<[^>]+>/g, ''));
}

async function inflateRaw(bytes) {
  if (typeof DecompressionStream !== 'undefined') {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  if (typeof process !== 'undefined') {
    const { inflateRawSync } = await import('node:zlib');
    return new Uint8Array(inflateRawSync(bytes));
  }
  throw new Error('This environment cannot decompress XLSX files. Use a modern browser or server-side import.');
}

async function unzipEntries(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  let eocdOffset = -1;
  for (let offset = view.byteLength - 22; offset >= Math.max(0, view.byteLength - 65558); offset -= 1) {
    if (readUint32(view, offset) === 0x06054b50) {
      eocdOffset = offset;
      break;
    }
  }
  if (eocdOffset < 0) throw new Error('Invalid XLSX file: ZIP directory not found.');

  const entryCount = readUint16(view, eocdOffset + 10);
  let centralOffset = readUint32(view, eocdOffset + 16);
  const entries = new Map();
  for (let index = 0; index < entryCount; index += 1) {
    if (readUint32(view, centralOffset) !== 0x02014b50) throw new Error('Invalid XLSX file: ZIP central directory is malformed.');
    const method = readUint16(view, centralOffset + 10);
    const compressedSize = readUint32(view, centralOffset + 20);
    const fileNameLength = readUint16(view, centralOffset + 28);
    const extraLength = readUint16(view, centralOffset + 30);
    const commentLength = readUint16(view, centralOffset + 32);
    const localHeaderOffset = readUint32(view, centralOffset + 42);
    const fileNameBytes = new Uint8Array(arrayBuffer, centralOffset + 46, fileNameLength);
    const fileName = textDecoder().decode(fileNameBytes);

    const localNameLength = readUint16(view, localHeaderOffset + 26);
    const localExtraLength = readUint16(view, localHeaderOffset + 28);
    const dataOffset = localHeaderOffset + 30 + localNameLength + localExtraLength;
    const compressed = new Uint8Array(arrayBuffer, dataOffset, compressedSize);
    let data;
    if (method === 0) data = compressed;
    else if (method === 8) data = await inflateRaw(compressed);
    else throw new Error(`Unsupported XLSX ZIP compression method ${method}.`);
    entries.set(fileName, textDecoder().decode(data));
    centralOffset += 46 + fileNameLength + extraLength + commentLength;
  }
  return entries;
}

function parseSharedStrings(xml = '') {
  return [...xml.matchAll(/<si[\s\S]*?<\/si>/g)].map(match => {
    const textRuns = [...match[0].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(text => decodeXmlEntities(text[1]));
    return textRuns.join('');
  });
}

function columnIndex(cellRef) {
  const letters = String(cellRef || '').match(/[A-Z]+/i)?.[0] || 'A';
  return [...letters.toUpperCase()].reduce((sum, char) => sum * 26 + char.charCodeAt(0) - 64, 0) - 1;
}

function parseSheetRows(xml = '', sharedStrings = []) {
  return [...xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)].map(rowMatch => {
    const cells = [];
    for (const cellMatch of rowMatch[1].matchAll(/<c([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attrs = cellMatch[1];
      const body = cellMatch[2];
      const ref = attrs.match(/\sr="([^"]+)"/)?.[1];
      const type = attrs.match(/\st="([^"]+)"/)?.[1];
      const valueMatch = body.match(/<v[^>]*>([\s\S]*?)<\/v>/);
      const inlineMatch = body.match(/<is[^>]*>([\s\S]*?)<\/is>/);
      let value = '';
      if (type === 's' && valueMatch) value = sharedStrings[Number(valueMatch[1])] || '';
      else if (type === 'inlineStr' && inlineMatch) value = stripTags(inlineMatch[1]);
      else if (valueMatch) value = decodeXmlEntities(valueMatch[1]);
      cells[columnIndex(ref)] = value;
    }
    return cells.map(cell => cell || '');
  }).filter(row => row.some(Boolean));
}

export async function parseXlsxComplaints(arrayBuffer) {
  const entries = await unzipEntries(arrayBuffer);
  const sheetName = [...entries.keys()].find(name => /^xl\/worksheets\/sheet\d+\.xml$/.test(name));
  if (!sheetName) throw new Error('No worksheet found in XLSX file.');
  const sharedStrings = parseSharedStrings(entries.get('xl/sharedStrings.xml'));
  const rows = parseSheetRows(entries.get(sheetName), sharedStrings);
  if (rows.length < 2) return [];
  const delimited = rows.map(row => row.map(value => `"${String(value ?? '').replaceAll('"', '""')}"`).join('\t')).join('\n');
  return parseDelimitedComplaints(delimited);
}
