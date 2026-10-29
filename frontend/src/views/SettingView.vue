<script setup>
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

const subjects = ref([])
const subjectName = ref('')
const subjectColor = ref('#4f46e5')
const loading = ref(true)
const saving = ref(false)
const deletingId = ref(null)
const errorMessage = ref('')
const successMessage = ref('')
const loginRequired = ref(false)

async function getErrorMessage(response, fallback) {
  const data = await response.json().catch(() => ({}))
  return data.message || fallback
}

async function loadSubjects() {
  loading.value = true
  errorMessage.value = ''
  loginRequired.value = false

  try {
    const response = await fetch('/api/subjects', { credentials: 'include' })
    if (!response.ok) {
      if (response.status === 401) loginRequired.value = true
      throw new Error(await getErrorMessage(response, '과목 목록을 불러오지 못했습니다.'))
    }
    subjects.value = await response.json()
  } catch (error) {
    errorMessage.value = error.message || '서버에 연결할 수 없습니다.'
  } finally {
    loading.value = false
  }
}

async function addSubject() {
  saving.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const response = await fetch('/api/subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        subject_name: subjectName.value.trim(),
        subject_color: subjectColor.value,
      }),
    })
    if (!response.ok) {
      if (response.status === 401) loginRequired.value = true
      throw new Error(await getErrorMessage(response, '과목을 추가하지 못했습니다.'))
    }

    subjects.value.push(await response.json())
    subjectName.value = ''
    successMessage.value = '과목을 추가했습니다.'
  } catch (error) {
    errorMessage.value = error.message || '서버에 연결할 수 없습니다.'
  } finally {
    saving.value = false
  }
}

async function removeSubject(subject) {
  const confirmed = window.confirm(
    `'${subject.subject_name}' 과목을 삭제할까요?\n이 과목의 공부 기록과 계획도 함께 삭제됩니다.`,
  )
  if (!confirmed) return

  deletingId.value = subject.id
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const response = await fetch(`/api/subjects/${subject.id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    if (!response.ok) {
      if (response.status === 401) loginRequired.value = true
      throw new Error(await getErrorMessage(response, '과목을 삭제하지 못했습니다.'))
    }

    subjects.value = subjects.value.filter((item) => item.id !== subject.id)
    successMessage.value = '과목을 삭제했습니다.'
  } catch (error) {
    errorMessage.value = error.message || '서버에 연결할 수 없습니다.'
  } finally {
    deletingId.value = null
  }
}

onMounted(loadSubjects)
</script>

<template>
  <section class="settings-page" aria-labelledby="settings-title">
    <header class="page-header">
      <p class="eyebrow">MY STUDY</p>
      <h1 id="settings-title">과목 목록 관리</h1>
      <p class="description">공부할 과목을 추가하거나 목록에서 삭제할 수 있습니다.</p>
    </header>

    <p v-if="errorMessage" class="notice error" role="alert">{{ errorMessage }}</p>
    <p v-if="successMessage" class="notice success" role="status">{{ successMessage }}</p>

    <div v-if="loginRequired" class="login-prompt">
      과목 목록을 관리하려면 로그인이 필요합니다.
      <RouterLink to="/signin">로그인하기</RouterLink>
    </div>

    <template v-else>
      <form class="subject-form" @submit.prevent="addSubject">
        <label for="subject-name">새 과목</label>
        <div class="form-controls">
          <input
            id="subject-name"
            v-model="subjectName"
            type="text"
            maxlength="50"
            placeholder="과목명을 입력하세요"
            required
          >
          <label class="color-picker" for="subject-color">
            <span>과목 색상</span>
            <input id="subject-color" v-model="subjectColor" type="color" aria-label="과목 색상">
          </label>
          <button type="submit" :disabled="saving || !subjectName.trim()">
            {{ saving ? '추가 중...' : '과목 추가' }}
          </button>
        </div>
      </form>

      <section class="subject-section" aria-labelledby="subject-list-title">
        <div class="list-heading">
          <h2 id="subject-list-title">내 과목</h2>
          <span>{{ subjects.length }}개</span>
        </div>

        <p v-if="loading" class="empty-state">과목 목록을 불러오는 중입니다.</p>
        <p v-else-if="subjects.length === 0" class="empty-state">
          등록된 과목이 없습니다. 공부할 과목을 추가해보세요.
        </p>
        <ul v-else class="subject-list">
          <li v-for="subject in subjects" :key="subject.id" class="subject-item">
            <span class="subject-name">
              <span class="subject-color" :style="{ backgroundColor: subject.subject_color }"></span>
              {{ subject.subject_name }}
            </span>
            <button
              type="button"
              class="remove-button"
              :disabled="deletingId !== null"
              @click="removeSubject(subject)"
            >
              {{ deletingId === subject.id ? '삭제 중...' : '삭제' }}
            </button>
          </li>
        </ul>
      </section>

      <p class="delete-warning">
        과목을 삭제하면 해당 과목에 연결된 공부 기록과 계획도 함께 삭제됩니다.
      </p>
    </template>
  </section>
</template>

<style scoped>
.settings-page {
  width: min(100%, 760px);
  margin: 0 auto;
  padding: 28px 8px 48px;
  color: #1f2937;
}

.page-header {
  margin-bottom: 32px;
}

.eyebrow {
  margin: 0 0 8px;
  color: #6366f1;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.12em;
}

h1,
h2,
p {
  margin-top: 0;
}

h1 {
  margin-bottom: 8px;
  font-size: clamp(1.7rem, 4vw, 2.2rem);
}

.description {
  margin-bottom: 0;
  color: #6b7280;
}

.subject-form,
.subject-section {
  padding: 24px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 8px 24px rgb(15 23 42 / 5%);
}

.subject-form > label {
  display: block;
  margin-bottom: 12px;
  font-weight: 700;
}

.form-controls {
  display: flex;
  gap: 12px;
}

.form-controls > input {
  min-width: 0;
  flex: 1;
  padding: 11px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  color: inherit;
  font: inherit;
}

.color-picker {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #6b7280;
  font-size: 0.85rem;
  white-space: nowrap;
}

.color-picker input {
  width: 40px;
  height: 40px;
  padding: 3px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
}

.form-controls button,
.remove-button {
  border: 0;
  border-radius: 8px;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.form-controls button {
  padding: 0 18px;
  background: #4f46e5;
  color: #fff;
}

.form-controls button:disabled,
.remove-button:disabled {
  cursor: wait;
  opacity: 0.6;
}

.subject-section {
  margin-top: 20px;
}

.list-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.list-heading h2 {
  margin: 0;
  font-size: 1.1rem;
}

.list-heading span {
  color: #6b7280;
  font-size: 0.9rem;
}

.subject-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.subject-item {
  display: flex;
  min-height: 56px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-top: 1px solid #f1f3f5;
}

.subject-name {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
}

.subject-color {
  width: 14px;
  height: 14px;
  border-radius: 50%;
}

.remove-button {
  padding: 7px 12px;
  background: #fef2f2;
  color: #b91c1c;
}

.empty-state {
  margin: 0;
  padding: 20px 0;
  color: #6b7280;
  text-align: center;
}

.delete-warning {
  margin: 14px 4px 0;
  color: #6b7280;
  font-size: 0.875rem;
}

.notice,
.login-prompt {
  margin-bottom: 16px;
  padding: 12px 14px;
  border-radius: 8px;
}

.notice.error {
  background: #fef2f2;
  color: #b91c1c;
}

.notice.success {
  background: #ecfdf5;
  color: #047857;
}

.login-prompt {
  background: #eef2ff;
  color: #3730a3;
}

.login-prompt a {
  margin-left: 8px;
  color: inherit;
  font-weight: 700;
}

@media (max-width: 560px) {
  .subject-form,
  .subject-section {
    padding: 18px;
  }

  .form-controls {
    flex-wrap: wrap;
  }

  .form-controls > input {
    flex-basis: 100%;
  }

  .form-controls button {
    min-height: 40px;
  }
}
</style>
