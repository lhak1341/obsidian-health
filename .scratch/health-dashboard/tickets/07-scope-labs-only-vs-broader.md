---
id: "07"
title: "Decide scope — labs-only vs broader health data"
type: wayfinder:grilling
mode: HITL
status: closed
assignee: lhak
blocked-by: []
---
# Decide scope — labs-only vs broader health data

## Question

The source note is bloodwork / biochem / antigen / urine only. But the annual package also produced
ECG, chest X-ray, and abdominal ultrasound, and a "health dashboard" could plausibly hold vitals like
blood pressure, weight, and BMI over time. Decide the boundary of *this* effort:

- **Labs-only** — dashboard covers the numeric/qualitative lab panels; imaging & vitals are out of scope.
- **Labs + imaging findings** — also record narrative imaging results (ECG normal, ultrasound findings).
- **Full vitals** — also track BP / weight / BMI / other self-measured metrics over time.

This shapes the destination and the data model (a BP reading and a WBC count are different shapes). Decide
early — it's a scope call, not a downstream detail. Whatever is ruled out lands in the map's Out-of-scope.
Use `/grilling`.

## Comments

### Resolution

**Scope = lab panels + vitals. Imaging out. Model must be extensible.**

- **In scope:** the annual report's **lab panels** (blood / biochem / antigen / urine) **and vitals**
  (BP, weight, BMI, etc.). Both arrive in the same yearly report, both are numeric and trend the same way —
  so vitals are first-class trended markers alongside labs, at zero extra data-gathering cost.
- **Out of scope:** **imaging findings** (ECG, chest X-ray, abdominal ultrasound). They're narrative, not a
  number that trends on a sparkline; not worth the model complexity now. → recorded in the map's Out of scope.
- **Extensibility (a data-model requirement, not current scope):** the user would gather more if there were a
  place for it. So the data model (ticket 02) must let a **new numeric metric** (body-composition, waist,
  resting HR, wearable summaries) be added later **without redesign** — but none of those are in scope for
  this effort. Adding them is a future effort, not fog on this map.

