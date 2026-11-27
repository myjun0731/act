# design-eng

디자인 엔지니어링과 애니메이션 작업용 플러그인.

```
/plugin install design-eng --marketplace myjun0731/act
```

## 들어 있는 것
| 스킬 | 하는 일 | 호출 |
|---|---|---|
| apple-design | Apple식 유체·물리 모션과 재질·타이포 원칙을 웹으로 옮김 | 자동 |
| emil-design-eng | Emil Kowalski의 UI 완성도·컴포넌트·애니메이션 판단 원칙 | 자동 |
| animation-vocabulary | 애매한 모션 묘사를 정확한 용어로 바꿔 줌 | 자동 |
| find-animation-opportunities | 애니메이션이 필요한 곳과 필요 없는 곳을 구분해 제안 (읽기 전용) | 자동 |
| improve-animations | 코드베이스의 모션을 감사하고 실행 계획을 만듦 (읽기 전용) | 자동 |
| review-animations | 애니메이션 코드를 높은 기준으로 리뷰 | `/design-eng:review-animations` |
| pick-ui-library | 작업에 맞는 프런트엔드 라이브러리 선택 | `/design-eng:pick-ui-library` |

## 의존성
없음. 0.2.0부터 design-for-ai(`ryanthedev/design-for-ai`)에 의존하지 않는다. 디자인 조사·목업 도구가 필요하면 원 저장소에서 따로 설치한다(`NOTICE.md` 참고).

## 출처
`NOTICE.md` 참고.
