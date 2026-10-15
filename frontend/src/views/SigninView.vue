<template>
  <div class="page">
    <!-- 로그인 카드를 감싸는 글래스/화이트 스타일 박스 -->
    <div class="wrapper">
      <h1>로그인</h1>
      <!-- 제출 시 새로고침 방지 후 handleLogin 실행 -->
      <form @submit.prevent="handleLogin">
        <div class="input-box">
          <label for="login-email">이메일</label>
          <input
            id="login-email"
            v-model="email"
            type="email"
            placeholder="you@example.com"
            required
          />
        </div>

        <div class="input-box">
          <label for="login-password">비밀번호</label>
          <input
            id="login-password"
            v-model="password"
            type="password"
            placeholder="비밀번호 입력"
            required
          />
        </div>

        <button type="submit" class="btn">로그인하기</button>
      </form>
    </div>
  </div>
</template>

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

            <button id="btnLogin" type="submit" :disabled="isLoginLoading || isLoggedIn">
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
    color: #222;
}

.auth-form {
    width: min(100%, 420px);
    padding: 28px;
    border: 1px solid #ddd;
    border-radius: 8px;
    background: #fff;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
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
    border: 1px solid #bbb;
    border-radius: 6px;
    color: #222;
    font: inherit;
}

#btnLogin {
    width: 100%;
    margin-top: 8px;
    padding: 12px;
    border: none;
    border-radius: 6px;
    background: #333;
    color: #fff;
    cursor: pointer;
    font: inherit;
    font-weight: 700;
}

#btnLogin:disabled {
    cursor: default;
    opacity: 0.6;
}

.auth-link {
    display: inline-block;
    margin-top: 16px;
    color: #333;
    font-weight: 700;
}

.error-message {
    margin-bottom: 12px;
    color: #c62828;
    font-weight: 700;
}
</style>
