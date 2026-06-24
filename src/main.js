import { evaluateComplaint } from './assessmentRules.js';
import { parseDelimitedComplaints, summarizeBatch, toCsv } from './excelImport.js';

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

function analyzeText() {
  const description = document.querySelector('#single-description').value;
  const product = document.querySelector('#single-product').value;
  const outcome = document.querySelector('#single-outcome').value;
  const patientImpact = document.querySelector('#patient-impact').checked;
  const lotKnown = document.querySelector('#lot-known').checked;
  renderResults(evaluateComplaint({ description, product, outcome, patientImpact, lotKnown }));
}

function renderResults(results) {
  const container = document.querySelector('#single-results');
  container.replaceChildren(...results.map(result => el('article', { class: `result ${result.recommendation.toLowerCase().replaceAll(' ', '-')}` }, [
    el('div', { class: 'resultHeader' }, [el('h3', { text: result.name }), el('span', { text: result.score })]),
    el('p', { class: 'badge', text: result.recommendation }),
    el('p', { text: result.purpose }),
    el('p', { class: 'small', text: result.matchedKeywords.length ? `Matched: ${result.matchedKeywords.join(', ')}` : 'No direct keyword match in current facts.' }),
    el('details', {}, [
      el('summary', { text: 'Evidence and next actions' }),
      el('ul', {}, result.evidence.map(item => el('li', { text: item }))),
      el('ol', {}, result.defaultActions.map(item => el('li', { text: item })))
    ])
  ])));
}

function renderBatch() {
  const summary = document.querySelector('#batch-summary');
  const table = document.querySelector('#batch-table');
  if (!state.analyzed.length) {
    summary.textContent = 'Upload an Excel-exported CSV/TSV file or paste rows copied from Excel.';
    table.replaceChildren();
    return;
  }
  const requiredCount = state.analyzed.filter(row => row.required.length).length;
  summary.textContent = `${state.analyzed.length} complaints analyzed. ${requiredCount} have one or more required assessments.`;
  table.replaceChildren(el('thead', {}, [el('tr', {}, ['Row', 'PE - PLI #', 'Product', 'Serial/Lot', 'Required assessments', 'Consider'].map(text => el('th', { text })))]),
    el('tbody', {}, state.analyzed.map(row => el('tr', {}, [
      el('td', { text: row.rowNumber }),
      el('td', { text: row.complaintId }),
      el('td', { text: row.product }),
      el('td', { text: row.lot }),
      el('td', { text: row.recommendedAssessments }),
      el('td', { text: row.considerAssessments })
    ]))));
}

function loadDelimitedText(text) {
  state.rows = parseDelimitedComplaints(text);
  state.analyzed = summarizeBatch(state.rows, evaluateComplaint);
  renderBatch();
}

function downloadCsv() {
  if (!state.analyzed.length) return;
  const blob = new Blob([toCsv(state.analyzed)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = el('a', { href: url, download: 'complaint-assessment-recommendations.csv' });
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function init() {
  document.querySelector('#single-form').addEventListener('input', analyzeText);
  document.querySelector('#file-input').addEventListener('change', event => {
    const file = event.target.files[0];
    if (!file) return;
    if (/\.xlsx$/i.test(file.name)) {
      document.querySelector('#batch-summary').textContent = 'This browser-only prototype does not parse native .xlsx workbooks yet. Save the sheet as CSV or copy/paste the Excel rows below.';
      return;
    }
    file.text().then(loadDelimitedText);
  });
  document.querySelector('#paste-data').addEventListener('input', event => loadDelimitedText(event.target.value));
  document.querySelector('#download-csv').addEventListener('click', downloadCsv);
  analyzeText();
  renderBatch();
}

init();
