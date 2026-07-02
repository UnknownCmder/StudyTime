import { ref } from 'vue'

const isLoggedIn = ref(false)
const isLoginLoading = ref(false)

async function fetchLoginStatus() {
    const response = await fetch('/api/login/status', {
        credentials: 'include',
    })

    if (!response.ok) {
        throw new Error('로그인 상태 확인 실패')
    }

    const data = await response.json()
    isLoggedIn.value = data.isLoggedIn
    return isLoggedIn.value
}

async function login() {
    isLoginLoading.value = true

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            credentials: 'include',
        })

        if (!response.ok) {
            throw new Error('로그인 실패')
        }

        const data = await response.json()
        isLoggedIn.value = data.isLoggedIn
        return isLoggedIn.value
    } finally {
        isLoginLoading.value = false
    }
}

async function logout() {
    isLoginLoading.value = true

    try {
        const response = await fetch('/api/login', {
            method: 'DELETE',
            credentials: 'include',
        })

        if (!response.ok) {
            throw new Error('로그아웃 실패')
        }

        const data = await response.json()
        isLoggedIn.value = data.isLoggedIn
        return !isLoggedIn.value
    } finally {
        isLoginLoading.value = false
    }
}

export function useAuth() {
    return {
        isLoggedIn,
        isLoginLoading,
        fetchLoginStatus,
        login,
        logout,
    }
}
