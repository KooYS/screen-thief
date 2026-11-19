# 화면 도둑 (screen-thief) 설계

## 목적

회사 자리에서 이직 준비(원티드, 리멤버, 포트폴리오 작업)를 하다가 사람이 지나가면, 보던 탭을 탭 바에서 없애고 진짜 Slack 화면으로 넘어간다.

## 사용 흐름

1. 아무 탭에서 `⌥ + S` (Alt+S) → 그 탭이 `PR 리뷰`라는 접힌 탭 그룹으로 숨겨지고 브라우저의 `app.slack.com` 탭이 활성화된다.
2. 어디서든 `⌥ + S`를 다시 누르면 → 그룹이 풀리고 그 탭이 다시 활성화된다.

Slack 탭이 없으면 옆 탭을 활성화한다. Slack 탭이 활성 상태일 때 첫 번째 누름은 아무것도 하지 않는다.

## 스포트라이트 모드

`⌥ + A`로 켜고 끔. 페이지 전체에 `backdrop-filter: blur(16px) grayscale(1) contrast(0.45)` 막을 씌우고, 커서 위치에 가로 1.8:1 타원 마스크로 구멍을 낸다. 막은 `pointer-events: none`이라 클릭·스크롤이 그대로 통과한다. `⌥` + 휠로 반지름 60~600px, `⌥ + ⇧` + 휠로 흐림 2~40px 조절. 켜짐 여부와 반지름은 `chrome.storage.local`에 저장되어 모든 탭에 동시에 적용된다.

## 결정과 이유

- **진짜 Slack을 그대로 사용**: 가짜 Slack UI나 Slack 위 덮개는 실제 채널명·동료·알림과 어긋나 오히려 눈에 띈다. (v1·v2에서 시도했다가 폐기)
- **탭 숨기기 = 접힌 탭 그룹**: 크롬에는 탭 숨김 API가 없다. `PR 리뷰`라는 회색 그룹으로 접으면 탭 바에 그룹 이름만 남고 (이름은 background.js의 GROUP_TITLE), 탭은 살아 있어 입력 내용까지 유지된다. 닫기+복원(v3)은 입력이 사라져 폐기, 최소화 창은 macOS Dock 썸네일이 남아 제외.
- **단축키는 `chrome.commands`**: 페이지에 코드를 주입하지 않고, `chrome://` 페이지 등 어떤 탭에서도 동작한다. `chrome://extensions/shortcuts`에서 변경 가능.
- **상태는 `chrome.storage.session`**: 서비스 워커가 재시작돼도 숨긴 탭 ID를 잃지 않는다. 브라우저를 끄면 비워진다.

## 한계

- 탭 바에 그룹 이름 칩이 남는다.
- 한 번에 탭 하나만 숨긴다. 원래 다른 그룹에 있던 탭은 복원 후 그룹에서 빠진다.

## 파일 구성

```
manifest.json        # 권한: tabs, tabGroups, storage. 명령 toggle = Alt+S, spotlight = Alt+A
background.js        # toggle(): 숨기기 / 복원, spotlight 명령 → storage 토글
spotlight.js         # content script: 블러 막 + 커서 타원 마스크
background.test.js   # node --test, chrome API 목으로 흐름 검증
```

## 검증

- `node --test`: 숨김 → Slack 활성화 → 복원 순서, Slack 없을 때 옆 탭 활성화, Slack 탭에서 누르면 무동작
- 수동: 원티드 탭에서 Alt+S → `PR 리뷰` 그룹으로 접힘 + Slack 활성화 → Alt+S → 원티드 탭이 입력 내용 그대로 복귀
