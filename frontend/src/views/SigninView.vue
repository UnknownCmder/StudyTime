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
import { ref } from 'vue'

// 입력값을 저장하는 반응형 변수 (email, password)
const email = ref('')
const password = ref('')

// 로그인 버튼 클릭 시 실행되는 함수: 실제 서비스에서는 이 안에서 로그인 API를 호출
function handleLogin() {
  console.log('login', { email: email.value, password: password.value })
}
</script>

<style scoped>
/* 화면 전체를 채우고 카드를 중앙에 배치하는 배경 영역 */
.page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  padding: 24px;
  box-sizing: border-box;
}

/* 로그인 폼을 감싸는 카드 박스 */
.wrapper {
  width: 100%;
  max-width: 360px;
  padding: 40px 32px;
  border-radius: 24px;
  background: #ffffff;
  border: 1px solid #000000;
}

h1 {
  color: #000000;
  text-align: center;
  margin: 0 0 28px;
  font-weight: 700;
  font-size: 24px;
}

.input-box {
  margin-bottom: 16px;
}

.input-box label {
  display: block;
  color: #000000;
  font-size: 12px;
  margin-bottom: 6px;
}

/* 이메일/비밀번호 입력창 공통 스타일 */
.input-box input {
  width: 100%;
  padding: 12px 14px;
  box-sizing: border-box;
  border: 1px solid #000000;
  border-radius: 12px;
  background: #ffffff;
  color: #000000;
  font-size: 14px;
  outline: none;
  transition: box-shadow 0.2s;
}

.input-box input::placeholder {
  color: #888888;
}

/* 입력창 포커스 시 테두리 강조 링 표시 */
.input-box input:focus {
  box-shadow: 0 0 0 2px #000000;
}

/* 로그인 버튼: 기본은 흰 배경, hover 시 색 반전으로 구분 */
.btn {
  width: 100%;
  padding: 12px;
  margin-top: 8px;
  cursor: pointer;
  border: 1px solid #000000;
  border-radius: 12px;
  background: #ffffff;
  color: #000000;
  font-size: 15px;
  font-weight: 700;
  transition: background 0.2s, color 0.2s, transform 0.1s;
}

.btn:hover {
  background: #000000;
  color: #ffffff;
}

.btn:active {
  transform: scale(0.98);
}
</style>