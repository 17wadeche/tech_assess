export const assessmentOptions = [
  {
    id: 'device-history-review',
    name: 'DeviceHistory Review',
    owner: 'Complaint handling / quality engineering',
    purpose: 'Review the device or product history for prior related complaints, service history, lot/serial traceability, and known event patterns.',
    keywords: ['device history', 'serial', 'lot', 'udi', 'prior complaint', 'previous event', 'same lot', 'trend', 'returned', 'returning', 'available for return', 'explanted'],
    evidence: ['Serial/lot/UDI', 'Prior complaint history', 'Return status', 'Service or usage history'],
    defaultActions: ['Check device and lot complaint history', 'Document prior related events and traceability findings']
  },
  {
    id: 'mfg-assessment',
    name: 'Mfg Assessment',
    owner: 'Manufacturing quality',
    purpose: 'Assess whether manufacturing records, process controls, nonconformances, or lot/batch history may explain the alleged product issue.',
    keywords: ['manufacturing', 'mfg', 'dhr', 'bhr', 'batch', 'lot', 'nonconformance', 'deviation', 'rework', 'broken', 'broke', 'detached', 'cracked', 'did not activate', 'failure', 'failed'],
    evidence: ['Lot/batch number', 'DHR/BHR records', 'Nonconformance/deviation history', 'Manufacturing release records'],
    defaultActions: ['Review manufacturing records for the lot/batch', 'Check nonconformance, deviation, rework, and release history']
  },
  {
    id: 'design-assessment',
    name: 'Design Assessment',
    owner: 'Design quality / product engineering',
    purpose: 'Assess whether the complaint suggests a design, specification, performance, usability, or recurring product design issue.',
    keywords: ['design', 'specification', 'recurrence', 'recurring', 'trend', 'malfunction', 'alarm', 'error code', 'would not', 'stopped', 'intermittent', 'software', 'firmware', 'usability', 'use error'],
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
  },
  {
    id: 'risk-assessment-review',
    name: 'RiskAssessmentReview',
    owner: 'Risk management / quality engineering',
    purpose: 'Review whether the event changes risk acceptability, severity/probability assumptions, risk controls, or benefit-risk conclusions.',
    keywords: ['risk', 'hazard', 'harm', 'injury', 'death', 'hospitalized', 'hospitalization', 'intervention', 'surgery', 'patient', 'adverse', 'malfunction', 'could cause', 'recurrence'],
    evidence: ['Patient outcome', 'Hazardous situation/failure mode', 'Severity and probability rationale', 'Existing risk-control mapping'],
    defaultActions: ['Map the complaint to existing risk-analysis hazards', 'Assess whether risk files or risk-control effectiveness need review']
  },
  {
    id: 'pli-geo-rd-review',
    name: 'PLI GEO RD Review',
    owner: 'Product line / geography R&D owner',
    purpose: 'Route product-line or geography-specific issues to the responsible R&D owner for additional review when local/product context is needed.',
    keywords: ['pli', 'geo', 'region', 'country', 'site', 'clinic', 'hospital', 'product line', 'r&d', 'rd', 'model number', 'product family'],
    evidence: ['Product line identifier', 'Country/region/site', 'Model number', 'Local complaint context'],
    defaultActions: ['Identify responsible product-line/geography R&D owner', 'Request product- or region-specific input when triggered']
  },
  {
    id: 'image-review',
    name: 'Image Review',
    owner: 'Quality engineering / product analysis',
    purpose: 'Review available images, attachments, screenshots, or photos for visible damage, labeling, packaging, or product-condition evidence.',
    keywords: ['image', 'photo', 'picture', 'screenshot', 'attachment', 'visible', 'label photo', 'packaging photo', 'damage shown'],
    evidence: ['Images/photos/screenshots', 'Attachment metadata', 'Product/packaging condition shown', 'Label or UDI images'],
    defaultActions: ['Request or review images/attachments', 'Document visible evidence and whether it supports the alleged issue']
  },
  {
    id: 'reassess-reporting',
    name: 'Reassess - Reporting',
    owner: 'Regulatory affairs / complaint handling',
    purpose: 'Reassess reporting when complaint facts indicate possible reportability changes, patient impact, malfunction, or new follow-up information.',
    keywords: ['reportable', 'reassess', 'mdr', 'vigilance', 'death', 'serious injury', 'hospitalized', 'hospitalization', 'intervention', 'malfunction', 'no injury', 'patient outcome', 'follow-up'],
    evidence: ['Reportability flag', 'Patient outcome', 'New or changed facts', 'Device contribution and recurrence rationale'],
    defaultActions: ['Reassess reporting decision against current facts', 'Document rationale and any reporting-clock impact']
  }
];

const highRiskPatterns = [/death|died/i, /serious injury|hospital/i, /intervention|surgery/i, /reportable|mdr|vigilance/i];
const malfunctionPatterns = [/malfunction|fail|failure|stopped|alarm|broken|cracked|detached|broke|did not activate|would not|error code/i];
const evidenceFields = ['description', 'product', 'outcome', 'lot'];

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function confidenceLabel(score) {
  if (score >= 80) return 'High';
  if (score >= 55) return 'Medium';
  if (score >= 30) return 'Low';
  return 'Very low';
}

function buildText(input) {
  return `${input?.description || ''} ${input?.product || ''} ${input?.outcome || ''} ${input?.eventContext || ''} ${input?.codeDescription || ''}`.toLowerCase();
}

export function evaluateComplaint(input = {}) {
  const text = buildText(input);
  const hasReturn = /return|returned|available|explanted|sample/.test(text) || input.returned === true;
  const patientImpact = Boolean(input.patientImpact) || /death|injur|hospital|intervention|surgery|medical|patient symptom|adverse/.test(text);
  const lotKnown = Boolean(input.lotKnown) || Boolean(input.lot) && !/^unknown|n\/a|na$/i.test(input.lot);
  const reportable = Boolean(input.reportable) || /reportable|mdr|vigilance|serious injury|death/.test(text);
  const malfunction = malfunctionPatterns.some(pattern => pattern.test(text));
  const missingEvidence = evidenceFields.filter(field => !input[field]);
  const factCompleteness = Math.round(((evidenceFields.length - missingEvidence.length) / evidenceFields.length) * 100);

  const results = assessmentOptions.map(option => {
    const matchedKeywords = option.keywords.filter(keyword => text.includes(keyword.toLowerCase()));
    const rationales = matchedKeywords.map(keyword => `Matched "${keyword}"`);
    let score = matchedKeywords.length * 18;

    if (option.id === 'device-history-review' && (lotKnown || hasReturn)) {
      score += lotKnown ? 20 : 0;
      score += hasReturn ? 15 : 0;
      rationales.push('Lot/serial or return facts support device-history review');
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
    if (option.id === 'risk-assessment-review' && (patientImpact || malfunction)) {
      score += patientImpact ? 25 : 0;
      score += malfunction ? 20 : 0;
      rationales.push('Patient impact and/or malfunction facts support risk assessment review');
    }
    if (option.id === 'pli-geo-rd-review' && (input.product || /model number|product family|clinic|hospital|country|region/.test(text))) {
      score += 12;
      rationales.push('Product-line or geography context may need owner review');
    }
    if (option.id === 'image-review' && /photo|image|picture|screenshot|attachment/.test(text)) {
      score += 30;
      rationales.push('Image or attachment evidence is available or requested');
    }
    if (option.id === 'reassess-reporting' && (reportable || patientImpact || malfunction)) {
      score += reportable ? 30 : 0;
      score += patientImpact ? 20 : 0;
      score += malfunction ? 15 : 0;
      rationales.push('Reporting reassessment is supported by reportability, patient impact, or malfunction facts');
    }

    const boundedScore = Math.min(score, 100);
    const confidence = Math.min(100, Math.round((boundedScore * 0.7) + (factCompleteness * 0.3)));
    return {
      ...option,
      matchedKeywords,
      rationales: unique(rationales),
      score: boundedScore,
      confidence,
      confidenceLevel: confidenceLabel(confidence),
      recommendation: boundedScore >= 45 ? 'Required' : boundedScore >= 18 ? 'Consider' : 'Not indicated from current facts'
    };
  }).sort((a, b) => b.score - a.score || b.confidence - a.confidence || a.name.localeCompare(b.name));

  return results;
}

export function evaluateTechnicalAssessmentNeed(input = {}) {
  const results = evaluateComplaint(input);
  const required = results.filter(result => result.recommendation === 'Required');
  const consider = results.filter(result => result.recommendation === 'Consider');
  const text = buildText(input);
  const highRisk = highRiskPatterns.some(pattern => pattern.test(text));
  const malfunction = malfunctionPatterns.some(pattern => pattern.test(text));
  const topScore = results[0]?.score || 0;
  const confidence = Math.min(100, Math.round(Math.max(results[0]?.confidence || 0, topScore, highRisk ? 85 : 0, malfunction ? 70 : 0)));

  return {
    technicalAssessmentNeeded: required.length > 0 || highRisk || malfunction,
    confidence,
    confidenceLevel: confidenceLabel(confidence),
    decision: required.length > 0 || highRisk || malfunction ? 'Technical assessment needed' : consider.length > 0 ? 'Technical assessment should be considered' : 'No technical assessment indicated from current facts',
    required,
    consider,
    results,
    riskSignals: unique([
      highRisk ? 'High-risk patient-impact or reporting signal' : '',
      malfunction ? 'Device malfunction or performance issue signal' : '',
      input.returned ? 'Product returned/available' : '',
      input.reportable ? 'Reportable flag in source data' : ''
    ])
  };
}
