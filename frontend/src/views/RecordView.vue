<script setup>
import { computed, onMounted, ref } from 'vue'
import { useAuth } from '../composables/useAuth'
import { useRecordViewState } from '../composables/useRecordViewState'

const { isLoggedIn, fetchLoginStatus } = useAuth()
const { selectedMonth, openWeek } = useRecordViewState()
const currentYear = computed(() => selectedMonth.value.getFullYear())
const currentMonth = computed(() => selectedMonth.value.getMonth() + 1)
const visibleDateRange = computed(() => {
  const year = currentYear.value
  const month = currentMonth.value
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  const firstVisibleDay = new Date(year, month - 1, 1 - firstDay.getDay())
  const lastVisibleDay = new Date(year, month - 1, lastDay.getDate() + (6 - lastDay.getDay()))
  return {
    from: formatDatabaseDateTime(firstVisibleDay, false),
    to: formatDatabaseDateTime(lastVisibleDay, true),
  }
})
const today = new Date()
const records = ref([])
const isLoading = ref(false)
const loadError = ref('')
const selectedRecord = ref(null)
const recordDetailDialog = ref(null)
const deleteConfirmDialog = ref(null)
const isDeletingRecord = ref(false)
const selectedRecordError = ref('')

async function loadRecords() {
  isLoading.value = true
  loadError.value = ''
  try {
    const { from, to } = visibleDateRange.value
    const params = new URLSearchParams({ from, to })
    const response = await fetch(`/api/studyRecord?${params}`, { credentials: 'include' })
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || '공부 기록을 불러오지 못했습니다.')
    }
    const data = await response.json()
    records.value = data.map(record => ({
      id: record.id,
      subject: record.subject_name,
      color: record.subject_color,
      detail: record.detail,
      restTime: record.rest_time,
      start: parseDatabaseDateTime(record.start_time),
      end: parseDatabaseDateTime(record.end_time),
    }))
  } catch (error) {
    loadError.value = error.message || '공부 기록을 불러오지 못했습니다.'
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  try {
    if (await fetchLoginStatus()) await loadRecords()
  } catch (error) {
    loadError.value = error.message || '로그인 상태를 확인하지 못했습니다.'
  }
})

function changeMonth(offset) {
  selectedMonth.value = new Date(
    selectedMonth.value.getFullYear(),
    selectedMonth.value.getMonth() + offset,
    1,
  )
  openWeek.value = null
  loadRecords()
}

function formatDatabaseDateTime(date, endOfDay) {
  // 달력 날짜의 시작/끝을 브라우저 로컬 시각으로 만든 뒤 UTC로 변환해 조회합니다.
  const localBoundary = new Date(
    date.getFullYear(), date.getMonth(), date.getDate(),
    endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0,
  )
  return localBoundary.toISOString()
}

function parseDatabaseDateTime(value) {
  // DB에 저장된 ISO UTC 시각을 Date로 읽고, 브라우저 시간대 기준으로 표시합니다.
  return new Date(value)
}

function openRecord(recordId) {
  selectedRecord.value = records.value.find(record => record.id === recordId) ?? null
  selectedRecordError.value = ''
  if (selectedRecord.value) recordDetailDialog.value.showModal()
}

function closeRecordDetails() {
  recordDetailDialog.value.close()
  selectedRecord.value = null
  selectedRecordError.value = ''
}

function confirmDeleteRecord() {
  selectedRecordError.value = ''
  deleteConfirmDialog.value.showModal()
}

async function deleteSelectedRecord() {
  if (!selectedRecord.value) return

  isDeletingRecord.value = true
  selectedRecordError.value = ''
  try {
    const response = await fetch(`/api/studyRecord/${selectedRecord.value.id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.message || '기록을 삭제하지 못했습니다.')
    deleteConfirmDialog.value.close()
    recordDetailDialog.value.close()
    selectedRecord.value = null
    await loadRecords()
  } catch (error) {
    selectedRecordError.value = error.message || '기록을 삭제하지 못했습니다.'
    if (deleteConfirmDialog.value.open) deleteConfirmDialog.value.close()
  } finally {
    isDeletingRecord.value = false
  }
}

function formatRecordDateTime(date) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(date)
}

function formatDuration(seconds = 0) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60
  return `${hours}시간 ${minutes}분 ${remainingSeconds}초`
}

/* =========================================================
 * 3. 과목별 색상
 *    과목 이름을 가나다순으로 정렬해 팔레트 색을 차례로 배정 (과목 10개까지 서로 다른 색)
 * ========================================================= */
const subjects = computed(() => {
  const colorsByName = new Map(records.value.map(record => [record.subject, record.color]))
  const names = [...colorsByName.keys()].sort((a, b) => a.localeCompare(b, 'ko'))
  return names.map(name => ({ name, color: colorsByName.get(name) }))
})

const subjectColor = computed(() => new Map(subjects.value.map(s => [s.name, s.color])))

/* =========================================================
 * 4. 기록 → 날짜별 타임라인 조각으로 정리
 *    { 'YYYY-MM-DD': [{ subject, color, start(분), end(분) }, ...] }
 *    자정을 넘긴 기록은 날짜별로 나눔 (예: 23:00~01:00 → 23:00~24:00 + 00:00~01:00)
 * ========================================================= */
const sessionsByDate = computed(() => {
  const result = {}

  for (const record of records.value) {
    const { id, subject, detail, start, end } = record
    const startAt = new Date(start)
    const endAt = new Date(end)
    if (isNaN(startAt) || isNaN(endAt) || endAt <= startAt) continue // 잘못된 기록은 건너뜀

    const dayStart = new Date(startAt.getFullYear(), startAt.getMonth(), startAt.getDate())
    while (dayStart < endAt) {
      const nextDay = new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate() + 1)
      const segStart = Math.max(startAt, dayStart)
      const segEnd = Math.min(endAt, nextDay)

      if (segEnd > segStart) {
        const key = dateKey(dayStart)
        ;(result[key] ??= []).push({
          id,
          subject,
          detail,
          color: subjectColor.value.get(subject),
          start: segStart.getHours() * 60 + segStart.getMinutes(),
          end: segEnd.getTime() === nextDay.getTime()
            ? 24 * 60
            : segEnd.getHours() * 60 + segEnd.getMinutes(),
        })
      }
      dayStart.setDate(dayStart.getDate() + 1)
    }
  }

  for (const list of Object.values(result)) list.sort((a, b) => a.start - b.start)
  return result
})

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/* =========================================================
 * 5. 월간 캘린더 만들기
 *    해당 월을 포함하는 주(일~토) 단위 배열. 앞뒤 달 날짜는 inMonth: false
 * ========================================================= */
const DOW_LABELS = ['일', '월', '화', '수', '목', '금', '토']
const weeks = computed(() => buildWeeks(currentYear.value, currentMonth.value))

function buildWeeks(year, month) {
  const first = new Date(year, month - 1, 1)
  const lastDate = new Date(year, month, 0).getDate()
  const cursor = new Date(year, month - 1, 1 - first.getDay())
  const result = []

  while (result.length === 0 || (cursor.getMonth() === month - 1 && cursor.getDate() <= lastDate)) {
    const week = []
    for (let i = 0; i < 7; i++) {
      const inMonth = cursor.getMonth() === month - 1
      const date = cursor.getDate()
      const key = dateKey(cursor)
      week.push({
        key,
        date,
        inMonth,
        kind: i === 0 ? 'sun' : i === 6 ? 'sat' : '',
        isToday: inMonth &&
          cursor.getFullYear() === today.getFullYear() &&
          cursor.getMonth() === today.getMonth() &&
          date === today.getDate(),
        sessions: sessionsByDate.value[key] ?? [],
      })
      cursor.setDate(date + 1)
    }
    result.push(week)
  }
  return result
}

/* =========================================================
 * 6. 타임라인 (크기 · 시간 눈금 · 공부 막대 위치)
 * ========================================================= */
const ROW_H = 24                          // 30분 = 24px
const SLOT_COUNT = 48                     // 24시간 / 30분 = 48칸
const TRACK_HEIGHT = ROW_H * SLOT_COUNT   // 전체 세로 길이(1152px) → 넘치면 스크롤

// 왼쪽 시간 축 눈금 (00:00 ~ 24:00, 30분 단위)
const axisMarks = []
for (let i = 0; i <= SLOT_COUNT; i++) {
  const min = i * 30
  axisMarks.push({
    top: i * ROW_H,
    label: fmtTime(min),
    isHour: min % 60 === 0,
  })
}

// 공부 조각 → 타임라인 안에서의 위치/높이(px) + 과목 색
function blockStyle({ start, end, color }) {
  return {
    top: (start / 30) * ROW_H + 'px',
    height: ((end - start) / 30) * ROW_H + 'px',
    backgroundColor: color,
  }
}

/* =========================================================
 * 7. 주별 타임라인 펼치기/접기
 *    패널 높이와 페이지 스크롤을 "같은 시간 · 같은 곡선"으로 한 프레임씩 함께 움직여
 *    펼쳐지는 동안 타임라인이 자연스럽게 화면 안으로 들어오게 합니다.
 * ========================================================= */
const FOLD_DURATION = 400 // ms (버튼 화살표 회전 시간도 이 값을 그대로 사용)
const EDGE_GAP = 16       // 스크롤 후 화면 위/아래에 남길 여백(px)

const rowEls = []          // 주별 날짜 행 DOM
const panelEls = []        // 주별 타임라인 패널 DOM
let animationFrame = 0

function toggleWeek(index) {
  const next = openWeek.value === index ? null : index
  const panels = panelEls.filter(Boolean)
  const rows = rowEls.filter(Boolean)

  if (!panels.length || !rows[index]) return

  // 지금 높이를 인라인으로 고정해 두고 (클래스가 바뀌어도 튀지 않게) 목표 높이를 계산
  const from = panels.map(el => el.getBoundingClientRect().height)
  panels.forEach((el, i) => (el.style.height = from[i] + 'px'))
  const to = panels.map((el, i) => (i === next ? el.scrollHeight : 0))

  openWeek.value = next
  animateFold(panels, rows, from, to, next)
}

function animateFold(panels, rows, from, to, openIndex) {
  cancelAnimationFrame(animationFrame)

  const scroller = findScrollParent(panels[0])
  const startScroll = scroller.scrollTop
  const endScroll = openIndex === null ? null : scrollTargetFor(openIndex, rows, from, to, scroller)
  const startTime = performance.now()

  function frame(now) {
    const progress = Math.min(1, (now - startTime) / FOLD_DURATION)
    const eased = easeInOutCubic(progress)

    panels.forEach((el, i) => {
      if (from[i] !== to[i]) el.style.height = from[i] + (to[i] - from[i]) * eased + 'px'
    })
    if (endScroll !== null) {
      scroller.scrollTop = startScroll + (endScroll - startScroll) * eased
    }

    if (progress < 1) {
      animationFrame = requestAnimationFrame(frame)
    } else {
      // 끝나면 인라인 높이를 지우고 CSS(.open → auto, 나머지 → 0)에 맡김
      panels.forEach(el => (el.style.height = ''))
    }
  }
  animationFrame = requestAnimationFrame(frame)
}

// 애니메이션이 끝났을 때의 스크롤 위치:
// 열린 타임라인 아래쪽까지 화면에 들어오되, 그 주의 날짜 행은 위로 밀려나지 않게
function scrollTargetFor(openIndex, rows, from, to, scroller) {
  const isPage = scroller === document.scrollingElement
  const viewTop = isPage ? 0 : scroller.getBoundingClientRect().top + scroller.clientTop
  const viewHeight = isPage ? window.innerHeight : scroller.clientHeight
  const current = scroller.scrollTop

  // 위쪽에서 접히는 패널만큼 이 주가 위로 올라감
  let shrinkAbove = 0
  for (let i = 0; i < openIndex; i++) shrinkAbove += from[i] - to[i]
  const totalChange = to.reduce((sum, h, i) => sum + h - from[i], 0)

  const row = rows[openIndex]
  const rowTop = row.getBoundingClientRect().top - viewTop + current - shrinkAbove
  const panelBottom = rowTop + row.offsetHeight + to[openIndex]

  let target = current
  if (panelBottom > target + viewHeight - EDGE_GAP) target = panelBottom - viewHeight + EDGE_GAP
  if (rowTop - EDGE_GAP < target) target = rowTop - EDGE_GAP

  const maxScroll = scroller.scrollHeight + totalChange - viewHeight
  return Math.max(0, Math.min(target, maxScroll))
}

// 가장 가까운 스크롤 영역 찾기 (App.vue의 .main-content)
function findScrollParent(el) {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const overflowY = getComputedStyle(p).overflowY
    if (overflowY === 'auto' || overflowY === 'scroll') return p
  }
  return document.scrollingElement
}

// 천천히 시작 → 빠르게 → 천천히 멈춤 (CSS cubic-bezier(0.65, 0, 0.35, 1)과 같은 곡선)
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/* =========================================================
 * 8. 시간 표시 도우미
 * ========================================================= */
// 분 → "HH:MM" (예: 545 -> "09:05")
function fmtTime(min) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// 하루 총 공부 시간 (예: "2시간 35분")
function dayTotal(sessions) {
  const min = sessions.reduce((sum, s) => sum + (s.end - s.start), 0)
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h && m) return `${h}시간 ${m}분`
  if (h) return `${h}시간`
  return `${m}분`
}
</script>

<template>
  <p v-if="!isLoggedIn" class="login-required-message">로그인을 해야 이용할 수 있습니다</p>
  <div v-else class="record" :style="{ '--fold-duration': FOLD_DURATION + 'ms' }">
    <div class="record-card">
      <!-- ===== 상단: 월 이동 네비게이션 (◀ 7월 ▶) ===== -->
      <div class="month-nav">
        <button class="nav-btn rainbow-btn" type="button" aria-label="이전 달" @click="changeMonth(-1)">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

          <h2 class="month-label">{{ currentYear }}년 {{ currentMonth }}월</h2>

        <button class="nav-btn rainbow-btn" type="button" aria-label="다음 달" @click="changeMonth(1)">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      <!-- 현재 조회 범위에 기록된 과목과 각 과목의 색상을 한 줄 범례로 보여줍니다. -->
      <ul v-if="subjects.length" class="subject-legend" aria-label="과목 색상 범례">
        <li v-for="subject in subjects" :key="subject.name" class="subject-chip">
          <span class="subject-dot" :style="{ backgroundColor: subject.color }"></span>
          <span>{{ subject.name }}</span>
        </li>
      </ul>

      <p v-if="isLoading" class="record-status" role="status">공부 기록을 불러오는 중입니다.</p>
      <p v-else-if="loadError" class="record-status error" role="alert">{{ loadError }}</p>
      <p v-else-if="records.length === 0" class="record-status">저장된 공부 기록이 없습니다.</p>

      <!-- ===== 월간 캘린더 ===== -->
      <div class="calendar">
        <!-- 요일 헤더 -->
        <div class="cal-row cal-head">
          <div class="toggle-col"></div>
          <div
            v-for="(label, i) in DOW_LABELS"
            :key="label"
            class="dow"
            :class="{ sun: i === 0, sat: i === 6 }"
          >{{ label }}</div>
        </div>

        <!-- 주 단위: [날짜 행] + [펼쳐지는 타임라인] -->
        <div
          v-for="(week, wi) in weeks"
          :key="wi"
          class="week"
          :class="{ open: openWeek === wi }"
        >
          <!-- 날짜 행 -->
          <div :ref="el => (rowEls[wi] = el)" class="cal-row">
            <!-- 왼쪽: 타임라인 펼치기 버튼 -->
            <div class="toggle-col">
              <button
                class="week-toggle rainbow-btn"
                :class="{ clicked: openWeek === wi }"
                type="button"
                :aria-expanded="openWeek === wi"
                :aria-label="`${wi + 1}번째 주 타임라인 ${openWeek === wi ? '접기' : '펼치기'}`"
                @click="toggleWeek(wi)"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>

            <!-- 날짜 칸 -->
            <div
              v-for="day in week"
              :key="day.key"
              class="cal-cell"
              :class="[day.kind, { muted: !day.inMonth, today: day.isToday }]"
              role="button"
              tabindex="0"
              :aria-label="`${day.date}일이 포함된 주 타임라인 ${openWeek === wi ? '접기' : '펼치기'}`"
              @click="toggleWeek(wi)"
              @keydown.enter.space.prevent="toggleWeek(wi)"
            >
              <span class="dom">{{ day.date }}</span>
              <span v-if="day.sessions.length" class="sum">{{ dayTotal(day.sessions) }}</span>
            </div>
          </div>

          <!-- 펼쳐지는 주간 타임라인 -->
          <div :ref="el => (panelEls[wi] = el)" class="week-panel">
            <div class="timeline-scroll">
              <div class="timeline">
                <!-- 왼쪽 시간 축 (30분 단위) -->
                <div class="axis" :style="{ height: TRACK_HEIGHT + 'px' }">
                  <span
                    v-for="mark in axisMarks"
                    :key="mark.top"
                    class="axis-mark"
                    :class="{ hour: mark.isHour }"
                    :style="{ top: mark.top + 'px' }"
                  >{{ mark.label }}</span>
                </div>

                <!-- 요일별 공부 기록 컬럼 -->
                <div
                  v-for="day in week"
                  :key="'col-' + day.key"
                  class="day-col"
                  :class="{ today: day.isToday, muted: !day.inMonth }"
                  :style="{ height: TRACK_HEIGHT + 'px' }"
                >
                  <!-- 막대 안에는 시작 시각과 끝 시각만 표시합니다. -->
                  <button
                    type="button"
                    v-for="(session, i) in day.sessions"
                    :key="`${session.id}-${i}`"
                    class="study-block"
                    :style="blockStyle(session)"
                    :title="`${fmtTime(session.start)} ~ ${fmtTime(session.end)}`"
                    :aria-label="`${session.subject}, ${fmtTime(session.start)}부터 ${fmtTime(session.end)}까지. 기록 상세 보기`"
                    @click="openRecord(session.id)"
                  >
                    <span class="block-time">{{ fmtTime(session.start) }} ~ {{ fmtTime(session.end) }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ===== 하단 안내 ===== -->
      <div class="legend">
        <span class="legend-text">
          Tip: 주 왼쪽의 <b>▶ 버튼</b>을 누르면 그 주의 타임라인이 열려요 · 막대를 누르면 상세 기록을 볼 수 있어요
        </span>
      </div>
    </div>

    <dialog ref="recordDetailDialog" class="record-dialog" aria-labelledby="record-dialog-title">
      <template v-if="selectedRecord">
        <h2 id="record-dialog-title">공부 기록</h2>
        <dl class="record-details">
          <dt>과목</dt>
          <dd>
            <span class="record-subject-color" :style="{ backgroundColor: selectedRecord.color }"></span>
            {{ selectedRecord.subject }}
          </dd>
          <dt>세부사항</dt>
          <dd class="record-detail-text">{{ selectedRecord.detail || '작성된 세부사항이 없습니다.' }}</dd>
          <dt>시작</dt>
          <dd>{{ formatRecordDateTime(selectedRecord.start) }}</dd>
          <dt>종료</dt>
          <dd>{{ formatRecordDateTime(selectedRecord.end) }}</dd>
          <dt>휴식시간</dt>
          <dd>{{ formatDuration(selectedRecord.restTime) }}</dd>
        </dl>
        <p v-if="selectedRecordError" class="record-dialog-error" role="alert">{{ selectedRecordError }}</p>
        <div class="record-dialog-actions">
          <button type="button" class="delete-record-button" @click="confirmDeleteRecord">삭제</button>
          <button type="button" @click="closeRecordDetails">취소</button>
        </div>
      </template>
    </dialog>

    <dialog ref="deleteConfirmDialog" class="record-confirm-dialog" aria-labelledby="delete-confirm-title">
      <h2 id="delete-confirm-title">진짜 삭제하시겠습니까?</h2>
      <div class="record-dialog-actions">
        <button type="button" class="delete-record-button" :disabled="isDeletingRecord" @click="deleteSelectedRecord">
          {{ isDeletingRecord ? '삭제 중...' : '수락' }}
        </button>
        <button type="button" :disabled="isDeletingRecord" @click="deleteConfirmDialog.close()">취소</button>
      </div>
    </dialog>
  </div>
</template>

<style scoped>
/* =========================================================
 * 1. 페이지 · 카드
 * ========================================================= */
.record {
  min-height: 100%;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 24px;
  background-color: var(--bg-color);
  color: var(--text-color);
  font-family: 'Arial', sans-serif;
  /* 브라우저 자동 스크롤 보정이 펼침 스크롤과 겹치지 않게 끔 */
  overflow-anchor: none;
}

.record-card {
  width: 100%;
  max-width: 820px;
  background-color: var(--surface-color);
  border: 1px solid color-mix(in srgb, var(--text-color) 14%, transparent);
  border-radius: 16px;
  box-shadow: 0 8px 24px color-mix(in srgb, var(--text-color) 10%, transparent);
  padding: 24px 28px 24px;
}

.record-status {
  margin: 0 0 16px;
  color: color-mix(in srgb, var(--text-color) 72%, transparent);
  text-align: center;
}

.record-status.error {
  color: #c62828;
}

/* =========================================================
 * 2. 상단 월 이동 네비게이션
 * ========================================================= */
.month-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  margin-bottom: 20px;
}

.month-label {
  margin: 0;
  min-width: 88px;
  text-align: center;
  font-size: 30px;
  font-weight: 800;
  color: var(--text-color);
}

.nav-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid color-mix(in srgb, var(--text-color) 22%, transparent);
  border-radius: 50%;
  background-color: var(--bg-color);
  color: var(--text-color);
  cursor: pointer;
  transition: all 0.15s ease;
}

.nav-btn.rainbow-btn,
.week-toggle.rainbow-btn {
  box-sizing: border-box;
  padding: 3px;
  border: 0;
  border-radius: 50%;
  background-color: transparent;
}

.nav-btn.rainbow-btn::before,
.week-toggle.rainbow-btn::before {
  inset: 3px;
  border-radius: 50%;
  background: var(--bg-color);
}

.nav-btn.rainbow-btn:hover::before,
.week-toggle.rainbow-btn:hover::before,
.week.open .week-toggle.rainbow-btn.clicked::before,
.nav-btn.rainbow-btn:active::before,
.week-toggle.rainbow-btn:active::before {
  background: var(--rainbow-btn-hover-background);
}

.nav-btn.rainbow-btn:hover,
.week-toggle.rainbow-btn:hover,
.week.open .week-toggle.rainbow-btn {
  border-color: transparent;
  color: #ffffff;
}

.nav-btn.rainbow-btn:active,
.week-toggle.rainbow-btn:active {
  transform: scale(0.94);
  filter: drop-shadow(0 0 8px #a855f7);
}

/* =========================================================
 * 3. 과목 색상 범례
 * ========================================================= */
.subject-legend {
  display: flex;
  flex-wrap: nowrap;
  justify-content: flex-start;
  gap: 8px;
  margin: 0 0 16px;
  padding: 4px 2px 10px;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  list-style: none;
  scrollbar-width: thin;
}

.subject-chip {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border: 1px solid color-mix(in srgb, var(--text-color) 18%, transparent);
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-color);
  white-space: nowrap;
}

.subject-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

/* =========================================================
 * 4. 월간 캘린더 (버튼 열 56px + 요일 7칸)
 *    버튼 열 너비 = 타임라인 시간 축 너비 → 날짜 칸과 타임라인 컬럼이 세로로 정렬됨
 * ========================================================= */
.calendar {
  border: 1px solid color-mix(in srgb, var(--text-color) 16%, transparent);
  border-radius: 12px;
  overflow: hidden;
}

.cal-row {
  display: grid;
  grid-template-columns: 56px repeat(7, 1fr);
}

/* 요일 헤더 */
.cal-head {
  border-bottom: 1px solid color-mix(in srgb, var(--text-color) 18%, transparent);
}

.cal-head .dow {
  padding: 10px 0;
  text-align: center;
  font-size: 13px;
  font-weight: 700;
  color: color-mix(in srgb, var(--text-color) 62%, transparent);
}

.cal-head .dow.sun {
  color: #e5484d;
}

.cal-head .dow.sat {
  color: #3b6fe0;
}

.week + .week {
  border-top: 1px solid color-mix(in srgb, var(--text-color) 14%, transparent);
}

/* 날짜 칸 */
.cal-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  min-height: 72px;
  padding: 8px;
  border-left: 1px solid color-mix(in srgb, var(--text-color) 12%, transparent);
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.cal-cell:hover {
  background-color: color-mix(in srgb, var(--primary-color) 8%, var(--surface-color));
}

.cal-cell:focus-visible {
  position: relative;
  z-index: 1;
  outline: 2px solid var(--primary-color);
  outline-offset: -2px;
}

.cal-cell .dom {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-color);
}

.cal-cell.sun .dom {
  color: #e5484d;
}

.cal-cell.sat .dom {
  color: #3b6fe0;
}

.cal-cell.muted .dom {
  opacity: 0.35;
}

.cal-cell.today {
  background-color: color-mix(in srgb, var(--primary-color) 10%, var(--surface-color));
}

.cal-cell.today .dom {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin: -4px 0 0 -4px;
  border-radius: 50%;
  background-color: var(--primary-color);
  color: #ffffff;
}

.cal-cell .sum {
  font-size: 11px;
  font-weight: 700;
  color: var(--primary-color);
}

/* =========================================================
 * 5. 주 타임라인 펼치기 버튼
 * ========================================================= */
.toggle-col {
  display: flex;
  align-items: center;
  justify-content: center;
  border-right: 1px solid color-mix(in srgb, var(--text-color) 14%, transparent);
}

.week-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 1px solid color-mix(in srgb, var(--text-color) 22%, transparent);
  border-radius: 50%;
  background-color: var(--bg-color);
  color: var(--text-color);
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.week-toggle:hover,
.week.open .week-toggle {
  background-color: var(--primary-color);
  border-color: var(--primary-color);
  color: #ffffff;
}

/* 화살표 회전: 패널 펼침과 같은 시간 · 같은 곡선 */
.week-toggle svg {
  transition: transform var(--fold-duration) cubic-bezier(0.65, 0, 0.35, 1);
}

.week.open .week-toggle svg {
  transform: rotate(90deg);
}

/* =========================================================
 * 6. 펼쳐지는 타임라인 패널
 *    평소: 닫힘 0 / 열림 auto. 펼치는 동안에는 JS가 높이를 프레임마다 지정
 * ========================================================= */
.week-panel {
  height: 0;
  overflow: hidden;
}

.week.open .week-panel {
  height: auto;
}

/* =========================================================
 * 7. 타임라인 (시간축 56px + 요일 7칸)
 * ========================================================= */
.timeline-scroll {
  max-height: 460px;
  overflow-y: auto;
  border-top: 1px solid color-mix(in srgb, var(--text-color) 18%, transparent);
  background-color: var(--surface-color);
}

.timeline {
  display: grid;
  grid-template-columns: 56px repeat(7, 1fr);
  padding: 8px 0;
}

/* 왼쪽 시간 축 */
.axis {
  position: relative;
  border-right: 1px solid color-mix(in srgb, var(--text-color) 14%, transparent);
}

.axis-mark {
  position: absolute;
  right: 6px;
  transform: translateY(-50%);
  font-size: 10px;
  color: color-mix(in srgb, var(--text-color) 48%, transparent);
  white-space: nowrap;
}

.axis-mark.hour {
  color: color-mix(in srgb, var(--text-color) 74%, transparent);
  font-weight: 700;
}

/* 요일별 컬럼 */
.day-col {
  position: relative;
  border-left: 1px solid color-mix(in srgb, var(--text-color) 12%, transparent);
  /* 30분(연한 선) / 1시간(진한 선) 눈금 */
  background-image:
    repeating-linear-gradient(to bottom, color-mix(in srgb, var(--text-color) 18%, transparent) 0, color-mix(in srgb, var(--text-color) 18%, transparent) 1px, transparent 1px, transparent 48px),
    repeating-linear-gradient(to bottom, color-mix(in srgb, var(--text-color) 9%, transparent) 0, color-mix(in srgb, var(--text-color) 9%, transparent) 1px, transparent 1px, transparent 24px);
}

.day-col.today {
  background-color: color-mix(in srgb, var(--primary-color) 5%, var(--surface-color));
}

.day-col.muted {
  background-color: color-mix(in srgb, var(--text-color) 5%, var(--surface-color));
}

/* 과목별 공부 막대 (배경색은 과목 색으로 인라인 지정) */
.study-block {
  position: absolute;
  left: 3px;
  right: 3px;
  border: 0;
  display: flex;
  flex-direction: column;
  padding: 2px 4px;
  border-radius: 4px;
  box-shadow: 0 1px 2px color-mix(in srgb, var(--text-color) 30%, transparent);
  overflow: hidden;
  color: #ffffff;
  font-family: inherit;
  text-align: left;
  line-height: 1.2;
  white-space: nowrap;
  cursor: pointer;
  appearance: none;
}

.study-block:focus-visible {
  z-index: 1;
  outline: 2px solid var(--primary-color);
  outline-offset: 1px;
}

.block-time {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 9px;
  font-weight: 700;
  opacity: 0.9;
}

/* =========================================================
 * 8. 하단 안내
 * ========================================================= */
.legend {
  margin-top: 14px;
  text-align: center;
}

.legend-text {
  font-size: 12px;
  color: color-mix(in srgb, var(--text-color) 62%, transparent);
}

.record-dialog,
.record-confirm-dialog {
  width: min(440px, calc(100vw - 32px));
  box-sizing: border-box;
  margin: auto;
  padding: 24px;
  border: 1px solid color-mix(in srgb, var(--text-color) 18%, transparent);
  border-radius: 16px;
  background: var(--surface-color);
  color: var(--text-color);
  box-shadow: 0 20px 60px color-mix(in srgb, var(--text-color) 24%, transparent);
}

.record-dialog::backdrop,
.record-confirm-dialog::backdrop {
  background: rgba(0, 0, 0, 0.48);
}

.record-dialog h2,
.record-confirm-dialog h2 {
  margin: 0 0 20px;
  font-size: 20px;
}

.record-details {
  display: grid;
  grid-template-columns: 86px minmax(0, 1fr);
  gap: 12px 8px;
  margin: 0;
}

.record-details dt {
  color: color-mix(in srgb, var(--text-color) 68%, transparent);
  font-weight: 700;
}

.record-details dd {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
}

.record-details dd:first-of-type {
  display: flex;
  align-items: center;
  gap: 8px;
}

.record-subject-color {
  width: 14px;
  height: 14px;
  flex: none;
  border-radius: 50%;
}

.record-detail-text {
  white-space: pre-wrap;
}

.record-dialog-error {
  margin: 16px 0 0;
  color: #c62828;
  font-weight: 700;
}

.record-dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 24px;
}

.record-dialog-actions button {
  min-width: 88px;
  min-height: 40px;
  padding: 8px 14px;
  border: 1px solid color-mix(in srgb, var(--text-color) 24%, transparent);
  border-radius: 8px;
  background: var(--bg-color);
  color: var(--text-color);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.record-dialog-actions .delete-record-button {
  border-color: #c62828;
  background: #c62828;
  color: #ffffff;
}

.record-dialog-actions button:disabled {
  cursor: wait;
  opacity: 0.6;
}

@media (max-width: 640px) {
  .record {
    padding: 0;
  }

  .record-card {
    padding: 18px 12px;
    border-radius: 12px;
  }

  .month-nav {
    gap: 12px;
    margin-bottom: 16px;
  }

  .month-label {
    min-width: 78px;
    font-size: 22px;
  }

  .nav-btn {
    width: 36px;
    height: 36px;
  }

  .calendar {
    overflow-x: auto;
    overflow-y: hidden;
  }

  .cal-row,
  .week {
    min-width: 560px;
  }

  .cal-cell {
    min-height: 62px;
    gap: 4px;
    padding: 5px 2px;
  }

  .cal-cell .dom {
    font-size: 12px;
  }

  .cal-cell .sum {
    font-size: 9px;
    line-height: 1.2;
  }

  .timeline-scroll {
    overflow-x: auto;
    overscroll-behavior-x: contain;
  }

  .timeline {
    min-width: 560px;
  }

  .record-dialog,
  .record-confirm-dialog {
    width: calc(100vw - 24px);
    max-height: calc(100dvh - 24px);
    overflow-y: auto;
    padding: 18px;
  }

  .record-details {
    grid-template-columns: 72px minmax(0, 1fr);
    gap: 10px 6px;
  }

  .record-dialog-actions {
    gap: 8px;
  }

  .record-dialog-actions button {
    min-width: 0;
    flex: 1;
    padding: 8px 10px;
  }
}

@media (max-width: 360px) {
  .cal-cell {
    min-height: 56px;
    padding-right: 1px;
    padding-left: 1px;
  }

  .cal-cell .sum {
    font-size: 8px;
  }
}
</style>
