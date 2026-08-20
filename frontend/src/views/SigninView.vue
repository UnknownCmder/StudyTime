<style scoped>
.page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #0a0a0c 0%, #3a3a40 45%, #e8e8ec 100%);
    padding: 24px;
    box-sizing: border-box;
}

.wrapper {
    width: 100%;
    max-width: 360px;
    padding: 40px 32px;
    border-radius: 24px;

    background: rgba(255, 255, 255, 0.12);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);

    border: 1px solid rgba(255, 255, 255, 0.25);

    box-shadow:
        0 8px 32px rgba(0, 0, 0, 0.4),
        inset 0 1px 1px rgba(255, 255, 255, 0.3);
}

h1 {
    color: #f5f5f7;
    text-align: center;
    margin: 0 0 28px;
    font-weight: 700;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.input-box {
    margin-bottom: 16px;
}

.input-box input {
    width: 100%;
    padding: 12px 14px;
    box-sizing: border-box;
    border: 1px solid rgba(255, 255, 255, 0.25);
    border-radius: 12px;

    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(12px) saturate(160%);
    -webkit-backdrop-filter: blur(12px) saturate(160%);

    color: #f5f5f7;
    font-size: 14px;
    outline: none;
    transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
}

.input-box input::placeholder {
    color: rgba(245, 245, 247, 0.5);
}

.input-box input:focus {
    background: rgba(255, 255, 255, 0.18);
    border-color: rgba(255, 255, 255, 0.5);
    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.15);
}

.remember-forgot {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.85rem;
    color: #d5d5db;
    margin-bottom: 24px;
}

.remember-forgot label {
    display: flex;
    align-items: center;
    gap: 6px;
}

.remember-forgot a {
    color: #f5f5f7;
    font-weight: 600;
    text-decoration: none;
}

.remember-forgot a:hover {
    text-decoration: underline;
}

.btn {
    width: 100%;
    padding: 12px;
    cursor: pointer;
    border: 1px solid rgba(255, 255, 255, 0.25);
    border-radius: 12px;

    background: rgba(255, 255, 255, 0.16);
    backdrop-filter: blur(12px) saturate(160%);
    -webkit-backdrop-filter: blur(12px) saturate(160%);

    color: #f5f5f7;
    font-size: 15px;
    font-weight: 700;
    transition: background 0.2s, transform 0.1s;
}

.btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.26);
}

.btn:active:not(:disabled) {
    transform: scale(0.98);
}

.btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.register-link {
    text-align: center;
    margin-top: 20px;
}

.register-link p {
    color: #d5d5db;
    font-size: 0.85rem;
    margin: 0;
}

.register-link a {
    color: #f5f5f7;
    font-weight: 700;
    text-decoration: none;
}

.register-link a:hover {
    text-decoration: underline;
}
</style>