# zemp_letter_abp — Employee Letter / HR Worklist App

## What This App Does

SAP UI5 / Fiori worklist app where **HRBP** and **Manager** users raise HR action requests for employees. Requests flow through a multi-level approval chain (RM1 → RM2 → RM3 → HOD1 → HOD2 → CHRO → HRBP).

**Tech stack:** SAPUI5 1.71.75 · OData V2 · XML Views · sap_fiori_3 theme · deployed to SAP ABAP via Cloud Platform destination `ABP_S4HANA_DEV_100`.

## Request Types

| Code | Action | Who Creates | Key Fields |
|------|--------|-------------|------------|
| **C1** | Confirmation / Probation Extension | Manager | 5 performance ratings, RM1 comment, confirm vs extend radio |
| **R1** | Re-Designation | HRBP | New Designation, New RM, optional Matrix Manager |
| **R2** | Retirement | HRBP | Years of Service, Effective Retirement Date |
| **T1** | Transfer | HRBP | New SBU, Org Unit, Location, Building, Designation, RM |

Each type maps to a dedicated OData entity set for creation:
- C1 → `/MyWorkListCnfrmSet` · R1 → `/RedesignationSet` · R2 → `/RetirementSet` · T1 → `/TransferSet`

## User Roles (determined by `/EmpDetailsSet` on login)

- **EMP** — read-only view of own data (all users)
- **MGR** — can raise C1 requests for direct reports
- **HRBP** — can raise R1, R2, T1 requests; also sees MGR tab
- **TRACK** — visible to all; table of all requests with search/sort/filter/export

Role flags come from backend: `oUserRole.Manager === "X"` / `oUserRole.Hrbp === "X"`.

## Validation Rules (Save vs Submit)

- **Save (SAV):** R1/R2/T1 save with no validation. C1 checks confirmation eligibility only.
- **Submit (SUB):** R1/R2/T1 require Effective Date. C1 requires all 5 ratings + comment + probation status + effective date + eligibility check.
- **C1 Eligibility:** Cannot confirm if any rating = "BELOW EXPECTATIONS" or >1 rating = "SATISFACTORY" → only Extension allowed.

## Status Flow

`"" (empty)` or `DRAFT` → editable → `SUB` triggers approval chain → `RM1 pending` → `RM2 pending` → … → `HRBP pending` → done.  
`REJECTED` → re-editable. `Edit (EDT)` wipes data for fresh entry (with warning dialog).

Editability: `status === "" || "DRAFT" || "REJECTED"`.

## File Map

```
webapp/
├── Component.js              # Root UIComponent, inits error handler + footerModel
├── index.html                 # Bootstrap entry
├── manifest.json              # Routes (single: InitialScreen), OData service config
│
├── controller/
│   ├── InitialScreen.controller.js  # ★ Main controller (~2060 lines) — all business logic
│   ├── BaseController.js            # getRouter/getModel/setModel/getResourceBundle
│   ├── App.controller.js            # Root view (minimal)
│   └── ErrorHandler.js              # Global OData error handler
│
├── view/
│   ├── InitialScreen.view.xml       # ★ Main view — IconTabBar with 4 tabs + footer
│   └── App.view.xml                 # Shell container
│
├── Fragments/
│   ├── Confirm.fragment.xml         # C1 — ratings, comments, approve/reject icons
│   ├── ReDesignation.fragment.xml   # R1 — new designation + RM fields
│   ├── Retirement.fragment.xml      # R2 — years of service + retirement date
│   ├── Transfer.fragment.xml        # T1 — SBU/OrgUnit/Location/Building/RM fields
│   ├── TrackClaims.fragment.xml     # Track list table + toolbar
│   └── ViewSettingsDialog.fragment.xml  # Sort/filter/group dialog
│
├── Util/
│   ├── SubmitHelperHRBP.js          # ★ Central save/submit logic, validation, OData create
│   ├── Common.js                    # Matrix Manager toggle visibility
│   └── EmployeeService.js           # OData read helpers (role check, employee list)
│
├── model/
│   ├── models.js                    # Device model
│   └── formatter.js                 # numberUnit, uppercase formatters
│
├── i18n/i18n.properties             # Minimal translations
└── css/style.css                    # Custom form/tab/rating styles
```

## Key JSON Models (client-side)

| Model | Purpose |
|-------|---------|
| `""` (default) | OData V2 model → `ZHCM_EMP_MY_WORKLIST_SRV` |
| `stateModel` | UI state: actions array, selectedAction, selectedRole, isEditable |
| `roleModel` | User role flags + tab visibility |
| `employeeModel` | Selected employee details |
| `feedbackModel` | Performance ratings, approver comments, probation status |
| `footerModel` | Footer button visibility/enablement |
| `claimsModel` | Track list data |

## OData Entity Sets

| Entity Set | Purpose |
|-----------|---------|
| `/EmpDetailsSet` | Logged-in user role detection |
| `/EmpIdDropDown` | Employee dropdown (filtered by UserId/RequestID/SearchText) |
| `/MyWorkListCnfrmSet` | C1 request read/create |
| `/RedesignationSet` | R1 create |
| `/RetirementSet` | R2 create |
| `/TransferSet` | T1 create |
| `/MyWorkTaskListSet` | Track list read |
| `/NewRMSet` | New RM search |
| `/MatrxMngrEmpSet` | Matrix Manager search |
| `/NewSBUSet`, `/NewOrgUnitSet`, `/NewLocationSet`, `/NewBuildingSet` | Transfer dropdown cascades |

## Notes

- `localService/metadata.xml` contains metadata for a **different** service (`ZHCMFO_TAXNBENEFIT_SRV`) — leftover from a template, not used at runtime.
- Employee search in HRBP tab uses 400ms debounce + sequence counter to discard stale responses.
- Transfer dropdowns are cascading: SBU → Org Unit, Location → Building.
- `FIXES.md` documents 6 bug fixes applied to the app.
- `saveAndSubmitRule.md` documents validation rules in detail.
