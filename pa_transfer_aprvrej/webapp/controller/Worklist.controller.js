sap.ui.define(
  [
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "../model/formatter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox",
  ],
  function (
    BaseController,
    JSONModel,
    formatter,
    Filter,
    FilterOperator,
    MessageBox,
  ) {
    "use strict";

    return BaseController.extend(
      "in.abp.hr.transfer.controller.Worklist",
      {
        formatter: formatter,

        onInit: function () {
          this._updateFragment();
          this._getStartupParameters();
        },
        _updateFragment: function () {
          var oView = this.getView();
          var sFragmentName = "in.abp.hr.transfer.Fragments.Transfer";
          var containerId = "fragmentContainerTRANSFER";
          var oContainer = oView.byId(containerId);

          if (!oContainer) {
            return;
          }
          oContainer.removeAllItems();
          if (this._oCurrentFragment) {
            this._oCurrentFragment.destroy();
          }
          this._oCurrentFragment = sap.ui.xmlfragment(
            oView.getId(),
            sFragmentName,
            this,
          );
          oContainer.addItem(this._oCurrentFragment);
        },
        _getStartupParameters: function () {
          var hash = window.location.hash;
          if (hash) {
            var _self = this;
            _self.loginId = sap.ushell.Container.getService("UserInfo").getId();
            var oUser = sap.ushell.Container.getUser();
            if (oUser) {
              sap.m.MessageToast.show("Welcome " + oUser.getFullName());
            }
            var queryString = hash.split("?")[1];
            if (queryString) {
              var params = new URLSearchParams(queryString);
              _self.empId = params.get("EmpId");
              _self.actId = params.get("ActId");
              _self.InstanceID = params.get("InstanceID");
            }
            this.loadEmployeeData(_self.empId, _self.actId, _self.loginId);
          } else {
            this.loadEmployeeData("00011915", "T1", "P00011779");
          }
        },
        loadEmployeeData: function (empId, actionId, loginId) {
          var oView = this.getView();
          var sEmpId = empId;
          var sActionID = actionId;
          var sLoginId = loginId;
          var oEmpModel = oView.getModel("employeeModel");
          if (!oEmpModel) {
            oEmpModel = new JSONModel();
            oView.setModel(oEmpModel, "employeeModel");
          }
          var oDataModel = this.getOwnerComponent().getModel();
          var aFilters = [
            new sap.ui.model.Filter(
              "EmpId",
              sap.ui.model.FilterOperator.EQ,
              sEmpId,
            ),
            new sap.ui.model.Filter(
              "ActionId",
              sap.ui.model.FilterOperator.EQ,
              sActionID,
            ),
            new sap.ui.model.Filter(
              "UserId",
              sap.ui.model.FilterOperator.EQ,
              sLoginId,
            ),
          ];
          oView.setBusy(true);
          oDataModel.read("/MyWorkListCnfrmSet", {
            filters: aFilters,
            success: function (oData) {
              oView.setBusy(false);
              if (oData.results && oData.results.length > 0) {
                var oSrvData = oData.results[0];
                oEmpModel.setData({
                  formVisible: true,
                  EmpId: oSrvData.EmpId || "",
                  EmpName: oSrvData.EmpName || "",
                  EffectiveDate: oSrvData.EffectiveDate || new Date(),
                  RequestId: oSrvData.RequestId || "",
                  Emp:
                    oSrvData.EmpId.replace(/^0+/, "") + " - " + oSrvData.EmpName || "",
                  SBU: oSrvData.SbuText + " - " + oSrvData.OrgUnitText || "",
                  Location:
                    oSrvData.LocationText + " - " + oSrvData.BuildingText || "",
                  Designation: oSrvData.Designation || "",
                  manager: oSrvData.ManagerName.replace(/^0+/, "") || "",
                  RM_Designation: oSrvData.ManagerDesig || "",
                  Hod: oSrvData.Hod1Name || "",
                  Hod1Designation: oSrvData.Hod1Designation || "",
                  Status: oSrvData.Status || "Open",
                });

                this.setTransferModel(oSrvData);
              } else {
                sap.m.MessageToast.show("No data found for employee " + sEmpId);
                oEmpModel.setData({});
              }
            }.bind(this),
            error: function (oError) {
              oView.setBusy(false);
              console.error("Error fetching employee details:", oError);
              sap.m.MessageToast.show("Failed to fetch employee details.");
            },
          });
        },

        onApprove: function () {
          this._submitDecision("APP");
        },

        onReject: function () {
          this._submitDecision("REJ");
        },

        _submitDecision: function (sOperation) {
          var oView = this.getView();
          var oDataModel = this.getOwnerComponent().getModel();
          var oEmployeeModel = oView.getModel("employeeModel");
          var sEmpId = oEmployeeModel.getProperty("/EmpId");

          oView.setBusy(true);
          var oPayload = {
            Operation: sOperation,
            EmpId: sEmpId,
            ActionId: this.actId || ""
          };
          console.log("Submit Decision - Path: /TransferSet");
          console.log("Submit Decision - Payload:", JSON.stringify(oPayload, null, 2));
          oDataModel.create(
            "/TransferSet",
            oPayload,
            {
              success: function () {
                oView.setBusy(false);
                var sMsg =
                  sOperation === "APP"
                    ? "The request has been approved successfully."
                    : "The request has been rejected.";
                MessageBox.success(sMsg, {
                  title: "Success",
                  onClose: function () {
                    oView.setBusy(true);
                    var sOrigin = window.location.origin;
                    var sClient = new URLSearchParams(window.location.search).get("sap-client") || "200";
                    var sLang = new URLSearchParams(window.location.search).get("sap-language") || "EN";
                    var sInboxUrl = sOrigin + "/sap/bc/ui2/flp?sap-client=" + sClient + "&sap-language=" + sLang +
                      "#WorkflowTask-displayInbox?allItems=true";
                    window.location.href = sInboxUrl;
                  }
                });
              },
              error: function (oError) {
                oView.setBusy(false);
                MessageBox.error("Operation failed. Please try again.");
              }
            }
          );
        },

        setTransferModel: function (oSrvData) {
          var oView = this.getView();
          var oTransferModel = oView.getModel("transferModel");
          if (!oTransferModel) {
            oTransferModel = new JSONModel();
            oView.setModel(oTransferModel, "transferModel");
          }

          var bHasMatrixManager =
            oSrvData.NewMatrixManagerId &&
            oSrvData.NewMatrixManagerId.replace(/^0+/, "").length > 0;

          var sNewRm = "";
          if (oSrvData.NewRm1Name) {
            sNewRm = oSrvData.NewRm1Id
              ? oSrvData.NewRm1Id.replace(/^0+/, "") +
                " - " +
                oSrvData.NewRm1Name
              : oSrvData.NewRm1Name;
          }

          var sNewMM = "";
          if (bHasMatrixManager && oSrvData.NewMatrixManagerName) {
            sNewMM =
              oSrvData.NewMatrixManagerId.replace(/^0+/, "") +
              " - " +
              oSrvData.NewMatrixManagerName;
          }

          oTransferModel.setData({
            NewSBU: oSrvData.NewSbuText || "",
            NewOrgUnit: oSrvData.NewOrgUnittext || "",
            NewLocation: oSrvData.NewLocationText || "",
            NewBuilding: oSrvData.NewBuildingText || "",
            NewDesignation: oSrvData.NewDesignation || "",
            NewRM: sNewRm,
            MatrixManagerSelected: bHasMatrixManager,
            NewMMId: sNewMM,
          });
        },
      },
    );
  },
);
