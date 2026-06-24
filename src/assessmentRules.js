export const assessmentOptions = [
  {
    id: 'field-return-product-analysis',
    name: 'Field return / product analysis',
    owner: 'Quality engineering or product analysis lab',
    purpose: 'Determine whether the returned device, accessory, or consumable confirms the alleged malfunction or physical damage.',
    keywords: ['returned', 'returning', 'available for return', 'explanted', 'malfunction', 'broken', 'cracked', 'leak', 'occlusion', 'alarm', 'failure', 'stopped', 'would not', 'intermittent', 'needle detached', 'suture broken', 'broke', 'did not activate'],
    evidence: ['Return availability', 'Device serial/lot number', 'Photos', 'Event chronology'],
    defaultActions: ['Request return authorization and preservation instructions', 'Capture chain-of-custody and condition-as-received notes']
  },
  {
    id: 'manufacturing-dhr-bhr-review',
    name: 'Manufacturing record review (DHR/BHR)',
    owner: 'Manufacturing quality',
    purpose: 'Check lot, batch, traveler, and release records for nonconformances, deviations, rework, or trends related to the complaint.',
    keywords: ['lot', 'batch', 'multiple units', 'same lot', 'expiry', 'expiration', 'sterile lot', 'manufacturing', 'label mismatch', 'traceability', 'serial'],
    evidence: ['Lot/batch number', 'Manufacturing site', 'Release date', 'Distribution history'],
    defaultActions: ['Pull DHR/BHR and deviation history', 'Check complaint and nonconformance trend for the same lot']
  },
  {
    id: 'clinical-medical-review',
    name: 'Clinical / medical assessment',
    owner: 'Medical safety or clinical affairs',
    purpose: 'Evaluate patient impact, seriousness, causality, expectedness, and whether clinical follow-up is needed.',
    keywords: ['death', 'died', 'injury', 'hospitalized', 'hospitalization', 'surgery', 'revision', 'therapy', 'patient harm', 'burn', 'shock', 'infection', 'bleeding', 'pain', 'symptom', 'adverse', 'intervention'],
    evidence: ['Patient outcome', 'Treatment/intervention', 'Relevant medical history', 'Clinician narrative'],
    defaultActions: ['Clarify patient outcome and intervention', 'Document medical causality rationale']
  },
  {
    id: 'regulatory-reportability-review',
    name: 'Regulatory reportability review',
    owner: 'Regulatory affairs / complaint handling',
    purpose: 'Assess whether the event may be reportable to authorities based on malfunction, death, serious injury, or local vigilance criteria.',
    keywords: ['death', 'serious injury', 'hospitalization', 'hospitalized', 'intervention', 'malfunction', 'reportable', 'recurrence', 'could cause', 'mdr', 'vigilance'],
    evidence: ['Country of event', 'Patient outcome', 'Device contribution', 'Recurrence risk'],
    defaultActions: ['Start reportability clock review', 'Identify country-specific vigilance requirements']
  },
  {
    id: 'software-firmware-data-log-review',
    name: 'Software, firmware, or data-log assessment',
    owner: 'Software quality / systems engineering',
    purpose: 'Review logs, configuration, version, connectivity, telemetry, and software behavior for possible defects or use conditions.',
    keywords: ['software', 'firmware', 'app', 'algorithm', 'update', 'download', 'log', 'error code', 'connectivity', 'bluetooth', 'sync', 'screen', 'frozen', 'reboot'],
    evidence: ['Software/firmware version', 'Error codes', 'Event logs', 'Screenshots'],
    defaultActions: ['Request log export and software version', 'Check known anomalies and release notes']
  },
  {
    id: 'cybersecurity-privacy-assessment',
    name: 'Cybersecurity / privacy assessment',
    owner: 'Product security and privacy',
    purpose: 'Evaluate suspected unauthorized access, data exposure, tampering, or security vulnerability implications.',
    keywords: ['hack', 'unauthorized', 'security', 'privacy', 'phi', 'data breach', 'password', 'tamper', 'vulnerability', 'ransomware', 'malware'],
    evidence: ['Systems involved', 'Access logs', 'Data types exposed', 'User/account details'],
    defaultActions: ['Escalate to product security', 'Preserve logs and avoid altering affected systems']
  },
  {
    id: 'sterility-biocompatibility-contamination',
    name: 'Sterility, biocompatibility, or contamination assessment',
    owner: 'Sterility assurance / microbiology / toxicology',
    purpose: 'Assess sterility breach, contamination, pyrogenicity, allergic reaction, or material compatibility concerns.',
    keywords: ['sterile', 'package open', 'seal', 'contamination', 'foreign material', 'particulate', 'infection', 'fever', 'allergic', 'rash', 'biocompatibility', 'odor'],
    evidence: ['Packaging condition', 'Photos', 'Lot number', 'Clinical signs/lab results'],
    defaultActions: ['Quarantine suspect product if available', 'Review sterilization and environmental monitoring records']
  },
  {
    id: 'packaging-labeling-ifu-review',
    name: 'Packaging, labeling, or IFU assessment',
    owner: 'Labeling quality / packaging engineering',
    purpose: 'Determine whether packaging integrity, labeling accuracy, UDI, instructions, or warnings contributed to the event.',
    keywords: ['label', 'ifu', 'instructions', 'warning', 'udi', 'barcode', 'wrong product', 'mislabeled', 'packaging', 'seal', 'pouch', 'carton', 'expiration'],
    evidence: ['Photos of labels/package', 'UDI/lot', 'IFU revision', 'User interpretation'],
    defaultActions: ['Compare sample to approved artwork', 'Check label reconciliation and packaging specs']
  },
  {
    id: 'supplier-component-assessment',
    name: 'Supplier or component assessment',
    owner: 'Supplier quality engineering',
    purpose: 'Investigate supplier materials, components, subassemblies, or purchased services that may be implicated.',
    keywords: ['supplier', 'component', 'battery', 'lead', 'connector', 'cable', 'sensor', 'third party', 'material', 'subassembly', 'handpiece', 'generator'],
    evidence: ['Component part number', 'Supplier lot', 'Failure mode', 'Incoming inspection history'],
    defaultActions: ['Notify supplier quality if criteria are met', 'Review supplier SCAR and incoming inspection trends']
  },
  {
    id: 'use-error-human-factors-review',
    name: 'Use-error / human factors assessment',
    owner: 'Human factors / clinical training',
    purpose: 'Assess whether the event involved foreseeable use error, training, usability, workflow, or interface confusion.',
    keywords: ['user error', 'training', 'confusing', 'difficult to use', 'misuse', 'setup', 'programming', 'wrong setting', 'could not understand', 'alarm ignored', 'prior to use', 'during use'],
    evidence: ['User role/training', 'Workflow step', 'Device settings', 'IFU followed/not followed'],
    defaultActions: ['Clarify task sequence and user expectations', 'Check known usability risks and mitigations']
  }
];

const highRiskPatterns = [/death|died/i, /serious injury|hospital/i, /unauthorized|data breach|privacy|security/i, /sterile|contamination|infection/i];
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
  const missingEvidence = evidenceFields.filter(field => !input[field]);
  const factCompleteness = Math.round(((evidenceFields.length - missingEvidence.length) / evidenceFields.length) * 100);

  const results = assessmentOptions.map(option => {
    const matchedKeywords = option.keywords.filter(keyword => text.includes(keyword.toLowerCase()));
    const rationales = matchedKeywords.map(keyword => `Matched "${keyword}"`);
    let score = matchedKeywords.length * 18;
    if (option.id === 'field-return-product-analysis' && hasReturn) {
      score += 20;
      rationales.push('Product appears available/returned for analysis');
    }
    if (option.id === 'clinical-medical-review' && patientImpact) {
      score += 30;
      rationales.push('Patient impact or clinical facts are present');
    }
    if (option.id === 'regulatory-reportability-review' && patientImpact) {
      score += 15;
      rationales.push('Patient impact may affect vigilance/reportability review');
    }
    if (option.id === 'regulatory-reportability-review' && reportable) {
      score += 25;
      rationales.push('Source row or narrative indicates reportability review');
    }
    if (option.id === 'manufacturing-dhr-bhr-review' && lotKnown) {
      score += 12;
      rationales.push('Lot/serial information is available for record review');
    }
    if (option.id === 'regulatory-reportability-review' && /death|serious injury|hospital/.test(text)) score += 30;
    if (option.id === 'field-return-product-analysis' && malfunctionPatterns.some(pattern => pattern.test(text))) score += 15;

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
      highRisk ? 'High-risk clinical, sterility, cybersecurity, or regulatory signal' : '',
      malfunction ? 'Device malfunction or performance issue signal' : '',
      input.returned ? 'Product returned/available' : '',
      input.reportable ? 'Reportable flag in source data' : ''
    ])
  };
}
