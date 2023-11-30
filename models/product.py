from odoo import _, api, fields, models


class ProductProduct(models.Model):
    _name = "product.product"
    _inherit = ["product.product", "block.mixin"]
