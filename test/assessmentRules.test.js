import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateComplaint, evaluateTechnicalAssessmentNeed } from '../src/assessmentRules.js';

test('uses the approved assessment option names for a serious malfunction event', () => {
  const results = evaluateComplaint({
    description: 'Pump stopped with error code and patient was hospitalized. Device is available for return.',
    patientImpact: true,
    lotKnown: false
  });
  const required = results.filter(result => result.recommendation === 'Required').map(result => result.id);
  assert.ok(required.includes('risk-assessment-review'));
  assert.ok(required.includes('reassess-reporting'));
  assert.ok(required.includes('design-assessment'));
  assert.deepEqual([...results.map(result => result.name)].sort(), [
    'CM/OEM Assessment',
    'Design Assessment',
    'DeviceHistory Review',
    'Mfg Assessment',
    'RiskAssessmentReview'
  ]);
});

test('considers Mfg Assessment when lot information and product damage are known', () => {
  const results = evaluateComplaint({ description: 'Same lot has multiple cracked connectors', lotKnown: true });
  const manufacturing = results.find(result => result.id === 'mfg-assessment');
  assert.ok(['Required', 'Consider'].includes(manufacturing.recommendation));
  assert.ok(manufacturing.score > 0);
});

import { parseDelimitedComplaints, summarizeBatch, toCsv } from '../src/excelImport.js';

test('parses Excel-exported complaint rows using screenshot-style headers', () => {
  const text = [
    'PE - PLI #\tProduct Description - PE PLI\tSerial/Lot # - PE PLI\tEvent Description - PE\tEvent Context\tCode/LLT Desc - PE PLI\tComplaint? - PE\tReportable?\tProduct Returned to MDT?\tRationale for no return',
    '0708488532-10\tVLOCN0346 VLOC PBT 0 BLU 9 GS-21\tA4F1829VY\tIt was reported that during use the device stopped and alarmed\tIntra Operative\tNEEDLE DETACHED\tY\tYes\tY\t'
  ].join('\n');
  const rows = parseDelimitedComplaints(text);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].complaintId, '0708488532-10');
  assert.equal(rows[0].product, 'VLOCN0346 VLOC PBT 0 BLU 9 GS-21');
  assert.equal(rows[0].lotKnown, true);
  assert.equal(rows[0].returned, true);
  assert.equal(rows[0].reportable, true);
});

test('summarizes imported rows and exports recommendation CSV', () => {
  const rows = parseDelimitedComplaints('PE - PLI #,Product Description - PE PLI,Serial/Lot # - PE PLI,Event Description - PE,Code/LLT Desc - PE PLI,Product Returned to MDT?\n1,Pump,LOT1,Patient hospitalized after error code alarm,DEVICE DID NOT ACTIVATE,Y');
  const analyzed = summarizeBatch(rows, evaluateComplaint);
  assert.equal(analyzed.length, 1);
  assert.ok(analyzed[0].required.length > 0);
  const csv = toCsv(analyzed);
  assert.match(csv, /Required Assessments/);
  assert.match(csv, /Complaint ID/);
});


test('returns an overall technical assessment decision with confidence', () => {
  const evaluation = evaluateTechnicalAssessmentNeed({
    description: 'During gastric bypass the suture broke at the weld while suturing and product will be returned.',
    product: 'VLOC suture',
    lot: 'A4F1829VY',
    lotKnown: true,
    returned: true
  });
  assert.equal(evaluation.technicalAssessmentNeeded, true);
  assert.equal(evaluation.decision, 'Technical assessment needed');
  assert.ok(evaluation.confidence >= 70);
  assert.ok(evaluation.required.some(result => result.id === 'mfg-assessment'));
});

function makeStoredZip(files) {
  const encoder = new TextEncoder();
  const chunks = [];
  const central = [];
  let offset = 0;
  const u16 = value => [value & 255, (value >> 8) & 255];
  const u32 = value => [value & 255, (value >> 8) & 255, (value >> 16) & 255, (value >> 24) & 255];
  for (const [name, content] of Object.entries(files)) {
    const nameBytes = encoder.encode(name);
    const data = encoder.encode(content);
    const local = new Uint8Array([
      ...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(data.length), ...u32(data.length), ...u16(nameBytes.length), ...u16(0)
    ]);
    chunks.push(local, nameBytes, data);
    central.push({ nameBytes, size: data.length, offset });
    offset += local.length + nameBytes.length + data.length;
  }
  const centralOffset = offset;
  for (const entry of central) {
    const header = new Uint8Array([
      ...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(entry.size), ...u32(entry.size), ...u16(entry.nameBytes.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(entry.offset)
    ]);
    chunks.push(header, entry.nameBytes);
    offset += header.length + entry.nameBytes.length;
  }
  const centralSize = offset - centralOffset;
  chunks.push(new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(central.length), ...u16(central.length), ...u32(centralSize), ...u32(centralOffset), ...u16(0)]));
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const zip = new Uint8Array(total);
  let cursor = 0;
  for (const chunk of chunks) {
    zip.set(chunk, cursor);
    cursor += chunk.length;
  }
  return zip.buffer;
}

test('parses a native XLSX workbook and analyzes every complaint row', async () => {
  const { parseXlsxComplaints } = await import('../src/excelImport.js');
  const sheet = `<?xml version="1.0" encoding="UTF-8"?><worksheet><sheetData>
    <row r="1"><c r="A1" t="inlineStr"><is><t>PE - PLI #</t></is></c><c r="B1" t="inlineStr"><is><t>Product Description - PE PLI</t></is></c><c r="C1" t="inlineStr"><is><t>Serial/Lot # - PE PLI</t></is></c><c r="D1" t="inlineStr"><is><t>Event Description - PE</t></is></c><c r="E1" t="inlineStr"><is><t>Code/LLT Desc - PE PLI</t></is></c><c r="F1" t="inlineStr"><is><t>Product Returned to MDT?</t></is></c></row>
    <row r="2"><c r="A2" t="inlineStr"><is><t>0708488532-10</t></is></c><c r="B2" t="inlineStr"><is><t>VLOC suture</t></is></c><c r="C2" t="inlineStr"><is><t>A4F1829VY</t></is></c><c r="D2" t="inlineStr"><is><t>Suture broke during use and product will be returned.</t></is></c><c r="E2" t="inlineStr"><is><t>NEEDLE DETACHED</t></is></c><c r="F2" t="inlineStr"><is><t>Y</t></is></c></row>
  </sheetData></worksheet>`;
  const workbook = makeStoredZip({ 'xl/worksheets/sheet1.xml': sheet });
  const rows = await parseXlsxComplaints(workbook);
  const analyzed = summarizeBatch(rows, evaluateTechnicalAssessmentNeed);
  assert.equal(analyzed.length, 1);
  assert.equal(analyzed[0].decision, 'Technical assessment needed');
  assert.ok(analyzed[0].required.some(result => result.id === 'mfg-assessment'));
  assert.ok(analyzed[0].required.every(result => ['DeviceHistory Review', 'Mfg Assessment', 'Design Assessment', 'CM/OEM Assessment', 'RiskAssessmentReview',].includes(result.name)));
});
