<script setup>
import { useAuth } from '@/composables/useAuth'
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const { isLoggedIn, isLoginLoading, fetchLoginStatus, login } = useAuth()

async function handleLogin() {
    try {
        const isLoginSuccessful = await login()

        if (isLoginSuccessful) {
            router.push('/')
        }
    } catch (error) {
        console.error('로그인 실패:', error)
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
    <button id="btnLogin" type="button" :disabled="isLoginLoading || isLoggedIn" @click="handleLogin">
        {{ isLoginLoading ? '로그인 중...' : '로그인' }}
    </button>
</template>
