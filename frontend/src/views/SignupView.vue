<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const { signup, requestEmailVerification, verifyEmail } = useAuth()
const id = ref('')
const password = ref('')
const passwordConfirm = ref('')
const email = ref('')
const code = ref('')
const codeSent = ref(false)
const emailVerified = ref(false)
const isSubmitting = ref(false)
const isSendingCode = ref(false)
const isVerifyingCode = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

async function handleSendCode() {
    errorMessage.value = ''
    successMessage.value = ''
    isSendingCode.value = true
    try {
        await requestEmailVerification(email.value)
        codeSent.value = true
        emailVerified.value = false
        successMessage.value = '인증 코드를 보냈습니다. 10분 안에 입력해주세요.'
    } catch (error) {
        errorMessage.value = error.message
    } finally {
        isSendingCode.value = false
    }
}

async function handleVerifyCode() {
    errorMessage.value = ''
    successMessage.value = ''
    isVerifyingCode.value = true
    try {
        await verifyEmail(email.value, code.value)
        emailVerified.value = true
        successMessage.value = '이메일 인증이 완료되었습니다.'
    } catch (error) {
        errorMessage.value = error.message
    } finally {
        isVerifyingCode.value = false
    }
}

async function handleSignup() {
    errorMessage.value = ''
    if (!emailVerified.value) {
        errorMessage.value = '먼저 이메일 인증을 완료해주세요.'
        return
    }
    if (password.value !== passwordConfirm.value) {
        errorMessage.value = '비밀번호가 일치하지 않습니다.'
        return
    }
    isSubmitting.value = true
    try {
        // 인증된 이메일과 함께 가입 정보를 서버로 보냅니다.
        await signup(id.value, password.value, email.value, passwordConfirm.value)
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
                <span>이메일</span>
                <input v-model.trim="email" type="email" autocomplete="email" required :disabled="emailVerified" />
                <button type="button" class="secondary-btn" :disabled="isSendingCode || !email || emailVerified" @click="handleSendCode">
                    {{ isSendingCode ? '발송 중...' : codeSent ? '인증 코드 다시 받기' : '인증 코드 받기' }}
                </button>
                <p class="email-notice">주의 : 인증 코드 이메일이 <strong class="spam-warning">스팸메일함</strong>으로 들어갈 수도 있습니다. <strong class="spam-warning">스팸메일함</strong>을 확인하고, StudyTime 이름으로 온 이메일이 스팸 처리되었다면 <strong class="spam-warning">반드시 스팸 해제해주세요.</strong></p>
            </label>

            <label v-if="codeSent && !emailVerified" class="input-group">
                <span>인증 코드</span>
                <input v-model.trim="code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required />
                <button type="button" class="secondary-btn" :disabled="isVerifyingCode || code.length !== 6" @click="handleVerifyCode">
                    {{ isVerifyingCode ? '확인 중...' : '이메일 인증' }}
                </button>
            </label>

            <label class="input-group">
                <span>비밀번호</span>
                <input v-model="password" type="password" autocomplete="new-password" required />
            </label>

            <label class="input-group">
                <span>비밀번호 확인</span>
                <input v-model="passwordConfirm" type="password" autocomplete="new-password" required />
            </label>

            <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
            <p v-if="successMessage" class="success-message">{{ successMessage }}</p>

            <button id="btnSignup" type="submit" class="rainbow-btn" :disabled="isSubmitting">
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
    padding: 16px;
    box-sizing: border-box;
}

.auth-form {
    width: min(100%, 420px);
    box-sizing: border-box;
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

.email-notice {
    margin: 8px 0 0;
    color: color-mix(in srgb, var(--text-color) 75%, transparent);
    font-size: 0.9rem;
    line-height: 1.5;
}

.spam-warning {
    color: #e57373;
}

.input-group input {
    width: 100%;
    box-sizing: border-box;
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

.secondary-btn {
    margin-top: 8px;
    padding: 8px 12px;
    border: 1px solid color-mix(in srgb, var(--text-color) 24%, transparent);
    border-radius: 6px;
    background: var(--bg-color);
    color: var(--text-color);
    font: inherit;
    cursor: pointer;
}

.secondary-btn:disabled {
    cursor: not-allowed;
    opacity: 0.6;
}

#btnSignup {
    width: 100%;
    box-sizing: border-box;
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

.success-message {
    margin-bottom: 12px;
    color: #218838;
    font-weight: 700;
}

@media (max-width: 480px) {
    .auth-page {
        min-height: calc(100dvh - 88px);
        padding: 10px 3px;
    }

    .auth-form {
        padding: 20px 16px;
        border-radius: 12px;
    }

    .auth-form h2 {
        margin-bottom: 18px;
        font-size: 24px;
    }
}

</style>
