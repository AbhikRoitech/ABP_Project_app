sap.ui.define([], function () {
	"use strict";

	return {

		/**
		 * Toggles visibility of Matrix Manager field
		 * based on checkbox selection.
		 *
		 * @param {sap.ui.core.mvc.View} oView Current view instance
		 * @param {boolean} bVisible Visibility flag
		 */
		toggleMatrixManagerField: function (oView, bVisible) {
			this._clearMatrixManagerField(oView);
			oView.byId("MatrxMngEmpId").setVisible(bVisible);
		},

		/**
		 * Clears the Matrix Manager data held in employeeModel
		 * (designation shown below the input + selected id/name).
		 * Called when the user empties the Matrix Manager input or
		 * toggles the Matrix Manager checkbox, so the designation text
		 * never stays behind for a manager that is no longer selected.
		 *
		 * NOTE: deliberately NOT called from _clearMatrixManagerField,
		 * because the draft pre-population flow toggles the field on
		 * AFTER employeeModel already holds the saved designation.
		 *
		 * @param {sap.ui.core.mvc.View} oView Current view instance
		 */
		clearMatrixManagerSelection: function (oView) {
			var oEmployeeModel = oView.getModel("employeeModel");
			if (!oEmployeeModel) {
				return;
			}
			oEmployeeModel.setProperty("/NewMatrixManagerDesig", "");
			oEmployeeModel.setProperty("/MatrxMngId", "");
			oEmployeeModel.setProperty("/MatrxMngName", "");
		},

		_clearMatrixManagerField: function (oView) {
			// Clear Input Value (R1 and T1 fragments use different ids)
			var aInputs = [oView.byId("matrxMngrEmpId"), oView.byId("matrxMngrEmpIdTransfer")];
			aInputs.forEach(function (oInput) {
				if (oInput) {
					oInput.setValue("");
					oInput.setValueState("None");
				}
			});
			// Clear Suggestion Model
			var oModel = oView.getModel("MatrxMngrEmpSetModel");
			if (oModel) {
				oModel.setData({
					results: []
				});
			}
		}

	};
});
