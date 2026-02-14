from typing import Any


def _get_path(data: dict, path: str) -> Any:
    current: Any = data
    for part in path.split("."):
        if isinstance(current, dict) and part in current:
            current = current[part]
        else:
            return None
    return current


def _set_path(data: dict, path: str, value: Any) -> None:
    parts = path.split(".")
    current = data
    for part in parts[:-1]:
        if part not in current or not isinstance(current[part], dict):
            current[part] = {}
        current = current[part]
    current[parts[-1]] = value


def _transform(value: Any, transform_name: str | None) -> Any:
    if transform_name is None or transform_name == "identity":
        return value
    if transform_name == "to_float":
        return None if value is None else float(value)
    if transform_name == "to_int":
        return None if value is None else int(value)
    if transform_name == "to_str":
        return None if value is None else str(value)
    if transform_name == "upper":
        return None if value is None else str(value).upper()
    if transform_name == "lower":
        return None if value is None else str(value).lower()
    raise ValueError(f"Unsupported transform: {transform_name}")


def _map_array(source_items: list[Any], item_rules: list[dict]) -> list[dict]:
    mapped: list[dict] = []
    for item in source_items:
        mapped_item: dict[str, Any] = {}
        if not isinstance(item, dict):
            mapped.append(mapped_item)
            continue

        for rule in item_rules:
            source_path = rule["source"]
            target_path = rule["target"]
            raw = _get_path(item, source_path)
            value = _transform(raw, rule.get("transform"))
            _set_path(mapped_item, target_path, value)
        mapped.append(mapped_item)
    return mapped


def apply_mapping(source_payload: dict, rules: list[dict]) -> dict:
    result: dict[str, Any] = {}

    for rule in rules:
        operation = rule.get("op", "copy")
        source_path = rule["source"]
        target_path = rule["target"]

        if operation == "map_array":
            source_items = _get_path(source_payload, source_path)
            if not isinstance(source_items, list):
                source_items = []
            mapped_value = _map_array(source_items, rule.get("item_rules", []))
            _set_path(result, target_path, mapped_value)
            continue

        raw_value = _get_path(source_payload, source_path)
        value = _transform(raw_value, rule.get("transform"))
        _set_path(result, target_path, value)

    return result
