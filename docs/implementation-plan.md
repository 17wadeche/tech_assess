# Complaint DHR need checker implementation plan

This prototype currently focuses on DeviceHistory Review need for the complaint-handling workflow. Production thresholds and SOP triggers should still be validated against controlled Medtronic procedures before release.

## Current assessment output

- DeviceHistory Review

## Excel-style import workflow

The app analyzes a whole workbook shaped like the provided screenshot. Upload the native `.xlsx` file and the importer reads the first worksheet, maps each complaint row, and runs the DHR decision engine. CSV/TSV files remain supported as a fallback for exported worksheets. The importer maps these headers:

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

The batch output includes the row number, complaint identifier, product, serial/lot, DHR decision, confidence, required DHR output, DHR items to consider, and a CSV download for review or re-import into a quality workflow. The browser parser supports standard `.xlsx` worksheet XML with shared strings and inline strings; production use should still validate the workbook parser against Medtronic-controlled templates and consider a server-side import service for very large files.


## Hybrid rules + ML confidence design

The current implementation is a hybrid-ready rules baseline: mandatory/high-risk rules protect safety-critical triggers while the scoring interface can later accept an ML/NLP probability for DHR. The app now returns an explicit decision (`DHR needed`, `DHR should be considered`, or `No DHR indicated from current facts`) plus a numeric confidence and confidence level.

Recommended production hybrid architecture:

1. Keep deterministic rules for never-miss triggers such as death, serious injury, reportability flags, cybersecurity/privacy signals, sterility/contamination, product malfunction, and product return availability.
2. Train a supervised text classifier on historical complaint rows to predict the DHR output from narrative, event context, code/LLT, product family, lot/serial availability, return status, reportability flag, and outcome.
3. Blend rule scores and ML probabilities using conservative thresholds: rules can force `Required`; ML can raise `Consider` or `Required` only after validation; reviewers can override with rationale.
4. Calibrate confidence with held-out complaints so an 80% confidence bucket is correct approximately 80% of the time. Track false negatives for DHR decisions.
5. Store decision features, matched keywords, rule version, confidence, reviewer selection, and override reason for auditability.

## Recommended build path

1. Create a controlled assessment taxonomy with the DHR SOP owner, trigger criteria, required evidence, and mandatory escalation path.
2. Label historical complaints with whether DHR was actually required, reviewer overrides, final reportability outcome, and missed-assessment corrections.
3. Start with rules for mandatory triggers, then add an NLP classifier to rank less deterministic DHR signals.
4. Return explainable recommendations: required/consider/not indicated, matched facts, missing evidence, and next actions.
5. Validate against a locked test set and track false negatives separately for high-risk categories such as death, serious injury, cybersecurity, sterility, and reportability.
6. Deploy with human review, audit trail, model/rule versioning, and periodic monitoring.

## Data fields to capture

- Complaint narrative, product family, country, event date, awareness date, reporter role, patient outcome, intervention, device availability, lot/serial/UDI, software version, error codes, photos, return status, no-return rationale, and related complaint identifiers.
- Final DHR decision, reviewer rationale, override reason, reportability decision, CAPA/escalation links, and closure codes.

## Production controls

- Do not allow the AI to close a complaint or remove mandatory DHR reviews without reviewer approval.
- Show missing information prompts before downgrading a recommendation.
- Route high-severity matches to the responsible function immediately.
- Revalidate whenever SOPs, products, or reportability rules change.

## Running locally

Use `npm start` to run the static prototype. The start script uses Node's built-in HTTP server implementation in `scripts/serve.mjs`, so Windows users do not need Python installed or configured in PATH.
