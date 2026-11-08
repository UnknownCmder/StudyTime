import { ref, watch } from 'vue'

const STORAGE_KEY = 'studytime-record-view-state'
const currentMonthStart = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1)

function readSavedState() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}')
    const savedMonth = typeof saved.month === 'string' ? new Date(`${saved.month}-01T00:00:00`) : null
    return {
      month: savedMonth && !Number.isNaN(savedMonth.getTime()) ? savedMonth : currentMonthStart(),
      week: Number.isInteger(saved.week) && saved.week >= 0 ? saved.week : null,
    }
  } catch {
    return { month: currentMonthStart(), week: null }
  }
}

// 달 이동과 주 펼치기 상태는 브라우저 세션에 보관해 페이지 이동/새로고침 후에도 복원합니다.
const savedState = readSavedState()
const selectedMonth = ref(savedState.month)
const openWeek = ref(savedState.week)

watch([selectedMonth, openWeek], ([month, week]) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      month: `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`,
      week,
    }))
  } catch {
    // 저장소를 사용할 수 없는 경우에도 현재 페이지의 반응형 상태는 유지합니다.
  }
}, { flush: 'sync' })

export function useRecordViewState() {
  return { selectedMonth, openWeek }
}

// 로그아웃하면 사용자별 화면 상태도 초기 상태로 되돌립니다.
export function resetRecordViewState() {
  selectedMonth.value = currentMonthStart()
  openWeek.value = null
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // 저장소를 사용할 수 없어도 메모리 상태는 초기화합니다.
  }
}
