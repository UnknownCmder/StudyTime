<script setup>
import { computed, onBeforeUnmount, ref } from 'vue';

const stopwatchElapsed = ref(0);
const stopwatchRunning = ref(false);
const laps = ref([]);
let stopwatchInterval = null;
let stopwatchStartedAt = 0;

const stopwatchDisplay = computed(() => formatTime(stopwatchElapsed.value));

function formatTime(milliseconds) {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    const centiseconds = Math.floor((milliseconds % 1000) / 10);

    return `${pad(minutes)}:${pad(seconds)}.${pad(centiseconds)}`;
}

function pad(value) {
    return String(value).padStart(2, '0');
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
    window.clearInterval(stopwatchInterval);
});
</script>

<template>
    <main class="time-app">
        <h1>스톱워치</h1>

        <div class="panels">
            <section class="panel">
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
                        <strong>{{ formatTime(lap) }}</strong>
                    </li>
                </ol>
            </section>
        </div>
    </main>
</template>
