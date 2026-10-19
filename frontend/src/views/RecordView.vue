<script setup>
// 공부 기록 페이지 - "디자인(레이아웃) 우선" 버전
// 아직 실제 기능(월 이동, 데이터 연동)은 연결하지 않고 정적 화면만 구성합니다.
import { computed, ref } from 'vue'
import { useAuth } from '../composables/useAuth'

const { isLoggedIn } = useAuth()

/* =========================================================
 * 1. 기본 설정 (임시 값)
 * ========================================================= */
const selectedMonth = ref(new Date(2026, 6, 1))
const currentYear = computed(() => selectedMonth.value.getFullYear())
const currentMonth = computed(() => selectedMonth.value.getMonth() + 1)
const today = new Date()

function changeMonth(offset) {
  selectedMonth.value = new Date(
    selectedMonth.value.getFullYear(),
    selectedMonth.value.getMonth() + offset,
    1,
  )
  openWeek.value = null
}

/* =========================================================
 * 2. 입력 데이터 (다른 코드에서 props로 넘겨받음)
 *
 *    records: [{ subject, start, end }, ...]
 *      - subject : 과목 이름 (예: '수학')
 *      - start   : 공부 시작 시각 ┐ Date 객체, '2026-07-09T09:05' 같은 문자열,
 *      - end     : 공부 종료 시각 ┘ 또는 타임스탬프(ms) - new Date()가 읽을 수 있으면 OK
 *
 *    사용 예) <RecordView :records="records" />
 *    records를 넘기지 않으면 아래 SAMPLE_RECORDS(미리보기용)를 보여줍니다.
 * ========================================================= */
const props = defineProps({
  records: { type: Array, default: undefined },
})

const SAMPLE_RECORDS = [
  { subject: '수학', start: '2026-07-01T10:00', end: '2026-07-01T11:30' },
  { subject: '영어', start: '2026-07-01T21:00', end: '2026-07-01T22:30' },
  { subject: '국어', start: '2026-07-02T19:00', end: '2026-07-02T21:30' },
  { subject: '영어', start: '2026-07-03T09:00', end: '2026-07-03T10:15' },
  { subject: '수학', start: '2026-07-05T14:00', end: '2026-07-05T16:30' },
  { subject: '과학', start: '2026-07-05T20:30', end: '2026-07-05T21:45' },
  { subject: '영어', start: '2026-07-06T08:20', end: '2026-07-06T09:00' },
  { subject: '수학', start: '2026-07-06T19:30', end: '2026-07-06T22:05' },
  { subject: '국어', start: '2026-07-07T07:45', end: '2026-07-07T08:30' },
  { subject: '과학', start: '2026-07-07T13:00', end: '2026-07-07T14:30' },
  { subject: '수학', start: '2026-07-07T21:00', end: '2026-07-07T23:10' },
  { subject: '영어', start: '2026-07-08T22:15', end: '2026-07-08T23:45' },
  { subject: '수학', start: '2026-07-09T09:05', end: '2026-07-09T11:40' },
  { subject: '국어', start: '2026-07-09T15:20', end: '2026-07-09T16:50' },
]

const records = computed(() => props.records ?? SAMPLE_RECORDS)

/* =========================================================
 * 3. 과목별 색상
 *    과목 이름을 가나다순으로 정렬해 팔레트 색을 차례로 배정 (과목 10개까지 서로 다른 색)
 * ========================================================= */
const SUBJECT_COLORS = [
  '#ff6b35', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899',
  '#d97706', '#0d9488', '#6366f1', '#ef4444', '#65a30d',
]

const subjects = computed(() => {
  const names = [...new Set(records.value.map(r => r.subject))].sort((a, b) => a.localeCompare(b, 'ko'))
  return names.map((name, i) => ({ name, color: SUBJECT_COLORS[i % SUBJECT_COLORS.length] }))
})

const subjectColor = computed(() => new Map(subjects.value.map(s => [s.name, s.color])))

/* =========================================================
 * 4. 기록 → 날짜별 타임라인 조각으로 정리
 *    { 'YYYY-MM-DD': [{ subject, color, start(분), end(분) }, ...] }
 *    자정을 넘긴 기록은 날짜별로 나눔 (예: 23:00~01:00 → 23:00~24:00 + 00:00~01:00)
 * ========================================================= */
const sessionsByDate = computed(() => {
  const result = {}

  for (const { subject, start, end } of records.value) {
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
          subject,
          color: subjectColor.value.get(subject),
          start: Math.round((segStart - dayStart) / 60000),
          end: Math.round((segEnd - dayStart) / 60000),
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

const openWeek = ref(null) // 열려 있는 주 번호 (없으면 null)
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
        <button class="nav-btn" type="button" aria-label="이전 달" @click="changeMonth(-1)">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

          <h2 class="month-label">{{ currentYear }}년 {{ currentMonth }}월</h2>

        <button class="nav-btn" type="button" aria-label="다음 달" @click="changeMonth(1)">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

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
                class="week-toggle"
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
                  <!-- 과목별 공부 막대: 과목 이름 + 시간 -->
                  <div
                    v-for="(session, i) in day.sessions"
                    :key="i"
                    class="study-block"
                    :style="blockStyle(session)"
                    :title="`${session.subject} · ${fmtTime(session.start)} ~ ${fmtTime(session.end)}`"
                  >
                    <span class="block-subject">{{ session.subject }}</span>
                    <span class="block-time">{{ fmtTime(session.start) }}~{{ fmtTime(session.end) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ===== 하단 안내 ===== -->
      <div class="legend">
        <span class="legend-text">
          주 왼쪽의 <b>▶ 버튼</b>을 누르면 그 주의 타임라인이 열려요 · 눈금은 <b>30분 단위</b> · 막대는 실제 공부한 시간 그대로
        </span>
      </div>
    </div>
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
  background-color: #f6f7f9;
  color: #2b2f36;
  font-family: 'Arial', sans-serif;
  /* 브라우저 자동 스크롤 보정이 펼침 스크롤과 겹치지 않게 끔 */
  overflow-anchor: none;
}

.record-card {
  width: 100%;
  max-width: 820px;
  background-color: #ffffff;
  border: 1px solid #e7e9ee;
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(20, 24, 40, 0.06);
  padding: 24px 28px 24px;
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
  color: #1f2430;
}

.nav-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid #e2e5ec;
  border-radius: 50%;
  background-color: #ffffff;
  color: #5a6472;
  cursor: pointer;
  transition: all 0.15s ease;
}

.nav-btn:hover {
  background-color: #ff6b35;
  border-color: #ff6b35;
  color: #ffffff;
}

/* =========================================================
 * 3. 과목 색상 범례
 * ========================================================= */
.subject-legend {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin: 0 0 16px;
  padding: 0;
  list-style: none;
}

.subject-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border: 1px solid #e7e9ee;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  color: #4b5563;
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
  border: 1px solid #eef0f4;
  border-radius: 12px;
  overflow: hidden;
}

.cal-row {
  display: grid;
  grid-template-columns: 56px repeat(7, 1fr);
}

/* 요일 헤더 */
.cal-head {
  border-bottom: 1px solid #e3e6ec;
}

.cal-head .dow {
  padding: 10px 0;
  text-align: center;
  font-size: 13px;
  font-weight: 700;
  color: #7a8290;
}

.cal-head .dow.sun {
  color: #e5484d;
}

.cal-head .dow.sat {
  color: #3b6fe0;
}

.week + .week {
  border-top: 1px solid #eef0f4;
}

/* 날짜 칸 */
.cal-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  min-height: 72px;
  padding: 8px;
  border-left: 1px solid #f0f2f5;
}

.cal-cell .dom {
  font-size: 13px;
  font-weight: 700;
  color: #4b5563;
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
  background-color: #fff4ee;
}

.cal-cell.today .dom {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin: -4px 0 0 -4px;
  border-radius: 50%;
  background-color: #ff6b35;
  color: #ffffff;
}

.cal-cell .sum {
  font-size: 11px;
  font-weight: 700;
  color: #ff6b35;
}

/* =========================================================
 * 5. 주 타임라인 펼치기 버튼
 * ========================================================= */
.toggle-col {
  display: flex;
  align-items: center;
  justify-content: center;
  border-right: 1px solid #eef0f4;
}

.week-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 1px solid #e2e5ec;
  border-radius: 50%;
  background-color: #ffffff;
  color: #5a6472;
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.week-toggle:hover,
.week.open .week-toggle {
  background-color: #ff6b35;
  border-color: #ff6b35;
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
  border-top: 1px solid #e3e6ec;
  background-color: #fcfcfd;
}

.timeline {
  display: grid;
  grid-template-columns: 56px repeat(7, 1fr);
  padding: 8px 0;
}

/* 왼쪽 시간 축 */
.axis {
  position: relative;
  border-right: 1px solid #eef0f4;
}

.axis-mark {
  position: absolute;
  right: 6px;
  transform: translateY(-50%);
  font-size: 10px;
  color: #aeb4bf;
  white-space: nowrap;
}

.axis-mark.hour {
  color: #6b7280;
  font-weight: 700;
}

/* 요일별 컬럼 */
.day-col {
  position: relative;
  border-left: 1px solid #f0f2f5;
  /* 30분(연한 선) / 1시간(진한 선) 눈금 */
  background-image:
    repeating-linear-gradient(to bottom, #e3e6ec 0, #e3e6ec 1px, transparent 1px, transparent 48px),
    repeating-linear-gradient(to bottom, #f2f4f7 0, #f2f4f7 1px, transparent 1px, transparent 24px);
}

.day-col.today {
  background-color: #fffaf7;
}

.day-col.muted {
  background-color: #f8f9fb;
}

/* 과목별 공부 막대 (배경색은 과목 색으로 인라인 지정) */
.study-block {
  position: absolute;
  left: 3px;
  right: 3px;
  display: flex;
  flex-direction: column;
  padding: 2px 4px;
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(20, 24, 40, 0.2);
  overflow: hidden;
  color: #ffffff;
  line-height: 1.2;
  white-space: nowrap;
}

/* 막대가 짧으면 과목 이름만 보이고 시간은 잘림 (전체는 마우스 올리면 툴팁으로) */
.block-subject {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 10px;
  font-weight: 800;
}

.block-time {
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
  color: #7a8290;
}
</style>
