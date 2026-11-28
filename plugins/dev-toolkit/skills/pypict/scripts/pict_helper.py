#!/usr/bin/env python3
"""
PICT Helper Script

This script provides utilities for working with PICT models and test cases.

Note: This is a placeholder/example script. Full implementation coming soon!

Requirements:
    pip install pypict --break-system-packages

Usage:
    python pict_helper.py generate config.json
    python pict_helper.py format output.txt
    python pict_helper.py parse output.txt
"""

import sys
import json
import locale
from typing import Dict, List, Any

# Windows 한국어 콘솔(cp949)에서도 한글 값이 깨지거나 죽지 않게 출력은 UTF-8 로 고정한다
for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8")
    except Exception:
        pass


class HelperError(Exception):
    """입력 파일을 읽거나 해석하지 못함 — main 이 메시지를 찍고 exit 1."""


def _read_text(path: str) -> str:
    """UTF-8(BOM 허용)로 읽고, 아니면 시스템 기본 인코딩(예: pict.exe 가 cp949 로 쓴 출력)으로 다시 읽는다."""
    with open(path, 'rb') as f:
        raw = f.read()
    for enc in ('utf-8-sig', locale.getpreferredencoding(False) or 'utf-8'):
        try:
            return raw.decode(enc)
        except (UnicodeDecodeError, LookupError):
            continue
    raise HelperError(f"{path}: UTF-8 도 시스템 인코딩도 아닌 파일입니다")


def _cells(line: str) -> List[str]:
    # strip() 은 끝의 빈 칸(탭)까지 지워 열이 밀린다 — 줄바꿈만 제거한다
    return line.rstrip('\r\n').split('\t')


def _md(v: str) -> str:
    # 값 속의 | 가 마크다운 표를 깨지 않게
    return v.replace('|', '\\|')

def generate_model(config_file: str) -> str:
    """
    Generate a PICT model from a JSON configuration file.
    
    Args:
        config_file: Path to JSON config file
        
    Returns:
        PICT model as string
        
    Example config.json:
    {
        "parameters": {
            "Browser": ["Chrome", "Firefox", "Safari"],
            "OS": ["Windows", "MacOS", "Linux"],
            "Memory": ["4GB", "8GB", "16GB"]
        },
        "constraints": [
            "IF [OS] = \"MacOS\" THEN [Browser] <> \"IE\"",
            "IF [Memory] = \"4GB\" THEN [OS] <> \"MacOS\""
        ]
    }
    """
    try:
        config = json.loads(_read_text(config_file))
        
        parameters = config.get('parameters', {})
        constraints = config.get('constraints', [])
        
        # Generate model
        model_lines = []
        model_lines.append("# Generated PICT Model")
        model_lines.append("")
        
        # Add parameters
        for param_name, values in parameters.items():
            values_str = ", ".join(values)
            model_lines.append(f"{param_name}: {values_str}")
        
        # Add constraints
        if constraints:
            model_lines.append("")
            model_lines.append("# Constraints")
            for constraint in constraints:
                if not constraint.endswith(';'):
                    constraint += ';'
                model_lines.append(constraint)
        
        return "\n".join(model_lines)
        
    except Exception as e:
        raise HelperError(f"Error generating model: {e}")

def format_output(output_file: str) -> str:
    """
    Format PICT output as a markdown table.
    
    Args:
        output_file: Path to PICT output file
        
    Returns:
        Markdown formatted table
    """
    try:
        lines = _read_text(output_file).splitlines()
        
        if not lines:
            return "No output to format"
        
        # First line is header
        header = _cells(lines[0])
        
        # Create markdown table
        table = []
        table.append("| " + " | ".join(_md(h) for h in header) + " |")
        table.append("|" + "|".join(["-" * (len(h) + 2) for h in header]) + "|")
        
        # Add data rows
        for line in lines[1:]:
            if line.strip():
                values = _cells(line)
                table.append("| " + " | ".join(_md(v) for v in values) + " |")
        
        return "\n".join(table)
        
    except Exception as e:
        raise HelperError(f"Error formatting output: {e}")

def parse_output(output_file: str) -> List[Dict[str, str]]:
    """
    Parse PICT output into a list of dictionaries.
    
    Args:
        output_file: Path to PICT output file
        
    Returns:
        List of test case dictionaries
    """
    try:
        lines = _read_text(output_file).splitlines()
        
        if not lines:
            return []
        
        # First line is header
        header = _cells(lines[0])
        
        # Parse data rows
        test_cases = []
        for i, line in enumerate(lines[1:], 1):
            if line.strip():
                values = _cells(line)
                test_case = {"test_id": i}
                for h, v in zip(header, values):
                    test_case[h] = v
                test_cases.append(test_case)
        
        return test_cases
        
    except Exception as e:
        raise HelperError(f"Error parsing output: {e}")

def main():
    """Main entry point for the script."""
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python pict_helper.py generate <config.json>")
        print("  python pict_helper.py format <output.txt>")
        print("  python pict_helper.py parse <output.txt>")
        sys.exit(1)
    
    command = sys.argv[1]
    
    try:
        _dispatch(command)
    except HelperError as e:
        print(str(e), file=sys.stderr)
        sys.exit(1)


def _dispatch(command: str):
    if command == "generate" and len(sys.argv) >= 3:
        config_file = sys.argv[2]
        model = generate_model(config_file)
        print(model)
    
    elif command == "format" and len(sys.argv) >= 3:
        output_file = sys.argv[2]
        table = format_output(output_file)
        print(table)
    
    elif command == "parse" and len(sys.argv) >= 3:
        output_file = sys.argv[2]
        test_cases = parse_output(output_file)
        print(json.dumps(test_cases, indent=2, ensure_ascii=False))
    
    else:
        print(f"Unknown command: {command}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()

# Example usage:
"""
# 1. Create a config.json file:
{
    "parameters": {
        "Browser": ["Chrome", "Firefox", "Safari"],
        "OS": ["Windows", "MacOS", "Linux"]
    },
    "constraints": [
        "IF [OS] = \"MacOS\" THEN [Browser] <> \"IE\""
    ]
}

# 2. Generate PICT model:
python pict_helper.py generate config.json > model.txt

# 3. Run PICT (if installed):
pict model.txt > output.txt

# 4. Format as markdown:
python pict_helper.py format output.txt

# 5. Parse to JSON:
python pict_helper.py parse output.txt
"""
