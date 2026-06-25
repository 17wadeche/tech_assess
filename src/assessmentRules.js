export const assessmentOptions = [
  {
    id: 'device-history-review',
    name: 'DeviceHistory Review',
    owner: 'Complaint handling / quality engineering',
    purpose: 'Review the device history record when the DHR business-rule conditions are met and no DHR exclusion applies.',
    keywords: ['failure out of box', 'foob', 'out of box failure', 'oobf', 'out of box', 'out of the box', 'doa'],
    evidence: ['Reportable? = Yes', 'Product not returned with allowed rationale', 'FOOB/OOB/DOA text, single-use label, or lot-based product', 'Known serial/lot and non-excluded RFR'],
    defaultActions: ['Perform DHR review for the known serial/lot', 'Document the triggering condition and confirm no exclusion criteria apply']
  },
  {
    id: 'mfg-assessment',
    name: 'Mfg Assessment',
    owner: 'Manufacturing quality',
    purpose: 'Assess whether manufacturing records, process controls, nonconformances, or lot/batch history may explain the alleged product issue.',
    keywords: ['manufacturing', 'mfg', 'dhr', 'bhr', 'batch', 'lot', 'nonconformance', 'deviation', 'rework', 'broken', 'broke', 'detached', 'cracked', 'did not activate', 'failure', 'failed', 'staple line incomplete', 'did not fire'],
    evidence: ['Lot/batch number', 'DHR/BHR records', 'Nonconformance/deviation history', 'Manufacturing release records'],
    defaultActions: ['Review manufacturing records for the lot/batch', 'Check nonconformance, deviation, rework, and release history']
  },
  {
    id: 'design-assessment',
    name: 'Design Assessment',
    owner: 'Design quality / product engineering',
    purpose: 'Assess whether the complaint suggests a design, specification, performance, usability, or recurring product design issue.',
    keywords: ['design', 'specification', 'recurrence', 'recurring', 'trend', 'malfunction', 'alarm', 'error code', 'would not', 'will not', 'stopped', 'intermittent', 'software', 'firmware', 'usability', 'use error', 'unable to', 'difficult to'],
    evidence: ['Failure mode', 'Design inputs/outputs', 'Known issue or trend data', 'Software/firmware version when applicable'],
    defaultActions: ['Compare the failure mode to design requirements and known issues', 'Review trend data and product risk controls']
  },
  {
    id: 'cm-oem-assessment',
    name: 'CM/OEM Assessment',
    owner: 'Supplier quality / external manufacturing quality',
    purpose: 'Assess whether a contract manufacturer, OEM, supplier, component, or externally manufactured accessory may be implicated.',
    keywords: ['cm', 'oem', 'supplier', 'contract manufacturer', 'component', 'accessory', 'handpiece', 'generator', 'connector', 'cable', 'battery', 'lead', 'third party', 'material'],
    evidence: ['Supplier or CM/OEM identity', 'Component part number', 'Supplier lot', 'Incoming inspection and supplier quality history'],
    defaultActions: ['Determine whether the implicated item is CM/OEM or supplier-controlled', 'Review supplier quality history and notify responsible owner if criteria are met']
  }
];

const malfunctionPatterns = [/malfunction|fail|failure|stopped|alarm|broken|cracked|detached|broke|did not activate|would not|will not|error code|unable to|difficult to|did not fire|incomplete/i];
const foobPatterns = [/failure out of box|\bfoob\b|out of box failure|\boobf\b|out of box|out of the box|\bdoa\b/i];
const excludedNoReturnRationales = ['unknown', 'expected', 'evaluated in the field'];
const excludedRfrValues = ['not a complaint', 'no reported condition', 'customer feedback', 'procedure related adverse event – unrelated to device', 'procedure related adverse event - unrelated to device'];
const evidenceFields = ['description', 'product', 'lot'];

function unique(values) { return [...new Set(values.filter(Boolean))]; }
function confidenceLabel(score) { if (score >= 80) return 'High'; if (score >= 55) return 'Medium'; if (score >= 30) return 'Low'; return 'Very low'; }
function yes(value) { return value === true || /^y|yes|true$/i.test(String(value || '').trim()); }
function no(value) { return value === false || /^n|no|false$/i.test(String(value || '').trim()); }
function known(value) { return Boolean(String(value || '').trim()) && !/^unknown|n\/a|na$/i.test(String(value).trim()); }
function normalize(value) { return String(value || '').trim().toLowerCase(); }
function buildText(input) { return `${input?.description || ''} ${input?.briefDescription || ''} ${input?.interfaceDetails || ''} ${input?.eventContext || ''} ${input?.codeDescription || ''} ${input?.product || ''} ${input?.outcome || ''}`.toLowerCase(); }

export function evaluateDhrNeed(input = {}) {
  const text = buildText(input);
  const lotOrSerialKnown = known(input.serialNumber) || known(input.lotNumber) || known(input.lot);
  const reportable = yes(input.reportable);
  const notReturned = no(input.returned);
  const noReturnAllowed = !excludedNoReturnRationales.includes(normalize(input.noReturnRationale));
  const keywordTrigger = foobPatterns.some(pattern => pattern.test(`${input.description || ''} ${input.briefDescription || ''}`));
  const singleUseTrigger = yes(input.labeledSingleUse);
  const lotBasedTrigger = yes(input.lotBasedProduct) || (known(input.lotNumber) && !known(input.serialNumber));
  const condition3 = keywordTrigger || singleUseTrigger || lotBasedTrigger;
  const rfrExcluded = excludedRfrValues.includes(normalize(input.rfr || input.codeDescription));
  const excluded = !lotOrSerialKnown || rfrExcluded;
  const required = reportable && notReturned && noReturnAllowed && condition3 && !excluded;

  return {
    required,
    conditions: { reportable, productNotReturnedWithAllowedRationale: notReturned && noReturnAllowed, eventOrSingleUseOrLotBased: condition3 },
    exclusions: { unknownSerialOrLot: !lotOrSerialKnown, excludedRfr: rfrExcluded },
    triggers: unique([keywordTrigger ? 'FOOB/OOB/DOA keyword in event or brief description' : '', singleUseTrigger ? 'Labeled for Single Use = Y' : '', lotBasedTrigger ? 'Product is treated as lot-based' : ''])
  };
}

export function evaluateComplaint(input = {}) {
  const text = buildText(input);
  const lotKnown = known(input.lot) || known(input.lotNumber) || known(input.serialNumber) || input.lotKnown === true;
  const malfunction = malfunctionPatterns.some(pattern => pattern.test(text));
  const missingEvidence = evidenceFields.filter(field => !input[field] && !(field === 'lot' && lotKnown));
  const factCompleteness = Math.round(((evidenceFields.length - missingEvidence.length) / evidenceFields.length) * 100);
  const dhr = evaluateDhrNeed(input);

  return assessmentOptions.map(option => {
    const matchedKeywords = option.keywords.filter(keyword => text.includes(keyword.toLowerCase()));
    const rationales = matchedKeywords.map(keyword => `Matched "${keyword}"`);
    let score = matchedKeywords.length * 18;

    if (option.id === 'device-history-review') {
      score = dhr.required ? 100 : Object.values(dhr.conditions).filter(Boolean).length * 18;
      rationales.push(...dhr.triggers);
      if (dhr.exclusions.unknownSerialOrLot) rationales.push('Excluded: serial/lot is unknown');
      if (dhr.exclusions.excludedRfr) rationales.push('Excluded: RFR is excluded from DHR');
    }
    if (option.id === 'mfg-assessment' && (lotKnown || malfunction)) {
      score += lotKnown ? 15 : 0;
      score += malfunction ? 25 : 0;
      rationales.push('Manufacturing review is supported by traceability and/or malfunction facts');
    }
    if (option.id === 'design-assessment' && malfunction) {
      score += 20;
      rationales.push('Failure mode may require design assessment');
    }
    if (option.id === 'cm-oem-assessment' && /accessory|component|supplier|handpiece|generator|connector|cable|oem|contract manufacturer/.test(text)) {
      score += 25;
      rationales.push('Accessory/component/supplier signal may require CM/OEM assessment');
    }

    const boundedScore = Math.min(score, 100);
    const confidence = Math.min(100, Math.round((boundedScore * 0.7) + (factCompleteness * 0.3)));
    return { ...option, matchedKeywords, rationales: unique(rationales), score: boundedScore, confidence, confidenceLevel: confidenceLabel(confidence), recommendation: option.id === 'device-history-review' ? (dhr.required ? 'Required' : 'Not indicated from current facts') : boundedScore >= 45 ? 'Required' : boundedScore >= 18 ? 'Consider' : 'Not indicated from current facts' };
  }).sort((a, b) => b.score - a.score || b.confidence - a.confidence || a.name.localeCompare(b.name));
}

export function evaluateTechnicalAssessmentNeed(input = {}) {
  const results = evaluateComplaint(input);
  const required = results.filter(result => result.recommendation === 'Required');
  const consider = results.filter(result => result.recommendation === 'Consider');
  const topScore = results[0]?.score || 0;
  const confidence = Math.min(100, Math.round(Math.max(results[0]?.confidence || 0, topScore)));
  return {
    technicalAssessmentNeeded: required.length > 0,
    confidence,
    confidenceLevel: confidenceLabel(confidence),
    decision: required.length > 0 ? 'Technical assessment needed' : consider.length > 0 ? 'Technical assessment should be considered' : 'No technical assessment indicated from current facts',
    required,
    consider,
    results,
    riskSignals: unique([input.reportable ? 'Reportable flag in source data' : '', evaluateDhrNeed(input).required ? 'DHR business rules met' : ''])
  };
}
