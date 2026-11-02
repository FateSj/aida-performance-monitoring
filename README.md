# Aida Performance Monitoring

A separate project for checking the deployed Aida frontend and measuring a repeatable browser scenario.

## Local setup

Requires Node.js 20 or later. Install dependencies and Chromium:

```bash
npm ci
npx playwright install chromium
npm run monitor
```

The command prints a JSON report and exits with a nonzero status if a check fails. It opens a new chat and measures the entire page's Chromium JavaScript heap and DOM node count after a three-second settling period. This is a snapshot, not total browser memory or a widget-only measurement; results may vary between runs.

`TARGET_URL` overrides the default `https://aida.iverse.space`. Commit verification is skipped until both `VERSION_URL` and `EXPECTED_COMMIT` are supplied. The version endpoint must return JSON with an exact `commit` value. The currently observed `/version` route returns HTML, so it is not configured by default.

## Run on GitHub

On GitHub, open **Actions → Manual frontend monitoring → Run workflow**, select the branch, and run it. Open the completed run and download the **monitoring-report** artifact to see the JSON results. A failed check makes the workflow fail, but the report is still uploaded when it was created. Installation failures can prevent a report from being created; inspect the workflow logs in that case. Reports are retained for 14 days.

Commit verification is skipped in the manual workflow until a reliable version endpoint and expected commit are configured. n8n reporting and deployment integration will be added in later stages. Do not commit credentials or `.env` files.
