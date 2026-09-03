<script setup>
import { computed, onBeforeUnmount, ref } from 'vue';

const timerMinutes = ref(5);
const timerSeconds = ref(0);
const timerRemaining = ref(300);
const timerRunning = ref(false);
let timerInterval = null;

const stopwatchElapsed = ref(0);
const stopwatchRunning = ref(false);
const laps = ref([]);
let stopwatchInterval = null;
let stopwatchStartedAt = 0;

const timerDisplay = computed(() => formatTime(timerRemaining.value));
const stopwatchDisplay = computed(() => formatTime(stopwatchElapsed.value, true));

function formatTime(millisecondsOrSeconds, includeMilliseconds = false) {
    if (includeMilliseconds) {
        const minutes = Math.floor(millisecondsOrSeconds / 60000);
        const seconds = Math.floor((millisecondsOrSeconds % 60000) / 1000);
        const centiseconds = Math.floor((millisecondsOrSeconds % 1000) / 10);

        return `${pad(minutes)}:${pad(seconds)}.${pad(centiseconds)}`;
    }

    const minutes = Math.floor(millisecondsOrSeconds / 60);
    const seconds = millisecondsOrSeconds % 60;

    return `${pad(minutes)}:${pad(seconds)}`;
}

function pad(value) {
    return String(value).padStart(2, '0');
}

function applyTimerInput() {
    if (timerRunning.value) {
        return;
    }

    const minutes = Math.max(0, Number(timerMinutes.value) || 0);
    const seconds = Math.min(59, Math.max(0, Number(timerSeconds.value) || 0));

    timerMinutes.value = minutes;
    timerSeconds.value = seconds;
    timerRemaining.value = minutes * 60 + seconds;
}

function startTimer() {
    if (timerRunning.value) {
        return;
    }

    if (timerRemaining.value <= 0) {
        applyTimerInput();
    }

    if (timerRemaining.value <= 0) {
        return;
    }

    timerRunning.value = true;
    timerInterval = window.setInterval(() => {
        timerRemaining.value -= 1;

        if (timerRemaining.value <= 0) {
            pauseTimer();
            timerRemaining.value = 0;
        }
    }, 1000);
}

function pauseTimer() {
    timerRunning.value = false;
    window.clearInterval(timerInterval);
    timerInterval = null;
}

function resetTimer() {
    pauseTimer();
    applyTimerInput();
}

function startStopwatch() {
    if (stopwatchRunning.value) {
        return;
    }

    stopwatchRunning.value = true;
    stopwatchStartedAt = performance.now() - stopwatchElapsed.value;
    stopwatchInterval = window.setInterval(() => {
        stopwatchElapsed.value = performance.now() - stopwatchStartedAt;
    }, 10);
}

function pauseStopwatch() {
    stopwatchRunning.value = false;
    window.clearInterval(stopwatchInterval);
    stopwatchInterval = null;
}

function resetStopwatch() {
    pauseStopwatch();
    stopwatchElapsed.value = 0;
    laps.value = [];
}

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
    <main class="time-app">
        <h1>Timer & Stopwatch</h1>

        <div class="panels">
            <section class="panel">
                <h2>타이머</h2>
                <p class="display" aria-live="polite">{{ timerDisplay }}</p>

                <div class="timer-inputs">
                    <label>
                        분
                        <input
                            v-model.number="timerMinutes"
                            type="number"
                            min="0"
                            :disabled="timerRunning"
                            @change="applyTimerInput"
                        >
                    </label>
                    <label>
                        초
                        <input
                            v-model.number="timerSeconds"
                            type="number"
                            min="0"
                            max="59"
                            :disabled="timerRunning"
                            @change="applyTimerInput"
                        >
                    </label>
                </div>

                <div class="actions">
                    <button v-if="!timerRunning" class="primary" @click="startTimer">시작</button>
                    <button v-else class="primary" @click="pauseTimer">일시정지</button>
                    <button @click="resetTimer">초기화</button>
                </div>
            </section>

            <section class="panel">
                <h2>스톱워치</h2>
                <p class="display" aria-live="polite">{{ stopwatchDisplay }}</p>

                <div class="actions">
                    <button v-if="!stopwatchRunning" class="primary" @click="startStopwatch">시작</button>
                    <button v-else class="primary" @click="pauseStopwatch">일시정지</button>
                    <button :disabled="!stopwatchRunning" @click="recordLap">랩</button>
                    <button @click="resetStopwatch">초기화</button>
                </div>

                <ol v-if="laps.length" class="laps">
                    <li v-for="(lap, index) in laps" :key="`${lap}-${index}`">
                        <span>Lap {{ laps.length - index }}</span>
                        <strong>{{ formatTime(lap, true) }}</strong>
                    </li>
                </ol>
            </section>
        </div>
    </main>
</template>

<style scoped>
/* 전체 페이지 배경 및 중앙 정렬 */
.time-app {
    min-height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    padding: 32px 24px 40px;
    background-color: #f6f7f9;
    color: #2b2f36;
    font-family: 'Arial', sans-serif;
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
