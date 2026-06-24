const columnAliases = {
  complaintId: ['pe - pli #', 'pe pli #', 'complaint id', 'complaint #', 'record id'],
  product: ['product description - pe pli', 'product description', 'product'],
  lot: ['serial/lot # - pe pli', 'serial/lot #', 'serial lot', 'lot', 'serial'],
  interfaceDetails: ['interface details - pe', 'interface details'],
  updateDetails: ['interface update details - pe', 'interface update details'],
  description: ['event description - pe', 'event description', 'description', 'narrative'],
  eventContext: ['event context', 'event context - pe'],
  codeDescription: ['code/llt desc - pe pli', 'code/llt desc', 'code description'],
  complaint: ['complaint? - pe', 'complaint?'],
  reportable: ['reportable?', 'reportable'],
  returned: ['product returned to mdt?', 'product returned', 'returned'],
  noReturnRationale: ['rationale for no return', 'no return rationale']
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
      lot: get('lot'),
      description: [get('description'), get('interfaceDetails'), get('updateDetails'), get('eventContext'), get('codeDescription'), get('noReturnRationale')].filter(Boolean).join(' '),
      outcome: get('codeDescription'),
      patientImpact: /death|injur|hospital|intervention|surgery|medical|patient/i.test(`${get('description')} ${get('codeDescription')} ${get('updateDetails')}`),
      lotKnown: Boolean(get('lot')) && !/^unknown$/i.test(get('lot')),
      returned: /^y|yes|true$/i.test(get('returned')),
      reportable: /^y|yes|true$/i.test(get('reportable')),
      raw: Object.fromEntries(headers.map((header, index) => [header, cells[index] || '']))
    };
  }).filter(row => row.complaintId || row.description || row.product);
}

export function summarizeBatch(rows, evaluator) {
  return rows.map(row => {
    const results = evaluator(row);
    const required = results.filter(result => result.recommendation === 'Required');
    const consider = results.filter(result => result.recommendation === 'Consider');
    return {
      ...row,
      results,
      required,
      consider,
      highestScore: results[0]?.score || 0,
      recommendedAssessments: required.map(result => result.name).join('; ') || 'No required assessment from current facts',
      considerAssessments: consider.map(result => result.name).join('; ')
    };
  });
}

export function toCsv(rows) {
  const headers = ['Row', 'Complaint ID', 'Product', 'Lot/Serial', 'Required Assessments', 'Consider Assessments', 'Top Score'];
  const escape = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const body = rows.map(row => [row.rowNumber, row.complaintId, row.product, row.lot, row.recommendedAssessments, row.considerAssessments, row.highestScore].map(escape).join(','));
  return [headers.map(escape).join(','), ...body].join('\n');
}
