import os
from dotenv import load_dotenv
from google import genai
from google.genai import types
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from typing import List

# 載入 .env
load_dotenv()
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise ValueError("環境變數中找不到 GOOGLE_API_KEY，請於 .env 中設定。")

# 建立 Google Gen AI 客戶端
client = genai.Client(api_key=GOOGLE_API_KEY)

app = FastAPI()

# 掛載靜態檔案與模板
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# 定義請求與訊息模型
class ChatMessagePart(BaseModel):
    text: str

class ChatMessage(BaseModel):
    role: str  # "user" 或 "model"
    parts: List[ChatMessagePart]

class ChatRequest(BaseModel):
    prompt: str
    history: List[ChatMessage] = []

@app.get("/", response_class=HTMLResponse)
async def get_chat_page(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/chat")
async def chat_endpoint(chat_request: ChatRequest):
    try:
        # 將歷史訊息轉成 types.Content 清單
        history_contents: List[types.Content] = []
        for msg in chat_request.history:
            parts = [types.Part.from_text(text=part.text) for part in msg.parts]
            history_contents.append(types.Content(role=msg.role, parts=parts))

        # 建立對話並送出新訊息
        chat = client.aio.chats.create(
            model="gemini-2.0-flash-001",
            history=history_contents
        )
        # 非同步送出訊息
        response = await chat.send_message(chat_request.prompt)

        llm_reply = response.text or "抱歉，我無法產生回覆。"
        return JSONResponse(content={"reply": llm_reply})

    except Exception as e:
        # 錯誤處理
        print(f"Gemini API 呼叫錯誤: {e}")
        raise HTTPException(status_code=500, detail=f"與 LLM 通訊時發生錯誤: {e}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
