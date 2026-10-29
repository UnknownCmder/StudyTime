<script setup>
// 공부 계획(플래너) 페이지
// 일요일~토요일 한 주를 슬라이드 한 장으로 보여주고, ◀ ▶ 버튼이나 좌우로 밀어서 주를 넘깁니다.
// 아직 계획 추가/수정과 서버 연동은 없고, 넘겨받은 계획(없으면 샘플)을 보여주기만 합니다.
import { computed, ref, watch } from 'vue'
import { useAuth } from '../composables/useAuth'

const { isLoggedIn } = useAuth()

/* =========================================================
 * 1. 날짜 도우미
 * ========================================================= */
const DOW_LABELS = ['일', '월', '화', '수', '목', '금', '토']
const today = new Date()
const todayKey = dateKey(today)
const thisWeekStart = startOfWeek(today)

// 그 날짜가 속한 주의 일요일 00:00
function startOfWeek(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay())
}

function addDays(d, n) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

function dateKey(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function pad(value) {
  return String(value).padStart(2, '0')
}

/* =========================================================
 * 2. 입력 데이터 (다른 코드에서 props로 넘겨받음)
 *
 *    plans: [{ subject, title, start, end }, ...]
 *      - subject : 과목 이름 (예: '수학')
 *      - title   : 할 일 메모 (예: '미적분 3단원') - 없어도 됨
 *      - start   : 시작 시각 ┐ Date 객체, '2026-10-29T09:00' 같은 문자열,
 *      - end     : 종료 시각 ┘ 또는 타임스탬프(ms) - new Date()가 읽을 수 있으면 OK
 *
 *    사용 예) <Planner :plans="plans" />
 *    plans를 넘기지 않으면 아래 SAMPLE_PLANS(미리보기용)를 보여줍니다.
 * ========================================================= */
const props = defineProps({
  plans: { type: Array, default: undefined },
})

// 이번 주 일요일 기준 dayOffset일 뒤의 time(HH:MM) 시각 (샘플이 항상 이번 주 근처에 보이도록)
function at(dayOffset, time) {
  const [h, m] = time.split(':').map(Number)
  const d = addDays(thisWeekStart, dayOffset)
  d.setHours(h, m)
  return d
}

const SAMPLE_PLANS = [
  // 지난주
  { subject: '수학', title: '수열 복습', start: at(-6, '19:00'), end: at(-6, '21:00') },
  { subject: '영어', title: '단어 50개', start: at(-4, '08:00'), end: at(-4, '09:00') },
  { subject: '국어', title: '비문학 3지문', start: at(-2, '20:00'), end: at(-2, '21:30') },
  // 이번 주
  { subject: '수학', title: '미적분 3단원', start: at(0, '09:00'), end: at(0, '11:00') },
  { subject: '영어', title: '듣기 모의고사', start: at(0, '14:00'), end: at(0, '15:00') },
  { subject: '국어', title: '문학 작품 정리', start: at(1, '19:00'), end: at(1, '20:30') },
  { subject: '과학', title: '화학 개념', start: at(2, '07:00'), end: at(2, '08:00') },
  { subject: '수학', title: '오답 노트', start: at(2, '20:00'), end: at(2, '22:00') },
  { subject: '영어', title: '독해 지문', start: at(2, '21:00'), end: at(2, '22:30') },
  { subject: '과학', title: '물리 문제풀이', start: at(3, '16:00'), end: at(3, '17:30') },
  { subject: '수학', title: '기출 풀이', start: at(4, '10:30'), end: at(4, '12:00') },
  { subject: '국어', title: '문법', start: at(4, '13:00'), end: at(4, '13:30') },
  { subject: '영어', title: '영작 연습', start: at(5, '23:00'), end: at(6, '00:30') },
  { subject: '과학', title: '생명과학 정리', start: at(6, '10:00'), end: at(6, '12:30') },
  // 다음 주
  { subject: '수학', title: '확률과 통계', start: at(8, '18:00'), end: at(8, '20:00') },
  { subject: '영어', title: '문법 총정리', start: at(10, '09:00'), end: at(10, '10:30') },
]

const plans = computed(() => props.plans ?? SAMPLE_PLANS)

/* =========================================================
 * 3. 과목별 색상 (공부기록 페이지와 같은 팔레트 · 같은 배정 방식)
 * ========================================================= */
const SUBJECT_COLORS = [
  '#ff6b35', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899',
  '#d97706', '#0d9488', '#6366f1', '#ef4444', '#65a30d',
]

const subjectColor = computed(() => {
  const names = [...new Set(plans.value.map(p => p.subject))].sort((a, b) => a.localeCompare(b, 'ko'))
  return new Map(names.map((name, i) => [name, SUBJECT_COLORS[i % SUBJECT_COLORS.length]]))
})

/* =========================================================
 * 4. 계획 → 날짜별 타임라인 조각으로 정리
 *    { 'YYYY-MM-DD': [{ subject, title, time, color, start(분), end(분), lane, lanes }, ...] }
 *    자정을 넘긴 계획은 날짜별로 나눔 (예: 23:00~00:30 → 23:00~24:00 + 00:00~00:30)
 * ========================================================= */
const plansByDate = computed(() => {
  const result = {}

  for (const { subject, title, start, end } of plans.value) {
    const startAt = new Date(start)
    const endAt = new Date(end)
    if (isNaN(startAt) || isNaN(endAt) || endAt <= startAt) continue // 잘못된 계획은 건너뜀

    // 나뉜 조각에도 원래 계획 시간을 그대로 표시
    const time = `${fmtClock(startAt)}~${fmtClock(endAt)}`
    const dayStart = new Date(startAt.getFullYear(), startAt.getMonth(), startAt.getDate())

    while (dayStart < endAt) {
      const nextDay = addDays(dayStart, 1)
      const segStart = Math.max(startAt, dayStart)
      const segEnd = Math.min(endAt, nextDay)

      if (segEnd > segStart) {
        ;(result[dateKey(dayStart)] ??= []).push({
          subject,
          title,
          time,
          color: subjectColor.value.get(subject),
          start: Math.round((segStart - dayStart) / 60000),
          end: Math.round((segEnd - dayStart) / 60000),
        })
      }
      dayStart.setDate(dayStart.getDate() + 1)
    }
  }

  for (const list of Object.values(result)) {
    list.sort((a, b) => a.start - b.start || a.end - b.end)
    assignLanes(list)
  }
  return result
})

// 시간이 겹치는 계획은 옆으로 나란히 배치:
// 서로 겹치는 묶음마다 줄(lane)을 나누고, 각 계획에 lane(몇 번째 줄) / lanes(줄 개수)를 붙임
function assignLanes(list) {
  let group = []
  let groupEnd = -1
  let laneEnds = []

  const closeGroup = () => {
    for (const plan of group) plan.lanes = laneEnds.length
    group = []
    laneEnds = []
  }

  for (const plan of list) {
    if (plan.start >= groupEnd) closeGroup()

    let lane = laneEnds.findIndex(laneEnd => laneEnd <= plan.start)
    if (lane === -1) lane = laneEnds.length
    laneEnds[lane] = plan.end
    plan.lane = lane

    group.push(plan)
    groupEnd = Math.max(groupEnd, plan.end)
  }
  closeGroup()
}

/* =========================================================
 * 5. 주(일~토) 슬라이드 데이터
 *    [지난주, 보고 있는 주, 다음 주] 세 장을 나란히 두고 가운데 장을 보여줌
 * ========================================================= */
const weekStart = ref(thisWeekStart) // 보고 있는 주의 일요일
const slideTarget = ref(null)        // 슬라이드가 끝나면 보여줄 주 (이동 중일 때만)
const shift = ref(0)                 // 슬라이드 방향: -1 이전 주 / 0 제자리 / 1 다음 주

const slides = computed(() => {
  const current = weekStart.value
  const target = slideTarget.value
  // '이번 주'로 여러 주를 건너뛸 때는 옆 장에 목표 주를 미리 그려 두고 한 칸만 밀어줌
  return [
    shift.value < 0 && target ? target : addDays(current, -7),
    current,
    shift.value > 0 && target ? target : addDays(current, 7),
  ].map(buildWeek)
})

function buildWeek(start) {
  return {
    key: dateKey(start),
    days: DOW_LABELS.map((dow, i) => {
      const d = addDays(start, i)
      const key = dateKey(d)
      return {
        key,
        dow,
        date: d.getDate() === 1 ? `${d.getMonth() + 1}/1` : d.getDate(), // 달이 바뀌는 날은 월도 표시
        kind: i === 0 ? 'sun' : i === 6 ? 'sat' : '',
        isToday: key === todayKey,
        plans: plansByDate.value[key] ?? [],
      }
    }),
  }
}

// 상단 제목: 슬라이드가 시작되면 바로 목표 주로 바뀜
const labelWeek = computed(() => slideTarget.value ?? weekStart.value)
const isThisWeek = computed(() => dateKey(labelWeek.value) === dateKey(thisWeekStart))

// 주차는 목요일 기준: 그 주의 목요일이 속한 달의 몇 번째 주인지
// (일~토 중 4일 이상이 들어 있는 달로 셈. 예: 9/27~10/3 → 10월 1주차)
const weekLabel = computed(() => {
  const start = labelWeek.value
  const end = addDays(start, 6)
  const thursday = addDays(start, 4)
  const fmt = d => `${d.getMonth() + 1}월 ${d.getDate()}일`
  return {
    title: `${thursday.getFullYear()}년 ${thursday.getMonth() + 1}월 ${Math.ceil(thursday.getDate() / 7)}주차`,
    range: `${fmt(start)} ~ ${fmt(end)}`,
  }
})

/* =========================================================
 * 6. 슬라이드 이동 (버튼 · 좌우로 밀기)
 * ========================================================= */
const SLIDE_DURATION = 360 // ms
const DRAG_LOCK = 8        // 이만큼(px) 움직이면 가로로 미는지 세로로 스크롤하는지 결정

const sliding = ref(false) // 슬라이드 애니메이션 중
const dragging = ref(false)
const dragX = ref(0)       // 손가락/마우스로 끌고 있는 거리(px)
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
let drag = null

// 트랙 너비가 300%라서 1/3씩 움직이면 한 장씩 넘어감
const trackStyle = computed(() => ({
  transform: `translateX(calc(${(-(1 + shift.value) * 100) / 3}% + ${dragX.value}px))`,
}))

function slideTo(dir, target = addDays(weekStart.value, dir * 7)) {
  if (sliding.value) return
  if (dir === 0 && dragX.value === 0) return // 움직일 게 없음

  slideTarget.value = dir ? target : null
  if (reduceMotion.matches) {
    finishSlide()
    return
  }
  sliding.value = true
  shift.value = dir
  dragX.value = 0
}

// 애니메이션이 끝나면 목표 주를 가운데 장으로 바꾸고 트랙 위치를 원래대로 (같은 화면이라 티 안 남)
function finishSlide() {
  if (slideTarget.value) weekStart.value = slideTarget.value
  slideTarget.value = null
  shift.value = 0
  dragX.value = 0
  sliding.value = false
}

function onTrackTransitionEnd(e) {
  if (e.target === e.currentTarget && e.propertyName === 'transform') finishSlide()
}

function goThisWeek() {
  slideTo(Math.sign(thisWeekStart - weekStart.value), thisWeekStart)
}

function startDrag(e) {
  if (sliding.value || e.button !== 0) return
  drag = { id: e.pointerId, x: e.clientX, y: e.clientY, axis: null }
}

function moveDrag(e) {
  if (!drag || e.pointerId !== drag.id) return
  // 시간표 밖에서 손을 뗀 경우: 버튼을 안 누른 채 움직이면 끌기 취소
  if (!e.buttons) {
    drag = null
    return
  }
  const dx = e.clientX - drag.x
  const dy = e.clientY - drag.y

  if (!drag.axis) {
    if (Math.hypot(dx, dy) < DRAG_LOCK) return
    drag.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
    if (drag.axis === 'x') {
      e.currentTarget.setPointerCapture(e.pointerId)
      dragging.value = true
    }
  }

  if (drag.axis === 'x') {
    const width = e.currentTarget.clientWidth
    dragX.value = Math.max(-width, Math.min(width, dx))
  }
}

// 충분히 밀었으면 그 방향으로 넘기고, 아니면 제자리로 돌아감
function endDrag(e, cancelled = false) {
  if (!drag || e.pointerId !== drag.id) return
  const wasDragging = drag.axis === 'x'
  drag = null
  dragging.value = false
  if (!wasDragging) return

  const threshold = Math.min(120, e.currentTarget.clientWidth * 0.2)
  let dir = 0
  if (!cancelled && dragX.value <= -threshold) dir = 1
  if (!cancelled && dragX.value >= threshold) dir = -1
  slideTo(dir)
}

/* =========================================================
 * 7. 타임라인 (크기 · 30분 눈금 · 계획 막대 위치)
 * ========================================================= */
const ROW_H = 24                          // 30분 = 24px
const SLOT_COUNT = 48                     // 24시간 / 30분 = 48칸
const TRACK_HEIGHT = ROW_H * SLOT_COUNT   // 하루 전체 세로 길이(1152px) → 넘치면 스크롤

// 왼쪽 시간 축 눈금 (00:00 ~ 23:30은 30분마다, 맨 아래는 하루의 끝 23:59)
const axisMarks = []
for (let i = 0; i < SLOT_COUNT; i++) {
  const min = i * 30
  axisMarks.push({ top: i * ROW_H, label: fmtTime(min), isHour: min % 60 === 0 })
}
axisMarks.push({ top: TRACK_HEIGHT, label: '23:59', isHour: true })

// 계획 조각 → 타임라인 안에서의 위치/크기 + 과목 색 (겹치면 줄 개수만큼 폭을 나눔)
function blockStyle({ start, end, color, lane, lanes }) {
  return {
    top: (start / 30) * ROW_H + 1 + 'px',
    height: Math.max(((end - start) / 30) * ROW_H - 2, 6) + 'px',
    left: `calc(${(lane / lanes) * 100}% + 2px)`,
    width: `calc(${100 / lanes}% - 4px)`,
    backgroundColor: color,
  }
}

// 처음 열 때: 이번 주 첫 계획 1시간 전쯤이 맨 위에 오도록 스크롤 (계획이 없으면 08:00)
const boardEl = ref(null)

watch(boardEl, el => {
  if (!el) return
  const starts = slides.value[1].days.flatMap(day => day.plans.map(plan => plan.start))
  const first = starts.length ? Math.min(...starts) : 9 * 60
  el.scrollTop = (Math.max(0, first - 60) / 30) * ROW_H
}, { flush: 'post' })

/* =========================================================
 * 8. 시간 표시 도우미
 * ========================================================= */
// 분 → "HH:MM" (예: 545 -> "09:05")
function fmtTime(min) {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`
}

// Date → "HH:MM"
function fmtClock(d) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// 하루 총 계획 시간 (예: "2시간 30분")
function dayTotal(dayPlans) {
  const min = dayPlans.reduce((sum, p) => sum + (p.end - p.start), 0)
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h && m) return `${h}시간 ${m}분`
  if (h) return `${h}시간`
  return `${m}분`
}
</script>

<template>
  <p v-if="!isLoggedIn" class="login-required-message">로그인을 해야 이용할 수 있습니다</p>
  <div
    v-else
    class="planner"
    :style="{ '--row-h': ROW_H + 'px', '--slide-duration': SLIDE_DURATION + 'ms' }"
  >
    <div class="planner-card">
      <!-- ===== 상단: 주 이동 네비게이션 (◀ 2026년 10월 5주차 ▶) ===== -->
      <div class="week-nav">
        <button class="nav-btn" type="button" aria-label="이전 주" @click="slideTo(-1)">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div class="week-label" aria-live="polite">
          <h2 class="week-title">{{ weekLabel.title }}</h2>
          <span class="week-range">{{ weekLabel.range }}</span>
        </div>

        <button class="nav-btn" type="button" aria-label="다음 주" @click="slideTo(1)">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        <button class="this-week-btn" type="button" :disabled="isThisWeek" @click="goThisWeek">
          이번 주
        </button>
      </div>

      <!-- ===== 주간 시간표 (세로로 스크롤) ===== -->
      <div ref="boardEl" class="board">
        <div class="board-inner">
          <!-- 왼쪽 시간 축: 주가 바뀌어도 그대로 -->
          <div class="axis-col">
            <div class="corner"></div>
            <div class="axis" :style="{ height: TRACK_HEIGHT + 'px' }">
              <span
                v-for="mark in axisMarks"
                :key="mark.top"
                class="axis-mark"
                :class="{ hour: mark.isHour }"
                :style="{ top: mark.top + 'px' }"
              >{{ mark.label }}</span>
            </div>
          </div>

          <!-- 슬라이드 영역: 좌우로 밀면 주가 넘어감 -->
          <div
            class="viewport"
            :class="{ dragging }"
            @pointerdown="startDrag"
            @pointermove="moveDrag"
            @pointerup="endDrag"
            @pointercancel="endDrag($event, true)"
          >
            <div
              class="track"
              :class="{ sliding }"
              :style="trackStyle"
              @transitionend="onTrackTransitionEnd"
            >
              <section
                v-for="(week, si) in slides"
                :key="week.key"
                class="slide"
                :aria-hidden="si !== 1"
              >
                <!-- 요일 헤더 (스크롤해도 위에 고정) -->
                <div class="day-heads">
                  <div
                    v-for="day in week.days"
                    :key="day.key"
                    class="day-head"
                    :class="[day.kind, { today: day.isToday }]"
                  >
                    <span class="dow">{{ day.dow }}</span>
                    <span class="dom">{{ day.date }}</span>
                    <span class="sum">{{ day.plans.length ? dayTotal(day.plans) : '' }}</span>
                  </div>
                </div>

                <!-- 요일별 계획 컬럼 (00:00 ~ 23:59, 30분 눈금) -->
                <div class="day-cols">
                  <div
                    v-for="day in week.days"
                    :key="'col-' + day.key"
                    class="day-col"
                    :class="{ today: day.isToday }"
                    :style="{ height: TRACK_HEIGHT + 'px' }"
                  >
                    <div
                      v-for="(plan, i) in day.plans"
                      :key="i"
                      class="plan-block"
                      :style="blockStyle(plan)"
                      :title="`${plan.subject}${plan.title ? ' · ' + plan.title : ''} · ${plan.time}`"
                    >
                      <span class="block-subject">{{ plan.subject }}</span>
                      <span v-if="plan.title" class="block-title">{{ plan.title }}</span>
                      <span class="block-time">{{ plan.time }}</span>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>

      <!-- ===== 하단 안내 ===== -->
      <div class="legend">
        <span class="legend-text">
          <b>◀ ▶ 버튼</b>을 누르거나 시간표를 <b>좌우로 밀면</b> 다른 주로 넘어가요 · 눈금은 <b>30분 단위</b>
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* =========================================================
 * 1. 페이지 · 카드
 * ========================================================= */
.planner {
  min-height: 100%;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 24px;
  background-color: #f6f7f9;
  color: #2b2f36;
  font-family: 'Arial', sans-serif;
}

.planner-card {
  width: 100%;
  max-width: 1100px;
  background-color: #ffffff;
  border: 1px solid #e7e9ee;
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(20, 24, 40, 0.06);
  padding: 24px 28px;
  /* 사이드바가 열리면 화면 너비와 카드 너비가 달라서, 카드 너비 기준으로 레이아웃을 바꿈 */
  container-type: inline-size;
}

/* =========================================================
 * 2. 상단 주 이동 네비게이션
 * ========================================================= */
.week-nav {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  margin-bottom: 20px;
}

.week-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 240px;
}

.week-title {
  margin: 0;
  font-size: 26px;
  font-weight: 800;
  color: #1f2430;
  white-space: nowrap;
}

.week-range {
  font-size: 13px;
  font-weight: 700;
  color: #7a8290;
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

.this-week-btn {
  position: absolute;
  right: 0;
  padding: 8px 14px;
  border: 1px solid #ff6b35;
  border-radius: 999px;
  background-color: #ffffff;
  color: #ff6b35;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}

.this-week-btn:not(:disabled):hover {
  background-color: #ff6b35;
  color: #ffffff;
}

.this-week-btn:disabled {
  border-color: #e2e5ec;
  color: #aeb4bf;
  cursor: default;
}

/* =========================================================
 * 3. 주간 시간표 (시간 축 56px + 슬라이드 영역)
 * ========================================================= */
.board {
  height: max(360px, calc(100vh - 320px));
  overflow-x: hidden;
  overflow-y: auto;
  border: 1px solid #eef0f4;
  border-radius: 12px;
  background-color: #fcfcfd;
}

.board-inner {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
}

/* 왼쪽 시간 축 */
.axis-col {
  border-right: 1px solid #eef0f4;
}

.corner {
  position: sticky;
  top: 0;
  z-index: 3;
  height: 64px;
  box-sizing: border-box;
  background-color: #ffffff;
  border-bottom: 1px solid #e3e6ec;
}

.axis {
  position: relative;
  margin: 8px 0;
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

/* =========================================================
 * 4. 슬라이드 (트랙 300% = 지난주 · 보고 있는 주 · 다음 주)
 *    overflow-x: clip → 옆 장은 잘라서 숨기되, 요일 헤더 sticky는 그대로 동작
 * ========================================================= */
.viewport {
  overflow-x: clip;
  touch-action: pan-y; /* 세로 스크롤은 브라우저가, 가로로 밀기는 JS가 처리 */
  user-select: none;
  cursor: grab;
}

.viewport.dragging {
  cursor: grabbing;
}

.track {
  display: flex;
  width: 300%;
  will-change: transform;
}

.track.sliding {
  transition: transform var(--slide-duration) cubic-bezier(0.65, 0, 0.35, 1);
}

.slide {
  flex: none;
  width: calc(100% / 3);
}

/* 요일 헤더 */
.day-heads {
  position: sticky;
  top: 0;
  z-index: 2;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  height: 64px;
  box-sizing: border-box;
  background-color: #ffffff;
  border-bottom: 1px solid #e3e6ec;
}

.day-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-width: 0;
}

.day-head + .day-head {
  border-left: 1px solid #f0f2f5;
}

.day-head .dow {
  font-size: 12px;
  font-weight: 700;
  color: #7a8290;
}

.day-head .dom {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 26px;
  height: 26px;
  padding: 0 4px;
  box-sizing: border-box;
  border-radius: 999px;
  font-size: 15px;
  font-weight: 800;
  color: #1f2430;
}

.day-head.sun .dow,
.day-head.sun .dom {
  color: #e5484d;
}

.day-head.sat .dow,
.day-head.sat .dom {
  color: #3b6fe0;
}

.day-head.today {
  background-color: #fff4ee;
}

.day-head.today .dom {
  background-color: #ff6b35;
  color: #ffffff;
}

.day-head .sum {
  min-height: 12px;
  font-size: 10px;
  font-weight: 700;
  color: #ff6b35;
  white-space: nowrap;
}

/* =========================================================
 * 5. 요일별 계획 컬럼
 * ========================================================= */
.day-cols {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  margin: 8px 0;
}

.day-col {
  position: relative;
  border-bottom: 1px solid #dde1e8;
  /* 1시간(진한 선) / 30분(연한 선) 눈금 */
  background-image:
    repeating-linear-gradient(to bottom, #dde1e8 0, #dde1e8 1px, transparent 1px, transparent calc(var(--row-h) * 2)),
    repeating-linear-gradient(to bottom, #edf0f4 0, #edf0f4 1px, transparent 1px, transparent var(--row-h));
}

.day-col + .day-col {
  border-left: 1px solid #f0f2f5;
}

.day-col.today {
  background-color: #fffaf7;
}

/* 계획 막대 (배경색은 과목 색으로 인라인 지정) */
.plan-block {
  position: absolute;
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 3px 5px;
  box-sizing: border-box;
  border-radius: 6px;
  box-shadow: 0 1px 2px rgba(20, 24, 40, 0.2);
  overflow: hidden;
  color: #ffffff;
  line-height: 1.2;
  white-space: nowrap;
}

/* 막대가 짧으면 과목 이름만 보이고 나머지는 잘림 (전체는 마우스 올리면 툴팁으로) */
.block-subject,
.block-title {
  overflow: hidden;
  text-overflow: ellipsis;
}

.block-subject {
  font-size: 11px;
  font-weight: 800;
}

.block-title {
  font-size: 10px;
}

.block-time {
  font-size: 9px;
  font-weight: 700;
  opacity: 0.9;
}

/* =========================================================
 * 6. 하단 안내
 * ========================================================= */
.legend {
  margin-top: 14px;
  text-align: center;
}

.legend-text {
  font-size: 12px;
  color: #7a8290;
}

/* =========================================================
 * 7. 좁은 화면 (카드 너비 기준)
 * ========================================================= */
@media (max-width: 640px) {
  .planner {
    padding: 8px;
  }

  .planner-card {
    padding: 16px 12px;
  }
}

@container (max-width: 600px) {
  .week-nav {
    flex-wrap: wrap;
    gap: 12px;
  }

  .week-label {
    min-width: 0;
  }

  .week-title {
    font-size: 19px;
  }

  .this-week-btn {
    position: static;
  }
}

@container (max-width: 440px) {
  .board-inner {
    grid-template-columns: 42px minmax(0, 1fr);
  }

  .axis-mark {
    right: 4px;
    font-size: 9px;
  }

  .plan-block {
    padding: 2px 3px;
  }

  .block-title,
  .block-time {
    display: none;
  }
}
</style>
