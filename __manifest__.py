{
    "name": "(Cafe Amanecer) Validaciones Código de barras",
    "summary": """
    Módulo técnico el cuál agrega una serie de validaciones
    al código de barras.
    """,
    "author": "Ingeint",
    "category": "Stock/Barcode",
    "version": "14.0.0",
    "depends": ["stock_barcode", "web"],
    "data": [
        # "security/ir.model.access.csv",
        "views/templates.xml",
    ],
    'qweb': [
        "static/src/xml/qweb_templates.xml",
    ],
    "license": "LGPL-3",
}