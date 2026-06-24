import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateComplaint } from '../src/assessmentRules.js';

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
