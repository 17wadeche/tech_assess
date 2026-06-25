import { evaluateTechnicalAssessmentNeed } from './assessmentRules.js';
import { parseDelimitedComplaints, parseXlsxComplaints, summarizeBatch, toCsv } from './excelImport.js';

const state = { rows: [], analyzed: [] };

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2).toLowerCase(), value);
    else node.setAttribute(key, value);
  });
  children.forEach(child => node.append(child));
  return node;
}

function renderBatch() {
  const summary = document.querySelector('#batch-summary');
  const table = document.querySelector('#batch-table');
  if (!state.analyzed.length) {
    summary.textContent = 'Upload the full XLSX workbook to evaluate every complaint row.';
    table.replaceChildren();
    return;
  }
  const neededCount = state.analyzed.filter(row => row.decision === 'Technical assessment needed').length;
  const requiredCount = state.analyzed.filter(row => row.required.length).length;
  const avgConfidence = Math.round(state.analyzed.reduce((sum, row) => sum + row.confidence, 0) / state.analyzed.length);
  summary.textContent = `${state.analyzed.length} rows analyzed. ${neededCount} need a technical assessment. ${requiredCount} have one or more required assessment types. Average confidence: ${avgConfidence}%.`;
  table.replaceChildren(el('thead', {}, [el('tr', {}, ['Row', 'PE - PLI #', 'Product', 'Serial/Lot', 'Decision', 'Confidence', 'Required assessments', 'Consider', 'Why'].map(text => el('th', { text })))]),
    el('tbody', {}, state.analyzed.map(row => el('tr', {}, [
      el('td', { text: row.rowNumber }),
      el('td', { text: row.complaintId }),
      el('td', { text: row.product }),
      el('td', { text: row.lot }),
      el('td', { text: row.decision }),
      el('td', { text: `${row.confidenceLevel} (${row.confidence}%)` }),
      el('td', { text: row.recommendedAssessments }),
      el('td', { text: row.considerAssessments }),
      el('td', { text: row.rationaleSummary })
    ]))));
}

function analyzeRows(rows) {
  state.rows = rows;
  state.analyzed = summarizeBatch(state.rows, evaluateTechnicalAssessmentNeed);
  renderBatch();
}

async function loadFile(file) {
  const summary = document.querySelector('#batch-summary');
  summary.textContent = `Reading ${file.name}...`;
  try {
    const rows = /\.xlsx$/i.test(file.name)
      ? await parseXlsxComplaints(await file.arrayBuffer())
      : parseDelimitedComplaints(await file.text());
    analyzeRows(rows);
  } catch (error) {
    state.rows = [];
    state.analyzed = [];
    renderBatch();
    summary.textContent = `Could not read ${file.name}: ${error.message}`;
  }
}

function downloadCsv() {
  if (!state.analyzed.length) return;
  const blob = new Blob([toCsv(state.analyzed)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = el('a', { href: url, download: 'complaint-assessment-decisions.csv' });
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function init() {
  document.querySelector('#file-input').addEventListener('change', event => {
    const file = event.target.files[0];
    if (file) loadFile(file);
  });
  document.querySelector('#download-csv').addEventListener('click', downloadCsv);
  renderBatch();
}

init();
