<script setup>
import { useAuth } from '@/composables/useAuth'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const { isLoggedIn, isLoginLoading, fetchLoginStatus, login } = useAuth()
const id = ref('')
const password = ref('')
const errorMessage = ref('')

async function handleLogin() {
    errorMessage.value = ''

    try {
        // 입력값을 서버로 보내 DB의 아이디/비밀번호와 일치하는지 확인합니다.
        const isLoginSuccessful = await login(id.value, password.value)

        if (isLoginSuccessful) {
            router.push('/')
        }
    } catch (error) {
        console.error('로그인 실패:', error)
        errorMessage.value = error.message
    }
}

onMounted(async () => {
    try {
        const isAlreadyLoggedIn = await fetchLoginStatus()

        if (isAlreadyLoggedIn) {
            router.push('/')
        }
    } catch (error) {
        console.error('로그인 상태 확인 실패:', error)
    }
})
</script>

<template>
    <section class="auth-page">
        <form class="auth-form" @submit.prevent="handleLogin">
            <h2>로그인</h2>

            <label class="input-group">
                <span>아이디</span>
                <input v-model.trim="id" type="text" autocomplete="username" required />
            </label>

            <label class="input-group">
                <span>비밀번호</span>
                <input v-model="password" type="password" autocomplete="current-password" required />
            </label>

            <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>

            <button id="btnLogin" type="submit" class="rainbow-btn" :disabled="isLoginLoading || isLoggedIn">
                {{ isLoginLoading ? '로그인 중...' : '로그인' }}
            </button>

            <RouterLink class="auth-link" to="/signup">회원가입</RouterLink>
        </form>
    </section>
</template>

<style scoped>
.auth-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: calc(100vh - 120px);
}

.auth-form {
    width: min(100%, 420px);
    padding: 28px;
    border: 1px solid color-mix(in srgb, var(--text-color) 14%, transparent);
    border-radius: 8px;
    background: var(--surface-color);
    color: var(--text-color);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.24);
}

.auth-form h2 {
    margin-bottom: 24px;
    font-size: 28px;
    font-weight: 700;
}

.input-group {
    display: block;
    margin-bottom: 16px;
}

.input-group span {
    display: block;
    margin-bottom: 6px;
    font-weight: 700;
}

.input-group input {
    width: 100%;
    padding: 12px;
    border: 1px solid color-mix(in srgb, var(--text-color) 24%, transparent);
    border-radius: 6px;
    background: var(--bg-color);
    color: var(--text-color);
    font: inherit;
}

.input-group input:focus {
    outline: 2px solid var(--primary-color);
    outline-offset: 1px;
}

#btnLogin {
    width: 100%;
    margin-top: 8px;
    padding: 12px;
    color: var(--text-color);
    font: inherit;
    font-weight: 700;
}

.auth-link {
    display: inline-block;
    margin-top: 16px;
    color: var(--text-color);
    font-weight: 700;
}

.error-message {
    margin-bottom: 12px;
    color: #c62828;
    font-weight: 700;
}
</style>
