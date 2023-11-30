odoo.define("amanecer_stock_barcode.LinesWidget", function (require) {
  "use strict";

  const core = require("web.core");
  const LinesWidget = require("stock_barcode.LinesWidget");

  LinesWidget.include({
    init: function (parent, page, pageIndex, nbPages) {
      this._super.apply(this, arguments);
      // These are set by the client action layer.
      this.isSourceScanned = false;
      this.isDestScanned = false;
    },

    /**
     * Increment a product.
     *
     * @param {Number|string} id_or_virtual_id
     * @param {Number} qty
     * @param {string} model
     */
    incrementProduct: function (
      id_or_virtual_id,
      qty,
      model,
      doNotClearLineHighlight
    ) {
      var $line = this.$("[data-id='" + id_or_virtual_id + "']");
      var incrementClass =
        model === "stock.inventory" ? ".product_qty" : ".qty-done";
      var qtyDone = parseFloat($line.find(incrementClass).text());
      // increment quantity and avoid insignificant digits
      $line
        .find(incrementClass)
        .text(parseFloat((qtyDone + qty).toPrecision(15)));
      this._highlightLine($line, doNotClearLineHighlight);

      this._handleControlButtons();
      this._updateIncrementButtons($line);

      // Several condition were added to take in account the message
      //  flow in a internal transfer and display what MUST be done.
      const reservationProcessed = this._isReservationProcessed();
      if (qty === 0) {
        this._toggleScanMessage("scan_lot");
        this._highlightLotIcon($line);
      } else if (this.mode === "receipt") {
        this._toggleScanMessage("scan_more_dest");
      } else if (this.mode === "inventory") {
        this._toggleScanMessage("scan_more_src");
      } else if (
        ["delivery", "internal"].includes(this.mode) &&
        !reservationProcessed &&
        this.isSourceScanned
      ) {
        this._toggleScanMessage("scan_products");
      } else if (
        (["delivery", "internal"].includes(this.mode) &&
          !reservationProcessed) ||
        (["delivery", "internal"].includes(this.mode) &&
          reservationProcessed &&
          !this.isSourceScanned)
      ) {
        this._toggleScanMessage("scan_src");
      } else if (this.mode === "internal" && reservationProcessed) {
        this._toggleScanMessage("scan_dest");
      } else if (this.mode === "no_multi_locations") {
        this._toggleScanMessage("scan_products");
      } else {
        this._toggleScanMessage("done_scanning");
      }
    },

    /**
     * Emphase the source location name in the summary bar
     *
     * @param {boolean} toggle: and object with all theinformation needed to render the
     */
    highlightLocation: function (toggle) {
      this.$(".o_barcode_summary_location_src").toggleClass("o_strong", toggle);
      this.$(".o_barcode_summary_location_dest").toggleClass(
        "o_barcode_summary_location_highlight",
        toggle
      );

      // There was added a condition for the displayed message
      // to take in account what to show when there's a running
      // transfer but no source location are validated yet.
      const reservationProcessed = this._isReservationProcessed();
      if (this.mode === "delivery" && reservationProcessed) {
        this._toggleScanMessage("done_scanning");
      } else if (!reservationProcessed) {
        this._toggleScanMessage("scan_products");
      } else {
        this._toggleScanMessage("scan_src");
      }
    },

    /**
     * Emphase the destination location name in the summary bar
     *
     * @param {boolean} toggle: set or not the property class
     */
    highlightDestinationLocation: function (toggle) {
      this.$(".o_barcode_summary_location_dest").toggleClass(
        "o_strong",
        toggle
      );
      if (toggle === false) {
        return;
      }
      this._handleControlButtons();

      // An extra condition was added to add a done message
      // when the dest is added validated.

      const reservationProcessed = this._isReservationProcessed();
      if (this.mode === "receipt" && !reservationProcessed) {
        this._toggleScanMessage("scan_products");
      } else if (["receipt", "internal"].includes(this.mode)) {
        this._toggleScanMessage("done_scanning");
      }
    },

    /**
     * Highlight the validate button if needed.
     *
     * @private
     */
    _highlightValidateButtonIfNeeded: function () {
      var $validate = this.$(".o_validate_page");
      var shouldHighlight;
      if ($validate.hasClass("o_hidden") === true) {
        shouldHighlight = false;
      } else {
        shouldHighlight = this._isReservationProcessed();
      }

      // An extra value was added to the condition in the
      // overrided method to change the button color when
      // also the locations are valid.
      let validLocations;
      if (this.mode === "delivery") {
        validLocations = this.isSourceScanned;
      } else if (this.mode === "internal") {
        validLocations = this.isSourceScanned && this.isDestScanned;
      } else {
        validLocations = this.isDestScanned;
      }

      if (shouldHighlight && validLocations) {
        // FIXME: is it my job?
        $validate.prop("disabled", false);
        $validate.toggleClass("btn-secondary", false);
        $validate.toggleClass("btn-success", true);
      } else {
        $validate.toggleClass("btn-secondary", true);
        $validate.toggleClass("btn-success", false);
      }
      return shouldHighlight;
    },
  });

  return LinesWidget;
});
