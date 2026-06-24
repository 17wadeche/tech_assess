import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateComplaint, evaluateTechnicalAssessmentNeed } from '../src/assessmentRules.js';

test('flags serious event reviews and considers software review for a serious pump software event', () => {
  const results = evaluateComplaint({
    description: 'Pump stopped with error code and patient was hospitalized. Device is available for return.',
    patientImpact: true,
    lotKnown: false
  });
  const required = results.filter(result => result.recommendation === 'Required').map(result => result.id);
  assert.ok(required.includes('clinical-medical-review'));
  assert.ok(required.includes('regulatory-reportability-review'));
  assert.ok(required.includes('field-return-product-analysis'));
  const software = results.find(result => result.id === 'software-firmware-data-log-review');
  assert.ok(['Required', 'Consider'].includes(software.recommendation));
});

test('considers manufacturing review when lot information is known', () => {
  const results = evaluateComplaint({ description: 'Same lot has multiple cracked connectors', lotKnown: true });
  const manufacturing = results.find(result => result.id === 'manufacturing-dhr-bhr-review');
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
  assert.ok(evaluation.required.some(result => result.id === 'field-return-product-analysis'));
});
