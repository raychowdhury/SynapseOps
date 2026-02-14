import copy
from typing import Any


def _get_path(data: Any, path: str) -> tuple[Any, bool]:
    if path in {"", "."}:
        return data, True

    current: Any = data
    for part in path.split("."):
        if isinstance(current, dict):
            if part not in current:
                return None, False
            current = current[part]
            continue

        if isinstance(current, list):
            if not part.isdigit():
                return None, False
            index = int(part)
            if index < 0 or index >= len(current):
                return None, False
            current = current[index]
            continue

        return None, False

    return current, True


def _set_path(data: dict, path: str, value: Any) -> None:
    parts = path.split(".")
    current: Any = data
    for i, part in enumerate(parts[:-1]):
        next_part = parts[i + 1]
        next_is_list = next_part.isdigit()

        if isinstance(current, dict):
            if part not in current or not isinstance(current[part], (dict, list)):
                current[part] = [] if next_is_list else {}
            current = current[part]
            continue

        if isinstance(current, list):
            if not part.isdigit():
                raise ValueError(f"Cannot set path '{path}' on list with key '{part}'")
            index = int(part)
            while len(current) <= index:
                current.append(None)
            if current[index] is None or not isinstance(current[index], (dict, list)):
                current[index] = [] if next_is_list else {}
            current = current[index]
            continue

        raise ValueError(f"Cannot set path '{path}' on non-container value")

    final_part = parts[-1]
    if isinstance(current, dict):
        current[final_part] = value
        return

    if isinstance(current, list):
        if not final_part.isdigit():
            raise ValueError(f"Cannot set list path '{path}' with key '{final_part}'")
        index = int(final_part)
        while len(current) <= index:
            current.append(None)
        current[index] = value
        return

    raise ValueError(f"Cannot set path '{path}' on non-container value")


def _transform(value: Any, transform_name: str | None) -> Any:
    if transform_name is None or transform_name == "identity":
        return value
    if transform_name in {"to_float", "float"}:
        return None if value is None else float(value)
    if transform_name in {"to_int", "int"}:
        return None if value is None else int(value)
    if transform_name == "to_str":
        return None if value is None else str(value)
    if transform_name == "upper":
        return None if value is None else str(value).upper()
    if transform_name == "lower":
        return None if value is None else str(value).lower()
    raise ValueError(f"Unsupported transform: {transform_name}")


def _resolve_rule_value(source_payload: Any, rule: dict) -> Any:
    source_path = str(rule.get("source", "."))
    raw_value, found = _get_path(source_payload, source_path)

    if (not found or raw_value is None) and "default" in rule:
        raw_value = copy.deepcopy(rule["default"])
        found = True

    if not found:
        return None

    try:
        return _transform(raw_value, rule.get("transform"))
    except (TypeError, ValueError):
        if "default" not in rule:
            raise
        fallback = copy.deepcopy(rule["default"])
        return _transform(fallback, rule.get("transform"))


def _apply_rules(source_payload: Any, rules: list[dict]) -> dict:
    result: dict[str, Any] = {}

    for rule in rules:
        operation = rule.get("op", "copy")
        target_path = rule.get("target")
        if not target_path:
            raise ValueError("Mapping rule must include a target path")

        if operation == "map_array":
            source_path = str(rule.get("source", "."))
            source_items, found = _get_path(source_payload, source_path)

            if (not found or source_items is None) and "default" in rule:
                source_items = copy.deepcopy(rule["default"])

            if not isinstance(source_items, list):
                source_items = []

            item_rules = rule.get("item_rules", [])
            mapped_items = [_apply_rules(item, item_rules) for item in source_items]
            _set_path(result, target_path, mapped_items)
            continue

        if operation != "copy":
            raise ValueError(f"Unsupported mapping operation: {operation}")

        mapped_value = _resolve_rule_value(source_payload, rule)
        _set_path(result, target_path, mapped_value)

    return result


def apply_mapping(source_payload: dict, rules: list[dict]) -> dict:
    return _apply_rules(source_payload, rules)
