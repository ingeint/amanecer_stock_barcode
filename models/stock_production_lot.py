from odoo import _, api, fields, models


class StockProductionLot(models.Model):
    _name = "stock.production.lot"
    _inherit = ["stock.production.lot", "block.mixin"]
