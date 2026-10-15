<script setup>
// 공부 기록 페이지 - "디자인(레이아웃) 우선" 버전
// 아직 실제 기능(월 이동, 데이터 연동)은 연결하지 않고 정적 화면만 구성합니다.

// 상단에 표시할 월 (임시 값 - 2026년 7월 기준)
const currentMonth = 7

// --- 타임라인 크기 상수 ---
const ROW_H = 24                 // 30분 = 24px
const SLOT_COUNT = 48            // 24시간 / 30분 = 48칸
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

// 요일별 공부 기록 (2026년 7월 5일~11일 주 예시)
// sessions: [시작(분), 끝(분)] - 자정 기준 실제 시각 그대로 (30분에 맞추지 않음)
const days = [
  { label: '일', date: 5, kind: 'sun', sessions: [[840, 990], [1230, 1305]] },
  { label: '월', date: 6, kind: '', sessions: [[500, 540], [1170, 1325]] },
  { label: '화', date: 7, kind: '', sessions: [[465, 510], [780, 870], [1260, 1390]] },
  { label: '수', date: 8, kind: '', sessions: [[1335, 1425]] },
  { label: '목', date: 9, kind: '', sessions: [[545, 700], [920, 1010]], isToday: true },
  { label: '금', date: 10, kind: '', sessions: [[1120, 1165]] },
  { label: '토', date: 11, kind: 'sat', sessions: [[600, 800], [960, 1110], [1320, 1439]] },
]

// [시작, 끝] → 타임라인 안에서의 위치/높이(px)
function blockStyle([start, end]) {
  return {
    top: (start / 30) * ROW_H + 'px',
    height: ((end - start) / 30) * ROW_H + 'px',
  }
}

// 분 → "HH:MM" (예: 545 -> "09:05")
function fmtTime(min) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// 하루 총 공부 시간
function dayTotal(sessions) {
  const min = sessions.reduce((sum, [s, e]) => sum + (e - s), 0)
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h && m) return `${h}시간 ${m}분`
  if (h) return `${h}시간`
  return `${m}분`
}
</script>

<template>
  <div class="record">
    <div class="record-card">
      <!-- 상단: 월 이동 네비게이션 (◀ 7월 ▶) -->
      <div class="month-nav">
        <button class="nav-btn" type="button" aria-label="이전 달">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <h2 class="month-label">{{ currentMonth }}월</h2>

        <button class="nav-btn" type="button" aria-label="다음 달">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      <!-- 요일별 24시간 타임라인 (세로로 스크롤) -->
      <div class="timeline-scroll">
        <div class="timeline">
          <!-- 헤더 행 (스크롤해도 상단 고정) -->
          <div class="head axis-corner"></div>
          <div
            v-for="day in days"
            :key="day.date"
            class="head day-head"
            :class="[day.kind, { today: day.isToday }]"
          >
            <span class="dow">{{ day.label }}</span>
            <span class="dom">{{ day.date }}</span>
            <span class="sum">{{ dayTotal(day.sessions) }}</span>
          </div>

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
            v-for="day in days"
            :key="'col-' + day.date"
            class="day-col"
            :class="{ today: day.isToday }"
            :style="{ height: TRACK_HEIGHT + 'px' }"
          >
            <div
              v-for="(session, i) in day.sessions"
              :key="i"
              class="study-block"
              :style="blockStyle(session)"
              :title="`${fmtTime(session[0])} ~ ${fmtTime(session[1])}`"
            >
              <span class="block-label">{{ fmtTime(session[0]) }}~{{ fmtTime(session[1]) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 범례 -->
      <div class="legend">
        <span class="legend-text">
          왼쪽 눈금은 <b>30분 단위</b> · 막대는 실제 공부한 시간 그대로 · 아래로 스크롤하면 24시간 전체를 볼 수 있어요
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* --- 페이지 배경 --- */
.record {
  min-height: 100%;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 24px;
  background-color: #f6f7f9;
  color: #2b2f36;
  font-family: 'Arial', sans-serif;
}

/* --- 기록 카드 --- */
.record-card {
  width: 100%;
  max-width: 820px;
  background-color: #ffffff;
  border: 1px solid #e7e9ee;
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(20, 24, 40, 0.06);
  padding: 24px 28px 24px;
}

/* --- 상단 월 이동 네비게이션 --- */
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

/* --- 스크롤 영역 --- */
.timeline-scroll {
  max-height: 460px;
  overflow-y: auto;
  border: 1px solid #eef0f4;
  border-radius: 12px;
}

/* --- 타임라인 그리드 (시간축 56px + 요일 7칸) --- */
.timeline {
  display: grid;
  grid-template-columns: 56px repeat(7, 1fr);
}

/* 헤더 행 (스크롤 시 상단 고정) */
.head {
  position: sticky;
  top: 0;
  z-index: 2;
  background-color: #ffffff;
  border-bottom: 1px solid #e3e6ec;
}

.axis-corner {
  border-right: 1px solid #eef0f4;
}

.day-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: 8px 2px;
  border-left: 1px solid #f0f2f5;
}

.day-head .dow {
  font-size: 13px;
  font-weight: 700;
  color: #7a8290;
}

.day-head.sun .dow {
  color: #e5484d;
}

.day-head.sat .dow {
  color: #3b6fe0;
}

.day-head .dom {
  font-size: 12px;
  font-weight: 700;
  color: #4b5563;
}

.day-head .sum {
  margin-top: 2px;
  font-size: 10px;
  font-weight: 700;
  color: #ff6b35;
}

.day-head.today {
  background-color: #fff4ee;
}

/* --- 왼쪽 시간 축 --- */
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

/* --- 요일별 컬럼 --- */
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

/* 실제 공부한 시간 막대 */
.study-block {
  position: absolute;
  left: 3px;
  right: 3px;
  border-radius: 4px;
  background: linear-gradient(180deg, #ff7a45, #ff5722);
  box-shadow: 0 1px 2px rgba(255, 87, 34, 0.25);
  overflow: hidden;
}

.block-label {
  display: block;
  padding: 2px 4px;
  font-size: 9px;
  line-height: 1.2;
  font-weight: 700;
  color: #ffffff;
  white-space: nowrap;
}

/* --- 범례 --- */
.legend {
  margin-top: 14px;
  text-align: center;
}

.legend-text {
  font-size: 12px;
  color: #7a8290;
}
</style>
