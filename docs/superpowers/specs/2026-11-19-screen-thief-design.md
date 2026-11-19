# 화면 도둑 (screen-thief) 설계

## 목적

회사 자리에서 이직 준비(원티드, 리멤버, 포트폴리오 작업)를 하다가 사람이 지나가면, 보던 탭을 탭 바에서 없애고 진짜 Slack 화면으로 넘어간다.

## 사용 흐름

1. 아무 탭에서 `⌥ + S` (Alt+S) → 그 탭이 사라지고 브라우저의 `app.slack.com` 탭이 활성화된다.
2. 어디서든 `⌥ + S`를 다시 누르면 → 사라졌던 탭이 원래 자리로 돌아온다.

Slack 탭이 없으면 탭만 사라지고 크롬이 옆 탭을 보여준다. Slack 탭이 활성 상태일 때 첫 번째 누름은 아무것도 하지 않는다.

## 결정과 이유

- **진짜 Slack을 그대로 사용**: 가짜 Slack UI나 Slack 위 덮개는 실제 채널명·동료·알림과 어긋나 오히려 눈에 띈다. (v1·v2에서 시도했다가 폐기)
- **탭 숨기기 = 닫기 + `chrome.sessions.restore`**: 크롬에는 탭 숨김 API가 없다. 닫은 탭 복원은 방문 기록과 스크롤 위치를 유지한다. 최소화 창으로 옮기는 방법은 macOS Dock에 썸네일이 남아 제외했다.
- **단축키는 `chrome.commands`**: 페이지에 코드를 주입하지 않고, `chrome://` 페이지 등 어떤 탭에서도 동작한다. `chrome://extensions/shortcuts`에서 변경 가능.
- **상태는 `chrome.storage.session`**: 서비스 워커가 재시작돼도 숨긴 탭 ID를 잃지 않는다. 브라우저를 끄면 비워진다.

## 한계

- 저장하지 않은 입력 내용(작성 중인 폼)은 복원되지 않는다.
- 한 번에 탭 하나만 숨긴다.

## 파일 구성

```
manifest.json        # 권한: tabs, sessions, storage. 명령 toggle = Alt+S
background.js        # toggle(): 숨기기 / 복원
background.test.js   # node --test, chrome API 목으로 흐름 검증
```

## 검증

- `node --test`: 숨김 → Slack 활성화 → 복원 순서, Slack 탭에서 누르면 무동작
- 수동: 원티드 탭에서 Alt+S → 탭 사라짐 + Slack 활성화 → Alt+S → 원티드 탭이 같은 위치·스크롤로 복귀
