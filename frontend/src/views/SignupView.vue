<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const { signup } = useAuth()
const id = ref('')
const password = ref('')
const isPasswordValid = () => {
    if (typeof password.value !== 'string' || password.value.length < 6 || password.value.length > 20) {
        return false;
    }
    return /^[A-Za-z0-9_!@#$%^&*()]+$/.test(password.value);
}
const isSubmitting = ref(false)
const errorMessage = ref('')

async function handleSignup() {
    errorMessage.value = ''
    if (!isPasswordValid()) {
        errorMessage.value = '비밀번호는 영어, 숫자, 밑줄(_)과 별표(*)만 사용할 수 있습니다.'
        return
    }
    isSubmitting.value = true

    try {
        // 아이디가 중복되지 않으면 서버가 비밀번호를 해싱해서 DB에 저장합니다.
        await signup(id.value, password.value)
        router.push('/signin')
    } catch (error) {
        console.error('회원가입 실패:', error)
        errorMessage.value = error.message
    } finally {
        isSubmitting.value = false
    }
}
</script>

<template>
    <section class="auth-page">
        <form class="auth-form" @submit.prevent="handleSignup">
            <h2>회원가입</h2>

            <label class="input-group">
                <span>아이디</span>
                <input v-model.trim="id" type="text" autocomplete="username" required />
            </label>

            <label class="input-group">
                <span>비밀번호</span>
                <input v-model="password" type="password" autocomplete="new-password" required />
                <small v-if="password && !isPasswordValid()" class="password-warning">
                    영어, 숫자, _ 와 * 만 사용할 수 있습니다.
                </small>
            </label>

            <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>

            <button id="btnSignup" type="submit" :disabled="isSubmitting">
                {{ isSubmitting ? '가입 중...' : '회원가입' }}
            </button>

            <RouterLink class="auth-link" to="/signin">로그인으로 이동</RouterLink>
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

#btnSignup {
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

#btnSignup:disabled {
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

.password-warning {
    display: block;
    margin-top: 6px;
    color: #c62828;
    font-weight: 600;
}
</style>
