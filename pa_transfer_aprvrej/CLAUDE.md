# pa_transfer_aprvrej — Transfer Approval / Rejection App

## What This App Does

SAP UI5 / Fiori approval app launched from the **SAP Fiori Inbox**. Approvers see a read-only view of a Transfer (T1) request raised in the main `zemp_letter_abp` app and click **Approve** or **Reject**. No editable fields, no comments — pure display-and-decide.

**Tech stack:** SAPUI5 (min 1.66.0) · OData V2 · XML Views · sap_fiori_3 theme · deployed via Cloud Platform destination `ABP_S4HANA_DEV_100`.

## How It's Launched

Opened from SAP Fiori Inbox with URL hash parameters:

| Param | Purpose |
|-------|---------|
| `EmpId` | Employee being transferred |
| `ActId` | Action ID (T1 for Transfer) |
| `InstanceID` | SAP Workflow instance (parsed but unused in client code) |

Logged-in user ID is read via `sap.ushell.Container.getService("UserInfo").getId()`.

**Dev fallback:** hardcoded test values `EmpId=00011915`, `ActId=T1`, `UserId=P00011779`.

## Approval Flow

1. App reads `/MyWorkListCnfrmSet` filtered by `EmpId`, `ActionId`, `UserId`
2. Approver sees read-only employee details + proposed transfer details
3. Clicks Approve or Reject
4. App POSTs to `/TransferSet` with `{Operation: "APP"/"REJ", EmpId, ActionId}`
5. On success → redirects to `#WorkflowTask-displayInbox?allItems=true`

**Approval chain is server-side only** (RM1 → RM2 → RM3 → HOD1 → HOD2 → CHRO → HRBP). The client has no awareness of which level is active — every approver sees the same UI.

## What the Approver Sees

**Header row:** Employee ID + Name, Effective Date (read-only)

**Transfer fragment — 3 sections, all read-only:**

| Section | Fields |
|---------|--------|
| Employee Details | Employee, Current SBU-Org Unit, Current Location-Building, Current Designation |
| Manager Details | Reporting Manager, RM's Designation, HOD, HOD Designation |
| Transfer Details | New SBU, New Location, New Designation, New RM, New Org Unit, New Building, optional Matrix Manager (checkbox + ID) |

**Footer:** Approve button (Accept type) · Reject button (Reject type)

## File Map

```
webapp/
├── Component.js                    # Root UIComponent, inits error handler + device model
├── manifest.json                   # Routes (worklist + unused object), OData service config
├── index.html                      # Bootstrap entry
│
├── controller/
│   ├── Worklist.controller.js      # ★ Main controller — loads data, handles approve/reject
│   ├── BaseController.js           # getRouter/getModel/setModel/getResourceBundle
│   ├── App.controller.js           # Root view busy state
│   ├── Object.controller.js        # Template scaffolding (unused)
│   ├── NotFound.controller.js      # 404 handler
│   └── ErrorHandler.js             # Global OData error dialog
│
├── view/
│   ├── Worklist.view.xml           # ★ Main view — header + fragment container + footer
│   ├── App.view.xml                # Shell container
│   ├── Object.view.xml             # Template scaffolding (unused)
│   ├── NotFound.view.xml           # Error page
│   └── ObjectNotFound.view.xml     # Object error page
│
├── Fragments/
│   └── Transfer.fragment.xml       # ★ Read-only form: employee + manager + transfer details
│
├── model/
│   ├── models.js                   # Device model
│   └── formatter.js                # numberUnit (template boilerplate, unused)
│
├── i18n/i18n.properties            # App title + template placeholders
└── css/style.css                   # Form label styles (only actively used classes)
```

## OData Entity Sets

**Service:** `ZHCM_EMP_MY_WORKLIST_SRV` (same as main app)

| Entity Set | Operation | Purpose |
|-----------|-----------|---------|
| `/MyWorkListCnfrmSet` | READ | Fetch T1 request details (filtered by EmpId, ActionId, UserId) |
| `/TransferSet` | CREATE | Submit approve/reject decision |

## JSON Models

| Model | Data |
|-------|------|
| `employeeModel` | Employee details: EmpId, EmpName, EffectiveDate, SBU, Location, Designation, manager, HOD, Status, formVisible |
| `transferModel` | Transfer details: NewSBU, NewOrgUnit, NewLocation, NewBuilding, NewDesignation, NewRM, MatrixManagerSelected, NewMMId |
| `appView` | Root busy state |
| `""` (default) | OData V2 model |

## Key Differences from pa_redesig_aprvrej

| Aspect | ReDesignation (R1) | Transfer (T1) |
|--------|-------------------|---------------|
| OData POST target | `/RedesignationSet` | `/TransferSet` |
| Dev fallback ActId | `Z7` | `T1` |
| Fragment model | `empModel` | `transferModel` |
| Transfer Details fields | New Designation, New RM | New SBU, New Org Unit, New Location, New Building, New Designation, New RM |
| Fragment container ID | `fragmentContainerREDESIG` | `fragmentContainerTRANSFER` |
| DatePicker typo | `editable="falseS"` (bug) | `editable="false"` (fixed) |
| CSS | Copied all styles from main app (bloat) | Only actively used classes |

## Relationship to Other Apps

```
zemp_letter_abp (HRBP raises T1 request)
    → backend workflow routes to approvers
        → pa_transfer_aprvrej (each approver views + approves/rejects)
            → redirects back to Fiori Inbox
```
