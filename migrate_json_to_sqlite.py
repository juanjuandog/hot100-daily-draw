from __future__ import annotations

import json
import sqlite3
from pathlib import Path


ROOT = Path(__file__).resolve().parent
DB_PATH = ROOT / "content.db"

TOPIC_FILES = [
    ("哈希", "hash-questions.json"),
    ("双指针", "two-pointers-questions.json"),
    ("滑动窗口", "sliding-window-questions.json"),
    ("子串", "substring-questions.json"),
    ("普通数组", "array-questions.json"),
    ("矩阵", "matrix-questions.json"),
    ("链表", "linked-list-questions.json"),
    ("二叉树", "binary-tree-questions.json"),
    ("图论", "graph-questions.json"),
    ("回溯", "backtracking-questions.json"),
    ("二分查找", "binary-search-questions.json"),
    ("栈", "stack-questions.json"),
    ("堆", "heap-questions.json"),
    ("贪心算法", "greedy-questions.json"),
    ("动态规划", "dp-questions.json"),
    ("多维动态规划", "multi-dp-questions.json"),
    ("技巧", "techniques-questions.json"),
]


def topic_defaults(topic: str) -> dict:
    return {
        "filled": 1,
        "title": f"{topic}专题题单",
        "intro": "当前专题已经按题号拆分，点击题目即可切换查看对应内容。",
        "coreCode": "",
        "acmCode": "",
        "analysis": "",
    }


def build_db() -> None:
    if DB_PATH.exists():
        DB_PATH.unlink()

    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")

    conn.executescript(
        """
        CREATE TABLE topics (
            name TEXT PRIMARY KEY,
            display_order INTEGER NOT NULL,
            filled INTEGER NOT NULL DEFAULT 1,
            title TEXT NOT NULL,
            intro TEXT NOT NULL DEFAULT '',
            core_code TEXT NOT NULL DEFAULT '',
            acm_code TEXT NOT NULL DEFAULT '',
            analysis TEXT NOT NULL DEFAULT ''
        );

        CREATE TABLE questions (
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
        """
    )

    for index, (topic, filename) in enumerate(TOPIC_FILES):
        topic_meta = topic_defaults(topic)
        conn.execute(
            """
            INSERT INTO topics (
                name, display_order, filled, title, intro, core_code, acm_code, analysis
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                topic,
                index,
                topic_meta["filled"],
                topic_meta["title"],
                topic_meta["intro"],
                topic_meta["coreCode"],
                topic_meta["acmCode"],
                topic_meta["analysis"],
            ),
        )

        json_path = ROOT / filename
        questions = json.loads(json_path.read_text(encoding="utf-8"))
        for q_index, question in enumerate(questions):
            conn.execute(
                """
                INSERT INTO questions (
                    topic_name, question_id, title, name, link, intro,
                    core_code, acm_code, analysis, sort_order
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    topic,
                    str(question.get("id", "")),
                    question.get("title", ""),
                    question.get("name", ""),
                    question.get("link", ""),
                    question.get("intro", ""),
                    question.get("coreCode", ""),
                    question.get("acmCode", ""),
                    question.get("analysis", ""),
                    q_index,
                ),
            )

    conn.commit()
    conn.close()


if __name__ == "__main__":
    build_db()
