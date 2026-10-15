<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'

const stopwatchElapsed = ref(0)
const stopwatchRunning = ref(false)
const stopwatchStarted = ref(false)
const laps = ref([])

let stopwatchInterval = null
let stopwatchStartedAt = 0

const stopwatchDisplay = computed(() => formatTime(stopwatchElapsed.value))

function formatTime(milliseconds) {
  const hours = Math.floor(milliseconds / 3_600_000)
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000)
  const seconds = Math.floor((milliseconds % 60_000) / 1_000)

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

function pad(value) {
  return String(value).padStart(2, '0')
}

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

function updateElapsedTime() {
  stopwatchElapsed.value = performance.now() - stopwatchStartedAt
}

function pauseStopwatch() {
  if (!stopwatchRunning.value) {
    return
  }

  updateElapsedTime()
  stopwatchRunning.value = false
  window.clearInterval(stopwatchInterval)
  stopwatchInterval = null
}

function resetStopwatch() {
  window.clearInterval(stopwatchInterval)
  stopwatchInterval = null
  stopwatchElapsed.value = 0
  stopwatchRunning.value = false
  stopwatchStarted.value = false
  laps.value = []
}

function recordLap() {
  if (!stopwatchRunning.value) {
    return
  }

  updateElapsedTime()
  laps.value.unshift(stopwatchElapsed.value)
}

onBeforeUnmount(() => {
  window.clearInterval(stopwatchInterval)
})
</script>

<template>
  <main class="stopwatch-page">
    <section class="stopwatch-shell" aria-labelledby="stopwatch-title">
      <h1 id="stopwatch-title">스톱워치</h1>

      <div class="time" role="timer" aria-live="polite" aria-atomic="true">
        {{ stopwatchDisplay }}
      </div>

      <div class="actions" aria-label="스톱워치 조작">
        <button
          type="button"
          class="control-button"
          :class="stopwatchStarted ? 'btnStop' : 'btnStart'"
          @click="stopwatchStarted ? resetStopwatch() : startStopwatch()"
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
  </main>
</template>

<style scoped>
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
  border: 0;
  border-radius: 18px;
  color: #ffffff;
  cursor: pointer;
  font: inherit;
  font-size: clamp(16px, 2vw, 21px);
  font-weight: 700;
  transition:
    transform 160ms ease,
    filter 160ms ease,
    opacity 160ms ease;
}

.control-button:not(:disabled):hover {
  filter: brightness(1.1);
  transform: translateY(-2px);
}

.control-button:not(:disabled):active {
  transform: translateY(0);
}

.control-button:focus-visible {
  outline: 3px solid #f8fafc;
  outline-offset: 3px;
}

.control-button:disabled {
  cursor: not-allowed;
  opacity: 0.38;
}

.btnStart {
  background: #15803d;
}

.btnStop {
  background: #b91c1c;
}

.lap-button {
  background: #475569;
}

.pause-button {
  background: #b45309;
}

.resume-button {
  background: #2563eb;
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
    border-radius: 14px;
    font-size: 15px;
  }
}
</style>
