<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useAuth } from '../composables/useAuth'

// 로그인 상태를 확인하고 비로그인 사용자에게는 계획 대신 안내 문구를 표시합니다.
const { isLoggedIn, fetchLoginStatus } = useAuth()

// 화면 모드, 기준 날짜, 서버에서 받은 데이터와 요청 상태를 관리합니다.
const view = ref('weekly')
const selectedDate = ref(new Date())
const subjects = ref([])
const weeklyPlans = ref([])
const dailyPlans = ref([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const dialog = ref(null)
const dailyDeleteDialog = ref(null)
const selectedDailyPlan = ref(null)
const isDeletingDailyPlan = ref(false)
const planDetailDialog = ref(null)
const selectedWeeklyPlan = ref(null)
const isDeletingPlan = ref(false)
const form = ref({ subject_id: '', day_of_week: new Date().getDay(), start_time: '', end_time: '', detail: '' })
const days = ['일', '월', '화', '수', '목', '금', '토'] //데이터베스에서는 0(일요일)~6(토요일)으로 요일을 표현
const today = new Date()

// API 요청에 사용할 날짜 키와 화면에 표시할 날짜·주간 범위를 계산합니다.
const dateKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const dateLabel = computed(() => new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
}).format(selectedDate.value))
const weekLabel = computed(() => {
    const start = weekStart(selectedDate.value)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    const format = date => `${date.getMonth() + 1}.${date.getDate()}`
    const endYear = end.getFullYear() === start.getFullYear() ? '' : `${end.getFullYear()}년 `
    return `${start.getFullYear()}년 ${format(start)} – ${endYear}${format(end)}`
})
// 과목 ID로 색상과 과목명을 바로 찾고, 주간 계획은 요일별·시작 시간순으로 묶습니다.
const subjectMap = computed(() => new Map(subjects.value.map(subject => [Number(subject.id), subject])))
const weeklyByDay = computed(() => Array.from({ length: 7 }, (_, day) => weeklyPlans.value
    .filter(plan => Number(plan.day_of_week) === day)
    .sort((a, b) => a.start_time.localeCompare(b.start_time))))

// RecordView와 같은 방식으로 하루를 30분 단위의 48개 칸으로 구성합니다.
const ROW_HEIGHT = 45
const SLOT_COUNT = 48
const TRACK_HEIGHT = ROW_HEIGHT * SLOT_COUNT
const timeMarks = Array.from({ length: SLOT_COUNT + 1 }, (_, index) => {
    const minutes = index * 30
    return {
        top: index * ROW_HEIGHT,
        label: `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`,
        isHour: minutes % 60 === 0,
    }
})

function weekStart(date) {
    // 선택한 날짜가 속한 일요일을 계산해 주간 기준 날짜로 사용합니다.
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    start.setDate(start.getDate() - start.getDay())
    return start
}

function timeLabel(value) {
    // DB 시간 문자열에서 시:분만 추려 화면에 표시합니다.
    return String(value).slice(0, 5)
}

function planBlockStyle(plan) {
    const [startHour, startMinute] = plan.start_time.split(':').map(Number)
    const [endHour, endMinute] = plan.end_time.split(':').map(Number)
    const start = startHour * 60 + startMinute
    const end = endHour * 60 + endMinute
    return {
        top: `${(start / 30) * ROW_HEIGHT}px`,
        height: `${Math.max(1, ((end - start) / 30) * ROW_HEIGHT)}px`,
        '--plan-color': subjectMap.value.get(Number(plan.subject_id))?.subject_color || '#6366f1',
    }
}

function moveDate(amount) {
    // 주간 보기에서는 7일, 일간 보기에서는 1일씩 기준 날짜를 이동합니다.
    const next = new Date(selectedDate.value)
    next.setDate(next.getDate() + amount * (view.value === 'weekly' ? 7 : 1))
    selectedDate.value = next
    loadPlans()
}

function openAdd() {
    // 새 계획 입력을 위해 폼을 초기화하고 네이티브 모달을 엽니다.
    error.value = ''
    form.value = {
        subject_id: subjects.value[0]?.id ?? '',
        day_of_week: new Date().getDay(),
        start_time: '',
        end_time: '',
        detail: '',
    }
    dialog.value?.showModal()
}

function closeDialog() {
    dialog.value?.close()
}

// 주간 막대를 클릭하면 선택한 계획의 상세 정보를 표시합니다.
function openWeeklyPlanDetails(plan) {
    selectedWeeklyPlan.value = plan
    error.value = ''
    planDetailDialog.value?.showModal()
}

function closeWeeklyPlanDetails() {
    planDetailDialog.value?.close()
    selectedWeeklyPlan.value = null
}

// 일별 계획의 삭제 버튼은 먼저 확인 팝업을 엽니다.
function confirmDailyPlanDeletion(plan) {
    selectedDailyPlan.value = plan
    error.value = ''
    dailyDeleteDialog.value?.showModal()
}

function closeDailyDeleteDialog() {
    dailyDeleteDialog.value?.close()
    selectedDailyPlan.value = null
}

async function request(url, options = {}) {
    // 세션 쿠키를 포함해 API를 호출하고, 서버 오류 메시지를 화면에 전달합니다.
    const headers = options.body ? { 'Content-Type': 'application/json' } : {}
    const response = await fetch(url, {
        credentials: 'include',
        ...options,
        headers: { ...headers, ...options.headers },
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.message || '요청을 처리하지 못했습니다.')
    return data
}

async function loadPlans() {
    // 현재 날짜의 주간 반복 계획과 날짜별 계획을 동시에 가져옵니다.
    if (!isLoggedIn.value) return
    loading.value = true
    error.value = ''
    try {
        const [weekly, daily] = await Promise.all([
            request('/api/studyPlan/weekly'),
            request(`/api/studyPlan/daily?date=${dateKey(selectedDate.value)}`),
        ])
        weeklyPlans.value = weekly
        dailyPlans.value = daily
    } catch (err) {
        error.value = err.message || '계획을 불러오지 못했습니다.'
    } finally {
        loading.value = false
    }
}

async function loadSubjects() {
    // 등록된 과목을 읽어 계획 추가 폼의 선택 목록에 사용합니다.
    try {
        subjects.value = await request('/api/studyRecord/subjects')
    } catch (err) {
        error.value = err.message || '과목을 불러오지 못했습니다.'
    }
}

async function savePlan() {
    // 현재 보기 모드에 따라 주간 또는 날짜별 계획을 생성합니다.
    if (!form.value.subject_id
        || (view.value === 'weekly' && (!form.value.start_time || !form.value.end_time))
        || (view.value === 'daily' && !form.value.detail.trim())) {
        error.value = view.value === 'weekly'
            ? '과목과 시작·종료 시간을 입력해주세요.'
            : '과목과 세부 내용을 입력해주세요.'
        return
    }

    saving.value = true
    error.value = ''
    try {
        if (view.value === 'weekly') {
            await request('/api/studyPlan/weekly', {
                method: 'POST',
                body: JSON.stringify({
                    subject_id: Number(form.value.subject_id),
                    day_of_week: Number(form.value.day_of_week),
                    start_time: form.value.start_time,
                    end_time: form.value.end_time,
                }),
            })
        } else {
            await request('/api/studyPlan/daily', {
                method: 'POST',
                body: JSON.stringify({
                    subject_id: Number(form.value.subject_id),
                    plan_date: dateKey(selectedDate.value),
                    detail: form.value.detail,
                }),
            })
        }
        closeDialog()
        await loadPlans()
    } catch (err) {
        error.value = err.message || '계획을 저장하지 못했습니다.'
    } finally {
        saving.value = false
    }
}

// 확인 팝업에서 삭제를 선택한 경우에만 일별 계획을 삭제합니다.
async function deleteSelectedDailyPlan() {
    if (!selectedDailyPlan.value) return
    isDeletingDailyPlan.value = true
    error.value = ''
    try {
        await request(`/api/studyPlan/daily/${selectedDailyPlan.value.id}`, { method: 'DELETE' })
        closeDailyDeleteDialog()
        await loadPlans()
    } catch (err) {
        error.value = err.message || '계획을 삭제하지 못했습니다.'
    } finally {
        isDeletingDailyPlan.value = false
    }
}

// 상세 모달에서 선택한 주간 계획을 삭제하고 최신 목록을 다시 불러옵니다.
async function deleteSelectedWeeklyPlan() {
    if (!selectedWeeklyPlan.value) return
    isDeletingPlan.value = true
    error.value = ''
    try {
        await request(`/api/studyPlan/weekly/${selectedWeeklyPlan.value.id}`, { method: 'DELETE' })
        closeWeeklyPlanDetails()
        await loadPlans()
    } catch (err) {
        error.value = err.message || '계획을 삭제하지 못했습니다.'
    } finally {
        isDeletingPlan.value = false
    }
}

async function toggleDone(plan) {
    // 날짜별 계획의 완료 여부를 서버에 저장하고 화면 상태를 반영합니다.
    try {
        await request(`/api/studyPlan/daily/${plan.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ isDone: !plan.isDone }),
        })
        plan.isDone = !plan.isDone
    } catch (err) {
        error.value = err.message || '완료 상태를 변경하지 못했습니다.'
    }
}

async function showDatePicker() {
    // 날짜를 입력받고 실제 날짜인지 확인한 뒤 해당 날짜의 계획을 표시합니다.
    const date = window.prompt('이동할 날짜를 입력해주세요 (YYYY-MM-DD)', dateKey(selectedDate.value))
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return
    const parsed = new Date(`${date}T12:00:00`)
    if (Number.isNaN(parsed.getTime()) || dateKey(parsed) !== date) return
    selectedDate.value = parsed
    await loadPlans()
}

onMounted(async () => {
    // 화면 진입 시 로그인 확인 후 과목과 계획 데이터를 불러옵니다.
    try {
        if (await fetchLoginStatus()) {
            await loadSubjects()
            await loadPlans()
        }
    } catch (err) {
        error.value = err.message || '로그인 상태를 확인하지 못했습니다.'
    }
})

onUnmounted(() => {
    // 화면을 벗어날 때 열린 모달이 있으면 정리합니다.
    if (dialog.value?.open) dialog.value.close()
    if (dailyDeleteDialog.value?.open) dailyDeleteDialog.value.close()
    if (planDetailDialog.value?.open) planDetailDialog.value.close()
})
</script>

<template>
    <!-- 비로그인 상태 안내와 로그인 사용자용 플래너 화면을 전환합니다. -->
    <p v-if="!isLoggedIn" class="login-required-message">로그인을 해야 이용할 수 있습니다</p>
    <main v-else class="plan-page">
        <header class="plan-header">
            <div>
                <p class="eyebrow">STUDY PLANNER</p>
                <h1>플래너 계획</h1>
            </div>
            <!-- 주간 반복 계획과 특정 날짜 계획 사이를 전환합니다. -->
            <div class="view-switch" role="tablist" aria-label="계획 보기">
                <button
                    :class="{ active: view === 'weekly' }"
                    role="tab"
                    :aria-selected="view === 'weekly'"
                    @click="view = 'weekly'; loadPlans()"
                >주별 계획</button>
                <button
                    :class="{ active: view === 'daily' }"
                    role="tab"
                    :aria-selected="view === 'daily'"
                    @click="view = 'daily'; loadPlans()"
                >일별 계획</button>
            </div>
        </header>

        <section class="plan-card">
            <!-- 일별 보기에서만 날짜를 이동하거나 직접 선택할 수 있습니다. -->
            <div v-if="view === 'daily'" class="period-nav">
                <button class="arrow-button rainbow-btn" aria-label="이전" @click="moveDate(-1)">‹</button>
                <button class="period-title" @click="showDatePicker">
                    {{ view === 'weekly' ? weekLabel : dateLabel }}
                    <span class="calendar-mark">▦</span>
                </button>
                <button class="arrow-button rainbow-btn" aria-label="다음" @click="moveDate(1)">›</button>
                <button class="today-button rainbow-btn" @click="selectedDate = new Date(); loadPlans()">오늘</button>
            </div>

            <p v-if="error" class="plan-error" role="alert">{{ error }}</p>
            <p v-if="loading" class="plan-empty" role="status">계획을 불러오는 중입니다.</p>

            <!-- 주간 보기: 30분 눈금의 시간표에 계획을 시간 막대로 표시합니다. -->
            <template v-else-if="view === 'weekly'">
                <div class="weekly-timetable-scroll">
                    <div class="weekly-timetable" :style="{ '--row-height': ROW_HEIGHT + 'px', '--hour-height': ROW_HEIGHT * 2 + 'px' }">
                        <div class="time-axis" :style="{ height: TRACK_HEIGHT + 'px' }">
                            <span
                                v-for="mark in timeMarks"
                                :key="mark.top"
                                class="time-mark"
                                :class="{ hour: mark.isHour }"
                                :style="{ top: mark.top + 'px' }"
                            >{{ mark.label }}</span>
                        </div>
                        <section
                            v-for="(dayPlans, index) in weeklyByDay"
                            :key="index"
                            class="timetable-day"
                            :class="{ today: index === today.getDay() }"
                            :style="{ height: TRACK_HEIGHT + 'px' }"
                        >
                            <h2>{{ days[index] }}</h2>
                            <article
                                v-for="plan in dayPlans"
                                :key="plan.id"
                                class="weekly-plan-block"
                                :style="planBlockStyle(plan)"
                                :title="`${subjectMap.get(Number(plan.subject_id))?.subject_name || plan.subject_name} · ${timeLabel(plan.start_time)}–${timeLabel(plan.end_time)}`"
                                role="button"
                                tabindex="0"
                                @click="openWeeklyPlanDetails(plan)"
                                @keydown.enter.space.prevent="openWeeklyPlanDetails(plan)"
                            >
                                <strong>{{ subjectMap.get(Number(plan.subject_id))?.subject_name || plan.subject_name }}</strong>
                                <span>{{ timeLabel(plan.start_time) }}–{{ timeLabel(plan.end_time) }}</span>
                            </article>
                        </section>
                    </div>
                </div>
            </template>

            <!-- 일간 보기: 체크박스로 완료 상태를 바꾸고 계획을 삭제할 수 있습니다. -->
            <template v-else>
                <div class="daily-list">
                    <div v-if="!dailyPlans.length" class="daily-empty">
                        <span class="empty-icon">✦</span>
                        <strong>아직 등록된 계획이 없어요</strong>
                        <span>오른쪽 아래 + 버튼을 눌러 오늘의 계획을 추가해보세요.</span>
                    </div>
                    <article
                        v-for="plan in dailyPlans"
                        :key="plan.id"
                        class="daily-item"
                        :class="{ done: plan.isDone }"
                        :style="{
                            '--plan-color': subjectMap.get(Number(plan.subject_id))?.subject_color || '#6366f1',
                        }"
                    >
                        <input
                            type="checkbox"
                            :checked="Boolean(plan.isDone)"
                            :aria-label="`${plan.subject_name} 완료`"
                            @change="toggleDone(plan)"
                        >
                        <div class="daily-subject">
                            <strong>{{ plan.subject_name }}</strong>
                            <span v-if="plan.detail">{{ plan.detail }}</span>
                        </div>
                        <button
                            class="delete-button"
                            aria-label="계획 삭제"
                            @click="confirmDailyPlanDeletion(plan)"
                        >×</button>
                    </article>
                </div>
            </template>

            <!-- 현재 보기 모드에 맞는 계획을 추가하는 모달을 엽니다. -->
            <button class="add-button rainbow-btn" aria-label="계획 추가" @click="openAdd">+</button>
        </section>

        <dialog
            ref="dialog"
            class="plan-dialog"
            @click="$event.target === $event.currentTarget && closeDialog()"
        >
            <form @submit.prevent="savePlan">
                <div class="dialog-heading">
                    <div>
                        <p class="eyebrow">NEW PLAN</p>
                        <h2>{{ view === 'weekly' ? `${days[selectedDate.getDay()]}요일 계획 추가` : '일별 계획 추가' }}</h2>
                    </div>
                    <button
                        type="button"
                        class="dialog-close"
                        aria-label="닫기"
                        @click="closeDialog"
                    >×</button>
                </div>

                <label>
                    과목 선택
                    <select v-model="form.subject_id" required>
                        <option value="" disabled>과목을 선택하세요</option>
                        <option v-for="subject in subjects" :key="subject.id" :value="subject.id">
                            {{ subject.subject_name }}
                        </option>
                    </select>
                </label>
                <label v-if="view === 'weekly'">
                    요일 선택
                    <select v-model.number="form.day_of_week" required>
                        <option v-for="(day, index) in days" :key="day" :value="index">{{ day }}요일</option>
                    </select>
                </label>
                <div v-if="view === 'weekly'" class="time-fields">
                    <label>시작 시간<input v-model="form.start_time" type="time" required></label>
                    <label>끝 시간<input v-model="form.end_time" type="time" required></label>
                </div>
                <label v-if="view === 'daily'">
                    세부 내용
                    <input
                        v-model="form.detail"
                        type="text"
                        maxlength="100"
                        placeholder="오늘 할 일을 적어주세요"
                    >
                </label>
                <p v-if="view === 'daily'" class="selected-date">{{ dateLabel }}</p>
                <p v-if="error" class="plan-error" role="alert">{{ error }}</p>
                <div class="dialog-actions">
                    <button type="button" class="cancel-button" @click="closeDialog">취소</button>
                    <button class="save-button" :disabled="saving || !subjects.length">
                        {{ saving ? '저장 중…' : '저장' }}
                    </button>
                </div>
            </form>
        </dialog>

        <dialog
            ref="dailyDeleteDialog"
            class="plan-dialog plan-confirm-dialog"
            aria-labelledby="daily-delete-title"
            @click="$event.target === $event.currentTarget && closeDailyDeleteDialog()"
        >
            <h2 id="daily-delete-title">정말 삭제하시겠습니까?</h2>
            <p v-if="selectedDailyPlan" class="delete-plan-description">
                {{ selectedDailyPlan.subject_name }} 계획을 삭제합니다.
            </p>
            <p v-if="error" class="plan-error" role="alert">{{ error }}</p>
            <div class="dialog-actions">
                <button class="delete-plan-button" :disabled="isDeletingDailyPlan" @click="deleteSelectedDailyPlan">
                    {{ isDeletingDailyPlan ? '삭제 중…' : '삭제' }}
                </button>
                <button class="cancel-button" :disabled="isDeletingDailyPlan" @click="closeDailyDeleteDialog">취소</button>
            </div>
        </dialog>

        <dialog
            ref="planDetailDialog"
            class="plan-dialog plan-detail-dialog"
            aria-labelledby="plan-detail-title"
            @click="$event.target === $event.currentTarget && closeWeeklyPlanDetails()"
        >
            <template v-if="selectedWeeklyPlan">
                <div class="dialog-heading">
                    <div>
                        <p class="eyebrow">WEEKLY PLAN</p>
                        <h2 id="plan-detail-title">계획 상세 정보</h2>
                    </div>
                    <button type="button" class="dialog-close" aria-label="닫기" @click="closeWeeklyPlanDetails">×</button>
                </div>
                <dl class="plan-details">
                    <dt>과목</dt>
                    <dd>
                        <span class="detail-subject-color" :style="{ backgroundColor: subjectMap.get(Number(selectedWeeklyPlan.subject_id))?.subject_color || '#6366f1' }"></span>
                        {{ subjectMap.get(Number(selectedWeeklyPlan.subject_id))?.subject_name || selectedWeeklyPlan.subject_name }}
                    </dd>
                    <dt>요일</dt>
                    <dd>{{ days[Number(selectedWeeklyPlan.day_of_week)] }}요일</dd>
                    <dt>시간</dt>
                    <dd>{{ timeLabel(selectedWeeklyPlan.start_time) }} – {{ timeLabel(selectedWeeklyPlan.end_time) }}</dd>
                </dl>
                <p v-if="error" class="plan-error" role="alert">{{ error }}</p>
                <div class="dialog-actions">
                    <button class="delete-plan-button" :disabled="isDeletingPlan" @click="deleteSelectedWeeklyPlan">
                        {{ isDeletingPlan ? '삭제 중…' : '삭제' }}
                    </button>
                    <button class="cancel-button" :disabled="isDeletingPlan" @click="closeWeeklyPlanDetails">취소</button>
                </div>
            </template>
        </dialog>
    </main>
</template>

<style scoped>
/* 플래너 페이지의 카드와 입력 요소에만 적용되는 화면 스타일입니다. */
.plan-page {
    max-width: 1120px;
    margin: 0 auto;
    padding: 28px 24px 48px;
    color: var(--text-color);
}

.plan-header {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 24px;
}

.eyebrow {
    margin: 0 0 6px;
    color: var(--primary-color);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: .14em;
}

.plan-header h1 {
    margin: 0;
    font-size: 30px;
    letter-spacing: -.04em;
}

.view-switch {
    display: flex;
    padding: 4px;
    border: 1px solid color-mix(in srgb, var(--text-color) 12%, transparent);
    border-radius: 12px;
    background: var(--surface-color);
}

.view-switch button,
.today-button {
    border: 0;
    border-radius: 9px;
    padding: 9px 16px;
    background: transparent;
    color: color-mix(in srgb, var(--text-color) 65%, transparent);
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
}

.view-switch button.active {
    background: var(--primary-color);
    color: #fff;
    box-shadow: 0 3px 10px color-mix(in srgb, var(--primary-color) 28%, transparent);
}

.plan-card {
    position: relative;
    min-height: 510px;
    padding: 22px;
    border: 1px solid color-mix(in srgb, var(--text-color) 12%, transparent);
    border-radius: 18px;
    background: var(--stopwatch-shell-background);
    box-shadow: 0 12px 36px rgba(0, 0, 0, .09);
}

.period-nav {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
    margin: 0 auto 24px;
}

.arrow-button {
    width: 36px;
    height: 36px;
    border: 0;
    border-radius: 10px;
    background: transparent;
    color: var(--text-color);
    font-size: 25px;
    line-height: 1;
    cursor: pointer;
}

.period-title {
    display: flex;
    align-items: center;
    gap: 9px;
    border: 0;
    background: transparent;
    color: var(--text-color);
    font-size: 18px;
    font-weight: 800;
    cursor: pointer;
}

.calendar-mark {
    color: var(--primary-color);
    font-size: 17px;
}

.today-button {
    border: 0;
    background: transparent;
    color: var(--text-color);
}

/* 무지개 테두리 안쪽은 각 버튼의 원래 배경색을 유지합니다. */
.arrow-button.rainbow-btn,
.today-button.rainbow-btn,
.add-button.rainbow-btn {
    box-sizing: border-box;
    padding: 3px;
    border: 0;
    background: var(--rainbow-border-gradient);
}

.today-button.rainbow-btn {
    min-width: 58px;
    min-height: 40px;
    padding: 6px 14px;
}

.weekly-timetable-scroll {
    max-height: 620px;
    overflow: auto;
    border: 1px solid color-mix(in srgb, var(--text-color) 14%, transparent);
    border-radius: 12px;
}

.weekly-timetable {
    display: grid;
    grid-template-columns: 58px repeat(7, minmax(90px, 1fr));
    min-width: 760px;
    padding-top: 34px;
    background: var(--stopwatch-shell-background);
}

.time-axis,
.timetable-day {
    position: relative;
    background-color: transparent;
    background-image:
        repeating-linear-gradient(to bottom, color-mix(in srgb, var(--text-color) 16%, transparent) 0, color-mix(in srgb, var(--text-color) 16%, transparent) 1px, transparent 1px, transparent var(--hour-height)),
        repeating-linear-gradient(to bottom, color-mix(in srgb, var(--text-color) 8%, transparent) 0, color-mix(in srgb, var(--text-color) 8%, transparent) 1px, transparent 1px, transparent var(--row-height));
}

.time-axis {
    border-right: 1px solid color-mix(in srgb, var(--text-color) 16%, transparent);
}

.time-mark {
    position: absolute;
    right: 6px;
    transform: translateY(-50%);
    color: color-mix(in srgb, var(--text-color) 48%, transparent);
    font-size: 10px;
    white-space: nowrap;
}

.time-mark.hour {
    color: color-mix(in srgb, var(--text-color) 76%, transparent);
    font-weight: 700;
}

.timetable-day {
    border-left: 1px solid color-mix(in srgb, var(--text-color) 12%, transparent);
}

.timetable-day.today {
    background-color: color-mix(in srgb, var(--primary-color) 5%, transparent);
}

.timetable-day h2 {
    position: sticky;
    z-index: 2;
    top: 0;
    height: 34px;
    margin: -34px 0 0;
    padding-top: 9px;
    background: var(--stopwatch-shell-background);
    text-align: center;
    font-size: 13px;
}

.timetable-day:first-of-type h2 {
    color: #e5484d;
}

.timetable-day:last-of-type h2 {
    color: #3b6fe0;
}

.weekly-plan-block {
    position: absolute;
    right: 3px;
    left: 3px;
    z-index: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow: hidden;
    padding: 4px;
    border-left: 3px solid var(--plan-color);
    border-radius: 5px;
    background: color-mix(in srgb, var(--plan-color) 26%, var(--surface-color));
    color: var(--text-color);
    font-size: 10px;
    line-height: 1.2;
}

.weekly-plan-block strong,
.weekly-plan-block span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.weekly-plan-block:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 1px;
}

.delete-button {
    flex: none;
    border: 0;
    background: transparent;
    color: color-mix(in srgb, var(--text-color) 50%, transparent);
    font-size: 20px;
    line-height: 1;
    cursor: pointer;
}

.delete-button:hover {
    color: #ef4444;
}

.daily-list {
    display: grid;
    gap: 10px;
    max-width: 760px;
    margin: 0 auto;
    padding: 8px 0 60px;
    border-radius: 12px;
    background: var(--stopwatch-shell-background);
}

.daily-empty {
    display: grid;
    justify-items: center;
    gap: 10px;
    padding: 90px 20px;
    color: color-mix(in srgb, var(--text-color) 56%, transparent);
    text-align: center;
}

.daily-empty strong {
    color: var(--text-color);
    font-size: 17px;
}

.daily-empty > span:last-child {
    font-size: 13px;
}

.empty-icon {
    color: var(--primary-color);
    font-size: 30px;
}

.daily-item {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 15px 16px;
    border: 1px solid color-mix(in srgb, var(--text-color) 12%, transparent);
    border-left: 4px solid var(--plan-color);
    border-radius: 12px;
    background: color-mix(in srgb, var(--plan-color) 26%, var(--surface-color));
}

.daily-item input {
    width: 18px;
    height: 18px;
    accent-color: var(--primary-color);
}

.daily-subject {
    display: grid;
    flex: 1;
    gap: 4px;
    min-width: 0;
}

.daily-subject strong {
    font-size: 14px;
}

.daily-subject span {
    overflow: hidden;
    color: color-mix(in srgb, var(--text-color) 58%, transparent);
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.daily-time {
    color: color-mix(in srgb, var(--text-color) 68%, transparent);
    font-size: 12px;
    white-space: nowrap;
}

.daily-item.done .daily-subject {
    text-decoration: line-through;
    opacity: .55;
}

.add-button {
    position: absolute;
    right: 24px;
    bottom: 22px;
    width: 52px;
    height: 52px;
    border: 0;
    border-radius: 17px;
    background: transparent;
    color: #fff;
    font-size: 31px;
    line-height: 1;
    box-shadow: 0 8px 20px color-mix(in srgb, var(--primary-color) 35%, transparent);
    cursor: pointer;
    transition: transform .15s;
}

.add-button:hover {
    transform: translateY(-2px);
}

.plan-error {
    margin: 0 0 14px;
    color: #ef4444;
    font-size: 13px;
}

.plan-dialog {
    width: min(440px, calc(100vw - 28px));
    padding: 0;
    border: 1px solid color-mix(in srgb, var(--text-color) 15%, transparent);
    border-radius: 18px;
    background: var(--surface-color);
    color: var(--text-color);
    box-shadow: 0 24px 70px rgba(0, 0, 0, .3);
}

.plan-dialog::backdrop {
    background: rgba(0, 0, 0, .55);
    backdrop-filter: blur(3px);
}

.plan-dialog form {
    padding: 24px;
}

.dialog-heading {
    display: flex;
    align-items: start;
    justify-content: space-between;
    margin-bottom: 24px;
}

.dialog-heading h2 {
    margin: 0;
    font-size: 21px;
}

.dialog-close {
    border: 0;
    background: transparent;
    color: var(--text-color);
    font-size: 26px;
    cursor: pointer;
}

.plan-dialog label {
    display: grid;
    gap: 8px;
    margin-bottom: 18px;
    font-size: 13px;
    font-weight: 700;
}

.plan-dialog select,
.plan-dialog input {
    box-sizing: border-box;
    width: 100%;
    height: 44px;
    padding: 0 12px;
    border: 1px solid color-mix(in srgb, var(--text-color) 18%, transparent);
    border-radius: 9px;
    background: var(--bg-color);
    color: var(--text-color);
    font: inherit;
}

.time-fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
}

.selected-date {
    margin: -4px 0 16px;
    color: color-mix(in srgb, var(--text-color) 58%, transparent);
    font-size: 12px;
}

.dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 22px;
}

.dialog-actions button {
    min-width: 90px;
    height: 40px;
    border-radius: 9px;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
}

.plan-details {
    display: grid;
    grid-template-columns: 72px minmax(0, 1fr);
    gap: 12px 10px;
    margin: 0;
}

.plan-detail-dialog {
    padding: 24px;
}

.plan-confirm-dialog {
    padding: 24px;
}

.plan-confirm-dialog h2 {
    margin: 0;
    font-size: 20px;
}

.delete-plan-description {
    margin: 12px 0 0;
    color: color-mix(in srgb, var(--text-color) 68%, transparent);
}

.plan-details dt {
    color: color-mix(in srgb, var(--text-color) 62%, transparent);
    font-weight: 700;
}

.plan-details dd {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    margin: 0;
    overflow-wrap: anywhere;
}

.detail-subject-color {
    width: 12px;
    height: 12px;
    flex: none;
    border-radius: 50%;
}

.delete-plan-button {
    border: 0;
    background: #c62828;
    color: #fff;
}

.dialog-actions button:disabled {
    cursor: wait;
    opacity: .6;
}

.cancel-button {
    border: 1px solid color-mix(in srgb, var(--text-color) 20%, transparent);
    background: var(--bg-color);
    color: var(--text-color);
}

.save-button {
    border: 0;
    background: var(--primary-color);
    color: white;
}

.save-button:disabled {
    opacity: .55;
    cursor: not-allowed;
}

@media (max-width: 760px) {
    .plan-page {
        padding: 20px 12px 36px;
    }

    .plan-header {
        align-items: flex-start;
        flex-direction: column;
    }

    .plan-header h1 {
        font-size: 26px;
    }

    .plan-card {
        min-height: 460px;
        padding: 16px 12px;
    }

    .weekly-timetable-scroll {
        max-height: 70vh;
    }

    .period-nav {
        gap: 8px;
    }

    .period-title {
        font-size: 14px;
    }

    .today-button {
        padding: 8px 10px;
    }

    .daily-item {
        gap: 9px;
        padding: 12px 10px;
    }

    .daily-time {
        font-size: 10px;
    }

    .add-button {
        right: 16px;
        bottom: 16px;
    }
}
</style>
