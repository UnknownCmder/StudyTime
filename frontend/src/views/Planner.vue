<script setup>
// 공부 계획(플래너) 페이지 - 오른쪽 위 전환 버튼으로 두 화면을 오갑니다.
// - 월간 달력: 날짜를 누르면 그날의 계획을 고치는 창이 열립니다.
// - 주간 플래너: 일요일~토요일 한 주를 슬라이드 한 장으로 보여주고, ◀ ▶ 버튼이나 좌우로 밀어서 주를 넘깁니다.
// 아직 서버 저장은 없고, 넘겨받은 계획(없으면 샘플)을 이 화면 안에서만 고칩니다.
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

// 그 날짜의 time(HH:MM) 시각
function withTime(d, time) {
  const [h, m] = time.split(':').map(Number)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m)
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
 *    달력에서 고친 내용은 이 화면 안의 복사본에만 반영됩니다. (서버 저장은 추후 연결)
 * ========================================================= */
const props = defineProps({
  plans: { type: Array, default: undefined },
})

// 이번 주 일요일 기준 dayOffset일 뒤의 time(HH:MM) 시각 (샘플이 항상 이번 주 근처에 보이도록)
function at(dayOffset, time) {
  return withTime(addDays(thisWeekStart, dayOffset), time)
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

// 화면에서 고칠 수 있도록 복사본으로 들고 있음 (props가 바뀌면 다시 복사)
const plans = ref([...(props.plans ?? SAMPLE_PLANS)])

watch(() => props.plans, list => {
  if (list) plans.value = [...list]
})

/* =========================================================
 * 3. 과목별 색상 (공부기록 페이지와 같은 팔레트 · 같은 배정 방식)
 * ========================================================= */
const SUBJECT_COLORS = [
  '#ff6b35', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899',
  '#d97706', '#0d9488', '#6366f1', '#ef4444', '#65a30d',
]

// 과목 이름 가나다순 (수정 창의 과목 자동완성에도 사용)
const subjectNames = computed(() =>
  [...new Set(plans.value.map(p => p.subject))].sort((a, b) => a.localeCompare(b, 'ko')),
)

const subjectColor = computed(() =>
  new Map(subjectNames.value.map((name, i) => [name, SUBJECT_COLORS[i % SUBJECT_COLORS.length]])),
)

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

// "HH:MM" → 분 (예: "09:05" -> 545)
function toMinutes(time) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
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

/* =========================================================
 * 9. 월간 달력
 *    보이는 달을 포함하는 주(일~토) 단위 배열. 앞뒤 달 날짜는 inMonth: false
 * ========================================================= */
const calendarMonth = ref(new Date(today.getFullYear(), today.getMonth(), 1))

const calendarLabel = computed(() =>
  `${calendarMonth.value.getFullYear()}년 ${calendarMonth.value.getMonth() + 1}월`,
)

const calendarWeeks = computed(() => {
  const month = calendarMonth.value.getMonth()
  const weeks = []
  let cursor = startOfWeek(calendarMonth.value)

  // 다음 주 일요일이 다음 달로 넘어가면 끝
  do {
    weeks.push(DOW_LABELS.map((dow, i) => {
      const d = addDays(cursor, i)
      const key = dateKey(d)
      return {
        key,
        date: d,
        dom: d.getDate(),
        label: `${d.getMonth() + 1}월 ${d.getDate()}일 ${dow}요일`,
        inMonth: d.getMonth() === month,
        kind: i === 0 ? 'sun' : i === 6 ? 'sat' : '',
        isToday: key === todayKey,
      }
    }))
    cursor = addDays(cursor, 7)
  } while (cursor.getMonth() === month)

  return weeks
})

function changeMonth(offset) {
  const d = calendarMonth.value
  calendarMonth.value = new Date(d.getFullYear(), d.getMonth() + offset, 1)
}

/* =========================================================
 * 10. 날짜별 계획 수정 창
 *     그날 "시작하는" 계획을 고침. 고치는 동안은 draft에만 반영하고, 저장을 눌러야 plans에 들어감
 *     종료 시간이 시작 시간보다 이르면 다음 날 끝나는 계획으로 봄 (예: 23:00 ~ 00:30)
 * ========================================================= */
const editDialog = ref(null)  // 팝업 요소. 화면이 만들어지기 전에는 null
const editingDate = ref(null) // 고치고 있는 날짜
const draft = ref([])         // [{ key, source, subject, title, startTime, endTime }, ...]
const editError = ref('')
let draftKey = 0

const editingLabel = computed(() => {
  const d = editingDate.value
  if (!d) return ''
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${DOW_LABELS[d.getDay()]}) 계획`
})

function startsOn(plan, key) {
  return dateKey(new Date(plan.start)) === key
}

function openEditor(date) {
  const key = dateKey(date)
  editingDate.value = date
  draft.value = plans.value
    .filter(plan => startsOn(plan, key))
    .sort((a, b) => new Date(a.start) - new Date(b.start))
    .map(plan => ({
      key: draftKey++,
      source: plan, // 원래 계획 (저장할 때 다른 필드는 그대로 유지)
      subject: plan.subject,
      title: plan.title ?? '',
      startTime: fmtClock(new Date(plan.start)),
      endTime: fmtClock(new Date(plan.end)),
    }))
  editError.value = ''
  editDialog.value.showModal()
}

// 새 계획 줄: 마지막 계획이 끝나는 시간부터 1시간 (없으면 09:00 ~ 10:00)
function addDraftRow() {
  const startTime = draft.value.at(-1)?.endTime || '09:00'
  draft.value.push({
    key: draftKey++,
    source: null,
    subject: '',
    title: '',
    startTime,
    endTime: fmtTime((toMinutes(startTime) + 60) % 1440),
  })
}

function removeDraftRow(index) {
  draft.value.splice(index, 1)
}

function endsNextDay(row) {
  return Boolean(row.startTime && row.endTime) && row.endTime < row.startTime
}

function draftError(rows) {
  if (rows.some(row => !row.subject)) return '과목을 입력해 주세요.'
  if (rows.some(row => !row.startTime || !row.endTime)) return '시작 시간과 종료 시간을 입력해 주세요.'
  if (rows.some(row => row.startTime === row.endTime)) return '시작 시간과 종료 시간이 같은 계획이 있어요.'
  return ''
}

// 그날 시작하는 계획을 draft 내용으로 통째로 바꿈 → 주간 플래너에도 바로 반영
function saveEditor() {
  const rows = draft.value.map(row => ({ ...row, subject: row.subject.trim(), title: row.title.trim() }))
  editError.value = draftError(rows)
  if (editError.value) return

  const date = editingDate.value
  const key = dateKey(date)
  const edited = rows.map(row => ({
    ...row.source,
    subject: row.subject,
    title: row.title,
    start: withTime(date, row.startTime),
    end: withTime(endsNextDay(row) ? addDays(date, 1) : date, row.endTime),
  }))

  plans.value = [...plans.value.filter(plan => !startsOn(plan, key)), ...edited]
  editDialog.value.close()
}

// 저장하지 않고 닫음 (draft는 다음에 열 때 새로 만듦)
function closeEditor() {
  editDialog.value.close()
}

/* =========================================================
 * 11. 화면 전환 (월간 달력 / 주간 플래너)
 * ========================================================= */
const VIEWS = [
  { id: 'month', label: '월간' },
  { id: 'week', label: '주간' },
]
const view = ref('week')

function switchView(next) {
  // 슬라이드 도중 주간 화면이 사라지면 transitionend가 오지 않으므로 바로 마무리
  if (sliding.value) finishSlide()
  view.value = next
}
</script>

<template>
  <p v-if="!isLoggedIn" class="login-required-message">로그인을 해야 이용할 수 있습니다</p>
  <div
    v-else
    class="planner"
    :style="{ '--row-h': ROW_H + 'px', '--slide-duration': SLIDE_DURATION + 'ms' }"
  >
    <!-- ===== 오른쪽 위: 화면 전환 버튼 ===== -->
    <div class="view-bar">
      <div class="view-switch" role="group" aria-label="계획표 보기 전환">
        <button
          v-for="item in VIEWS"
          :key="item.id"
          type="button"
          :class="{ active: view === item.id }"
          :aria-pressed="view === item.id"
          @click="switchView(item.id)"
        >{{ item.label }}</button>
      </div>
    </div>

    <!-- ===== 월간 달력: 날짜를 누르면 그날 계획을 고치는 창이 열림 ===== -->
    <div v-if="view === 'month'" class="planner-card">
      <div class="month-nav">
        <button class="nav-btn" type="button" aria-label="이전 달" @click="changeMonth(-1)">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <h2 class="month-label">{{ calendarLabel }}</h2>

        <button class="nav-btn" type="button" aria-label="다음 달" @click="changeMonth(1)">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      <div class="calendar">
        <!-- 요일 헤더 -->
        <div class="cal-row cal-head">
          <div
            v-for="(label, i) in DOW_LABELS"
            :key="label"
            class="dow"
            :class="{ sun: i === 0, sat: i === 6 }"
          >{{ label }}</div>
        </div>

        <!-- 날짜 칸 (누르면 수정 창) -->
        <div v-for="(week, wi) in calendarWeeks" :key="wi" class="cal-row cal-week">
          <button
            v-for="day in week"
            :key="day.key"
            type="button"
            class="cal-cell"
            :class="[day.kind, { muted: !day.inMonth, today: day.isToday }]"
            :aria-label="`${day.label} 계획 수정`"
            @click="openEditor(day.date)"
          >
            <span class="dom">{{ day.dom }}</span>
          </button>
        </div>
      </div>

      <div class="legend">
        <span class="legend-text">날짜를 누르면 그날의 <b>계획을 고칠 수 있어요</b></span>
      </div>
    </div>

    <!-- ===== 주간 플래너 ===== -->
    <div v-else class="planner-card">
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

    <!-- ===== 날짜별 계획 수정 창 ===== -->
    <dialog ref="editDialog" class="edit-dialog" aria-labelledby="edit-dialog-title">
      <form class="edit-content" @submit.prevent="saveEditor">
        <h3 id="edit-dialog-title" class="edit-title">{{ editingLabel }}</h3>

        <ul v-if="draft.length" class="plan-rows">
          <li v-for="(row, i) in draft" :key="row.key" class="plan-row">
            <input
              v-model="row.subject"
              class="field subject-field"
              list="planner-subjects"
              placeholder="과목"
              aria-label="과목"
              required
            >
            <input
              v-model="row.title"
              class="field title-field"
              placeholder="할 일 (선택)"
              aria-label="할 일"
            >
            <div class="row-times">
              <input v-model="row.startTime" class="field time-field" type="time" aria-label="시작 시간" required>
              <span>~</span>
              <input v-model="row.endTime" class="field time-field" type="time" aria-label="종료 시간" required>
              <span class="next-day">{{ endsNextDay(row) ? '다음 날' : '' }}</span>
            </div>
            <button type="button" class="row-delete" aria-label="계획 삭제" title="삭제" @click="removeDraftRow(i)">×</button>
          </li>
        </ul>
        <p v-else class="edit-empty">이 날은 아직 계획이 없어요.</p>

        <button type="button" class="row-add" @click="addDraftRow">+ 계획 추가</button>

        <p v-if="editError" class="edit-error" role="alert">{{ editError }}</p>

        <div class="edit-actions">
          <button type="submit" class="save-edit">저장</button>
          <button type="button" @click="closeEditor">취소</button>
        </div>
      </form>

      <!-- 과목 입력 자동완성: 지금까지 쓴 과목 -->
      <datalist id="planner-subjects">
        <option v-for="name in subjectNames" :key="name" :value="name" />
      </datalist>
    </dialog>
  </div>
</template>

<style scoped>
/* =========================================================
 * 1. 페이지 · 카드 (전환 버튼 줄 아래에 월간 또는 주간 카드 하나)
 * ========================================================= */
.planner {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
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

/* 화면 전환 버튼 (카드 오른쪽 위에 맞춤) */
.view-bar {
  display: flex;
  justify-content: flex-end;
  width: 100%;
  max-width: 1100px;
}

.view-switch {
  display: inline-flex;
  padding: 4px;
  border: 1px solid #e2e5ec;
  border-radius: 999px;
  background-color: #ffffff;
  box-shadow: 0 2px 6px rgba(20, 24, 40, 0.04);
}

.view-switch button {
  padding: 7px 18px;
  border: 0;
  border-radius: 999px;
  background-color: transparent;
  color: #5a6472;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.view-switch button:not(.active):hover {
  color: #ff6b35;
}

.view-switch button.active {
  background-color: #ff6b35;
  color: #ffffff;
  cursor: default;
}

.view-switch button:focus-visible {
  outline: 3px solid #2563eb;
  outline-offset: 2px;
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
 * 7. 월간 달력 (공부기록 페이지 달력과 같은 모양, 날짜만 표시)
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
  min-width: 160px;
  text-align: center;
  font-size: 26px;
  font-weight: 800;
  color: #1f2430;
  white-space: nowrap;
}

.calendar {
  border: 1px solid #eef0f4;
  border-radius: 12px;
  overflow: hidden;
}

.cal-row {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

/* 요일 헤더 */
.cal-head {
  border-bottom: 1px solid #e3e6ec;
}

.cal-head .dow {
  padding: 12px 0;
  text-align: center;
  font-size: 15px;
  font-weight: 700;
  color: #7a8290;
}

.cal-head .dow.sun {
  color: #e5484d;
}

.cal-head .dow.sat {
  color: #3b6fe0;
}

.cal-week + .cal-week {
  border-top: 1px solid #eef0f4;
}

/* 날짜 칸 (버튼) */
.cal-cell {
  display: flex;
  align-items: flex-start;
  min-height: 112px;
  padding: 10px;
  border: 0;
  background-color: #ffffff;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.cal-cell + .cal-cell {
  border-left: 1px solid #f0f2f5;
}

.cal-cell:hover {
  background-color: #fff4ee;
}

.cal-cell:focus-visible {
  outline: 2px solid #ff6b35;
  outline-offset: -2px;
}

.cal-cell .dom {
  font-size: 16px;
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

.cal-cell.today:hover {
  background-color: #ffe9dd;
}

.cal-cell.today .dom {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  margin: -5px 0 0 -5px;
  border-radius: 50%;
  background-color: #ff6b35;
  color: #ffffff;
}

/* =========================================================
 * 8. 날짜별 계획 수정 창
 *    한 줄 = [과목] [할 일] [시작 ~ 종료 (다음 날)] [×]
 * ========================================================= */
.edit-dialog {
  width: min(680px, calc(100vw - 32px));
  max-height: calc(100dvh - 32px);
  margin: auto;
  padding: 28px;
  overflow-y: auto;
  border: 1px solid #e7e9ee;
  border-radius: 20px;
  background: #ffffff;
  color: #2b2f36;
  box-shadow: 0 24px 64px rgb(0 0 0 / 25%);
}

.edit-dialog::backdrop {
  background: rgb(0 0 0 / 45%);
}

.edit-content {
  display: grid;
  gap: 16px;
}

.edit-title {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  color: #1f2430;
}

.plan-rows {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.plan-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.5fr) auto 32px;
  grid-template-areas: 'subject title times delete';
  gap: 8px;
  align-items: center;
}

.subject-field {
  grid-area: subject;
}

.title-field {
  grid-area: title;
}

.row-times {
  grid-area: times;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #7a8290;
}

.field {
  height: 38px;
  min-width: 0;
  padding: 0 10px;
  border: 1px solid #d5d9e0;
  border-radius: 8px;
  background-color: #ffffff;
  color: #1f2430;
  font: inherit;
  font-size: 14px;
}

.field:focus {
  outline: none;
  border-color: #ff6b35;
  box-shadow: 0 0 0 3px rgb(255 107 53 / 18%);
}

.time-field {
  width: 112px;
  padding: 0 8px;
}

/* 자리를 항상 차지해서 '다음 날'이 생겨도 줄 정렬이 흐트러지지 않게 */
.next-day {
  width: 3.4em;
  font-size: 11px;
  font-weight: 700;
  color: #ff6b35;
  white-space: nowrap;
}

.row-delete {
  grid-area: delete;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 50%;
  background-color: transparent;
  color: #9aa1ac;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}

.row-delete:hover {
  background-color: #fdecec;
  color: #e5484d;
}

.edit-empty {
  margin: 0;
  padding: 20px 0;
  text-align: center;
  font-size: 14px;
  color: #7a8290;
}

.row-add {
  justify-self: start;
  padding: 8px 14px;
  border: 1px dashed #ff6b35;
  border-radius: 8px;
  background-color: #ffffff;
  color: #ff6b35;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.row-add:hover {
  background-color: #fff4ee;
}

.edit-error {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: #e5484d;
}

.edit-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 8px;
}

.edit-actions button {
  min-height: 48px;
  padding: 10px;
  border: 1px solid #d5d9e0;
  border-radius: 12px;
  background-color: #f5f6f7;
  color: #202428;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.edit-actions .save-edit {
  background-color: #ff6b35;
  border-color: #ff6b35;
  color: #ffffff;
}

.edit-actions button:focus-visible,
.row-add:focus-visible,
.row-delete:focus-visible {
  outline: 3px solid #2563eb;
  outline-offset: 2px;
}

/* 좁은 화면: [과목 ×] / [할 일] / [시간] 세 줄로 */
@media (max-width: 560px) {
  .edit-dialog {
    padding: 20px 16px;
  }

  .plan-row {
    grid-template-columns: minmax(0, 1fr) 32px;
    grid-template-areas:
      'subject delete'
      'title title'
      'times times';
    padding-bottom: 10px;
    border-bottom: 1px solid #eef0f4;
  }
}

/* =========================================================
 * 9. 좁은 화면 (카드 너비 기준)
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

  .week-title,
  .month-label {
    font-size: 19px;
  }

  .month-nav {
    gap: 12px;
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

  .cal-cell {
    min-height: 64px;
    padding: 6px;
  }

  .cal-cell .dom {
    font-size: 14px;
  }
}
</style>
