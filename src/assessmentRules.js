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

export function evaluateComplaint(input = {}) {
  const text = buildText(input);
  const lotKnown = known(input.lot) || known(input.lotNumber) || known(input.serialNumber) || input.lotKnown === true;
  const missingEvidence = evidenceFields.filter(field => !input[field] && !(field === 'lot' && lotKnown));
  const factCompleteness = Math.round(((evidenceFields.length - missingEvidence.length) / evidenceFields.length) * 100);
  const dhr = evaluateDhrNeed(input);

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
    decision: required.length > 0 ? 'DHR needed' : consider.length > 0 ? 'DHR should be considered' : 'No DHR indicated from current facts',
    required,
    consider,
    results,
    riskSignals: unique([yes(input.reportable) ? 'Reportable flag in source data' : '', evaluateDhrNeed(input).required ? 'DHR business rules met' : ''])
  };
}
