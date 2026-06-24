import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AlertTriangle, ClipboardCheck, FileSearch, ShieldCheck } from 'lucide-react';
import { assessmentOptions, evaluateComplaint } from './assessmentRules.js';
import './styles.css';

const example = `Clinician reports the pump alarmed with error code 402 and stopped during therapy. Patient was hospitalized overnight for monitoring. Device is available for return. Lot AB123, software v3.2.`;

function App() {
  const [form, setForm] = useState({ description: example, product: '', outcome: '', patientImpact: true, lotKnown: true });
  const results = useMemo(() => evaluateComplaint(form), [form]);
  const required = results.filter(r => r.recommendation === 'Required');

  function update(field, value) { setForm(current => ({ ...current, [field]: value })); }

  return <main>
    <section className="hero">
      <div>
        <p className="eyebrow">Complaint handling decision support</p>
        <h1>Technical assessment recommender</h1>
        <p className="lede">A configurable prototype that screens complaint narratives and identifies likely technical, medical, regulatory, and quality assessments. Replace the starter taxonomy with your approved Medtronic procedure terms before production use.</p>
      </div>
      <div className="heroCard"><ShieldCheck /><strong>{required.length}</strong><span>assessments currently flagged as required</span></div>
    </section>

    <section className="grid">
      <form className="panel" onSubmit={event => event.preventDefault()}>
        <h2><FileSearch /> Complaint facts</h2>
        <label>Complaint narrative<textarea value={form.description} onChange={e => update('description', e.target.value)} rows="9" /></label>
        <div className="twoCol">
          <label>Product / family<input value={form.product} onChange={e => update('product', e.target.value)} placeholder="e.g., pump, lead, app" /></label>
          <label>Patient outcome<input value={form.outcome} onChange={e => update('outcome', e.target.value)} placeholder="e.g., no injury, hospitalization" /></label>
        </div>
        <label className="check"><input type="checkbox" checked={form.patientImpact} onChange={e => update('patientImpact', e.target.checked)} /> Patient harm, intervention, or clinical symptoms are reported</label>
        <label className="check"><input type="checkbox" checked={form.lotKnown} onChange={e => update('lotKnown', e.target.checked)} /> Lot, batch, serial, or UDI is known</label>
      </form>

      <section className="panel">
        <h2><ClipboardCheck /> Recommended assessment plan</h2>
        <div className="cards">
          {results.map(result => <article key={result.id} className={`result ${result.recommendation.toLowerCase().replaceAll(' ', '-')}`}>
            <div className="resultHeader"><h3>{result.name}</h3><span>{result.score}</span></div>
            <p className="badge">{result.recommendation}</p>
            <p>{result.purpose}</p>
            {result.matchedKeywords.length > 0 && <p className="small"><strong>Matched:</strong> {result.matchedKeywords.join(', ')}</p>}
            <details><summary>Evidence and next actions</summary>
              <ul>{result.evidence.map(item => <li key={item}>{item}</li>)}</ul>
              <ol>{result.defaultActions.map(item => <li key={item}>{item}</li>)}</ol>
            </details>
          </article>)}
        </div>
      </section>
    </section>

    <section className="panel governance">
      <h2><AlertTriangle /> Implementation guardrails</h2>
      <ul>
        <li>Keep the model advisory: the complaint owner remains accountable for final assessment selection.</li>
        <li>Map each option to controlled SOP names, business rules, reportability clocks, and product-family procedures.</li>
        <li>Validate with historical complaints, measure missed required assessments, and require quality/regulatory sign-off before release.</li>
        <li>Store rationale, matched facts, model/rule version, reviewer override, and audit trail for every recommendation.</li>
      </ul>
    </section>
  </main>;
}

createRoot(document.getElementById('root')).render(<App />);
