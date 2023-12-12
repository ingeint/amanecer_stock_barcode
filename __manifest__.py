{
    "name": "(Cafe Amanecer) Validaciones Código de barras",
    "summary": """
    Módulo técnico el cuál agrega una serie de validaciones
    al código de barras.
    """,
    "author": "Ingeint",
    "category": "Stock/Barcode",
    "version": "14.0.0",
    "depends": ["stock_barcode", "mrp", "web"],
    "data": [
        # "security/ir.model.access.csv",
        "data/report_paperformat.xml",

        "views/templates.xml",
        "views/product_views.xml",
        "views/stock_location_views.xml",
        "views/stock_production_lot_views.xml",

        "report/product_zebra_report_template.xml",
        "report/amanecer_stock_barcode_report.xml",
    ],
    "qweb": [
        "static/src/xml/qweb_templates.xml",
    ],
    "license": "LGPL-3",
}
