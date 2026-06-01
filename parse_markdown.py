import json
import re
import sys
from pathlib import Path


TITLE_RE = re.compile(r"^##\s+\[(?:<font[^>]*>)?(\d+\.\s*.+?)(?:</font>)?\]\((https?://[^)]+)\)\s*$")
TAG_RE = re.compile(r"<[^>]+>")


def clean_inline(text: str) -> str:
    text = TAG_RE.sub("", text)
    text = text.replace("**", "").replace("_", "").replace("`", "")
    return text.strip()


def extract_sections(content: str):
    lines = content.splitlines()
    questions = []
    current = None
    buffer = []

    def flush_current():
        nonlocal current, buffer
        if current is None:
            return
        current["raw_lines"] = buffer[:]
        questions.append(current)
        current = None
        buffer = []

    for line in lines:
        match = TITLE_RE.match(line.strip())
        if match:
            flush_current()
            title = clean_inline(match.group(1))
            current = {
                "id": title.split(".")[0].strip(),
                "title": title,
                "name": title.split(".", 1)[1].strip() if "." in title else title,
                "link": match.group(2),
            }
        elif current is not None:
            buffer.append(line)

    flush_current()
    return questions


def parse_question(raw_question):
    lines = raw_question.pop("raw_lines")
    intro_parts = []
    analysis_parts = []
    code_blocks = []

    i = 0
    before_first_code = True
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        if stripped.startswith("```"):
            lang = stripped[3:].strip()
            block_lines = []
            i += 1
            while i < len(lines) and not lines[i].strip().startswith("```"):
                block_lines.append(lines[i])
                i += 1
            code_blocks.append((lang, "\n".join(block_lines).strip()))
            before_first_code = False
        else:
            cleaned = clean_inline(line)
            if cleaned:
                if before_first_code:
                    intro_parts.append(cleaned)
                else:
                    analysis_parts.append(cleaned)
        i += 1

    core_code = ""
    acm_code = ""
    extra_analysis = []
    for lang, block in code_blocks:
      if not block:
          continue
      if not core_code and ("class Solution" in block or "class Trie" in block or "class " in block and "public class Main" not in block):
          core_code = block
      elif not acm_code and "public class Main" in block:
          acm_code = block
      else:
          extra_analysis.append(block)

    if extra_analysis:
        analysis_parts = extra_analysis + analysis_parts

    raw_question["intro"] = "\n".join(intro_parts).strip()
    raw_question["coreCode"] = core_code
    raw_question["acmCode"] = acm_code
    raw_question["analysis"] = "\n\n".join(part for part in analysis_parts if part).strip()
    return raw_question


def main():
    if len(sys.argv) not in (2, 3):
        print("usage: python parse_markdown.py <markdown_path> [output_json]", file=sys.stderr)
        sys.exit(1)

    content = Path(sys.argv[1]).read_text(encoding="utf-8")
    questions = [parse_question(question) for question in extract_sections(content)]
    output = json.dumps(questions, ensure_ascii=False, indent=2)

    if len(sys.argv) == 3:
        Path(sys.argv[2]).write_text(output, encoding="utf-8")
    else:
        print(output)


if __name__ == "__main__":
    main()
