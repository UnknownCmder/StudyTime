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
    <div clsass="wrapper">
        <form action="">
            <h1>login</h1>
            <div class="id-input">
                <input type="text" placeholder="Username"
                required>
            </div>
            <div class="input-box">
                <input type="Password" 
                placeholder="Password" required>
            </div>

            <div class="remember-forgot">
                <label><input type="checkbox"> Rememver me</label>
                <a href="#">Forgot password?</a>
            </div>

            <button type="submit" class="btn">Login</button>

            <div class="register-lint">
                <p>Don't have an account? <a
                herf="#"></a></p>
            </div>
        </form>
    </div>
</template>

<style>

</style>
