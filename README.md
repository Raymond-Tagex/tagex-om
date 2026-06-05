# TAGEX Energy — O&M Ticket System
## Netlify Deployment Package

### Files in this package
| File | Purpose |
|---|---|
| `index.html` | Main app — self-contained, no build step needed |
| `netlify.toml` | Netlify config — headers, cache rules, redirects |
| `_redirects` | SPA fallback routing |
| `_headers` | HTTP headers for CORS + cache control |

### Deploy instructions

#### Option A — Netlify Drag & Drop (fastest)
1. Go to **app.netlify.com/drop**
2. Drag the entire **tagex-om-deploy** folder onto the page
3. Netlify gives you a URL immediately (e.g. `random-name.netlify.app`)
4. Rename the site: Site settings → Site details → Change site name → `tagex-om-ticketsys`

#### Option B — Netlify CLI
```bash
npm install -g netlify-cli
cd tagex-om-deploy
netlify deploy --prod --dir .
```

#### Option C — GitHub + Netlify Auto-deploy
1. Push this folder to a GitHub repo
2. Connect repo in Netlify: Add new site → Import from Git
3. Build settings: publish directory = `.` (root), no build command needed
4. Every push to `main` auto-deploys

### Site configuration
- **Airtable Base:** app0tq4y9wH10h6Up (O&M Platform)
- **PAT:** Embedded in index.html (auto-connects on load)
- **Auto-refresh:** Every 60 seconds
- **Live URL:** https://tagex-om-ticketsys.netlify.app

### Airtable field mapping (confirmed from schema)
| Field | ID | Type |
|---|---|---|
| JC Reference | fld0epAfApDO5Cxyv | singleLineText |
| Title | fldaNMYaVBdw4rxho | singleLineText |
| Status | fldNoL4FzEHcT027I | singleSelect |
| Priority | fldliJYCbS5nrRT6R | singleSelect |
| Progress % | fldOYTsZ9k0QaKsGg | number |
| Due Date | fldahcH4NfVwKVqrd | date |
| Responsible | fld8S3uhtvvf065Wk | collaborator |
| Client | fldd22cBqRMjzsPet | linkedRecord |
| Site/Address | fldUhpNu8fh16J0Gb | linkedRecord |
| Overdue Flag | fldNMeufuo0dWXDDA | formula (read-only) |
| Activity Log Notes | fldcciRgQcM8gPwBR | multilineText |
| Activity Log JC Link | fldq3dlkkE6lRd9za | linkedRecord |
| Activity Log Type | fld3Im7LzAcn6ckQe | singleSelect |
