# Complaint technical assessment AI implementation plan

This prototype uses a transparent rules taxonomy because Medtronic-specific complaint handling assessment names, thresholds, and SOP triggers are controlled internal content. To productionize it, replace the starter options with approved procedure names and validated decision logic.

## Starter technical assessment options

- Field return / product analysis
- Manufacturing record review (DHR/BHR)
- Clinical / medical assessment
- Regulatory reportability review
- Software, firmware, or data-log assessment
- Cybersecurity / privacy assessment
- Sterility, biocompatibility, or contamination assessment
- Packaging, labeling, or IFU assessment
- Supplier or component assessment
- Use-error / human factors assessment

## Recommended build path

1. Create a controlled assessment taxonomy with each option's SOP owner, trigger criteria, required evidence, and mandatory escalation path.
2. Label historical complaints with the assessments that were actually required, reviewer overrides, final reportability outcome, and missed-assessment corrections.
3. Start with rules for mandatory triggers, then add an NLP classifier to rank less deterministic assessments.
4. Return explainable recommendations: required/consider/not indicated, matched facts, missing evidence, and next actions.
5. Validate against a locked test set and track false negatives separately for high-risk categories such as death, serious injury, cybersecurity, sterility, and reportability.
6. Deploy with human review, audit trail, model/rule versioning, and periodic monitoring.

## Data fields to capture

- Complaint narrative, product family, country, event date, awareness date, reporter role, patient outcome, intervention, device availability, lot/serial/UDI, software version, error codes, photos, return status, and related complaint identifiers.
- Final selected assessments, reviewer rationale, override reason, reportability decision, CAPA/escalation links, and closure codes.

## Production controls

- Do not allow the AI to close a complaint or remove mandatory assessments without reviewer approval.
- Show missing information prompts before downgrading a recommendation.
- Route high-severity matches to the responsible function immediately.
- Revalidate whenever SOPs, products, or reportability rules change.
