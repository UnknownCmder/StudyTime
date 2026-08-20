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
