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
    id: 'design-assessment',
    name: 'Design Assessment',
    owner: 'Design quality / product engineering',
    purpose: 'Assess whether the complaint suggests a design, specification, performance, usability, or recurring product design issue.',
    keywords: ['design', 'specification', 'recurrence', 'recurring', 'trend', 'malfunction', 'alarm', 'error code', 'would not', 'will not', 'stopped', 'intermittent', 'software', 'firmware', 'usability', 'use error', 'unable to', 'difficult to'],
    evidence: ['Failure mode and affected function', 'Design inputs/outputs or specifications', 'Known issue, repeat complaint, or trend data', 'Software/firmware version when applicable'],
    defaultActions: ['Compare the failure mode to design requirements and known issues', 'Review trend data, risk controls, usability factors, and software/firmware history']
  },
];

const designSignalGroups = [
  { name: 'Functional failure', weight: 28, patterns: [/malfunction|fail(?:ed|ure)?|stopped|broken|broke|did not activate|did not fire|would not|will not|unable to|incomplete|no output|loss of/i] },
  { name: 'Alarm, error, or diagnostic code', weight: 24, patterns: [/alarm|alert|error code|fault code|diagnostic|code\s*\d+/i] },
  { name: 'Software or firmware factor', weight: 24, patterns: [/software|firmware|app|version|upgrade|update|configuration|programming/i] },
  { name: 'Design specification or requirements concern', weight: 30, patterns: [/design|specification|requirement|tolerance|dimension|performance|output|input/i] },
  { name: 'Usability or human factors concern', weight: 22, patterns: [/usability|use error|user interface|human factor|unable to|difficult to|confusing|training/i] },
  { name: 'Recurring issue or trend', weight: 26, patterns: [/recurr|repeat|multiple|trend|same lot|similar complaints?|known issue/i] },
  { name: 'Physical integrity affecting performance', weight: 20, patterns: [/cracked|detached|leak|fracture|weld|separated|bent|kink|delaminat|connector/i] },
  { name: 'Clinical impact reported with device behavior', weight: 18, patterns: [/death|injur|hospital|intervention|surgery|therapy interrupted|patient|clinical/i] },
];
const foobPatterns = [/failure out of box|\bfoob\b|out of box failure|\boobf\b|out of box|out of the box|\bdoa\b/i];
const excludedNoReturnRationales = ['unknown', 'expected', 'evaluated in the field'];
const excludedRfrValues = ['not a complaint', 'no reported condition', 'customer feedback', 'procedure related adverse event – unrelated to device', 'procedure related adverse event - unrelated to device'];
const evidenceFields = ['description', 'product', 'lot'];

function unique(values) { return [...new Set(values.filter(Boolean))]; }
function confidenceLabel(score) { if (score >= 80) return 'High'; if (score >= 55) return 'Medium'; if (score >= 30) return 'Low'; return 'Very low'; }
function yes(value) { return value === true || /^(y|yes|true)$/i.test(String(value || '').trim()); }
function no(value) { return value === false || /^(n|no|false)$/i.test(String(value || '').trim()); }
function known(value) { return Boolean(String(value || '').trim()) && !/^(unknown|n\/a|na)$/i.test(String(value).trim()); }
function normalize(value) { return String(value || '').trim().toLowerCase(); }
function buildText(input) { return `${input?.description || ''} ${input?.briefDescription || ''} ${input?.interfaceDetails || ''} ${input?.eventContext || ''} ${input?.codeDescription || ''} ${input?.product || ''} ${input?.outcome || ''}`.toLowerCase(); }
function recommendationFor(score, requiredAt = 60, considerAt = 22) { return score >= requiredAt ? 'Required' : score >= considerAt ? 'Consider' : 'Not indicated from current facts'; }

export function evaluateDhrNeed(input = {}) {
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

export function evaluateDesignNeed(input = {}) {
  const text = buildText(input);
  const signals = designSignalGroups.flatMap(group => group.patterns.some(pattern => pattern.test(text)) ? [{ name: group.name, weight: group.weight }] : []);
  const matchedSignalNames = signals.map(signal => signal.name);
  const baseScore = signals.reduce((sum, signal) => sum + signal.weight, 0);
  const productKnown = known(input.product);
  const lotKnown = known(input.lot) || known(input.lotNumber) || known(input.serialNumber) || input.lotKnown === true;
  const factBoost = (productKnown ? 6 : 0) + (lotKnown ? 4 : 0) + (input.patientImpact === true ? 8 : 0);
  const score = Math.min(100, baseScore + factBoost);
  const recommendation = recommendationFor(score, 50, 24);
  const reasons = unique([
    ...matchedSignalNames.map(name => `Design signal: ${name}`),
    productKnown ? 'Product/family is available for design comparison' : '',
    lotKnown ? 'Lot/serial context is available for trend comparison' : '',
    input.patientImpact === true ? 'Patient impact increases assessment priority' : '',
    recommendation === 'Not indicated from current facts' ? 'No design, performance, usability, software, recurrence, or functional-failure signal was found' : ''
  ]);
  return { required: recommendation === 'Required', score, recommendation, signals: matchedSignalNames, reasons };
}

export function evaluateComplaint(input = {}) {
  const text = buildText(input);
  const lotKnown = known(input.lot) || known(input.lotNumber) || known(input.serialNumber) || input.lotKnown === true;
  const missingEvidence = evidenceFields.filter(field => !input[field] && !(field === 'lot' && lotKnown));
  const factCompleteness = Math.round(((evidenceFields.length - missingEvidence.length) / evidenceFields.length) * 100);
  const dhr = evaluateDhrNeed(input);
  const design = evaluateDesignNeed(input);

  return assessmentOptions.map(option => {
    const matchedKeywords = option.keywords.filter(keyword => text.includes(keyword.toLowerCase()));
    const rationales = matchedKeywords.map(keyword => `Matched keyword: "${keyword}"`);
    let score = matchedKeywords.length * 18;
    let recommendation;

    if (option.id === 'device-history-review') {
      score = dhr.required ? 100 : Object.values(dhr.conditions).filter(Boolean).length * 18;
      rationales.push(...dhr.triggers);
      if (dhr.exclusions.unknownSerialOrLot) rationales.push('Excluded: serial/lot is unknown');
      if (dhr.exclusions.excludedRfr) rationales.push('Excluded: RFR is excluded from DHR');
      recommendation = dhr.required ? 'Required' : 'Not indicated from current facts';
    }
    if (option.id === 'design-assessment') {
      score = Math.max(score, design.score);
      rationales.push(...design.reasons);
      recommendation = design.recommendation;
    }

    const boundedScore = Math.min(score, 100);
    const confidence = Math.min(100, Math.round((boundedScore * 0.72) + (factCompleteness * 0.28)));
    return { ...option, matchedKeywords, rationales: unique(rationales), score: boundedScore, confidence, confidenceLevel: confidenceLabel(confidence), recommendation: recommendation || recommendationFor(boundedScore) };
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
    riskSignals: unique([yes(input.reportable) ? 'Reportable flag in source data' : '', evaluateDhrNeed(input).required ? 'DHR business rules met' : '', results.find(result => result.id === 'design-assessment')?.recommendation === 'Required' ? 'Design Assessment rule threshold met' : ''])
  };
}
