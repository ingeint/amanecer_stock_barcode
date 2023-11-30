from odoo import _, api, fields, models


class StockLocation(models.Model):
    _name = "stock.location"
    _inherit = ["stock.location", "block.mixin"]
