import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET


NS = {
    "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "pr": "http://schemas.openxmlformats.org/package/2006/relationships",
}

QUESTION_RE = re.compile(r"^(\d+)\.\s*(.+)$")


def load_xml(zip_file, path):
    with zip_file.open(path) as f:
        return ET.parse(f).getroot()


def build_relationship_map(zip_file):
    rels = load_xml(zip_file, "word/_rels/document.xml.rels")
    rel_map = {}
    for rel in rels.findall("pr:Relationship", NS):
        rel_map[rel.attrib["Id"]] = rel.attrib.get("Target", "")
    return rel_map


def paragraph_text(paragraph):
    parts = []
    for node in paragraph.iter():
        if node.tag == f"{{{NS['w']}}}t":
            parts.append(node.text or "")
        elif node.tag == f"{{{NS['w']}}}br":
            parts.append("\n")
    return "".join(parts).strip()


def parse_document(docx_path):
    with zipfile.ZipFile(docx_path) as zf:
        document = load_xml(zf, "word/document.xml")
        rel_map = build_relationship_map(zf)

    body = document.find("w:body", NS)
    items = []
    for paragraph in body.findall("w:p", NS):
        style_node = paragraph.find("w:pPr/w:pStyle", NS)
        style = style_node.attrib.get(f"{{{NS['w']}}}val", "") if style_node is not None else ""
        link = None
        text = paragraph_text(paragraph)
        hyperlink = paragraph.find("w:hyperlink", NS)
        if hyperlink is not None:
            rid = hyperlink.attrib.get(f"{{{NS['r']}}}id")
            if rid:
              link = rel_map.get(rid)
        items.append({"style": style, "text": text, "link": link})
    return items


def normalize_items(items):
    questions = []
    current = None
    text_blocks = []
    analysis_buffer = []
    intro_buffer = []

    def flush_current():
        nonlocal current, text_blocks, analysis_buffer, intro_buffer
        if not current:
            return
        current["coreCode"] = ""
        current["acmCode"] = ""
        before_code_blocks = []
        after_code_blocks = []
        seen_first_code = False
        for block in text_blocks:
            stripped = block.strip()
            if not stripped:
                continue
            if not current["coreCode"] and (
                "class Solution" in stripped or stripped.startswith("class ")
            ):
                current["coreCode"] = stripped
                seen_first_code = True
            elif not current["acmCode"] and "public class Main" in stripped:
                current["acmCode"] = stripped
                seen_first_code = True
            else:
                if seen_first_code:
                    after_code_blocks.append(stripped)
                else:
                    before_code_blocks.append(stripped)
        if before_code_blocks:
            intro_buffer.extend(before_code_blocks)
        if after_code_blocks:
            analysis_buffer = after_code_blocks + analysis_buffer
        current["intro"] = "\n".join(line for line in intro_buffer if line).strip()
        current["analysis"] = "\n\n".join(line for line in analysis_buffer if line).strip()
        questions.append(current)
        current = None
        text_blocks = []
        analysis_buffer = []
        intro_buffer = []

    for item in items:
        text = item["text"].strip()
        if not text:
            continue

        if item["style"] == "Heading2":
            match = QUESTION_RE.match(text)
            if match:
                flush_current()
                current = {
                    "id": match.group(1),
                    "title": text,
                    "name": match.group(2),
                    "link": item["link"] or "",
                }
            continue

        if current is None:
            continue

        if item["style"] == "ne-codeblock":
            text_blocks.append(text)
            continue

        if not text_blocks:
            intro_buffer.append(text)
        else:
            analysis_buffer.append(text)

    flush_current()
    return questions


def main():
    if len(sys.argv) not in (2, 3):
        print("usage: python parse_docx.py <docx_path> [output_json]", file=sys.stderr)
        sys.exit(1)
    items = parse_document(sys.argv[1])
    questions = normalize_items(items)
    output = json.dumps(questions, ensure_ascii=False, indent=2)
    if len(sys.argv) == 3:
        with open(sys.argv[2], "w", encoding="utf-8") as f:
            f.write(output)
    else:
        print(output)


if __name__ == "__main__":
    main()
