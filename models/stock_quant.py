from odoo import _, api, fields, models
from odoo.exceptions import ValidationError


class StockQuant(models.Model):
    _inherit = "stock.quant"

    @api.constrains("product_id")
    def _check_product_blocked(self):
        for quant in self:
            message = _(
                "The inventory move couldn't be executed due to the product being blocked."
            )
            quant._validate_state(quant.product_id, message)

    @api.constrains("location_id")
    def _check_location_blocked(self):
        for quant in self:
            message = _(
                "The inventory move couldn't be execute due to the location being blocked."
            )
            quant._validate_state(quant.location_id, message)

    @api.constrains("lot_id")
    def _check_lot_blocked(self):
        for quant in self:
            message = _(
                "The inventory move couldn't be execute due to the lot being blocked."
            )
            quant._validate_state(quant.lot_id, message)

    def _validate_state(self, model_id, message):
        """It abstracts the blocking validation from the desired tables
        only if they have the field on their columns.

        :param model_id: product_id/location_id/lot_id
        :param message: The message you want to add to the constrain
        :raises ValidationError:
        """
        self.ensure_one()
        if model_id.block_state == "block":
            raise ValidationError(message)
