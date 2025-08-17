# Performance & Accessibility Baseline

This document is intended to store the initial Lighthouse and Axe accessibility audit results to serve as a baseline for future performance and accessibility work.

## Lighthouse Audit (Mobile & Desktop)

**Status:** Blocked

The Lighthouse audits could not be run because the test execution environment is non-functional. The `npm` scripts required to invoke the test runner and the Lighthouse CLI are failing due to a critical issue where package binaries are not being correctly installed or linked.

Once the environment is repaired, a baseline report should be generated and attached here.

## Axe Accessibility Audit

**Status:** Blocked

The Axe accessibility tests, which are integrated into the Playwright test suite, could not be run for the same reason outlined above.

A baseline report should be generated once the testing environment is functional. The initial goal should be an accessibility score of >= 90 with no critical violations.
