<script setup>
import { onMounted, ref } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useAuth } from './composables/useAuth'

const sidebarList = [
    { name: '홈', path: '/' },
    { name: '스탑워치', path: '/stopwatch' },
    { name: '시간표', path: '/about' },
    { name: '공부기록', path: '/record' },
    { name: '설정', path: '/about' },
]

const isSidebarOpen = ref(true)
const sidebarRef = ref(null)
const router = useRouter()
const { isLoggedIn, isLoginLoading, fetchLoginStatus, logout } = useAuth()

function toggleSidebar() {
  // 현재 화면 너비 확인
    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
        // 모바일: 'mobile-open' 클래스를 토글하여 메뉴를 보여주거나 숨김
        sidebarRef.value?.classList.toggle('mobile-open');
    } else {
        // 데스크탑: 'closed' 클래스를 토글하여 메뉴를 옆으로 밀어넣거나 뺌
        isSidebarOpen.value = !isSidebarOpen.value;
    }
}

async function handleAuthButtonClick() {
    if (!isLoggedIn.value) {
        router.push('/signin')
        return
    }

    try {
        const isLoggedOut = await logout()

        if (isLoggedOut) {
            router.push('/')
        }
    } catch (error) {
        console.error('로그아웃 실패:', error)
    }
}

onMounted(fetchLoginStatus)
</script>

<template>
    <div class="app">
    <header class="header">
        <div class="header-content">
        <button id="btnSidebar" class="btn-sidebar" @click="toggleSidebar">
            ☰ </button>
        <h1 class="logo">StudyTime</h1>
        </div>
        <button id="btnLogin" type="button" :disabled="isLoginLoading" @click="handleAuthButtonClick">
            {{ isLoggedIn ? '로그아웃' : '로그인' }}
        </button>
    </header>

    <nav id="sidebar" ref="sidebarRef" class="sidebar" :class="{ closed: !isSidebarOpen }">
        <ul class="menu-list">
        <li v-for="site in sidebarList" :key="site.name">
            <RouterLink :to="site.path">{{ site.name }}</RouterLink>
        </li>
        </ul>
    </nav>

    <main class="main-content">
        <RouterView />
    </main>
    </div>
</template>

<style scoped>
/* 기본 초기화 */
.app {
    width: 100vw;
    height: 100vh;
    max-width: none;
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    color: white;
    font-family: 'Arial', sans-serif;
  overflow: hidden; /* 스크롤바 관리 */

    display: grid;
    grid-template-columns: 250px 1fr;
    grid-template-rows: 60px 1fr;
}

/* --- 상단 헤더 스타일 --- */
.header {
    grid-column: 1 / -1;
    grid-row: 1 / 2;

    display: flex;
    background-color: #333;
    color: white;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
    z-index: 1000; /* 항상 최상위 */
}

.header-content {
    display: flex;
    align-items: center;
    gap: 15px;
}

.logo {
    margin: 0;
    font-size: 24px;
    font-weight: bold;
}

#btnLogin {
    border: none;
    color: white;
    cursor: pointer;
    font: inherit;
    font-weight: bold;
    padding: 8px 15px;
    border-radius: 4px;
    background-color: #555;
    text-decoration: none;
    transition: background-color 0.3s ease;
}

#btnLogin:hover {
    background-color: #777;
}

#btnLogin:disabled {
    cursor: default;
    opacity: 0.6;
}


.btn-sidebar {
    background: none;
    border: none;
    color: white;
    font-size: 24px;
    cursor: pointer;
    padding: 5px;
}

.btn-sidebar:hover {
    color: #ddd;
}



/* --- 왼쪽 사이드바 스타일 --- */
.sidebar {
  grid-column: 1 / 2;
  grid-row: 2 / 3;
    height: 100%;
    background-color: #555;
    border-right: 1px solid #ddd;
    transition: transform 0.3s ease; /* 부드러운 이동 효과 */
    overflow-y: auto;
    
    /* 사이드바가 접혔을 때를 위한 설정 */
    transform: translateX(0); 
}

/* 사이드바 메뉴 스타일 */
.menu-list {
    list-style: none;
    padding: 20px 0;
}

.menu-list li a {
    display: block;
    padding: 15px 20px;
    text-decoration: none;
    color: white;
    font-weight: bold;
    border-bottom: 1px solid #333;
}

.menu-list li a:hover {
    color: #333;
    background-color: #ddd;
}

/* --- 메인 콘텐츠 스타일 --- */
.main-content {
    grid-row: 2 / 3;
    grid-column: 2 / 3;
    padding: 20px;
    overflow-y: auto; /* 내용이 많으면 스크롤 */
    background-color: #fff;
}

/* --- [핵심 기능] 사이드바 토글 상태 --- */

/* 1. 사이드바가 닫혔을 때 */
.sidebar.closed {
    transform: translateX(-250px); /* 너비만큼 왼쪽으로 이동하여 숨김 */
}

/* --- 반응형 (모바일) --- */
@media (max-width: 768px) {
    /* 모바일에서는 기본적으로 사이드바를 숨깁니다 */
    .sidebar {
        position: absolute; /* 메인 콘텐츠 위에 뜸 */
        height: 100%;
        margin-left: -250px; /* 기본 숨김 상태 */
        z-index: 999;
        box-shadow: 2px 0 5px rgba(0,0,0,0.2);
    }

    /* 모바일에서는 'closed' 클래스가 없을 때가 아니라
        오히려 'active' 클래스가 붙어야 열리도록 로직을 반대로 활용하거나
       JS에서 처리를 돕기 위해 아래와 같이 설정합니다. */
    
    /* 모바일에서 열렸을 때 */
    .sidebar.mobile-open {
        margin-left: 0;
    }
}

/* --- 로그인 박스 --- */
.box-login {
    width: 600px;
    margin: 100px auto;
    padding: 30px;
    background-color: #333;
    border-radius: 8px;
    box-shadow: 0 0 10px #555;
}

.input-group input {
    width: 100%;
    padding: 10px;
    margin-top: 5px;
    border-radius: 4px;
    border: none;
    color: black;
}
</style>
