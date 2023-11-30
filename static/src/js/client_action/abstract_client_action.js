odoo.define("amanecer_stock_barcode.ClientAction", function (require) {
  "use strict";

  const core = require("web.core");
  const ClientAction = require("stock_barcode.ClientAction");

  const _t = core._t;

  function isChildOf(locationParent, locationChild) {
    return _.str.startsWith(
      locationChild.parent_path,
      locationParent.parent_path
    );
  }

  ClientAction.include({
    init: function (parent, action) {
      this._super.apply(this, arguments);
      this.isSourceScanned = false;
      this.isDestScanned = false;
    },

    /**
     * Handle what needs to be done when a product is scanned.
     *
     * @param {string} barcode scanned barcode
     * @param {Object} linesActions
     * @returns {Promise}
     */
    _step_product: async function (barcode, linesActions) {
      var self = this;
      this.currentStep = "product";
      this.stepState = $.extend(true, {}, this.currentState);
      var errorMessage;

      var product = await this._isProduct(barcode);
      if (product) {
        if (product.tracking !== "none" && self.requireLotNumber) {
          this.currentStep = "lot";
        }
        var res = this._incrementLines({ product: product, barcode: barcode });
        if (res.isNewLine) {
          if (this.actionParams.model === "stock.inventory") {
            // FIXME sle: add owner_id, prod_lot_id, owner_id, product_uom_id
            return this._rpc({
              model: "product.product",
              method: "get_theoretical_quantity",
              args: [
                res.lineDescription.product_id.id,
                res.lineDescription.location_id.id,
              ],
            }).then(function (theoretical_qty) {
              res.lineDescription.theoretical_qty = theoretical_qty;
              linesActions.push([
                self.linesWidget.addProduct,
                [res.lineDescription, self.actionParams.model],
              ]);
              self.scannedLines.push(res.id || res.virtualId);
              return Promise.resolve({ linesActions: linesActions });
            });
          } else {
            linesActions.push([
              this.linesWidget.addProduct,
              [res.lineDescription, this.actionParams.model],
            ]);
          }
        } else if (!(res.id || res.virtualId)) {
          return Promise.reject(_t("There are no lines to increment."));
        } else {
          if (product.tracking === "none" || !self.requireLotNumber) {
            linesActions.push([
              this.linesWidget.incrementProduct,
              [
                res.id || res.virtualId,
                product.qty || 1,
                this.actionParams.model,
              ],
            ]);
          } else {
            linesActions.push([
              this.linesWidget.incrementProduct,
              [res.id || res.virtualId, 0, this.actionParams.model],
            ]);
          }
        }
        this.scannedLines.push(res.id || res.virtualId);
        return Promise.resolve({ linesActions: linesActions });
      } else {
        var success = function (res) {
          return Promise.resolve({ linesActions: res.linesActions });
        };
        var fail = function (specializedErrorMessage) {
          self.currentStep = "product";
          if (specializedErrorMessage) {
            return Promise.reject(specializedErrorMessage);
          }
          if (!self.scannedLines.length) {
            if (self.groups.group_tracking_lot) {
              errorMessage = _t(
                "You are expected to scan one or more products or a package available at the picking's location"
              );
            } else {
              errorMessage = _t(
                "You are expected to scan one or more products."
              );
            }
            return Promise.reject(errorMessage);
          }

          var location = self.locationsByBarcode[barcode];
          if (self.mode !== "receipt" && location && !self.isSourceScanned) {
            if (self.scanned_location.id !== location.id) {
              const errorMessage = _t(
                "The scanned Source Location in invalid."
              );
              return Promise.reject(errorMessage);
            }
            return self._step_source(barcode, linesActions);
          } else if (location && !self.isDestScanned) {
            if (self.scanned_location.id !== location.id) {
              const errorMessage = _t("The scanned Dest Location in invalid.");
              return Promise.reject(errorMessage);
            }
            return self._step_destination(barcode, linesActions);
          } else {
            errorMessage = _t(
              "You are expected to scan more products or a destination location."
            );
            return Promise.reject(errorMessage);
          }
        };
        return self._step_lot(barcode, linesActions).then(success, function () {
          return self._step_package(barcode, linesActions).then(success, fail);
        });
      }
    },

    /**
     * Handle what needs to be done when a source location is scanned.
     *
     * @param {string} barcode scanned barcode
     * @param {Object} linesActions
     * @returns {Promise}
     */
    _step_source: function (barcode, linesActions) {
      var self = this;
      this.currentStep = "source";
      this.stepState = $.extend(true, {}, this.currentState);
      var errorMessage;

      /* Bypass this step in the following cases:
           - the picking is a receipt
           - the multi location group isn't active
        */
      var sourceLocation = this.locationsByBarcode[barcode];
      if (
        sourceLocation &&
        !(this.mode === "receipt" || this.mode === "no_multi_locations")
      ) {
        // Sanity check: is the scanned location allowed in this document?
        if (!this.mode === "inventory") {
          const locationId = this._getLocationId();
          if (locationId && !isChildOf(locationId, sourceLocation)) {
            errorMessage = _t(
              "This location is not a child of the main location."
            );
            return Promise.reject(errorMessage);
          }
        } else {
          let isLocationAllowed = false;
          if (this.currentState.location_ids) {
            for (const locationId of this.currentState.location_ids) {
              if (isChildOf(locationId, sourceLocation)) {
                isLocationAllowed = true;
                break;
              }
            }
          } else {
            isLocationAllowed = true;
          }
          if (!isLocationAllowed) {
            errorMessage = _t(
              "This location is not a child of the selected locations on the inventory adjustment."
            );
            return Promise.reject(errorMessage);
          }

          linesActions.push([this.linesWidget.highlightLocation, [true]]);
          if (this.actionParams.model === "stock.picking") {
            linesActions.push([
              this.linesWidget.highlightDestinationLocation,
              [false],
            ]);
          }
          this.scanned_location = sourceLocation;
          this.currentStep = "product";
          this.isSourceScanned = true;
          this.linesWidget.isSourceScanned = true;
          return Promise.resolve({ linesActions: linesActions });
        }
      }
      /* Implicitely set the location source in the following cases:
            - the user explicitely scans a product
            - the user explicitely scans a lot
            - the user explicitely scans a package
        */
      // We already set the scanned_location even if we're not sure the
      // following steps will succeed. They need scanned_location to work.
      this.scanned_location = {
        id: this.pages
          ? this.pages[this.currentPageIndex].location_id
          : this.currentState.location_id.id,
        display_name: this.pages
          ? this.pages[this.currentPageIndex].location_name
          : this.currentState.location_id.display_name,
      };

      linesActions.push([this.linesWidget.highlightLocation, [true]]);
      if (this.actionParams.model === "stock.picking") {
        linesActions.push([
          this.linesWidget.highlightDestinationLocation,
          [false],
        ]);
      }

      return this._step_product(barcode, linesActions).then(
        function (res) {
          return Promise.resolve({ linesActions: res.linesActions });
        },
        function (specializedErrorMessage) {
          delete self.scanned_location;
          self.currentStep = "source";
          if (specializedErrorMessage) {
            return Promise.reject(specializedErrorMessage);
          }
          var errorMessage = _t("You are expected to scan a source location.");
          return Promise.reject(errorMessage);
        }
      );
    },

    /**
     * Handle what needs to be done when a destination location is scanned.
     *
     * @param {string} barcode scanned barcode
     * @param {Object} linesActions
     * @returns {Promise}
     */
    _step_destination: function (barcode, linesActions) {
      var errorMessage;

      // Bypass the step if needed.
      if (
        this.mode === "delivery" ||
        this.actionParams.model === "stock.inventory"
      ) {
        this._endBarcodeFlow();
        return this._step_source(barcode, linesActions);
      }

      var destinationLocation = this.locationsByBarcode[barcode];
      if (!isChildOf(this.currentState.location_dest_id, destinationLocation)) {
        errorMessage = _t("This location is not a child of the main location.");
        return Promise.reject(errorMessage);
      } else {
        if (!this.scannedLines.length || this.mode === "no_multi_locations") {
          if (this.groups.group_tracking_lot) {
            errorMessage = _t(
              "You are expected to scan one or more products or a package available at the picking's location"
            );
          } else {
            errorMessage = _t("You are expected to scan one or more products.");
          }
          return Promise.reject(errorMessage);
        }
        var self = this;
        this.stepState = $.extend(true, {}, this.currentState);
        // FIXME: remove .uniq() once the code is adapted.
        _.each(_.uniq(this.scannedLines), function (idOrVirtualId) {
          var currentStateLine = _.find(
            self._getLines(self.currentState),
            function (line) {
              return (
                (line.virtual_id &&
                  line.virtual_id.toString() === idOrVirtualId) ||
                line.id === idOrVirtualId
              );
            }
          );
          if (
            currentStateLine.qty_done - currentStateLine.product_uom_qty >=
            0
          ) {
            // Move the line.
            currentStateLine.location_dest_id.id = destinationLocation.id;
            currentStateLine.location_dest_id.display_name =
              destinationLocation.display_name;
          } else {
            // Split the line.
            var qty = currentStateLine.qty_done;
            currentStateLine.qty_done -= qty;
            var newLine = $.extend(true, {}, currentStateLine);
            newLine.qty_done = qty;
            newLine.location_dest_id.id = destinationLocation.id;
            newLine.location_dest_id.display_name =
              destinationLocation.display_name;
            newLine.product_uom_qty = 0;
            var virtualId = self._getNewVirtualId();
            newLine.virtual_id = virtualId;
            delete newLine.id;
            self._getLines(self.currentState).push(newLine);
          }
        });
        linesActions.push([this.linesWidget.clearLineHighlight, [undefined]]);
        linesActions.push([this.linesWidget.highlightLocation, [true]]);
        linesActions.push([
          this.linesWidget.highlightDestinationLocation,
          [true],
        ]);
        this.scanned_location_dest = destinationLocation;
        this.isDestScanned = true;
        this.linesWidget.isDestScanned = true;
        return Promise.resolve({ linesActions: linesActions });
      }
    },

    /**
     * @private
     * @param {String} barcode the scanned barcode
     * @returns {Promise}
     */
    _onBarcodeScanned: function (barcode) {
      var self = this;
      return this.stepsByName[this.currentStep || "source"](barcode, []).then(
        function (res) {
          var prom = Promise.resolve();
          var currentPage = self.pages[self.currentPageIndex];
          if (
            self.scanned_location &&
            self.scanned_location.id !== currentPage.location_id
          ) {
            return self.do_warn(
              false,
              _t("The scanned Source Location in invalid.")
            );
          }

          if (
            self.scanned_location_dest &&
            self.scanned_location_dest.id !== currentPage.location_dest_id
          ) {
            return self.do_warn(
              false,
              _t("The scanned Dest Location in invalid.")
            );
          }

          // Apply now the needed actions on the different widgets.
          if (self.scannedLines && self.scanned_location_dest) {
            self._endBarcodeFlow();
          }
          var linesActions = res.linesActions;
          var always = function () {
            _.each(linesActions, function (action) {
              action[0].apply(self.linesWidget, action[1]);
            });
          };
          prom.then(always).guardedCatch(always);
          return prom;
        },
        function (errorMessage) {
          self.do_warn(false, errorMessage);
        }
      );
    },
  });

  return ClientAction;
});
