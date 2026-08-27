import io
import os
from datetime import date, timedelta

import pytest

from app.services import timetable as tt


def _today_monday():
    today = date.today()
    return today - timedelta(days=today.isoweekday() - 1)


ANY_ROW = {
    "KCM": "Android技术开发基础",
    "SKJS": "金旭亮",
    "JASMC": "综教A504",
    "SKXQ": 4,
    "SKZC": "1111111100000000",
    "ZCMC": "1-8周",
    "KSJC": 1,
    "JSJC": 2,
    "XNXQDM": "2025-2026-1",
    "KCH": "100074105",
    "XF": 2,
    "KCXZDM_DISPLAY": "选修",
}


READ_ONLY_ROW = {
    "KCM": "高等数学",
    "SKJS": "张三",
    "JASMC": "A101",
    "SKXQ": 1,
    "SKZC": "111111111111111100000000",
    "ZCMC": "1-16周",
    "KSJC": 3,
    "JSJC": 4,
    "XNXQDM": "2025-2026-1",
}


def test_week_helpers():
    assert tt.mask_to_weeks("1111111100000000") == [1, 2, 3, 4, 5, 6, 7, 8]
    assert tt.weeks_to_mask([1, 3, 5], length=8) == "10101000"
    assert tt.parse_week_label("1-8周") == [1, 2, 3, 4, 5, 6, 7, 8]
    assert tt.parse_week_label("1-8周(单)") == [1, 3, 5, 7]
    assert tt.parse_week_label("2-16周(双)") == [2, 4, 6, 8, 10, 12, 14, 16]
    assert tt.parse_week_label("1-8,10-12周") == [1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12]
    assert tt.resolve_weeks("1111111100000000", None) == [1, 2, 3, 4, 5, 6, 7, 8]
    assert tt.infer_term(date(2025, 10, 1)) == "2025-2026-1"
    assert tt.infer_term(date(2026, 3, 1)) == "2025-2026-2"


def test_parse_wisedu_rows():
    courses = tt.parse_wisedu_rows([ANY_ROW, READ_ONLY_ROW])
    assert len(courses) == 2
    first = courses[0]
    assert first["name"] == "Android技术开发基础"
    assert first["day_of_week"] == 4
    assert first["start_period"] == 1
    assert first["end_period"] == 2
    assert first["week_mask"] == "1111111100000000"
    assert first["term"] == "2025-2026-1"


def test_parse_arranged_list():
    items = [
        {
            "courseName": "网络安全实训",
            "courseCode": "UK03018",
            "beginSection": 1,
            "endSection": 2,
            "dayOfWeek": 4,
            "week": "0000000011111111",
            "placeName": "训1223",
            "weeksAndTeachers": "9-16周[实践]/张德慧[主讲]",
            "credit": "1.0",
        }
    ]
    courses = tt.parse_arranged_list(items, term="2026-2027-1")
    assert len(courses) == 1
    first = courses[0]
    assert first["name"] == "网络安全实训"
    assert first["teacher"] == "张德慧"
    assert first["location"] == "训1223"
    assert first["day_of_week"] == 4
    assert first["start_period"] == 1
    assert first["end_period"] == 2
    assert first["week_mask"] == "0000000011111111"
    assert first["week_label"] == "9-16周"


def test_parse_excel():
    from openpyxl import Workbook

    wb = Workbook()
    ws = wb.active
    ws.append(["课程名称", "教师", "教室", "星期", "节次", "周次"])
    ws.append(["软件工程", "李四", "B202", "星期一", "1-2节", "1-16周"])
    buf = io.BytesIO()
    wb.save(buf)
    courses = tt.parse_excel(buf.getvalue(), term="2025-2026-1")
    assert len(courses) == 1
    assert courses[0]["name"] == "软件工程"
    assert courses[0]["day_of_week"] == 1
    assert courses[0]["start_period"] == 1
    assert courses[0]["end_period"] == 2


def test_parse_html_flat():
    html = """
    <table>
      <tr><th>课程名称</th><th>教师</th><th>教室</th><th>星期</th><th>节次</th><th>周次</th></tr>
      <tr><td>数据结构</td><td>王五</td><td>C303</td><td>周三</td><td>3-4节</td><td>1-12周</td></tr>
    </table>
    """
    courses = tt.parse_html(html, term="2025-2026-1")
    assert len(courses) == 1
    assert courses[0]["name"] == "数据结构"
    assert courses[0]["day_of_week"] == 3


def test_parse_ics():
    ics = """BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:操作系统@赵六
DTSTART:20250901T080000
DTEND:20250901T094000
LOCATION:D401
RRULE:FREQ=WEEKLY;COUNT=16
END:VEVENT
END:VCALENDAR
"""
    courses = tt.parse_ics(ics, term="2025-2026-1")
    assert len(courses) == 1
    assert courses[0]["name"] == "操作系统"
    assert courses[0]["teacher"] == "赵六"
    assert courses[0]["day_of_week"] == 1


def test_requires_auth(client):
    assert client.get("/api/timetable/courses").status_code == 401
    assert client.post("/api/timetable/courses", json={"term": "2025-2026-1", "courses": []}).status_code == 401
    assert client.post("/api/timetable/generate-plans", json={"term": "2025-2026-1", "week_start": "2025-09-01"}).status_code == 401


def test_save_and_list_courses(client, auth_headers):
    url = "/api/timetable/courses"
    payload = {
        "term": "2025-2026-1",
        "week1_date": "2025-09-01",
        "courses": [
            {
                "term": "2025-2026-1",
                "name": "软件工程",
                "teacher": "李四",
                "location": "B202",
                "day_of_week": 1,
                "start_period": 1,
                "end_period": 2,
                "week_mask": "1111111100000000",
                "week_label": "1-8周",
            }
        ],
    }
    saved = client.post(url, json=payload, headers=auth_headers)
    assert saved.status_code == 200
    assert saved.json()["saved"] == 1

    listed = client.get("/api/timetable/courses?term=2025-2026-1", headers=auth_headers).json()
    assert len(listed["courses"]) == 1
    assert listed["courses"][0]["name"] == "软件工程"
    assert listed["settings"]["week1_date"] == "2025-09-01"

    # 再次保存同学期应替换，而非追加
    payload["courses"][0]["name"] = "替换后的课"
    assert client.post(url, json=payload, headers=auth_headers).json()["saved"] == 1
    assert client.get("/api/timetable/courses?term=2025-2026-1", headers=auth_headers).json()["courses"][0]["name"] == "替换后的课"


def test_courses_isolated_per_user(client, auth_headers, register_user):
    other = register_user("other@example.com")
    payload = {
        "term": "2025-2026-1",
        "courses": [{"term": "2025-2026-1", "name": "owner课", "day_of_week": 1, "start_period": 1, "end_period": 1}],
    }
    client.post("/api/timetable/courses", json=payload, headers=auth_headers)
    others = client.get("/api/timetable/courses?term=2025-2026-1", headers=other).json()["courses"]
    assert others == []


def test_settings_get_update(client, auth_headers):
    initial = client.get("/api/timetable/settings", headers=auth_headers).json()
    assert initial["week1_date"] is None
    assert initial["period_times"][0]["start"] == "10:00"

    patched = client.patch(
        "/api/timetable/settings",
        json={"active_term": "2025-2026-1", "week1_date": "2025-09-01"},
        headers=auth_headers,
    ).json()
    assert patched["week1_date"] == "2025-09-01"


def test_generate_plans_creates_and_dedups(client, auth_headers):
    this_monday = _today_monday()
    week1 = (this_monday - timedelta(weeks=1)).isoformat()
    week_start = (this_monday + timedelta(weeks=1)).isoformat()
    term = "2025-2026-1"
    client.post(
        "/api/timetable/courses",
        json={
            "term": term,
            "week1_date": week1,
            "courses": [
                {
                    "term": term,
                    "name": "高数",
                    "teacher": "张三",
                    "location": "A101",
                    "day_of_week": 2,
                    "start_period": 1,
                    "end_period": 2,
                    "week_mask": "1111111111111111",
                    "week_label": "1-16周",
                }
            ],
        },
        headers=auth_headers,
    )
    first = client.post("/api/timetable/generate-plans", json={"term": term, "week_start": week_start}, headers=auth_headers).json()
    assert first["created"] == 1
    second = client.post("/api/timetable/generate-plans", json={"term": term, "week_start": week_start}, headers=auth_headers).json()
    assert second["created"] == 0
    assert second["skipped_duplicate"] == 1


def test_generate_plans_skips_past(client, auth_headers):
    this_monday = _today_monday()
    week1 = (this_monday - timedelta(weeks=2)).isoformat()
    week_start = (this_monday - timedelta(weeks=1)).isoformat()
    term = "2025-2026-1"
    client.post(
        "/api/timetable/courses",
        json={
            "term": term,
            "week1_date": week1,
            "courses": [
                {"term": term, "name": "历史课", "day_of_week": 1, "start_period": 1, "end_period": 1, "week_mask": "1111111111111111"}
            ],
        },
        headers=auth_headers,
    )
    result = client.post("/api/timetable/generate-plans", json={"term": term, "week_start": week_start}, headers=auth_headers).json()
    assert result["created"] == 0
    assert result["skipped_past"] == 1


def test_generate_plans_requires_week1(client, auth_headers):
    term = "2025-2026-1"
    week_start = (_today_monday() + timedelta(weeks=1)).isoformat()
    result = client.post("/api/timetable/generate-plans", json={"term": term, "week_start": week_start}, headers=auth_headers)
    assert result.status_code == 400


def test_wisedu_fetch_fails_without_valid_captcha(client, auth_headers):
    response = client.post(
        "/api/timetable/wisedu/fetch",
        json={"username": "x", "password": "y", "captcha_token": "bad", "captcha_code": "1"},
        headers=auth_headers,
    )
    assert response.status_code == 400
    assert "过期" in response.json()["detail"]



@pytest.mark.skipif(os.environ.get("WISEDU_LIVE") != "1", reason="需要真实教务账号：WISEDU_LIVE=1")
def test_wisedu_live_login_and_fetch(client, auth_headers):
    # 这一步用于实测确认登录接口；普通测试跳过。
    captcha = client.post("/api/timetable/wisedu/captcha", headers=auth_headers).json()
    response = client.post(
        "/api/timetable/wisedu/fetch",
        json={
            "username": os.environ["WISEDU_USERNAME"],
            "password": os.environ["WISEDU_PASSWORD"],
            "captcha_token": captcha["captcha_token"],
            "captcha_code": "0000",
            "term": os.environ.get("WISEDU_TERM", ""),
        },
        headers=auth_headers,
    )
    assert response.status_code == 200
