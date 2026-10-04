"""管理员批量导入「日程表」(.xlsx) 的解析与展开。

表格约定：一行 = 一条日程，首行（或前若干行中的一行）是表头。
表头可用中文或英文，常见写法都会被识别，例如：

    日期 | 开始时间 | 结束时间 | 标题 | 备注 | 分类 | 优先级 | 状态 | 重复 | 重复至

其中只有「日期」和「标题」是必填；其余列可留空。支持可选的「重复」列，
把一条日程展开成多个日期（每天 / 工作日 / 每周X），配合「重复至」限定范围。

解析结果里的每一行都是可以直接落库的 Plan 字段，方便「先预览、再确认导入」。
"""

from __future__ import annotations

import io
import re
from datetime import date, datetime, time, timedelta
from typing import Any, Optional

# 单次导入最多处理这么多行（含重复展开后的行数）。
MAX_ROWS = 2000
# 读表时最多读这么多行，避免超大表格把内存吃满（表头之外的都会计入）。
MAX_SHEET_ROWS = 20000
# 单条「重复」日程最多展开的天数，避免误填「重复至 2099 年」把库撑爆。
MAX_REPEAT_OCCURRENCES = 366

TITLE_MAX = 200
DESCRIPTION_MAX = 2000
CATEGORY_MAX = 50
DEFAULT_CATEGORY = "日程"


class ScheduleImportError(ValueError):
    """文件本身无法解析（不是表格 / 找不到表头 / 不是 xlsx）。"""


_ALIASES: dict[str, tuple[str, ...]] = {
    "date": ("日期", "日程日期", "计划日期", "开始日期", "所在日期", "date", "day"),
    "title": (
        "标题",
        "日程",
        "事项",
        "任务",
        "安排",
        "主题",
        "内容",
        "名称",
        "事项名称",
        "日程内容",
        "日程安排",
        "title",
        "name",
        "event",
        "subject",
    ),
    "start_time": ("开始时间", "起始时间", "开始", "起", "starttime", "start", "begin", "from"),
    "end_time": ("结束时间", "截止时间", "结束", "止", "endtime", "end", "finish", "to"),
    "time_range": ("时间", "时间段", "起止时间", "日程时间", "时段", "timerange", "time"),
    "description": ("备注", "描述", "说明", "详情", "备注说明", "description", "note", "remark", "memo"),
    "category": ("分类", "类别", "类型", "标签", "category", "tag", "type", "group"),
    "priority": ("优先级", "重要程度", "priority", "importance"),
    "status": ("状态", "status", "state"),
    "repeat": ("重复", "重复方式", "循环", "频次", "repeat", "recurrence", "frequency"),
    "repeat_until": ("重复至", "重复截止", "重复结束", "结束重复", "重复到", "repeatuntil", "until"),
}

_PRIORITY_MAP = {
    "high": "high",
    "高": "high",
    "高优先级": "high",
    "重要": "high",
    "紧急": "high",
    "medium": "medium",
    "中": "medium",
    "中优先级": "medium",
    "普通": "medium",
    "一般": "medium",
    "low": "low",
    "低": "low",
    "低优先级": "low",
    "次要": "low",
}

_STATUS_MAP = {
    "pending": "pending",
    "待办": "pending",
    "未开始": "pending",
    "未完成": "pending",
    "in_progress": "in_progress",
    "进行中": "in_progress",
    "doing": "in_progress",
    "done": "done",
    "已完成": "done",
    "完成": "done",
    "cancelled": "cancelled",
    "canceled": "cancelled",
    "已取消": "cancelled",
    "取消": "cancelled",
}

_WEEKDAY_NAMES = {"一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "日": 7, "天": 7}


def _norm(text: Any) -> str:
    """表头归一化：去空格、去常见标点、转小写，便于别名匹配。"""
    value = "" if text is None else str(text)
    value = value.replace("\u3000", " ").strip().lower()
    return re.sub(r"[\s:：()（）\[\]【】_\-./·、]+", "", value)


# 枚举列的值也按同一套规则归一化后再查表，例如 in_progress / In-Progress 都能识别。
_PRIORITY_MAP = {_norm(key): value for key, value in _PRIORITY_MAP.items()}
_STATUS_MAP = {_norm(key): value for key, value in _STATUS_MAP.items()}

_NORMALIZED_ALIASES: dict[str, str] = {}
for _field, _names in _ALIASES.items():
    for _name in _names:
        _NORMALIZED_ALIASES.setdefault(_norm(_name), _field)


def _clean(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and value.is_integer():
        value = int(value)
    return re.sub(r"\s+", " ", str(value).replace("\u3000", " ")).strip()


def _cell(cells: list, index: Optional[int]) -> Any:
    if index is None or index < 0 or index >= len(cells):
        return None
    return cells[index]


def _text(value: Any, limit: int) -> str:
    return _clean(value)[:limit]


def _to_real_date(year: int, month: int, day: int) -> Optional[str]:
    try:
        return date(year, month, day).isoformat()
    except ValueError:
        return None


def parse_date(value: Any) -> Optional[str]:
    """把单元格解析成 yyyy-mm-dd。支持 Excel 日期、yyyy/mm/dd、2026年10月5日、20261005。"""
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        number = float(value)
        if not number.is_integer():
            return None
        integer = int(number)
        if 19000101 <= integer <= 21001231:
            text = str(integer)
            return _to_real_date(int(text[:4]), int(text[4:6]), int(text[6:]))
        # Excel 日期序列号（1900 起算）
        if 20000 <= integer <= 80000:
            return (date(1899, 12, 30) + timedelta(days=integer)).isoformat()
        return None

    text = _clean(value).replace("：", ":")
    if not text:
        return None
    match = re.search(r"(\d{4})\s*[-/.年]\s*(\d{1,2})\s*[-/.月]\s*(\d{1,2})\s*日?", text)
    if match:
        return _to_real_date(int(match.group(1)), int(match.group(2)), int(match.group(3)))
    match = re.fullmatch(r"(\d{4})(\d{2})(\d{2})", text)
    if match:
        return _to_real_date(int(match.group(1)), int(match.group(2)), int(match.group(3)))
    # 只写了「10月5日」「10/5」没写年份：按今年算；若已过去半年以上，按明年算。
    match = re.search(r"(\d{1,2})\s*(?:月|/)\s*(\d{1,2})\s*日?", text)
    if match:
        month, day = int(match.group(1)), int(match.group(2))
        today = date.today()
        candidate = _to_real_date(today.year, month, day)
        if candidate and (today - date.fromisoformat(candidate)).days > 180:
            candidate = _to_real_date(today.year + 1, month, day)
        return candidate
    return None


def _has_explicit_year(value: Any) -> bool:
    if isinstance(value, (datetime, date)):
        return True
    return bool(re.search(r"\d{4}", _clean(value)))


def parse_time(value: Any) -> Optional[str]:
    """把单元格解析成 HH:MM。支持 Excel 时间、14:30、14:30:00、下午2点半、8点、1430。"""
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value.strftime("%H:%M")
    if isinstance(value, time):
        return value.strftime("%H:%M")
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        number = float(value)
        if 0 <= number < 1:
            minutes = round(number * 24 * 60) % (24 * 60)
            return f"{minutes // 60:02d}:{minutes % 60:02d}"
        if number.is_integer() and 0 <= number <= 2359:
            text = f"{int(number):04d}"
            return _format_clock(int(text[:2]), int(text[2:]))
        return None

    text = _clean(value).replace("：", ":")
    if not text:
        return None
    # 形如 2026-10-05 08:30，取其中的时间部分
    if re.search(r"\d{4}\s*[-/.年]", text):
        found = re.search(r"(\d{1,2}):(\d{2})", text)
        if found:
            return _format_clock(int(found.group(1)), int(found.group(2)))
    match = re.search(r"(凌晨|早上|上午|中午|下午|晚上)?\s*(\d{1,2})\s*[:点时]\s*(\d{1,2})?\s*分?", text)
    if not match:
        match = re.fullmatch(r"(\d{1,2})(\d{2})", text)
        if match:
            return _format_clock(int(match.group(1)), int(match.group(2)))
        return None
    hour = int(match.group(2))
    minute = int(match.group(3)) if match.group(3) else 0
    if minute == 0 and "半" in text:
        minute = 30
    period_text = match.group(1) or ""
    if period_text in ("下午", "晚上") and hour < 12:
        hour += 12
    elif period_text == "中午" and hour < 12:
        hour += 12
    elif period_text == "凌晨" and hour == 12:
        hour = 0
    return _format_clock(hour, minute)


def _format_clock(hour: int, minute: int) -> Optional[str]:
    if not 0 <= hour <= 23 or not 0 <= minute <= 59:
        return None
    return f"{hour:02d}:{minute:02d}"


def parse_time_range(value: Any) -> tuple[Optional[str], Optional[str]]:
    """解析「08:00-09:30」这类合并的时间段单元格。"""
    if isinstance(value, (datetime, time)):
        return parse_time(value), None
    text = _clean(value).replace("：", ":")
    if not text:
        return None, None
    # 去掉可能存在的日期前缀，例如「2026-10-05 08:00-09:30」
    text = re.sub(r"^\d{4}\s*[-/.年]\s*\d{1,2}\s*[-/.月]\s*\d{1,2}\s*日?\s*", "", text)
    if not text:
        return None, None
    parts = re.split(r"\s*(?:-|~|～|—|–|至|到)\s*", text, maxsplit=1)
    if len(parts) == 2:
        return parse_time(parts[0]), parse_time(parts[1])
    return parse_time(text), None


def _detect_repeat(text: str, anchor: Optional[str]) -> tuple[str, int]:
    """返回 (重复方式, 星期几)。重复方式：none / daily / workday / weekly。"""
    normalized = _norm(text)
    if not normalized:
        return "none", 0
    if any(word in normalized for word in ("每天", "每日", "天天", "daily", "everyday")):
        return "daily", 0
    if any(word in normalized for word in ("工作日", "周一到周五", "周一至周五", "workday", "weekday")):
        return "workday", 0
    if "每周" in normalized or "weekly" in normalized or "星期" in normalized or re.search(r"周[一二三四五六日天]", normalized):
        found = re.search(r"[周星期]([一二三四五六日天])", normalized)
        weekday = _WEEKDAY_NAMES.get(found.group(1), 0) if found else 0
        if not weekday and anchor:
            weekday = date.fromisoformat(anchor).isoweekday()
        return "weekly", weekday
    return "none", 0


def _expand_dates(row: dict, warnings: list[str]) -> list[dict]:
    """按「重复 / 重复至」把一行展开成多个日期的行。"""
    anchor = row["date"]
    kind, weekday = _detect_repeat(row.get("_repeat", ""), anchor)
    if kind == "none" or not row.get("_repeat_until"):
        if kind != "none":
            warnings.append(f"「{row['title']}」填了「重复」但没填「重复至」，已按单次导入")
        return [row]
    try:
        until = date.fromisoformat(row["_repeat_until"])
    except (TypeError, ValueError):
        warnings.append(f"「{row['title']}」的「重复至」不是有效日期，已按单次导入")
        return [row]
    start = date.fromisoformat(anchor)
    if until < start:
        warnings.append(f"「{row['title']}」的「重复至」早于开始日期，已按单次导入")
        return [row]

    dates: list[date] = []
    cursor = start
    while cursor <= until:
        if kind == "daily":
            dates.append(cursor)
        elif kind == "workday":
            if cursor.isoweekday() <= 5:
                dates.append(cursor)
        elif kind == "weekly" and cursor.isoweekday() == (weekday or start.isoweekday()):
            dates.append(cursor)
        cursor += timedelta(days=1)
        if len(dates) > MAX_REPEAT_OCCURRENCES:
            warnings.append(f"「{row['title']}」重复次数过多，已截断到前 {MAX_REPEAT_OCCURRENCES} 天")
            dates = dates[:MAX_REPEAT_OCCURRENCES]
            break

    expanded = []
    for item in dates:
        copy = dict(row)
        copy["date"] = item.isoformat()
        expanded.append(copy)
    return expanded


def _map_headers(cells: list) -> dict[str, int]:
    mapping: dict[str, int] = {}
    for index, cell in enumerate(cells):
        field = _NORMALIZED_ALIASES.get(_norm(cell))
        if field and field not in mapping:
            mapping[field] = index
    return mapping


def _detect_header(raw_rows: list[list]) -> tuple[Optional[int], dict[str, int]]:
    """在前若干行里找表头：优先「日期 + 标题」都认出来的那一行。"""
    fallback: Optional[tuple[int, dict[str, int]]] = None
    for index, row in enumerate(raw_rows[:20]):
        mapping = _map_headers(row)
        if not mapping:
            continue
        if "date" in mapping and "title" in mapping:
            return index, mapping
        if fallback is None and ("date" in mapping or "title" in mapping):
            fallback = (index, mapping)
    return fallback if fallback else (None, {})


def _probe_header_row(raw_rows: list[list]) -> Optional[int]:
    """表头写法完全没见过时，找「这一行不像数据、下面几行才像数据」的那一行当表头。

    例如第一行是「日期安排 / 事项内容 / 地点」，下面才是真正的日程。
    """
    if len(raw_rows) < 2:
        return None
    for index in range(min(5, len(raw_rows) - 1)):
        row = raw_rows[index]
        below_rows = raw_rows[index + 1 : index + 21]
        for column in range(len(row)):
            below = [_cell(item, column) for item in below_rows]
            if _looks_like_date(_cell(row, column)):
                continue
            hits = sum(1 for value in below if _looks_like_date(value))
            if hits and hits >= max(1, int(len(below) * 0.6)):
                return index
    return None


# ---- 表头认不出来时的兜底：直接按单元格内容判断哪一列是什么 ----

# 这些列名认不出来也不影响，可以靠内容自动识别
_TIME_FIELDS = {"start_time", "end_time", "time_range"}


def _looks_like_date(value: Any) -> bool:
    if isinstance(value, (datetime, date)):
        return True
    if isinstance(value, bool) or value is None:
        return False
    if isinstance(value, (int, float)):
        # 只认 8 位年月日（20261005），避免把序号/学号当成日期
        return re.fullmatch(r"\d{8}", _clean(value)) is not None and parse_date(value) is not None
    return parse_date(value) is not None


def _looks_like_time(value: Any) -> bool:
    if isinstance(value, (datetime, time)):
        return True
    text = _clean(value).replace("：", ":")
    if ":" not in text and "点" not in text:
        return False
    return parse_time(value) is not None or parse_time_range(value)[0] is not None


def _is_text_like(value: Any) -> bool:
    if isinstance(value, (datetime, date, time)):
        return False
    text = _clean(value)
    if len(text) < 2 or _looks_like_date(value) or _looks_like_time(value):
        return False
    return not text.replace(".", "").isdigit()


def _column_stats(raw_rows: list[list], data_start: int, width: int) -> dict[int, dict]:
    sample = raw_rows[data_start : data_start + 200]
    stats: dict[int, dict] = {}
    for index in range(width):
        values = [value for value in (_cell(row, index) for row in sample) if _clean(value)]
        if not values:
            continue
        text_values = [value for value in values if _is_text_like(value)]
        stats[index] = {
            "count": len(values),
            "date": sum(1 for value in values if _looks_like_date(value)) / len(values),
            "time": sum(1 for value in values if _looks_like_time(value)) / len(values),
            "text": len(text_values) / len(values),
            "avg_len": sum(len(_clean(value)) for value in text_values) / max(1, len(text_values)),
            # 教室 / 工号这类带数字的短文本，一般是地点而不是日程标题
            "digit": sum(1 for value in text_values if re.search(r"\d", _clean(value))) / max(1, len(text_values)),
        }
    return stats


def _infer_columns(raw_rows: list[list], data_start: int, mapping: dict[str, int]) -> dict[str, int]:
    """表头没写清楚时，按内容猜出日期 / 标题（必要时还有时间）列。"""
    width = max((len(row) for row in raw_rows[:200]), default=0)
    if width == 0:
        return mapping
    stats = _column_stats(raw_rows, data_start, width)
    if not stats:
        return mapping
    taken = set(mapping.values())

    if "date" not in mapping:
        # 时间列也允许被认成日期列：有些表只用一列「时间」同时写日期和时间
        excluded = {index for field, index in mapping.items() if field not in _TIME_FIELDS}
        candidates = [
            (index, item)
            for index, item in stats.items()
            if index not in excluded and item["date"] >= 0.6 and item["count"] >= 1
        ]
        if candidates:
            index = max(candidates, key=lambda pair: (pair[1]["date"], -pair[0]))[0]
            mapping["date"] = index
            taken.add(index)

    if "title" not in mapping:
        candidates = [
            (index, item)
            for index, item in stats.items()
            if index not in taken
            and item["text"] >= 0.5
            and item["count"] >= 1
            and item["date"] < 0.6
            and item["digit"] <= 0.5
        ]
        if not candidates:
            candidates = [
                (index, item)
                for index, item in stats.items()
                if index not in taken and item["text"] >= 0.5 and item["count"] >= 1 and item["date"] < 0.6
            ]
        if candidates:
            index = max(
                candidates,
                key=lambda pair: (pair[1]["count"], -round(pair[1]["digit"], 2), round(pair[1]["avg_len"], 1), -pair[0]),
            )[0]
            mapping["title"] = index
            taken.add(index)

    if "start_time" not in mapping and "end_time" not in mapping and "time_range" not in mapping:
        candidates = [
            (index, item)
            for index, item in stats.items()
            if index not in taken and item["time"] >= 0.6 and item["count"] >= 1
        ]
        if candidates:
            index = max(candidates, key=lambda pair: (pair[1]["time"], -pair[0]))[0]
            mapping["time_range"] = index
    return mapping


def _column_label(raw_rows: list[list], header_index: Optional[int], index: int) -> str:
    if header_index is not None:
        text = _clean(_cell(raw_rows[header_index], index))
        if text:
            return text
    return f"第 {index + 1} 列"


# ---- 横向「按周排布」的表格：第一行是日期，下面格子里写当天安排 ----

_LABEL_CELLS = {"星期", "周", "日期", "时间", "时间段", "上午", "下午", "中午", "晚上", "备注", "说明"}
for _day_name in ("一", "二", "三", "四", "五", "六", "日", "天"):
    _LABEL_CELLS.add(f"星期{_day_name}")
    _LABEL_CELLS.add(f"周{_day_name}")


def _cell_lines(value: Any) -> list[str]:
    """把单元格里的多行内容拆开（一个格子里写两三件事的情况）。"""
    if value is None or isinstance(value, (datetime, date, time)):
        return []
    return [part.strip() for part in re.split(r"[\n\r]+", str(value)) if part.strip()]


def _is_label_cell(text: str) -> bool:
    normalized = _norm(text)
    if normalized in _LABEL_CELLS:
        return True
    return normalized in {
        "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
        "mon", "tue", "wed", "thu", "fri", "sat", "sun",
    }


def _split_cell_time(text: str) -> tuple[Optional[str], Optional[str], str]:
    """把「08:00 背单词」「08:00-09:00 背单词」拆成时间与内容。"""
    match = re.match(r"^(\d{1,2}[:：]\d{2})\s*(?:[-~—–至到]\s*(\d{1,2}[:：]\d{2}))?\s+(.+)$", text)
    if not match:
        return None, None, text
    start = parse_time(match.group(1))
    if not start:
        return None, None, text
    end = parse_time(match.group(2)) if match.group(2) else None
    rest = match.group(3).strip()
    if len(rest) < 2:
        return None, None, text
    return start, end, rest


def _grid_date_blocks(raw_rows: list[list]) -> list[tuple[int, dict[int, str]]]:
    """找出「一行里排着好几个连续日期」的日期表头行——按周排布的表格都长这样。"""
    blocks: list[tuple[int, dict[int, str]]] = []
    for index, row in enumerate(raw_rows):
        dates: dict[int, str] = {}
        for column, value in enumerate(row):
            text = parse_date(value)
            if text:
                dates[column] = text
        # 竖排表格一行只有一个日期（日期 + 重复至 最多两个），三个以上才当成横向日期行
        if len(dates) < 3:
            continue
        ordered = sorted(date.fromisoformat(value) for value in dates.values())
        if (ordered[-1] - ordered[0]).days > len(ordered) + 2:
            continue
        blocks.append((index, dates))
    return blocks


def _parse_grid(raw_rows: list[list], warnings: list[str]) -> Optional[dict]:
    blocks = _grid_date_blocks(raw_rows)
    if not blocks:
        return None

    rows: list[dict] = []
    skipped = 0
    for position, (header_index, dates) in enumerate(blocks):
        end = blocks[position + 1][0] if position + 1 < len(blocks) else len(raw_rows)
        for row_index in range(header_index + 1, end):
            row = raw_rows[row_index]
            for column, plan_date in dates.items():
                value = _cell(row, column)
                if value is None or parse_date(value):
                    continue
                for line in _cell_lines(value):
                    if parse_date(line) or _is_label_cell(line):
                        continue
                    start_time, end_time, title = _split_cell_time(line)
                    title = title[:TITLE_MAX]
                    if not title:
                        skipped += 1
                        continue
                    rows.append(
                        {
                            "date": plan_date,
                            "title": title,
                            "description": "",
                            "start_time": start_time,
                            "end_time": end_time,
                            "category": DEFAULT_CATEGORY,
                            "priority": "medium",
                            "status": "pending",
                        }
                    )

    if not rows:
        return None
    if len(rows) > MAX_ROWS:
        warnings.append(f"共解析出 {len(rows)} 条日程，超出单次上限 {MAX_ROWS} 条，多余的已忽略")
        rows = rows[:MAX_ROWS]

    header_labels = "、".join(f"第 {index + 1} 行" for index, _ in blocks)
    warnings.append(
        f"这张表是横向按周排布的：已把 {header_labels} 里的日期当作日期列，每个格子里的内容作为当天的一条日程，请核对预览"
    )
    return {
        "rows": rows,
        "warnings": warnings,
        "skipped": skipped,
        "columns": {"date": f"{header_labels}里的日期", "title": "各格子内容"},
    }


def _read_sheet_rows(sheet) -> tuple[list[list], bool]:
    raw_rows: list[list] = []
    truncated = False
    for row in sheet.iter_rows(values_only=True):
        if len(raw_rows) >= MAX_SHEET_ROWS:
            truncated = True
            break
        raw_rows.append(list(row))
    return raw_rows, truncated


def _parse_sheet(raw_rows: list[list], truncated: bool) -> dict:
    """解析单个工作表：先按「一行一条日程」认，认不出再按「横向按周排布」认。"""
    warnings: list[str] = []
    if truncated:
        warnings.append(f"表格太大，只读取了前 {MAX_SHEET_ROWS} 行")
    try:
        return _parse_columns(raw_rows, warnings)
    except ScheduleImportError as exc:
        grid = _parse_grid(raw_rows, warnings)
        if grid is not None:
            return grid
        raise exc


def _parse_columns(raw_rows: list[list], warnings: list[str]) -> dict:
    """竖排表格：一行一条日程，表头认不出就按内容自动判断日期 / 标题列。"""

    header_index, header_map = _detect_header(raw_rows)
    if header_index is None:
        probe = _probe_header_row(raw_rows)
        if probe is not None:
            # 表头写法没见过，但这一行里的「备注 / 分类」等列名可能还是认识的
            header_index, header_map = probe, _map_headers(raw_rows[probe])
    data_start = 0 if header_index is None else header_index + 1
    auto_fields = [field for field in ("date", "title") if field not in header_map]
    header_map = _infer_columns(raw_rows, data_start, header_map)

    # 完全没有表头（或表头里没有任何可识别的字眼）时，如果第 1 行不像数据、第 2 行像数据，
    # 就把第 1 行当成表头，避免把「日期/标题」这类标题当成一条日程。
    if header_index is None and "date" in header_map:
        date_column = header_map["date"]
        first_is_date = _looks_like_date(_cell(raw_rows[0], date_column)) if raw_rows else False
        later_has_date = any(_looks_like_date(_cell(row, date_column)) for row in raw_rows[1:6])
        if not first_is_date and later_has_date:
            header_index, data_start = 0, 1

    if "date" not in header_map:
        raise ScheduleImportError(
            "没有识别出日期列。请确认表格里有一列写的是日期（如 2026-10-05、2026/10/5、10月5日）。"
            "如果这是横向排星期、纵向排节次的课程表网格，请在「课表」页用课表导入。"
        )
    if "title" not in header_map:
        raise ScheduleImportError("没有识别出标题列。请确认表格里有一列写的是日程内容，或把表头写成「标题」。")

    detected = ", ".join(
        f"{'日期' if field == 'date' else '标题'}列＝「{_column_label(raw_rows, header_index, index)}」"
        for field, index in header_map.items()
        if field in ("date", "title")
    )
    if header_index is None or auto_fields:
        warnings.append(f"已自动识别：{detected}，请核对预览是否正确")

    skipped = 0
    grouped: list[dict] = []
    assumed_year = False

    for offset, row in enumerate(raw_rows[data_start:], start=data_start + 1):
        if all(not _clean(cell) for cell in row):
            continue
        title = _text(_cell(row, header_map.get("title")), TITLE_MAX)
        if not title:
            skipped += 1
            continue
        raw_date = _cell(row, header_map.get("date"))
        date_text = parse_date(raw_date)
        if not date_text:
            skipped += 1
            if len(warnings) < 8:
                warnings.append(f"第 {offset} 行：无法识别「{title}」的日期（{_clean(raw_date) or '空'}），已跳过")
            continue
        if not _has_explicit_year(raw_date):
            assumed_year = True

        start = parse_time(_cell(row, header_map.get("start_time")))
        end = parse_time(_cell(row, header_map.get("end_time")))
        if (not start or not end) and "time_range" in header_map:
            range_start, range_end = parse_time_range(_cell(row, header_map.get("time_range")))
            start = start or range_start
            end = end or range_end

        priority_raw = _norm(_cell(row, header_map.get("priority")))
        status_raw = _norm(_cell(row, header_map.get("status")))
        category = _text(_cell(row, header_map.get("category")), CATEGORY_MAX) or DEFAULT_CATEGORY
        repeat_until_text = parse_date(_cell(row, header_map.get("repeat_until")))

        grouped.append(
            {
                "date": date_text,
                "title": title,
                "description": _text(_cell(row, header_map.get("description")), DESCRIPTION_MAX),
                "start_time": start,
                "end_time": end,
                "category": category,
                "priority": _PRIORITY_MAP.get(priority_raw, "medium"),
                "status": _STATUS_MAP.get(status_raw, "pending"),
                "_repeat": _text(_cell(row, header_map.get("repeat")), 40),
                "_repeat_until": repeat_until_text,
            }
        )

    rows: list[dict] = []
    for item in grouped:
        rows.extend(_expand_dates(item, warnings))

    if len(rows) > MAX_ROWS:
        warnings.append(f"共解析出 {len(rows)} 条日程，超出单次上限 {MAX_ROWS} 条，多余的已忽略")
        rows = rows[:MAX_ROWS]

    for item in rows:
        item.pop("_repeat", None)
        item.pop("_repeat_until", None)

    if assumed_year:
        warnings.append(f"表格里有「10月5日」这类没写年份的日期，已统一按 {date.today().year} 年（如已过去半年则按次年）处理")

    columns = {field: _column_label(raw_rows, header_index, index) for field, index in header_map.items()}
    return {"rows": rows, "warnings": warnings, "skipped": skipped, "columns": columns}


def parse_schedule_excel(data: bytes) -> dict:
    """解析 .xlsx 日程表，返回 {rows, warnings, skipped, columns}（不落库）。

    表头可以是「日期 / 标题」，也可以是别的写法，甚至没有表头——
    都会尝试按单元格内容自动识别。多个工作表时，取第一个能解析出日程的。
    """
    from openpyxl import load_workbook

    try:
        workbook = load_workbook(io.BytesIO(data), data_only=True, read_only=True)
    except Exception as exc:  # openpyxl 对损坏/非 xlsx 文件抛的异常种类较多
        raise ScheduleImportError("无法读取该文件，请确认上传的是 .xlsx 格式的日程表") from exc

    if not workbook.worksheets:
        raise ScheduleImportError("这个文件里没有工作表")

    first_error: Optional[ScheduleImportError] = None
    empty_result: Optional[dict] = None
    for sheet in workbook.worksheets:
        raw_rows, truncated = _read_sheet_rows(sheet)
        if not raw_rows:
            continue
        try:
            result = _parse_sheet(raw_rows, truncated)
        except ScheduleImportError as exc:
            first_error = first_error or exc
            continue
        if result["rows"]:
            return result
        # 解析通了但一条有效日程都没有：保留它，好让界面提示具体是哪些行有问题
        empty_result = empty_result or result
    if empty_result is not None:
        return empty_result
    if first_error:
        raise first_error
    raise ScheduleImportError("这个文件里没有可以解析的内容")


TEMPLATE_HEADERS = ["日期", "开始时间", "结束时间", "标题", "备注", "分类", "优先级", "状态", "重复", "重复至"]


def build_template_workbook() -> bytes:
    """生成一份可直接填写的日程导入模板。"""
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill

    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "日程表"
    sheet.append(TEMPLATE_HEADERS)
    head_fill = PatternFill("solid", start_color="D9F2EC")
    for column, _ in enumerate(TEMPLATE_HEADERS, start=1):
        cell = sheet.cell(row=1, column=column)
        cell.font = Font(bold=True)
        cell.fill = head_fill
    sheet.append([date.today().isoformat(), "09:00", "10:00", "晨会", "每周例会", "工作", "高", "待办", "每天", (date.today() + timedelta(days=6)).isoformat()])
    sheet.append([(date.today() + timedelta(days=1)).isoformat(), "14:00", "15:30", "项目复盘", "", "工作", "中", "待办", "", ""])
    sheet.append([(date.today() + timedelta(days=2)).isoformat(), "", "", "整理资料", "示例：不填时间表示全天", "默认", "", "", "", ""])
    widths = [14, 12, 12, 24, 28, 10, 10, 10, 10, 14]
    for index, width in enumerate(widths, start=1):
        sheet.column_dimensions[sheet.cell(row=1, column=index).column_letter].width = width
    for row in sheet.iter_rows(min_row=2):
        for cell in row:
            cell.number_format = "@"

    buffer = io.BytesIO()
    workbook.save(buffer)
    return buffer.getvalue()
