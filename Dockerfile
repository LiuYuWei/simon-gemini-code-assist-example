FROM python:3.12.10-slim

# 1. 設定工作目錄為 /app，之後所有相對路徑都以這裡為準
WORKDIR /app

# 2. 先複製 requirements.txt 並安裝依賴（利用快取 layer）
COPY requirements.txt .

RUN pip install --upgrade pip \
 && pip install -r requirements.txt

# 3. 複製其餘程式碼
COPY . .

# 4. 暴露埠號
EXPOSE 8000

# 5. 執行 uvicorn，這時 cwd=/app，就能正確載入 main.py
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
