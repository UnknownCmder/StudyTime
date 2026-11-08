# 키 생성을 위한 임시 파일
import secrets

secret = secrets.token_hex(32)

print(secret)