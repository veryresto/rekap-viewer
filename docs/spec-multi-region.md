# Rekap Viewer — Phase 2 Multi-Region Experiment

## Goal

Extend the current Fly.io deployment into a real multi-region setup and measure the impact on latency and routing behavior.

Current architecture already:
- uses backend proxy
- uses Tigris object storage as shared cache
- refreshes Google Sheets data every 5 minutes
- exposes observability headers
- benchmarks latency from multiple geographic regions

This phase focuses on:
- multi-region Fly Machines
- routing observations
- latency comparison
- operational understanding of Fly edge + regional compute

Do NOT redesign the application architecture.

---

## Current Architecture

Current request flow:

Browser
  ↓
Fly Edge
  ↓
SIN Machine
  ↓
Tigris cached JSON

Current deployment:
- single Fly Machine
- region: sin

Tigris is already external/shared state, so application should already be safe for multi-region reads.

---

## High-Level Objective

Deploy additional app machine(s) in London region (`lhr`) and compare:

- latency
- TTFB
- Fly routing behavior
- response headers
- edge behavior

against previous single-region benchmark results.

---

## Important Context

Previous experiments already showed:

- requests entering Fly edge in London are faster than normal public internet routing
- even while actual compute still happens in Singapore

This phase should verify what changes once compute itself becomes multi-region.

---

## Deployment Requirements

Keep:
- existing app name
- existing domain
- existing architecture
- existing cache strategy

Add:
- additional Fly Machine in `lhr`

Do NOT remove Singapore region.

Target regions:
- sin
- lhr

---

## Flyctl Requirements

The coding agent has access to `flyctl`.

Use real Fly operations instead of simulated configuration.

The agent may:
- inspect app state
- inspect machine state
- deploy regions
- scale machines
- inspect logs
- validate routing behavior

Use real commands where appropriate.

---

## Machine Strategy

Deploy:
- at least 1 machine in `sin`
- at least 1 machine in `lhr`

Avoid autoscaling complexity for now.

Keep machine count explicit and predictable.

---

## Routing Verification

The app already exposes:
- X-Fly-Region
- X-Cache-Updated-At
- X-Cache-Age

Continue using these.

The implementation should make it easy to verify:
- which region served request
- whether cache is shared properly
- whether routing changes by geography

---

## Logging

Continue lightweight operational logging.

Useful logs:
- Fly region
- cache refresh activity
- request duration
- machine startup
- request path

Do not add noisy/debug spam.

---

## Benchmarking Requirements

Keep existing benchmark script compatible.

The agent may improve benchmark tooling if useful.

Benchmark sources should include:
- Fly Machine in Singapore
- Fly Machine in London
- external Linux VM in Singapore
- external Linux VM in London

Measurements should include:
- DNS
- connect
- TLS
- TTFB
- total time
- response headers

---

## Verification Goals

Verify:

### 1. Regional Routing

London-origin requests should ideally hit:
X-Fly-Region: lhr

Singapore-origin requests should ideally hit:
X-Fly-Region: sin

---

### 2. Shared Cache

Both regions should serve:
- same cached data
- same cache timestamp
- consistent responses

No region-specific cache divergence should occur.

---

### 3. Latency Improvement

Compare:
- previous single-region measurements
vs
- multi-region measurements

Especially observe:
- TTFB
- total time

---

### 4. Failure Behavior

Application should continue functioning if:
- one region temporarily unavailable
- cache refresh temporarily fails

Do not overengineer failover handling, but system should remain operational.

---

## Constraints

Do NOT:
- introduce Postgres
- introduce Redis
- redesign frontend
- introduce Kubernetes
- introduce separate worker service
- introduce complex orchestration

Keep architecture operationally simple.

---

## Suggested Operational Validation

Useful commands may include:
- fly machines list
- fly logs
- curl -I
- benchmark script from multiple regions

The agent may automate some validation if useful.

---

## Deliverables

Expected result:
- app actively serving from multiple regions
- routing behavior observable through headers/logs
- benchmark comparison available
- deployment remains stable

---

## Notes

This phase is intentionally operational rather than feature-oriented.

The purpose is to learn:
- Fly regional routing
- multi-region deployment behavior
- shared-state architecture
- latency decomposition
- edge vs compute locality

rather than building new product functionality.