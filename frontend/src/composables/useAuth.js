import { ref } from 'vue'

const isLoggedIn = ref(false)
const isLoginLoading = ref(false)
const currentUserId = ref(null)

async function fetchLoginStatus() {
    // 서버 세션 쿠키를 포함해서 현재 로그인 상태를 확인합니다.
    const response = await fetch('/api/login/status', {
        credentials: 'include',
    })

    if (!response.ok) {
        throw new Error('로그인 상태 확인 실패')
    }

    const data = await response.json()
    isLoggedIn.value = data.isLoggedIn
    currentUserId.value = data.userId || null
    return isLoggedIn.value
}

async function login(id, password) {
    // 로그인 폼에서 받은 아이디/비밀번호를 백엔드 검증 API로 보냅니다.
    isLoginLoading.value = true

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ id, password }),
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.message || '로그인 실패')
        }

        const data = await response.json()
        isLoggedIn.value = data.isLoggedIn
        currentUserId.value = data.userId || null
        return isLoggedIn.value
    } finally {
        isLoginLoading.value = false
    }
}

async function logout() {
    // 서버 세션을 삭제하고 프론트의 로그인 상태도 초기화합니다.
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
        currentUserId.value = null
        return !isLoggedIn.value
    } finally {
        isLoginLoading.value = false
    }
}

async function signup(id, password) {
    // 회원가입 API는 성공 시 DB에 해시된 비밀번호를 저장합니다.
    const response = await fetch('/api/signup', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ id, password }),
    })

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || '회원가입 실패')
    }

    return response.json()
}

export function useAuth() {
    return {
        isLoggedIn,
        isLoginLoading,
        currentUserId,
        fetchLoginStatus,
        login,
        logout,
        signup,
    }
}
