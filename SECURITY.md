# Security reporting and public CI

This is an unreleased development snapshot. R05 remains an M6 release blocker;
no production-readiness or complete WCAG-conformance claim is made.

Do not put credentials, customer data, private files, traces from real accounts,
or exploit details in public issues, pull requests, screenshots or CI artifacts.
Use GitHub's private vulnerability reporting when the repository owner enables
it. If no private reporting channel is available, ask for one without including
sensitive details. No personal email address is published as a contact here.

The UI Lab and QA runner execute trusted local project code; they are not a
sandbox for hostile projects. Keep the Lab loopback/origin/session restrictions
and do not expose it as a public service. The production app is separate.

Public PR code is untrusted even when its tests pass. It must not receive
secrets or write credentials, run on a persistent/self-hosted runner, or produce
an artifact that is automatically promoted into a release. Configure approval
for all external contributors before enabling Actions. See
[the publication procedure](docs/PUBLICATION.md).

The historical private repository/evidence is not imported. The public snapshot
contains only reviewed source and explicitly documented comparator input images.
Fresh diagnostics can contain source code and local session details; review them
before sharing, respect retention, and never inject real credentials into CI.
