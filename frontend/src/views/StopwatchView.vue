<script setup>
import { computed, onBeforeUnmount, ref } from 'vue';

const stopwatchElapsed = ref(0)
const stopwatchRunning = ref(false)
const stopwatchStarted = ref(false)
const laps = ref([])
const stopDialog = ref(null)
const stoppedElapsed = ref(0)

let stopwatchInterval = null
let stopwatchStartedAt = 0

const timerDisplay = computed(() => formatTime(timerRemaining.value));
const stopwatchDisplay = computed(() => formatTime(stopwatchElapsed.value, true));

// 시간을 밀리초 단위로 받아서 시분초로 계산하고 문자열로 반환
function formatTime(milliseconds) {
  const hours = Math.floor(milliseconds / 3_600_000)
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000)
  const seconds = Math.floor((milliseconds % 60_000) / 1_000)

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

// 시간이 1시간일때 01로 표기하는 함수
function pad(value) {
  return String(value).padStart(2, '0')
}

// 스톱워치 시작 함수
function startStopwatch() {
    if (stopwatchRunning.value) {
        return;
    }

  stopwatchStarted.value = true
  stopwatchRunning.value = true
  stopwatchStartedAt = performance.now() - stopwatchElapsed.value
  updateElapsedTime()
  stopwatchInterval = window.setInterval(updateElapsedTime, 200)
}

// 스톱워치 시간 업데이트
function updateElapsedTime() {
  stopwatchElapsed.value = performance.now() - stopwatchStartedAt
}

//스톱워치 일시정지
function pauseStopwatch() {
  if (!stopwatchRunning.value) {
    return
  }

  updateElapsedTime()
  stopwatchRunning.value = false
  window.clearInterval(stopwatchInterval)
  stopwatchInterval = null
}

// 중지 직전 시간을 팝업용으로 보관하고 스톱워치 상태를 즉시 초기화합니다.
function stopStopwatch() {
    if (!stopwatchStarted.value) {
        return
    }

    pauseStopwatch()
    stoppedElapsed.value = stopwatchElapsed.value
    resetStopwatch()
    stopDialog.value.showModal()
}

// 저장 버튼은 팝업을 닫습니다. 실제 기록 저장은 추후 연결합니다.
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
        return;
    }

    laps.value.unshift(stopwatchElapsed.value);
}

onBeforeUnmount(() => {
    window.clearInterval(timerInterval);
    window.clearInterval(stopwatchInterval);
});
</script>

<template>
  <main class="stopwatch-page">
    <section class="stopwatch-shell" aria-labelledby="stopwatch-title">
      <h1 id="stopwatch-title">스탑워치</h1>

      <div class="time" role="timer" aria-live="polite" aria-atomic="true">
        {{ stopwatchDisplay }}
      </div>

      <div class="actions" aria-label="스탑워치 조작">
        <button
          type="button"
          class="control-button"
          :class="stopwatchStarted ? 'btnStop' : 'btnStart'"
          @click="stopwatchStarted ? stopStopwatch() : startStopwatch()"
        >
          {{ stopwatchStarted ? '중지' : '시작' }}
        </button>
        <button
          type="button"
          class="control-button lap-button"
          :disabled="!stopwatchRunning"
          @click="recordLap"
        >
          랩
        </button>
        <button
          type="button"
          class="control-button"
          :class="stopwatchStarted && !stopwatchRunning ? 'resume-button' : 'pause-button'"
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
    <dialog ref="stopDialog" class="stop-dialog" aria-label="기록 시간 저장"
        @cancel.prevent="cancelStopwatch">
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
                <button type="submit" class="save-stop" autofocus>저장</button>
                <button type="button" @click="cancelStopwatch">취소</button>
            </div>
        </form>
    </dialog>
  </main>
</template>

<style scoped>
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
    border: 1px solid #73797f;
    border-radius: 16px;
    background: #f5f6f7;
    color: #202428;
    font: inherit;
    cursor: pointer;
}

.stop-dialog-actions .save-stop {
    background: #15803d;
    border-color: #15803d;
    color: #ffffff;
}

.stop-dialog-actions button:focus-visible {
    outline: 3px solid #2563eb;
    outline-offset: 3px;
}

.stopwatch-page {
  width: 100%;
  min-height: 100%;
  box-sizing: border-box;
  display: flex;
  padding: clamp(8px, 1.5vw, 20px);
  color: #f8fafc;
}

.stopwatch-shell {
  width: 100%;
  min-height: calc(100vh - 140px);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: clamp(28px, 5vw, 64px);
  border: 1px solid #475569;
  border-radius: clamp(24px, 3vw, 40px);
  background: linear-gradient(145deg, #303743, #1e242d);
  box-shadow:
    0 24px 55px rgba(15, 23, 42, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

h1 {
  margin: 0 0 clamp(26px, 5vh, 52px);
  font-size: clamp(24px, 3vw, 38px);
  letter-spacing: 0.08em;
}

/* 페이지 제목 스타일 */

.time-app h1 {
    margin: 0 0 20px;
    font-size: clamp(2rem, 4vw, 2.8rem);
    font-weight: 800;
    color: #1f2430;
    text-align: center;
}

.panels {
    display: grid;
    grid-template-columns: repeat(2, minmax(280px, 1fr));
    gap: 24px;
    width: 100%;
    max-width: 920px;
}

/* 타이머/스톱워치 카드 공통 스타일 */
.panel {
    background-color: #ffffff;
    border: 1px solid #e7e9ee;
    border-radius: 18px;
    box-shadow: 0 8px 24px rgba(20, 24, 40, 0.06);
    padding: 24px 24px 20px;
    display: flex;
    flex-direction: column;
    gap: 18px;
}

.panel h2 {
    margin: 0;
    font-size: 1.6rem;
    font-weight: 800;
    color: #1f2430;
}

/* 시간 표시 영역: 강조된 숫자 스타일 */
.display {
    margin: 0;
    padding: 18px 16px;
    border-radius: 12px;
    background: linear-gradient(180deg, #fff5ef, #fffaf7);
    border: 1px solid #ffe5d5;
    text-align: center;
    font-size: clamp(2rem, 5vw, 3rem);
    font-weight: 800;
    letter-spacing: 0.08em;
    color: #ff6b35;
}

/* 분/초 입력 필드 정렬 */
.timer-inputs {
    display: flex;
    gap: 16px;
    justify-content: center;
    flex-wrap: wrap;
}

.timer-inputs label {
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 0.95rem;
    font-weight: 700;
    color: #4b5563;
}

.timer-inputs input {
    width: 110px;
    padding: 10px 12px;
    border: 1px solid #e2e5ec;
    border-radius: 10px;
    background-color: #fff;
    color: #1f2430;
    font-size: 1rem;
    font-weight: 700;
    text-align: center;
}

.timer-inputs input:focus {
    outline: 2px solid rgba(255, 107, 53, 0.25);
    border-color: #ff8e5e;
}

/* 버튼 묶음 배치 */
.actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: center;
}

/* 기본 버튼 스타일 */
button {
    min-width: 92px;
    padding: 10px 16px;
    border: 1px solid #e2e5ec;
    border-radius: 10px;
    background-color: #ffffff;
    color: #3d4553;
    font-size: 0.96rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s ease;
}

button:hover:not(:disabled) {
    background-color: #ff6b35;
    border-color: #ff6b35;
    color: #ffffff;
}

button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

button.primary {
    background: linear-gradient(180deg, #ff7a45, #ff5722);
    border-color: #ff6b35;
    color: #ffffff;
    box-shadow: 0 4px 10px rgba(255, 107, 53, 0.2);
}

button.primary:hover:not(:disabled) {
    background: linear-gradient(180deg, #ff6931, #ef4b1b);
}

/* 랩 기록 리스트 */
.laps {
    margin: 0;
    padding: 0 0 0 18px;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.laps li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    border-radius: 8px;
    background-color: #f7f8fa;
    border: 1px solid #edf0f4;
    font-size: 0.92rem;
    color: #495365;
}

.laps strong {
    color: #ff6b35;
    font-weight: 800;
}

/* 모바일 대응 */
@media (max-width: 760px) {
    .panels {
        grid-template-columns: 1fr;
    }

    .panel {
        padding: 20px 18px 18px;
    }
}
</style>
