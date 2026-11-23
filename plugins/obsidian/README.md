# obsidian

Obsidian 볼트를 Claude에서 읽고 쓰게 해 주는 MCP 서버 플러그인. 서버는 PyPI의 `mcp-obsidian` 0.2.3을 `uvx`로 실행한다.

```
/plugin install obsidian --marketplace myjun0731/claude-pro
```

## 준비
1. Obsidian에 **Local REST API** 커뮤니티 플러그인을 설치하고 켠다.
2. `uv`를 설치한다 (`winget install astral-sh.uv` 또는 `pip install uv`). `uvx` 명령이 필요하다.
3. 세션 안에서 설치하면 API 키 입력창이 뜬다. 셸에서 설치했다면 `/plugin configure obsidian@claude-pro`로 입력한다.
   키는 OS 자격 증명 저장소에 저장되고 `settings.json`에는 남지 않는다.

allinone에는 넣지 않았다. 키가 없으면 서버가 뜨지 못하므로, 필요한 PC에서만 따로 설치한다.
