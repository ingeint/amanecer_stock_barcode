from odoo import _, api, fields, models


class BlockMixin(models.AbstractModel):
    _name = "block.mixin"
    _description = "A mixin to inherit the blocking process"

    block_state = fields.Selection(
        selection=[("available", "Available"), ("block", "Block")],
        default="available",
        help="With this you can block the registry for any reason, and it won't be able to use.",
    )
