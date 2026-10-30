<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { useAuth } from '../composables/useAuth'

const { isLoggedIn } = useAuth()

const stopwatchElapsed = ref(0) //스탑워치 경과시간 0으로 설정 및 화면 변환
const stopwatchRunning = ref(false) //스탑워치 작동 상태 false로 설정
const stopwatchStarted = ref(false) //스탑워치 시작 여부 false로 설정
const laps = ref([]) //랩기록 빈 배열 설정
const stopDialog = ref(null) //팝업 요소를 담을 변수. 화면이 만들어지기 전에는 null
const stoppedElapsed = ref(0) //중지 시 팝업에 표시할 경과시간의 초깃값을 0으로 설정

let stopwatchInterval = null //반복 실행 중인 작업 없음
let stopwatchStartedAt = 0 //경과시간 계산의 기준 시각 저장. 재개할 때 기존 경과시간을 반영해 조정

//표시 시간 : formatTime함수로 흐른시간을 화면에 표시
const stopwatchDisplay = computed(() => formatTime(stopwatchElapsed.value))

//밀리초 단위로 시간계산
function formatTime(milliseconds) {
  const hours = Math.floor(milliseconds / 3_600_000)
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000)
  const seconds = Math.floor((milliseconds % 60_000) / 1_000)

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

// 숫자를 최소 두 자리로 표시하고, 부족한 앞자리를 0으로 채우는 함수
function pad(value) {
  return String(value).padStart(2, '0')
}

//스탑워치 시작함수 : 스탑워치가 작동중이 아닐때 stopwatchStarted와 stopwatchRunning 값을 true로 바꿈
function startStopwatch() {
  if (stopwatchRunning.value) {
    return
  }

  stopwatchStarted.value = true
  stopwatchRunning.value = true
  stopwatchStartedAt = performance.now() - stopwatchElapsed.value
  updateElapsedTime()
  stopwatchInterval = window.setInterval(updateElapsedTime, 200)
}

//경과시간 갱신 : 경과시간 = 현재 시간 - 작동 시작 시간
function updateElapsedTime() {
  stopwatchElapsed.value = performance.now() - stopwatchStartedAt
}

//스탑워치 일시정지 : 작동중이면 경과시간을 즉시 갱신하고 반복 실행을 멈춤. 경과시간, 랩 기록, 시작 여부는 유지
function pauseStopwatch() {
  if (!stopwatchRunning.value) {
    return
  }

  updateElapsedTime()
  stopwatchRunning.value = false
  window.clearInterval(stopwatchInterval)
  stopwatchInterval = null
}

// 중지한 시간을 보관하고 초기화한 뒤 기록 팝업을 엽니다.
function stopStopwatch() {
  if (!stopwatchStarted.value) return

  pauseStopwatch()
  stoppedElapsed.value = stopwatchElapsed.value
  resetStopwatch()
  stopDialog.value.showModal()
}

// 실제 기록 저장은 추후 연결합니다.
function saveStopwatch() {
  stopDialog.value.close()
}

// 팝업을 닫습니다. 스톱워치는 이미 초기화된 상태를 유지합니다.
function cancelStopwatch() {
  stopDialog.value.close()
}

// 스톱워치 초기화
function resetStopwatch() {
  window.clearInterval(stopwatchInterval)
  stopwatchInterval = null
  stopwatchStartedAt = 0
  stopwatchElapsed.value = 0
  stopwatchRunning.value = false
  stopwatchStarted.value = false
  laps.value = []
}

// 랩 기록
function recordLap() {
  if (!stopwatchRunning.value) {
    return
  }

  updateElapsedTime()
  laps.value.unshift(stopwatchElapsed.value)
}

//컴포넌트가 화면에서 제거되기 직전에 반복 작업을 종료
onBeforeUnmount(() => {
  window.clearInterval(stopwatchInterval)
})
</script>

<template>
  <p v-if="!isLoggedIn" class="login-required-message">로그인을 해야 이용할 수 있습니다</p>
  <main v-else class="stopwatch-page">
    <section class="stopwatch-shell" aria-labelledby="stopwatch-title">
      <h1 id="stopwatch-title">스탑워치</h1>

      <div class="time" role="timer" aria-live="polite" aria-atomic="true">
        {{ stopwatchDisplay }}
      </div>

      <div class="actions" aria-label="스탑워치 조작">
        <button
          type="button"
          class="control-button rainbow-btn"
          @click="stopwatchStarted ? stopStopwatch() : startStopwatch()"
        >
          {{ stopwatchStarted ? '중지' : '시작' }}
        </button>
        <button
          type="button"
          class="control-button rainbow-btn"
          :disabled="!stopwatchRunning"
          @click="recordLap"
        >
          랩
        </button>
        <button
          type="button"
          class="control-button rainbow-btn"
          :disabled="!stopwatchStarted"
          @click="stopwatchRunning ? pauseStopwatch() : startStopwatch()"
        >
          {{ stopwatchStarted && !stopwatchRunning ? '재개' : '일시정지' }}
        </button>
      </div>

      <div v-if="laps.length" class="lap-panel">
        <h2>랩 기록</h2>
        <ol class="lap-list">
          <li v-for="(lap, index) in laps" :key="`${lap}-${index}`">
            <span>랩 {{ laps.length - index }}</span>
            <strong>{{ formatTime(lap) }}</strong>
          </li>
        </ol>
      </div>
    </section>
    <dialog
      ref="stopDialog"
      class="stop-dialog"
      aria-label="기록 시간 저장"
      @cancel.prevent="cancelStopwatch"
    >
      <form class="stop-dialog-content" @submit.prevent="saveStopwatch">
        <output class="stop-dialog-time" aria-label="기록 시간">
          {{ formatTime(stoppedElapsed) }}
        </output>
        <!-- 과목 추가 및 선택 기능은 추후 연결합니다. -->
        <div class="subject-controls">
          <button type="button" class="subject-add" disabled
            aria-label="과목 추가" title="과목 추가 (준비 중)">+</button>
          <select class="subject-select" aria-label="과목 선택" disabled>
            <option value="">과목선택</option>
          </select>
        </div>
        <div class="stop-dialog-actions">
          <button type="submit" class="rainbow-btn" autofocus>저장</button>
          <button type="button" class="rainbow-btn" @click="cancelStopwatch">취소</button>
        </div>
      </form>
    </dialog>
  </main>
</template>

<style scoped>
.stopwatch-page {
  width: 100%;
  min-height: 100%;
  box-sizing: border-box;
  display: flex;
  padding: clamp(8px, 1.5vw, 20px);
  color: var(--stopwatch-shell-text);
}

.stopwatch-shell {
  width: 100%;
  min-height: calc(100vh - 140px);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: clamp(28px, 5vw, 64px);
  border: 1px solid var(--stopwatch-shell-border);
  border-radius: clamp(24px, 3vw, 40px);
  background: var(--stopwatch-shell-background);
  box-shadow: var(--stopwatch-shell-shadow);
}

h1 {
  margin: 0 0 clamp(26px, 5vh, 52px);
  font-size: clamp(24px, 3vw, 38px);
  letter-spacing: 0.08em;
}

.time {
  width: min(100%, 920px);
  box-sizing: border-box;
  padding: clamp(32px, 8vh, 76px) clamp(18px, 5vw, 56px);
  border: 2px solid #667085;
  border-radius: clamp(20px, 2.5vw, 32px);
  background: #0c1119;
  box-shadow:
    inset 0 8px 24px rgba(0, 0, 0, 0.55),
    0 10px 24px rgba(0, 0, 0, 0.2);
  color: #d9ffe5;
  font-family: 'Courier New', monospace;
  font-size: clamp(52px, 10vw, 142px);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  text-align: center;
  letter-spacing: 0.04em;
  text-shadow: 0 0 20px rgba(74, 222, 128, 0.28);
}

.actions {
  width: min(100%, 720px);
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(10px, 2vw, 22px);
  margin-top: clamp(28px, 5vh, 52px);
}

.control-button {
  min-height: 58px;
  padding: 14px 18px;
  cursor: pointer;
  font: inherit;
  font-size: clamp(16px, 2vw, 21px);
  font-weight: 700;
}

.control-button:focus-visible {
  outline: 3px solid #f8fafc;
  outline-offset: 3px;
}

.control-button:disabled {
  cursor: not-allowed;
}

.lap-panel {
  width: min(100%, 720px);
  margin-top: 28px;
  padding-top: 22px;
  border-top: 1px solid rgba(255, 255, 255, 0.16);
}

.lap-panel h2 {
  margin: 0 0 14px;
  font-size: 18px;
}

.lap-list {
  max-height: 190px;
  margin: 0;
  padding: 0 8px 0 0;
  overflow-y: auto;
  list-style: none;
}

.lap-list li {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 12px 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  font-variant-numeric: tabular-nums;
}

@media (max-width: 640px) {
  .stopwatch-page {
    padding: 4px;
  }

  .stopwatch-shell {
    min-height: calc(100vh - 112px);
    padding: 24px 16px;
    border-radius: 24px;
  }

  h1 {
    margin-bottom: 24px;
  }

  .time {
    padding: 38px 10px;
    border-radius: 18px;
    font-size: clamp(42px, 14vw, 68px);
    letter-spacing: 0;
  }

  .actions {
    gap: 8px;
    margin-top: 28px;
  }

  .control-button {
    min-height: 52px;
    padding: 10px 6px;
    font-size: 15px;
  }
}
.stop-dialog {
    width: min(600px, calc(100vw - 32px));
    max-height: calc(100dvh - 32px);
    box-sizing: border-box;
    margin: auto;
    padding: 40px 32px;
    overflow-y: auto;
    border: 2px solid #35393d;
    border-radius: 48px;
    background: #ffffff;
    color: #202428;
    box-shadow: 0 24px 64px rgb(0 0 0 / 25%);
}

.stop-dialog::backdrop {
    background: rgb(0 0 0 / 55%);
}

.stop-dialog-content {
    display: grid;
    gap: 40px;
}

.stop-dialog-time {
    display: block;
    box-sizing: border-box;
    padding: 24px 8px;
    border: 2px solid #555b61;
    border-radius: 24px;
    text-align: center;
    font-size: 32px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
}

.subject-controls {
    display: grid;
    grid-template-columns: 36px minmax(0, 1fr);
    width: 84%;
    justify-self: center;
}

.subject-add,
.subject-select {
    height: 36px;
    box-sizing: border-box;
    border: 1px solid #73797f;
    border-radius: 0;
    background: #ffffff;
    font: inherit;
    opacity: 1;
    cursor: not-allowed;
}

.subject-add {
    width: 36px;
    padding: 0;
    color: #555b61;
    font-size: 24px;
    line-height: 1;
}

.subject-select {
    width: 100%;
    min-width: 0;
    padding: 0 12px;
    border-left: 0;
    color: #a1a1aa;
    -webkit-text-fill-color: #a1a1aa;
}

.stop-dialog-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 24px;
}

.stop-dialog-actions button {
    min-height: 56px;
    padding: 12px;
    font: inherit;
    cursor: pointer;
}

.stop-dialog-actions button:focus-visible {
    outline: 3px solid #2563eb;
    outline-offset: 3px;
}
</style>
