import logging
from collections import defaultdict

from odoo import _, api, fields, models

_logger = logging.getLogger(__name__)


class ProductTemplate(models.Model):
    _name = "product.template"
    _inherit = ["product.template", "block.mixin"]

    def write(self, vals):
        state = vals.get("block_state")
        if state:
            vals.update({"product_variant_ids": self._parse_product_variants(state)})

        return super().write(vals)

    def _parse_product_variants(self, state):
        self.ensure_one()

        return [
            (1, variant.id, {"block_state": state})
            for variant in self.product_variant_ids
        ]
