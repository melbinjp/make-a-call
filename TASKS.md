# Outstanding Tasks & Follow-ups

This document tracks required work, suggested owners, and estimated effort for the `make-a-call` repository.

## P1: Critical Issues (Blockers)

| Task | Description | Suggested Owner | Effort | Status |
| --- | --- | --- | --- | --- |
| **Fix Node.js/npm Execution Environment** | The container environment for this repository is unable to run `npm` package binaries (e.g., `eslint`, `playwright`). The `node_modules/.bin` directory is not created on `npm install`, preventing all script-based verification. This is a **critical blocker** for CI/CD. | @melbinjpaulose | High | **Blocked** |
| **Validate and Deploy Firebase Rules** | The new, more secure Firebase rules in `firebase-rules.json` must be deployed to the project's Firebase console to mitigate the critical security vulnerability. | @melbinjpaulose | Low | **Ready** |

## P2: High-Priority Bugs & Hardening

| Task | Description | Suggested Owner | Effort | Status |
| --- | --- | --- | --- | --- |
| **Fix Syntax in `index.html`** | The `index.html` file has an invalid closing `</div>` tag that prevents tools like Prettier from parsing it. This should be fixed to improve tooling compatibility. | @melbinjpaulose | Low | **Ready** |
| **Fix Syntax in `manifest.json`** | The `manifest.json` file contains an invalid unicode escape sequence, likely from an emoji. This should be corrected. | @melbinjpaulose | Low | **Ready** |
| **Migrate `dependency-check` to `knip`** | The `dependency-check` npm package is deprecated. It should be replaced with its successor, `knip`, to keep the toolchain modern. | @melbinjpaulose | Low | **Ready** |
| **Implement Full Test Suite** | The current test suite only contains smoke tests. A full suite covering core WebRTC logic, data channel messaging, and UI interactions should be developed. | @melbinjpaulose | High | **Blocked** (by environment issue) |

## P3: Future Enhancements

| Task | Description | Suggested Owner | Effort | Status |
| --- | --- | --- | --- | --- |
| **Set up Dependabot** | Configure Dependabot for the repository to automatically create PRs for outdated dependencies. | @melbinjpaulose | Low | **Ready** |
| **Add SAST Scanning** | Integrate a Static Application Security Testing (SAST) tool into the CI pipeline to proactively identify security vulnerabilities. | @melbinjpaulose | Medium | **Ready** |
| **Add Lighthouse Performance Audits** | Integrate Lighthouse CI into the workflow to track performance, SEO, and accessibility scores over time. (The dependencies are installed, but the CI job needs to be finalized). | @melbinjpaulose | Medium | **Blocked** (by environment issue) |
