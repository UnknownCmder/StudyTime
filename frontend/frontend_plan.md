# 코드 테스트 방법
## 기본 세팅 (초기 세팅)
1. 코딩 애플 채널 튜토리얼에서 vue 다운 따라하기
2. node.js 다운로드
3. frontend 폴더로 이동
    - "cd .." : 상위 폴더로 이동 (ex : ../github/test -> ../github)
    - "cd {폴더명}" : {폴더명}으로 이동
4. 터미널에 `npm install` 입력
5. backend 폴더로 이동
6. 터미널에 `npm install` 입력

## 코드 실행법
1. frontend 폴더로 이동
    - "cd .." : 상위 폴더로 이동 (ex : ../github/test -> ../github)
    - "cd {폴더명}" : {폴더명}으로 이동
2. 터미널에 `npm run build` 입력
3. backend 폴더로 이동
4. 터미널에 `node server.js` 입력
5. 터미널에 나온 링크 들어가서 기능 확인
6. 종료법 : 터미널에서 ctrl + c 누르기
----
----
# 홈 (HomeView.vue)
- 공부 시간이 큰 순으로 1등부터 10등까지의 닉네임, 공부 시간을 출력한다
----
# 로그인 페이지 (SigninView.vue)
## 요소
- [ ] 아이디 입력 창 (class=id-input)
- [ ] 비밀번호 입력 창 (class=pw-input)
- [ ] 로그인 버튼 (class=btnSignin)
- [ ] 회원가입 페이지로 가기 버튼 (class=btnGoSignup)

## 참고사항
### 아이디
- 영어, 숫자만 입력 가능
### 로그인 버튼
- 로그인 버튼 입력 시 서버에 아이디와 비밀번호를 전송
- 로그인 성공 시 홈으로 이동
----
# 회원가입 페이지 (SingupView.vue)
## 요소
- [ ] 아이디 입력 창 (class=id-input)
- [ ] 이메일 입력 창 (class=email-input)
- [ ] 비밀번호 입력 창 (class=pw-input)
- [ ] 회원가입 버튼 (class=btnSignup)

## 참고사항
- 회원가입 
- 회원가입이 완료되면 로그인 창으로 이동한다
----
# 스탑워치 페이지 (StopWatchView.vue)
## 요소
- [ ] 흐른 시간 (class=time)
- [ ] 시작 버튼 (class=btnStart)
- [ ] 중지 버튼 (class=btnStop)

## 참고 사항
### 시작 버튼
- 시작버튼을 누르면 서버에 시작 시간을 전송

### 중지 버튼
- 중지 버튼을 누르면 작은 창이 뜬다. 그 창에는 공부한 과목 선택 창, 완료 버튼이 있다.
- 중지 버튼을 누르면 서버에 중지 시간을 전송
----
# 공부기록  (StudyRecordView.vue)
## 요소
- [ ] 날짜 (O월 O주) (class=date)
- [ ] 화살표 < (class=btnLeft), > (class=btnRight)
- [ ] 7 * 48 크기의 표 (class=timetable)

## 참고 사항
### 날짜 및 화살표
- 예시 : ' < 11월 4주 > '
- < : 이전 주로 이동
- \> : 다음 주로 이동
### 표
- 행 : 요일 (월 ~ 일) / 열 : 시간 (00시부터 24시까지 / 30분 간격)
- 공부 한 시간에 맞추어 과목에 맞는 색과 과목 이름 넣기

# 시간표 (TimeTableView.vue) (세부 기능 미정)
- 공부 계획 세우는 페이지

# 설정 (SettingView.vue) (세부 기능 미정)
- 설정 페이지
- 다크모드 설정, 이메일 변경, 비밀번호 변경 등의 기능 예정
