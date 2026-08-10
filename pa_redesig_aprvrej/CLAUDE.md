# pa_redesig_aprvrej — Re-Designation Approval / Rejection App

## What This App Does

SAP UI5 / Fiori approval app launched from the **SAP Fiori Inbox**. Approvers see a read-only view of a Re-Designation (R1) request raised in the main `zemp_letter_abp` app and click **Approve** or **Reject**. No editable fields, no comments — pure display-and-decide.

**Tech stack:** SAPUI5 (min 1.66.0) · OData V2 · XML Views · sap_fiori_3 theme · deployed via Cloud Platform destination `ABP_S4HANA_DEV_100`.

## How It's Launched

Opened from SAP Fiori Inbox with URL hash parameters:

| Param | Purpose |
|-------|---------|
| `EmpId` | Employee being re-designated |
| `ActId` | Action ID (always `Z7` for R1) |
| `InstanceID` | SAP Workflow instance (parsed but unused in client code) |

Logged-in user ID is read via `sap.ushell.Container.getService("UserInfo").getId()`.

**Dev fallback:** hardcoded test values `EmpId=00011915`, `ActId=Z7`, `UserId=P00011779`.

## Approval Flow

1. App reads `/MyWorkListCnfrmSet` filtered by `EmpId`, `ActionId=Z7`, `UserId`
2. Approver sees read-only employee details + proposed new assignment
3. Clicks Approve or Reject
4. App POSTs to `/RedesignationSet` with `{Operation: "APP"/"REJ", EmpId, ActionId}`
5. On success → redirects to `#WorkflowTask-displayInbox?allItems=true`

**Approval chain is server-side only** (RM1 → RM2 → RM3 → HOD1 → HOD2 → CHRO → HRBP). The client has no awareness of which level is active — every approver sees the same UI.

## What the Approver Sees

**Header row:** Employee ID + Name, Effective Date (read-only)

**ReDesignation fragment — 3 sections, all read-only:**

| Section | Fields |
|---------|--------|
| Employee Details | Employee, Current SBU-Org Unit, Current Location-Building, Current Designation |
| Manager Details | Reporting Manager, RM's Designation, HOD, HOD Designation |
| New Assignment | New Designation, New RM, optional Matrix Manager (checkbox + ID) |

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
│   └── NotFound.view.xml           # Error page
│
├── Fragments/
│   └── ReDesignation.fragment.xml  # ★ Read-only form: employee + manager + new assignment
│
├── model/
│   ├── models.js                   # Device model
│   └── formatter.js                # numberUnit (template boilerplate, unused)
│
├── i18n/i18n.properties            # App title + template placeholders
├── css/style.css                   # Form label styles (many classes copied from main app, unused)
└── localService/metadata.xml       # ⚠ Template placeholder (MDC_CUSTOM_OBJECT_SRV), NOT runtime metadata
```

## OData Entity Sets

**Service:** `ZHCM_EMP_MY_WORKLIST_SRV` (same as main app)

| Entity Set | Operation | Purpose |
|-----------|-----------|---------|
| `/MyWorkListCnfrmSet` | READ | Fetch R1 request details (filtered by EmpId, ActionId, UserId) |
| `/RedesignationSet` | CREATE | Submit approve/reject decision |

## JSON Models

| Model | Data |
|-------|------|
| `employeeModel` | Employee details: EmpId, EmpName, EffectiveDate, SBU, Location, Designation, manager, HOD, Status, formVisible |
| `empModel` | New assignment: NewDesignation, NewRM (formatted "ID - Name"), MatrixManagerSelected, NewMMId |
| `appView` | Root busy state |
| `""` (default) | OData V2 model |

## Known Issues / Notes

- **Typo in view:** `Worklist.view.xml` line 20 has `editable="falseS"` (capital S) on the DatePicker — UI5 won't parse this as `false`, so the date field may appear editable even though it's bound to model data.
- **`InstanceID` unused:** Parsed from URL but never passed to any API call.
- **`localService/metadata.xml`** contains `MDC_CUSTOM_OBJECT_SRV` template entities — not the actual runtime entities. Ignore this file.
- **Object route/view** is template scaffolding, never navigated to.
- **CSS bloat:** Many CSS classes (`.iconGreen`, `.iconRed`, `.feedbackLabel`, etc.) are copied from the main app but unused here.
- **No utility files:** All logic lives in `Worklist.controller.js` (~130 lines of custom code).
- **Leading zeros:** Employee IDs are stripped of leading zeros via `.replace(/^0+/, "")` before display.

## Relationship to Main App

This app is the **approval counterpart** to `zemp_letter_abp`:

```
zemp_letter_abp (HRBP raises R1 request)
    → backend workflow routes to approvers
        → pa_redesig_aprvrej (each approver views + approves/rejects)
            → redirects back to Fiori Inbox
```
