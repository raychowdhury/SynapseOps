from app.services.api_integration.services.mapping_engine import apply_mapping


def test_mapping_engine_supports_defaults_and_transform_aliases():
    payload = {
        "order": {
            "id": "SO-2001",
            "total": "19.95",
            "line_items": [
                {"sku": "SKU-1", "qty": "2", "price": "4.50"},
                {"sku": "SKU-2"},
            ],
        }
    }

    rules = [
        {"source": "order.id", "target": "order_number"},
        {"source": "order.total", "target": "total_amount", "transform": "float"},
        {"source": "order.currency", "target": "currency", "default": "USD"},
        {
            "source": "order.line_items",
            "target": "items",
            "op": "map_array",
            "item_rules": [
                {"source": "sku", "target": "sku"},
                {"source": "qty", "target": "qty", "transform": "int", "default": 1},
                {"source": "price", "target": "unit_price", "transform": "float", "default": 0},
            ],
        },
    ]

    mapped = apply_mapping(payload, rules)
    assert mapped == {
        "order_number": "SO-2001",
        "total_amount": 19.95,
        "currency": "USD",
        "items": [
            {"sku": "SKU-1", "qty": 2, "unit_price": 4.5},
            {"sku": "SKU-2", "qty": 1, "unit_price": 0.0},
        ],
    }


def test_mapping_engine_supports_nested_array_mapping():
    payload = {
        "batches": [
            {
                "batch_id": "BATCH-1",
                "rows": [
                    {"sku": "A-1", "qty": "3"},
                    {"sku": "A-2"},
                ],
            }
        ]
    }

    rules = [
        {
            "source": "batches",
            "target": "batches",
            "op": "map_array",
            "item_rules": [
                {"source": "batch_id", "target": "id"},
                {
                    "source": "rows",
                    "target": "items",
                    "op": "map_array",
                    "item_rules": [
                        {"source": "sku", "target": "sku"},
                        {"source": "qty", "target": "quantity", "transform": "int", "default": 0},
                    ],
                },
            ],
        }
    ]

    mapped = apply_mapping(payload, rules)
    assert mapped == {
        "batches": [
            {
                "id": "BATCH-1",
                "items": [
                    {"sku": "A-1", "quantity": 3},
                    {"sku": "A-2", "quantity": 0},
                ],
            }
        ]
    }
