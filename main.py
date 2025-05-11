import os
import google.generativeai as genai
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from dotenv import load_dotenv
from typing import List, Dict

# 從 .env 檔案載入環境變數
load_dotenv()

# 設定 Gemini API
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise ValueError("環境變數中找不到 GOOGLE_API_KEY。請在 .env 檔案中設定它。")

genai.configure(api_key=GOOGLE_API_KEY)

# 使用 gemini-1.5-flash-latest 模型。
# 您提到 "gemini-2.0-flash"，這是透過 google-generativeai SDK 可用的最接近的 Flash 模型。
MODEL_NAME = "gemini-1.5-flash-latest"

app = FastAPI()

# 掛載靜態檔案 (CSS, JS)
app.mount("/static", StaticFiles(directory="static"), name="static")

# 設定 Jinja2 樣板
templates = Jinja2Templates(directory="templates")

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
        model = genai.GenerativeModel(MODEL_NAME)
        
        formatted_history = [{"role": msg.role, "parts": [{"text": part.text for part in msg.parts}]} for msg in chat_request.history]

        chat_session = model.start_chat(history=formatted_history)
        response = await chat_session.send_message_async(chat_request.prompt)
        
        llm_reply = response.text if hasattr(response, 'text') and response.text else "抱歉，我無法產生回覆。"
        return JSONResponse(content={"reply": llm_reply})
    except Exception as e:
        print(f"Gemini API 呼叫錯誤: {e}")
        raise HTTPException(status_code=500, detail=f"與 LLM 通訊時發生錯誤: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)