sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	"./model/models",
	"./controller/ErrorHandler"
], function (UIComponent, Device, models, ErrorHandler) {
	"use strict";

	return UIComponent.extend("in.abp.hr.redesignation.Component", {

		metadata : {
			manifest: "json"
		},

		/**
		 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
		 * In this function, the device models are set and the router is initialized.
		 * @public
		 * @override
		 */
		init : function () {
			// call the base component's init function
			UIComponent.prototype.init.apply(this, arguments);

			// initialize the error handler with the component
			this._oErrorHandler = new ErrorHandler(this);

			// set the device model
			this.setModel(models.createDeviceModel(), "device");

			// Opened from My Inbox (Open Task)? -> open this app as a full page in the same tab
			if (this._openAsFullPageIfEmbedded()) {
				return;
			}
			// create the views based on the url/hash
			this.getRouter().initialize();
		},

		/**
		 * When My Inbox embeds this app (Open Task), navigate to the app as a separate
		 * full page in the same browser tab. Back button returns to the inbox task.
		 * @returns {boolean} true if navigation to full page was started
		 * @private
		 */
		_openAsFullPageIfEmbedded: function () {
			var oComponentData = this.getComponentData() || {};
			var sHash = window.location.hash || "";
			var bEmbeddedInInbox = typeof oComponentData.onTaskUpdate === "function" &&
				sHash.indexOf("WorkflowTask-displayInbox") > -1;
			if (!bEmbeddedInInbox || !(sap.ushell && sap.ushell.Container)) {
				return false;
			}

			var oStartup = oComponentData.startupParameters || {};
			var oParams = {};
			["EmpId", "ActId", "InstanceID"].forEach(function (sKey) {
				if (oStartup[sKey] && oStartup[sKey][0]) {
					oParams[sKey] = oStartup[sKey][0];
				}
			});

			// Back button: return to the task detail in the inbox, not into this embedded app again
			if (sHash.indexOf("/replaceDetail/") > -1 && window.history.replaceState) {
				window.history.replaceState(window.history.state, "", sHash.replace("/replaceDetail/", "/detail/"));
			}

			var oTarget = { semanticObject: "ZREDESIGAPPREJ", action: "display" };
			var aIntents = ["external", "replaceDetails"].map(function (sMode) {
				return { target: oTarget, params: jQuery.extend({ openMode: sMode }, oParams) };
			});
			var oNav = sap.ushell.Container.getService("CrossApplicationNavigation");
			var that = this;

			oNav.isNavigationSupported(aIntents).done(function (aResult) {
				for (var i = 0; i < aResult.length; i++) {
					if (aResult[i].supported) {
						oNav.toExternal(aIntents[i]);
						return;
					}
				}
				that.getRouter().initialize(); // fallback: show app inside the inbox
			}).fail(function () {
				that.getRouter().initialize();
			});
			return true;
		},

		/**
		 * The component is destroyed by UI5 automatically.
		 * In this method, the ErrorHandler is destroyed.
		 * @public
		 * @override
		 */
		destroy : function () {
			this._oErrorHandler.destroy();
			// call the base component's destroy function
			UIComponent.prototype.destroy.apply(this, arguments);
		},

		/**
		 * This method can be called to determine whether the sapUiSizeCompact or sapUiSizeCozy
		 * design mode class should be set, which influences the size appearance of some controls.
		 * @public
		 * @return {string} css class, either 'sapUiSizeCompact' or 'sapUiSizeCozy' - or an empty string if no css class should be set
		 */
		getContentDensityClass : function() {
			if (this._sContentDensityClass === undefined) {
				// check whether FLP has already set the content density class; do nothing in this case
				// eslint-disable-next-line sap-no-proprietary-browser-api
				if (document.body.classList.contains("sapUiSizeCozy") || document.body.classList.contains("sapUiSizeCompact")) {
					this._sContentDensityClass = "";
				} else if (!Device.support.touch) { // apply "compact" mode if touch is not supported
					this._sContentDensityClass = "sapUiSizeCompact";
				} else {
					// "cozy" in case of touch support; default for most sap.m controls, but needed for desktop-first controls like sap.ui.table.Table
					this._sContentDensityClass = "sapUiSizeCozy";
				}
			}
			return this._sContentDensityClass;
		}

	});

});