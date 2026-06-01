from __future__ import annotations

import json
import sqlite3
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


ROOT = Path(__file__).resolve().parent
STATE_FILE = ROOT / "app-state.json"
DB_FILE = ROOT / "content.db"

DEFAULT_STATE = {"favorites": [], "analyses": {}, "coreCodes": {}, "acmCodes": {}}


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


def ensure_database() -> None:
    conn = get_connection()
    conn.execute("PRAGMA foreign_keys = ON")
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS topics (
            name TEXT PRIMARY KEY,
            display_order INTEGER NOT NULL,
            filled INTEGER NOT NULL DEFAULT 1,
            title TEXT NOT NULL,
            intro TEXT NOT NULL DEFAULT '',
            core_code TEXT NOT NULL DEFAULT '',
            acm_code TEXT NOT NULL DEFAULT '',
            analysis TEXT NOT NULL DEFAULT ''
        );

        CREATE TABLE IF NOT EXISTS questions (
            topic_name TEXT NOT NULL,
            question_id TEXT NOT NULL,
            title TEXT NOT NULL,
            name TEXT NOT NULL DEFAULT '',
            link TEXT NOT NULL DEFAULT '',
            intro TEXT NOT NULL DEFAULT '',
            core_code TEXT NOT NULL DEFAULT '',
            acm_code TEXT NOT NULL DEFAULT '',
            analysis TEXT NOT NULL DEFAULT '',
            sort_order INTEGER NOT NULL,
            PRIMARY KEY (topic_name, question_id),
            FOREIGN KEY (topic_name) REFERENCES topics(name) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS favorites (
            question_key TEXT PRIMARY KEY
        );

        CREATE TABLE IF NOT EXISTS saved_contents (
            content_type TEXT NOT NULL,
            storage_key TEXT NOT NULL,
            content TEXT NOT NULL DEFAULT '',
            PRIMARY KEY (content_type, storage_key)
        );

        CREATE TABLE IF NOT EXISTS section_items (
            section_key TEXT NOT NULL,
            item_order INTEGER NOT NULL,
            title TEXT NOT NULL,
            question TEXT NOT NULL DEFAULT '',
            answer TEXT NOT NULL DEFAULT '',
            PRIMARY KEY (section_key, item_order)
        );

        CREATE TABLE IF NOT EXISTS algorithm_topics (
            collection_key TEXT NOT NULL,
            name TEXT NOT NULL,
            display_order INTEGER NOT NULL,
            filled INTEGER NOT NULL DEFAULT 1,
            title TEXT NOT NULL,
            intro TEXT NOT NULL DEFAULT '',
            core_code TEXT NOT NULL DEFAULT '',
            acm_code TEXT NOT NULL DEFAULT '',
            analysis TEXT NOT NULL DEFAULT '',
            PRIMARY KEY (collection_key, name)
        );

        CREATE TABLE IF NOT EXISTS algorithm_questions (
            collection_key TEXT NOT NULL,
            topic_name TEXT NOT NULL,
            question_id TEXT NOT NULL,
            title TEXT NOT NULL,
            name TEXT NOT NULL DEFAULT '',
            link TEXT NOT NULL DEFAULT '',
            intro TEXT NOT NULL DEFAULT '',
            core_code TEXT NOT NULL DEFAULT '',
            acm_code TEXT NOT NULL DEFAULT '',
            analysis TEXT NOT NULL DEFAULT '',
            sort_order INTEGER NOT NULL,
            PRIMARY KEY (collection_key, topic_name, question_id),
            FOREIGN KEY (collection_key, topic_name)
                REFERENCES algorithm_topics(collection_key, name)
                ON DELETE CASCADE
        );
        """
    )
    seed_algorithm_data(conn)
    conn.close()


def seed_algorithm_data(conn: sqlite3.Connection) -> None:
    hot100_count = conn.execute(
        "SELECT COUNT(*) AS count FROM algorithm_topics WHERE collection_key = 'hot100'"
    ).fetchone()["count"]
    if hot100_count == 0:
        legacy_topics = conn.execute(
            """
            SELECT name, display_order, filled, title, intro, core_code, acm_code, analysis
            FROM topics
            ORDER BY display_order
            """
        ).fetchall()
        for topic in legacy_topics:
            conn.execute(
                """
                INSERT OR IGNORE INTO algorithm_topics(
                    collection_key, name, display_order, filled, title, intro, core_code, acm_code, analysis
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    "hot100",
                    topic["name"],
                    topic["display_order"],
                    topic["filled"],
                    topic["title"],
                    topic["intro"],
                    topic["core_code"],
                    topic["acm_code"],
                    topic["analysis"],
                ),
            )

        legacy_questions = conn.execute(
            """
            SELECT topic_name, question_id, title, name, link, intro, core_code, acm_code, analysis, sort_order
            FROM questions
            ORDER BY topic_name, sort_order
            """
        ).fetchall()
        for question in legacy_questions:
            conn.execute(
                """
                INSERT OR IGNORE INTO algorithm_questions(
                    collection_key, topic_name, question_id, title, name, link, intro, core_code, acm_code, analysis, sort_order
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    "hot100",
                    question["topic_name"],
                    question["question_id"],
                    question["title"],
                    question["name"],
                    question["link"],
                    question["intro"],
                    question["core_code"],
                    question["acm_code"],
                    question["analysis"],
                    question["sort_order"],
                ),
            )

    classic_topics = [
        "数组",
        "字符串",
        "双指针",
        "滑动窗口",
        "矩阵",
        "哈希表",
        "区间",
        "栈",
        "链表",
        "二叉树",
        "二叉树层次遍历",
        "二叉搜索树",
        "图",
        "图的广度优先搜索",
        "字典树",
        "回溯",
        "分治",
        "Kadane 算法",
        "二分查找",
        "堆",
        "位运算",
        "数学",
        "一维动态规划",
        "多维动态规划",
    ]
    classic_count = conn.execute(
        "SELECT COUNT(*) AS count FROM algorithm_topics WHERE collection_key = 'classic150'"
    ).fetchone()["count"]
    if classic_count == 0:
        for index, name in enumerate(classic_topics):
            conn.execute(
                """
                INSERT OR IGNORE INTO algorithm_topics(
                    collection_key, name, display_order, filled, title, intro, core_code, acm_code, analysis
                ) VALUES (?, ?, ?, ?, ?, '', '', '', '')
                """,
                (
                    "classic150",
                    name,
                    index,
                    0,
                    f"{name}专题题单",
                ),
            )
    conn.commit()


def migrate_state_file_if_needed() -> None:
    ensure_database()
    if not STATE_FILE.exists():
        return

    try:
        data = json.loads(STATE_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        data = DEFAULT_STATE

    conn = get_connection()

    for key in dict.fromkeys(data.get("favorites", [])):
        conn.execute(
            "INSERT OR IGNORE INTO favorites(question_key) VALUES (?)",
            (key,),
        )

    for content_type, payload_key in (
        ("analysis", "analyses"),
        ("core", "coreCodes"),
        ("acm", "acmCodes"),
    ):
        mapping = data.get(payload_key, {})
        if isinstance(mapping, dict):
            for storage_key, content in mapping.items():
                conn.execute(
                    """
                    INSERT OR REPLACE INTO saved_contents(content_type, storage_key, content)
                    VALUES (?, ?, ?)
                    """,
                    (content_type, storage_key, content or ""),
                )

    conn.commit()
    conn.close()
    STATE_FILE.unlink(missing_ok=True)


def load_state() -> dict:
    ensure_database()
    conn = get_connection()
    favorites = [
        row["question_key"]
        for row in conn.execute("SELECT question_key FROM favorites ORDER BY rowid")
    ]
    analyses = {
        row["storage_key"]: row["content"]
        for row in conn.execute(
            "SELECT storage_key, content FROM saved_contents WHERE content_type = 'analysis'"
        )
    }
    core_codes = {
        row["storage_key"]: row["content"]
        for row in conn.execute(
            "SELECT storage_key, content FROM saved_contents WHERE content_type = 'core'"
        )
    }
    acm_codes = {
        row["storage_key"]: row["content"]
        for row in conn.execute(
            "SELECT storage_key, content FROM saved_contents WHERE content_type = 'acm'"
        )
    }
    conn.close()
    return {
        "favorites": favorites,
        "analyses": analyses,
        "coreCodes": core_codes,
        "acmCodes": acm_codes,
    }


def save_state(state: dict) -> None:
    ensure_database()
    conn = get_connection()
    conn.execute("DELETE FROM favorites")
    conn.execute("DELETE FROM saved_contents")

    for key in dict.fromkeys(state.get("favorites", [])):
        conn.execute(
            "INSERT INTO favorites(question_key) VALUES (?)",
            (key,),
        )

    mappings = [
        ("analysis", state.get("analyses", {})),
        ("core", state.get("coreCodes", {})),
        ("acm", state.get("acmCodes", {})),
    ]
    for content_type, mapping in mappings:
        if isinstance(mapping, dict):
            for storage_key, content in mapping.items():
                conn.execute(
                    """
                    INSERT INTO saved_contents(content_type, storage_key, content)
                    VALUES (?, ?, ?)
                    """,
                    (content_type, storage_key, content or ""),
                )

    conn.commit()
    conn.close()


def load_content() -> dict:
    ensure_database()
    conn = get_connection()
    collections = [
        ("hot100", "Hot100"),
        ("classic150", "面试经典150"),
    ]
    payload_collections = []
    for collection_key, collection_title in collections:
        topics = conn.execute(
            """
            SELECT name, filled, title, intro, core_code, acm_code, analysis
            FROM algorithm_topics
            WHERE collection_key = ?
            ORDER BY display_order
            """,
            (collection_key,),
        ).fetchall()

        payload_topics = []
        for topic in topics:
            questions = conn.execute(
                """
                SELECT question_id, title, name, link, intro, core_code, acm_code, analysis
                FROM algorithm_questions
                WHERE collection_key = ? AND topic_name = ?
                ORDER BY sort_order
                """,
                (collection_key, topic["name"]),
            ).fetchall()

            payload_topics.append(
                {
                    "name": topic["name"],
                    "filled": bool(topic["filled"]),
                    "title": topic["title"],
                    "intro": topic["intro"],
                    "coreCode": topic["core_code"],
                    "acmCode": topic["acm_code"],
                    "analysis": topic["analysis"],
                    "questions": [
                        {
                            "id": row["question_id"],
                            "title": row["title"],
                            "name": row["name"],
                            "link": row["link"],
                            "intro": row["intro"],
                            "coreCode": row["core_code"],
                            "acmCode": row["acm_code"],
                            "analysis": row["analysis"],
                        }
                        for row in questions
                    ],
                }
            )
        payload_collections.append(
            {
                "key": collection_key,
                "title": collection_title,
                "topics": payload_topics,
            }
        )

    conn.close()
    return {"collections": payload_collections}


def save_algorithm_question(payload: dict) -> dict:
    ensure_database()
    collection_key = str(payload.get("collectionKey") or "").strip()
    topic_name = str(payload.get("topicName") or "").strip()
    title = str(payload.get("title") or "").strip()
    question_id = str(payload.get("questionId") or "").strip()
    intro = str(payload.get("intro") or "").strip()

    if not collection_key or not topic_name or not title:
        raise ValueError("collectionKey, topicName, title are required")

    conn = get_connection()
    topic = conn.execute(
        """
        SELECT name
        FROM algorithm_topics
        WHERE collection_key = ? AND name = ?
        """,
        (collection_key, topic_name),
    ).fetchone()
    if topic is None:
        conn.close()
        raise ValueError("topic not found")

    max_sort_order = conn.execute(
        """
        SELECT COALESCE(MAX(sort_order), 0) AS max_sort_order
        FROM algorithm_questions
        WHERE collection_key = ? AND topic_name = ?
        """,
        (collection_key, topic_name),
    ).fetchone()["max_sort_order"]
    next_order = int(max_sort_order) + 1
    if not question_id:
        question_id = str(next_order)

    conn.execute(
        """
        INSERT INTO algorithm_questions(
            collection_key, topic_name, question_id, title, name, link, intro, core_code, acm_code, analysis, sort_order
        ) VALUES (?, ?, ?, ?, '', '', ?, '', '', '', ?)
        """,
        (collection_key, topic_name, question_id, title, intro, next_order),
    )
    conn.commit()
    conn.close()
    return {
        "id": question_id,
        "title": title,
        "intro": intro,
        "coreCode": "",
        "acmCode": "",
        "analysis": "",
    }


def load_sections() -> dict:
    ensure_database()
    conn = get_connection()
    rows = conn.execute(
        """
        SELECT section_key, item_order, title, question, answer
        FROM section_items
        ORDER BY section_key, item_order
        """
    ).fetchall()
    conn.close()

    payload: dict[str, list[dict]] = {}
    for row in rows:
        payload.setdefault(row["section_key"], []).append(
            {
                "order": row["item_order"],
                "title": row["title"],
                "question": row["question"],
                "answer": row["answer"],
            }
        )
    return {"sections": payload}


def save_section_item(payload: dict) -> dict:
    ensure_database()
    section_key = str(payload.get("sectionKey") or "").strip()
    raw_content = str(payload.get("content") or "").replace("\r\n", "\n").strip()

    if not section_key or not raw_content:
        raise ValueError("sectionKey and content are required")

    lines = [line for line in raw_content.split("\n")]
    title = (lines[0] or "").strip()
    answer = "\n".join(lines[1:]).strip()
    if not title:
        raise ValueError("title is required")

    conn = get_connection()
    max_order = conn.execute(
        """
        SELECT COALESCE(MAX(item_order), 0) AS max_order
        FROM section_items
        WHERE section_key = ?
        """,
        (section_key,),
    ).fetchone()["max_order"]
    next_order = int(max_order) + 1
    conn.execute(
        """
        INSERT INTO section_items(section_key, item_order, title, question, answer)
        VALUES (?, ?, ?, '', ?)
        """,
        (section_key, next_order, title, answer),
    )
    conn.commit()
    conn.close()
    return {
        "order": next_order,
        "title": title,
        "question": "",
        "answer": answer,
    }


def update_section_item(payload: dict) -> dict:
    ensure_database()
    section_key = str(payload.get("sectionKey") or "").strip()
    item_order = int(payload.get("itemOrder") or 0)
    raw_content = str(payload.get("content") or "").replace("\r\n", "\n").strip()

    if not section_key or item_order <= 0 or not raw_content:
        raise ValueError("sectionKey, itemOrder and content are required")

    lines = [line for line in raw_content.split("\n")]
    title = (lines[0] or "").strip()
    answer = "\n".join(lines[1:]).strip()
    if not title:
        raise ValueError("title is required")

    conn = get_connection()
    exists = conn.execute(
        """
        SELECT 1
        FROM section_items
        WHERE section_key = ? AND item_order = ?
        """,
        (section_key, item_order),
    ).fetchone()
    if not exists:
        conn.close()
        raise ValueError("item not found")

    conn.execute(
        """
        UPDATE section_items
        SET title = ?, question = '', answer = ?
        WHERE section_key = ? AND item_order = ?
        """,
        (title, answer, section_key, item_order),
    )
    conn.commit()
    conn.close()
    return {
        "order": item_order,
        "title": title,
        "question": "",
        "answer": answer,
    }


def delete_section_item(payload: dict) -> None:
    ensure_database()
    section_key = str(payload.get("sectionKey") or "").strip()
    item_order = int(payload.get("itemOrder") or 0)
    if not section_key or item_order <= 0:
        raise ValueError("sectionKey and itemOrder are required")

    conn = get_connection()
    exists = conn.execute(
        """
        SELECT 1
        FROM section_items
        WHERE section_key = ? AND item_order = ?
        """,
        (section_key, item_order),
    ).fetchone()
    if not exists:
        conn.close()
        raise ValueError("item not found")

    conn.execute(
        "DELETE FROM section_items WHERE section_key = ? AND item_order = ?",
        (section_key, item_order),
    )
    rows = conn.execute(
        """
        SELECT item_order
        FROM section_items
        WHERE section_key = ?
        ORDER BY item_order
        """,
        (section_key,),
    ).fetchall()
    for index, row in enumerate(rows, start=1):
        if row["item_order"] != index:
            conn.execute(
                """
                UPDATE section_items
                SET item_order = ?
                WHERE section_key = ? AND item_order = ?
                """,
                (index, section_key, row["item_order"]),
            )
    conn.commit()
    conn.close()


class AppHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self) -> None:
        if self.path == "/api/state":
            state = load_state()
            payload = json.dumps(state, ensure_ascii=False).encode("utf-8")
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return
        if self.path == "/api/content":
            content = load_content()
            payload = json.dumps(content, ensure_ascii=False).encode("utf-8")
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return
        if self.path == "/api/sections":
            sections = load_sections()
            payload = json.dumps(sections, ensure_ascii=False).encode("utf-8")
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return
        return super().do_GET()

    def do_POST(self) -> None:
        content_length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(content_length)
        try:
            payload = json.loads(body.decode("utf-8"))
        except json.JSONDecodeError:
            self.send_error(HTTPStatus.BAD_REQUEST, "Invalid JSON")
            return

        if self.path == "/api/state":
            save_state(payload)
            response = json.dumps({"ok": True}, ensure_ascii=False).encode("utf-8")
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(response)))
            self.end_headers()
            self.wfile.write(response)
            return

        if self.path == "/api/algorithm-question":
            try:
                question = save_algorithm_question(payload)
            except ValueError as exc:
                self.send_error(HTTPStatus.BAD_REQUEST, str(exc))
                return

            response = json.dumps({"ok": True, "question": question}, ensure_ascii=False).encode("utf-8")
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(response)))
            self.end_headers()
            self.wfile.write(response)
            return

        if self.path == "/api/section-item":
            try:
                item = save_section_item(payload)
            except ValueError as exc:
                self.send_error(HTTPStatus.BAD_REQUEST, str(exc))
                return

            response = json.dumps({"ok": True, "item": item}, ensure_ascii=False).encode("utf-8")
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(response)))
            self.end_headers()
            self.wfile.write(response)
            return

        if self.path == "/api/section-item/update":
            try:
                item = update_section_item(payload)
            except ValueError as exc:
                self.send_error(HTTPStatus.BAD_REQUEST, str(exc))
                return

            response = json.dumps({"ok": True, "item": item}, ensure_ascii=False).encode("utf-8")
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(response)))
            self.end_headers()
            self.wfile.write(response)
            return

        if self.path == "/api/section-item/delete":
            try:
                delete_section_item(payload)
            except ValueError as exc:
                self.send_error(HTTPStatus.BAD_REQUEST, str(exc))
                return

            response = json.dumps({"ok": True}, ensure_ascii=False).encode("utf-8")
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(response)))
            self.end_headers()
            self.wfile.write(response)
            return

        self.send_error(HTTPStatus.NOT_FOUND, "Not found")


class ReusableThreadingHTTPServer(ThreadingHTTPServer):
    allow_reuse_address = True


def main() -> None:
    migrate_state_file_if_needed()
    server = ReusableThreadingHTTPServer(("127.0.0.1", 8000), AppHandler)
    print("Serving on http://127.0.0.1:8000")
    server.serve_forever()


if __name__ == "__main__":
    main()
