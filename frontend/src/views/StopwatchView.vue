<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useAuth } from '../composables/useAuth'

const { isLoggedIn, fetchLoginStatus } = useAuth()

// 화면에 표시할 공부 경과 시간(밀리초)과 스톱워치의 실행 상태를 관리합니다.
const stopwatchElapsed = ref(0)
const stopwatchRunning = ref(false)
// 시작 버튼을 눌렀는지 관리합니다. 시작 전/기록 종료 후에는 false입니다.
const stopwatchStarted = ref(false)
// 사용자가 기록한 랩 시간(밀리초)을 최신 순으로 저장합니다.
const laps = ref([])
// 기록 저장 팝업의 <dialog> 요소를 참조합니다. 마운트 전에는 요소가 없습니다.
const stopDialog = ref(null)
// 중지 시점의 시간을 팝업에 고정해서 보여주기 위한 값입니다.
const stoppedElapsed = ref(0)
// 서버에서 불러온 사용자의 과목과 선택/신규 과목 작성 상태입니다.
const subjects = ref([])
const selectedSubjectId = ref('')
const isCreatingSubject = ref(false)
const newSubjectName = ref('')
const newSubjectColor = ref('#6366f1')
// 종료 시 팝업에서 입력하는 기록 설명과 서버에 저장 중인 활성 기록 ID입니다.
const recordDetail = ref('')
const activeRecordId = ref(null)
// 팝업에서 저장할 종료 시각을 YYYYMMDDHHmmss 숫자로 보관합니다.
const stoppedEndDataTime = ref(0)
// 현재 DB 기록이 일시정지 상태인지, 요청 중/오류인지 나타냅니다.
const isRecordPaused = ref(false)
const timerError = ref('')
const isSavingRecord = ref(false)
const dialogError = ref('')

// 화면 표시를 갱신하는 반복 타이머와 경과 시간 계산의 기준점입니다.
// 이 값들은 화면에 직접 표시되지 않는 내부 제어값이므로 ref가 아닙니다.
let stopwatchInterval = null
let stopwatchStartedAt = 0

// 경과시간이 바뀌면 사람이 읽기 쉬운 시:분:초 문자열도 자동으로 다시 계산됩니다.
const stopwatchDisplay = computed(() => formatTime(stopwatchElapsed.value))

// 밀리초를 시:분:초 형식으로 바꿉니다. 유효하지 않은 값은 00:00:00으로 처리합니다.
function formatTime(milliseconds) {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return '00:00:00'
  const hours = Math.floor(milliseconds / 3_600_000)
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000)
  const seconds = Math.floor((milliseconds % 60_000) / 1_000)

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

// 숫자를 두 자리 이상으로 표시합니다(예: 4 → "04").
function pad(value) {
  return String(value).padStart(2, '0')
}

// 스톱워치를 시작하거나 재개합니다. 일시정지 기록이 있다면 먼저 서버에 재개 시각을 저장합니다.
async function startStopwatch() {
  if (stopwatchRunning.value) {
    return
  }

  if (isRecordPaused.value) {
    timerError.value = ''
    try {
      const response = await fetch(`/api/studyRecord/${activeRecordId.value}/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ resume_time: formatDatabaseDateTime(new Date()) }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.message || '스톱워치를 재개하지 못했습니다.')
      isRecordPaused.value = false
    } catch (error) {
      timerError.value = error.message || '스톱워치를 재개하지 못했습니다.'
      return
    }
  }

  stopwatchStarted.value = true
  stopwatchRunning.value = true
  stopwatchStartedAt = performance.now() - stopwatchElapsed.value
  updateElapsedTime()
  stopwatchInterval = window.setInterval(updateElapsedTime, 200)
}

// performance.now()를 이용해 기준 시각부터 현재까지의 경과 밀리초를 계산합니다.
function updateElapsedTime() {
  stopwatchElapsed.value = performance.now() - stopwatchStartedAt
}

// 실행 중인 기록을 일시정지합니다. 실제 일시정지 시각을 서버에 저장한 뒤 화면 갱신을 멈춥니다.
async function pauseStopwatch() {
  if (!stopwatchRunning.value) {
    return
  }

  updateElapsedTime()
  timerError.value = ''
  try {
    const response = await fetch(`/api/studyRecord/${activeRecordId.value}/pause`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ pause_start_time: formatDatabaseDateTime(new Date()) }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.message || '일시정지 시각을 저장하지 못했습니다.')
    isRecordPaused.value = true
  } catch (error) {
    timerError.value = error.message || '일시정지 시각을 저장하지 못했습니다.'
    return
  }
  stopwatchRunning.value = false
  window.clearInterval(stopwatchInterval)
  stopwatchInterval = null
}

async function loadSubjects() {
  // 로그인 세션을 쿠키로 전달해 현재 사용자의 과목 목록을 가져옵니다.
  const response = await fetch('/api/studyRecord/subjects', { credentials: 'include' })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || '과목 목록을 불러오지 못했습니다.')
  subjects.value = data
  // 기록 팝업을 열 때마다 선택을 비워 사용자가 과목을 직접 지정하게 합니다.
  selectedSubjectId.value = ''
}

async function beginStopwatch() {
  // 시작 시각만 가진 활성 기록을 서버에 만든 다음 로컬 타이머를 시작합니다.
  timerError.value = ''
  dialogError.value = ''
  recordDetail.value = ''
  isSavingRecord.value = true
  try {
    const response = await fetch('/api/studyRecord/active', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ start_time: formatDatabaseDateTime(new Date()) }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.message || '공부 시작 시각을 저장하지 못했습니다.')
    activeRecordId.value = data.id
    isRecordPaused.value = false
    stopwatchElapsed.value = 0
    stopwatchStarted.value = false
    startStopwatch()
  } catch (error) {
    timerError.value = error.message || '공부를 시작하지 못했습니다.'
  } finally {
    isSavingRecord.value = false
  }
}

function parseDatabaseDateTime(value) {
  // DB의 ISO UTC 시각을 Date로 읽으면 표시 단계에서 브라우저 로컬 시각으로 변환됩니다.
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

async function restoreActiveStopwatch() {
  // 페이지 재진입 시 사용자의 미완료 기록을 조회해 스톱워치 상태를 복원합니다.
  const response = await fetch('/api/studyRecord/active', { credentials: 'include' })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || '진행 중인 기록을 불러오지 못했습니다.')
  if (!data) {
    activeRecordId.value = null
    isRecordPaused.value = false
    resetStopwatch()
    return
  }

  const startDate = parseDatabaseDateTime(data.start_time)
  if (!startDate) return

  activeRecordId.value = data.id
  const pauseStartDate = !data.pause_start_time
    ? null
    : parseDatabaseDateTime(data.pause_start_time)
  isRecordPaused.value = pauseStartDate !== null
  // 누적 휴식 초와 현재 진행 중인 휴식 시간을 공부 경과 시간에서 뺍니다.
  const restSeconds = Number(data.rest_time)
  const accumulatedRest = Number.isFinite(restSeconds) && restSeconds > 0
    ? restSeconds * 1000
    : 0
  const currentRest = pauseStartDate
    ? Math.max(0, Date.now() - pauseStartDate.getTime())
    : 0
  const elapsed = Date.now() - startDate.getTime() - accumulatedRest - currentRest
  stopwatchElapsed.value = Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0
  stopwatchStartedAt = performance.now() - stopwatchElapsed.value
  stopwatchStarted.value = true
  stopwatchRunning.value = !isRecordPaused.value
  if (stopwatchRunning.value) {
    stopwatchInterval = window.setInterval(updateElapsedTime, 200)
  }
}

onMounted(async () => {
  // 화면이 만들어지면 로그인 상태를 확인하고, 로그인 사용자라면 진행 중 기록을 복구합니다.
  try {
    await fetchLoginStatus()
    if (isLoggedIn.value) await restoreActiveStopwatch()
  } catch (error) {
    timerError.value = error.message || '진행 중인 스톱워치를 복원하지 못했습니다.'
  }
})

// 중지 시각과 경과 시간을 확정하고 과목/상세 내용을 입력할 기록 팝업을 엽니다.
async function stopStopwatch() {
  if (!stopwatchStarted.value) return
  const stopTime = formatDatabaseDateTime(new Date())
  isSavingRecord.value = true

  if (stopwatchRunning.value) {
    updateElapsedTime()
    window.clearInterval(stopwatchInterval)
    stopwatchInterval = null
    stopwatchRunning.value = false
    try {
      const response = await fetch(`/api/studyRecord/${activeRecordId.value}/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ pause_start_time: stopTime }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.message || '종료 시각을 준비하지 못했습니다.')
      isRecordPaused.value = true
    } catch (error) {
      timerError.value = error.message || '종료 시각을 준비하지 못했습니다.'
      stopwatchStartedAt = performance.now() - stopwatchElapsed.value
      stopwatchRunning.value = true
      stopwatchInterval = window.setInterval(updateElapsedTime, 200)
      isSavingRecord.value = false
      return
    }
  }
  stoppedElapsed.value = stopwatchElapsed.value
  stoppedEndDataTime.value = stopTime
  dialogError.value = ''
  try {
    await loadSubjects()
  } catch (error) {
    dialogError.value = error.message || '과목 목록을 불러오지 못했습니다.'
  }
  isSavingRecord.value = false
  timerError.value = ''
  isCreatingSubject.value = false
  stopDialog.value.showModal()
}

async function createSubject() {
  // 입력한 이름과 색상을 서버에 등록하고, 새 과목을 현재 기록의 선택 과목으로 지정합니다.
  dialogError.value = ''
  const subjectName = newSubjectName.value.trim()
  if (!subjectName) {
    dialogError.value = '과목 이름을 입력해주세요.'
    return
  }

  try {
    const response = await fetch('/api/studyRecord/subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ subject_name: subjectName, subject_color: newSubjectColor.value }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.message || '과목을 추가하지 못했습니다.')
    subjects.value.push(data)
    selectedSubjectId.value = data.id
    newSubjectName.value = ''
    isCreatingSubject.value = false
  } catch (error) {
    dialogError.value = error.message || '과목을 추가하지 못했습니다.'
  }
}

function formatDatabaseDateTime(date) {
  // Date를 UTC 기준 ISO 문자열로 직렬화해 DB에 저장합니다.
  return date.toISOString()
}

async function saveStopwatch() {
  // 선택 과목, 기록 내용, 종료 시각을 기존 활성 기록에 반영해 완료 처리합니다.
  dialogError.value = ''
  if (!selectedSubjectId.value) {
    dialogError.value = '과목을 선택하거나 새 과목을 추가해주세요.'
    return
  }
  isSavingRecord.value = true
  try {
    const response = await fetch(`/api/studyRecord/${activeRecordId.value}/finish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        subject_id: Number(selectedSubjectId.value),
        detail: recordDetail.value.trim() || null,
        end_time: stoppedEndDataTime.value,
      }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.message || '공부 기록을 저장하지 못했습니다.')
    activeRecordId.value = null
    isRecordPaused.value = false
    resetStopwatch()
    recordDetail.value = ''
    stopDialog.value.close()
  } catch (error) {
    dialogError.value = error.message || '공부 기록을 저장하지 못했습니다.'
  } finally {
    isSavingRecord.value = false
  }
}

// 취소하면 서버의 미완료 활성 기록을 삭제하고 팝업과 타이머 상태를 초기화합니다.
async function cancelStopwatch() {
  if (!activeRecordId.value) {
    stopDialog.value.close()
    return
  }

  isSavingRecord.value = true
  dialogError.value = ''
  try {
    const response = await fetch(`/api/studyRecord/${activeRecordId.value}/active`, {
      method: 'DELETE',
      credentials: 'include',
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.message || '미완료 기록을 삭제하지 못했습니다.')
    activeRecordId.value = null
    isRecordPaused.value = false
    recordDetail.value = ''
    resetStopwatch()
    stopDialog.value.close()
  } catch (error) {
    dialogError.value = error.message || '미완료 기록을 삭제하지 못했습니다.'
  } finally {
    isSavingRecord.value = false
  }
}

// 반복 타이머와 화면 상태, 랩 목록을 초기 상태로 되돌립니다.
function resetStopwatch() {
  window.clearInterval(stopwatchInterval)
  stopwatchInterval = null
  stopwatchStartedAt = 0
  stopwatchElapsed.value = 0
  stopwatchRunning.value = false
  stopwatchStarted.value = false
  laps.value = []
}

// 실행 중인 현재 경과 시간을 갱신한 뒤 랩 목록 맨 앞에 추가합니다.
function recordLap() {
  if (!stopwatchRunning.value) {
    return
  }

  updateElapsedTime()
  laps.value.unshift(stopwatchElapsed.value)
}

// 페이지 이동 등으로 컴포넌트가 제거될 때 갱신 타이머가 남지 않도록 정리합니다.
onBeforeUnmount(() => {
  window.clearInterval(stopwatchInterval)
})
</script>

<template>
  <!-- 로그인하지 않은 사용자는 스톱워치 대신 안내 문구를 봅니다. -->
  <p v-if="!isLoggedIn" class="login-required-message">로그인을 해야 이용할 수 있습니다</p>
  <!-- 로그인한 사용자를 위한 스톱워치 본문입니다. -->
  <main v-else class="stopwatch-page">
    <section class="stopwatch-shell" aria-labelledby="stopwatch-title">
      <h1 id="stopwatch-title">스탑워치</h1>

      <div class="time" role="timer" aria-live="polite" aria-atomic="true">
        {{ stopwatchDisplay }}
      </div>

      <!-- 시작/중지, 랩, 일시정지/재개 버튼을 현재 상태에 따라 활성화합니다. -->
      <div class="actions" aria-label="스탑워치 조작">
        <button
          type="button"
          class="control-button rainbow-btn"
          :disabled="isSavingRecord"
          @click="stopwatchStarted ? stopStopwatch() : beginStopwatch()"
        >
          {{ stopwatchStarted ? '중지' : '시작' }}
        </button>
        <button
          type="button"
          class="control-button rainbow-btn"
          :disabled="!stopwatchRunning || isSavingRecord"
          @click="recordLap"
        >
          랩
        </button>
        <button
          type="button"
          class="control-button rainbow-btn"
          :disabled="!stopwatchStarted || isSavingRecord"
          @click="stopwatchRunning ? pauseStopwatch() : startStopwatch()"
        >
          {{ stopwatchStarted && !stopwatchRunning ? '재개' : '일시정지' }}
        </button>
      </div>
      <p v-if="timerError" class="timer-error" role="alert">{{ timerError }}</p>

      <!-- 랩을 하나 이상 기록한 경우에만 랩 목록을 표시합니다. -->
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
    <!-- 중지 후 기록 설명과 과목을 입력하고 저장할 네이티브 모달입니다. -->
    <dialog
      ref="stopDialog"
      class="stop-dialog"
      aria-label="공부 기록 저장"
      @cancel.prevent="cancelStopwatch"
    >
      <form class="stop-dialog-content" @submit.prevent="saveStopwatch">
        <h2>공부 기록 저장</h2>
        <output class="stop-dialog-time" aria-label="기록 시간">
          {{ formatTime(stoppedElapsed) }}
        </output>
        <!-- 이 내용은 study_record의 detail 필드로 저장됩니다. -->
        <label class="record-detail-label">
          기록 내용
          <textarea v-model.trim="recordDetail" maxlength="255" rows="3"
            placeholder="공부한 내용이나 메모를 입력하세요."></textarea>
        </label>
        <!-- 기존 과목을 선택하거나 + 버튼을 눌러 신규 과목 입력란을 엽니다. -->
        <div class="subject-controls">
          <button type="button" class="subject-add" aria-label="과목 추가"
            :aria-expanded="isCreatingSubject" @click="isCreatingSubject = !isCreatingSubject">+</button>
          <select v-model.number="selectedSubjectId" class="subject-select" aria-label="과목 선택">
            <option value="">과목 선택</option>
            <option v-for="subject in subjects" :key="subject.id" :value="subject.id">
              {{ subject.subject_name }}
            </option>
          </select>
        </div>
        <!-- 신규 과목의 이름과 색상을 입력하고 서버에 추가하는 영역입니다. -->
        <div v-if="isCreatingSubject" class="new-subject-form">
          <label>
            과목 이름
            <input v-model.trim="newSubjectName" type="text" maxlength="20" />
          </label>
          <label class="subject-color-label">
            색상
            <input v-model="newSubjectColor" type="color" aria-label="과목 색상" />
          </label>
          <button type="button" class="rainbow-btn" @click="createSubject">과목 추가</button>
        </div>
        <p v-if="dialogError" class="dialog-error" role="alert">{{ dialogError }}</p>
        <!-- 저장은 기록을 완료 처리하고, 취소는 미완료 기록을 삭제합니다. -->
        <div class="stop-dialog-actions">
          <button type="submit" class="rainbow-btn" :disabled="isSavingRecord || !selectedSubjectId" autofocus>
            {{ isSavingRecord ? '저장 중...' : '저장' }}
          </button>
          <button type="button" class="rainbow-btn" :disabled="isSavingRecord" @click="cancelStopwatch">취소</button>
        </div>
      </form>
    </dialog>
  </main>
</template>

<style scoped>
/* 스톱워치 페이지의 바깥쪽 영역과 전체 화면 높이를 설정합니다. */
.stopwatch-page {
  width: 100%;
  min-height: 100%;
  box-sizing: border-box;
  display: flex;
  padding: clamp(8px, 1.5vw, 20px);
  color: var(--stopwatch-shell-text);
}

/* 테마 변수로 표면색/테두리를 적용하는 중앙 스톱워치 패널입니다. */
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

/* 큰 숫자 타이머 표시 영역입니다. 숫자 폭을 고정해 초가 바뀌어도 흔들리지 않게 합니다. */
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

/* 주요 조작 버튼을 같은 너비의 세 열로 배치합니다. */
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

/* 타이머 요청 실패 안내와 랩 기록 목록의 배치 및 가독성을 설정합니다. */
.timer-error {
  color: #c62828;
  font-weight: 700;
  text-align: center;
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
  /* 좁은 화면에서는 패널 여백과 타이머 글자 크기를 줄입니다. */
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
    /* 팝업 크기, 스크롤, 테마 색상은 공용 라이트/다크 모드 변수를 따릅니다. */
    width: min(600px, calc(100vw - 32px));
    max-height: calc(100dvh - 32px);
    box-sizing: border-box;
    margin: auto;
    padding: 40px 32px;
    overflow-y: auto;
    border: 2px solid color-mix(in srgb, var(--text-color) 18%, transparent);
    border-radius: 48px;
    background: var(--surface-color);
    color: var(--text-color);
    box-shadow: 0 24px 64px color-mix(in srgb, var(--text-color) 22%, transparent);
}

.stop-dialog::backdrop {
    background: rgb(0 0 0 / 55%);
}

.stop-dialog-content {
    display: grid;
    gap: 20px;
}

.stop-dialog-content h2 {
    margin: 0;
}

.stop-dialog-time {
    display: block;
    box-sizing: border-box;
    padding: 24px 8px;
    border: 2px solid color-mix(in srgb, var(--text-color) 28%, transparent);
    border-radius: 24px;
    text-align: center;
    font-size: 32px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
}

.subject-controls {
    /* 과목 추가 버튼과 선택 목록을 한 줄에 나란히 배치합니다. */
    display: grid;
    grid-template-columns: 36px minmax(0, 1fr);
    width: 84%;
    justify-self: center;
}

.record-detail-label {
    /* 기록 상세 입력란의 레이블과 텍스트 영역을 세로로 배치합니다. */
    display: grid;
    gap: 8px;
    font-weight: 700;
}

.record-detail-label textarea {
    width: 100%;
    box-sizing: border-box;
    padding: 10px 12px;
    border: 1px solid color-mix(in srgb, var(--text-color) 28%, transparent);
    border-radius: 8px;
    background: var(--bg-color);
    color: var(--text-color);
    font: inherit;
    resize: vertical;
}

.subject-add,
.subject-select {
    height: 36px;
    box-sizing: border-box;
    border: 1px solid color-mix(in srgb, var(--text-color) 28%, transparent);
    border-radius: 0;
    background: var(--bg-color);
    color: var(--text-color);
    font: inherit;
    opacity: 1;
    cursor: pointer;
}

.subject-add {
    width: 36px;
    padding: 0;
    font-size: 24px;
    line-height: 1;
}

.subject-select {
    width: 100%;
    min-width: 0;
    padding: 0 12px;
    border-left: 0;
    -webkit-text-fill-color: var(--text-color);
}

.new-subject-form {
    /* 신규 과목 이름/색상/추가 버튼을 한 행에 놓습니다. */
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    align-items: end;
    gap: 12px;
}

.new-subject-form label {
    display: grid;
    gap: 6px;
    font-weight: 700;
}

.new-subject-form input[type='text'] {
    min-width: 0;
    height: 36px;
    box-sizing: border-box;
    padding: 0 10px;
    border: 1px solid color-mix(in srgb, var(--text-color) 28%, transparent);
    border-radius: 6px;
    background: var(--bg-color);
    color: var(--text-color);
    font: inherit;
}

.subject-color-label input {
    width: 44px;
    height: 36px;
    padding: 2px;
    border: 1px solid color-mix(in srgb, var(--text-color) 28%, transparent);
    border-radius: 6px;
    background: var(--bg-color);
    cursor: pointer;
}

.new-subject-form button {
    min-height: 36px;
    padding: 6px 12px;
    color: var(--text-color);
    font: inherit;
}

.dialog-error {
    margin: 0;
    color: #c62828;
    font-weight: 700;
}

.stop-dialog-actions {
    /* 저장 및 취소 버튼을 같은 너비로 나란히 배치합니다. */
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 24px;
}

.stop-dialog-actions button {
    min-height: 56px;
    padding: 12px;
    color: var(--text-color);
    font: inherit;
    cursor: pointer;
}

.stop-dialog-actions button:focus-visible {
    outline: 3px solid var(--primary-color);
    outline-offset: 3px;
}

.stop-dialog-actions button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
}

@media (max-width: 520px) {
    /* 작은 화면에서는 팝업 여백을 줄이고 신규 과목 입력을 두 줄로 재배치합니다. */
    .stop-dialog {
        padding: 28px 20px;
        border-radius: 28px;
    }

    .new-subject-form {
        grid-template-columns: minmax(0, 1fr) auto;
    }

    .new-subject-form button {
        grid-column: 1 / -1;
    }
}

@media (max-width: 380px) {
  .stopwatch-page {
    padding: 0;
  }

  .stopwatch-shell {
    padding: 20px 10px;
  }

  .actions {
    gap: 5px;
  }

  .control-button {
    padding: 9px 3px;
    font-size: 13px;
  }

  .stop-dialog-actions {
    gap: 10px;
  }
}
</style>
