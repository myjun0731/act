# ml

머신러닝 스킬: PyTorch 패턴, ML 도입 플레이북, 추천 파이프라인 설계, 벵골어 NLP, MLE 워크플로. ECC(MIT) 내재화.


```
claude plugin install ml@act
```

- **opt-in**: allinone에 포함되지 않는다. 필요할 때만 `claude plugin install ml@act`로 설치한다.
- **독립 동작**: ECC 하네스(커맨드·에이전트·훅·메모리) 없이 동작하도록 고쳐서 넣는다. `python scripts/check_skills.py --plugin ml`이 ERROR 0이어야 한다.
- 출처와 변경 내용은 [ATTRIBUTION.md](ATTRIBUTION.md), 원본 라이선스는 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)에 있다.

## 구성

<!-- inventory:begin -->
### 스킬 (5)

| 스킬 | 설명 |
|---|---|
| `bengali-nlp` | Bengali (Bangla) text processing patterns including Unicode normalization, script detection, tokenization, conjunct handling, and Bangla-specific NLP… |
| `ml-adoption-playbook` | End-to-end methodology for AI agents and software engineers to add machine learning algorithms to existing non-ML codebases. |
| `mle-workflow` | Production machine-learning engineering workflow for data contracts, reproducible training, model evaluation, deployment, monitoring, and rollback. |
| `pytorch-patterns` | PyTorch deep learning patterns and best practices for building robust, efficient, and reproducible training pipelines, model architectures, and data … |
| `recsys-pipeline-architect` | Design composable recommendation, ranking, and feed pipelines using the six-stage Source→Hydrator→Filter→Scorer→Selector→SideEffect framework popular… |

### 에이전트 (1)

| 에이전트 | 설명 |
|---|---|
| `ml:pytorch-build-resolver` | PyTorch runtime, CUDA, and training error resolution specialist. |
<!-- inventory:end -->
