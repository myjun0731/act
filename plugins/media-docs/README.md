# media-docs

미디어·문서 스킬: Manim·Remotion 영상, UI 데모 녹화, HTML 슬라이드, 영상 편집·생성(MCP/API 키 선택). ECC(MIT) 내재화.


```
claude plugin install media-docs@act
```

- **opt-in**: allinone에 포함되지 않는다. 필요할 때만 `claude plugin install media-docs@act`로 설치한다.
- **독립 동작**: ECC 하네스(커맨드·에이전트·훅·메모리) 없이 동작하도록 고쳐서 넣는다. `python scripts/check_skills.py --plugin media-docs`이 ERROR 0이어야 한다.
- 출처와 변경 내용은 [ATTRIBUTION.md](ATTRIBUTION.md), 원본 라이선스는 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)에 있다.

## 구성

<!-- inventory:begin -->
### 스킬 (9)

| 스킬 | 설명 |
|---|---|
| `blender-motion-state-inspection` | Inspects Blender characters, rigs, poses, animation retargeting, ground contact, facing direction, or model-vs-motion alignment where screenshots alo… |
| `fal-ai-media` | Unified media generation via fal.ai MCP — image, video, and audio. |
| `frontend-slides` | Create stunning, animation-rich HTML presentations from scratch or by converting PowerPoint files. |
| `google-workspace-ops` | Operate across Google Drive, Docs, Sheets, and Slides as one workflow surface for plans, trackers, decks, and shared documents. |
| `manim-video` | Build reusable Manim explainers for technical concepts, graphs, system diagrams, and product walkthroughs, then hand off to a video editor or composi… |
| `nutrient-document-processing` | Process, convert, OCR, extract, redact, sign, and fill documents using the Nutrient DWS API. |
| `ui-demo` | Record polished UI demo videos using Playwright. |
| `video-editing` | AI-assisted video editing workflows for cutting, structuring, and augmenting real footage. |
| `videodb` | Ingest, index, search, edit, and monitor video and audio with the VideoDB Python SDK — upload from files, URLs, or RTSP feeds, build spoken and scene… |
<!-- inventory:end -->
