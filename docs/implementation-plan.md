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

## Excel-style import workflow

The app can analyze a single complaint or a worksheet shaped like the provided screenshot. For batch review, export the worksheet from Excel as CSV/TSV or copy the header row and data rows directly from Excel into the paste box. The importer maps these headers:

- `PE - PLI #`
- `Product Description - PE PLI`
- `Serial/Lot # - PE PLI`
- `Interface Details - PE`
- `Interface Update Details - PE`
- `Event Description - PE`
- `Event Context`
- `Code/LLT Desc - PE PLI`
- `Complaint? - PE`
- `Reportable?`
- `Product Returned to MDT?`
- `Rationale for no return`

The batch output includes the row number, complaint identifier, product, serial/lot, required assessments, assessments to consider, and a CSV download for review or re-import into a quality workflow. Native `.xlsx` parsing is intentionally not bundled in this zero-dependency prototype; production use should add a validated workbook parser or server-side import service.

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
