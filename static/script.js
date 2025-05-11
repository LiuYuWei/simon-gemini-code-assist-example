document.addEventListener('DOMContentLoaded', () => {
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');
    const resetButton = document.getElementById('resetButton'); // 取得重置按鈕

    let chatHistory = []; // 用來儲存 API 格式的聊天歷史紀錄
    const initialWelcomeMessage = "您好！今天我能為您做些什麼？"; // 初始歡迎訊息

    function addMessageToChatBox(content, senderClass, isMarkdown = false) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', senderClass);

        // 如果 isMarkdown 為 true 且 marked 函式庫存在，則將內容解析為 Markdown
        // 這主要用於模型的實際回覆
        if (isMarkdown && typeof marked !== 'undefined' && typeof marked.parse === 'function') {
            messageElement.innerHTML = marked.parse(content);
        } else {
            // 對於其他所有情況（使用者訊息、思考中訊息、歡迎訊息、錯誤訊息，或 marked.js 未載入）
            // 將內容視為純文字並包裹在 <p> 標籤中
            const paragraph = document.createElement('p');
            paragraph.textContent = content;
            messageElement.appendChild(paragraph);
        }
        chatBox.appendChild(messageElement);
        chatBox.scrollTop = chatBox.scrollHeight; // 自動捲動到底部
    }

    function initializeChat() {
        // 清空聊天框，只留下初始訊息
        chatBox.innerHTML = ''; // 清除所有現有訊息
        addMessageToChatBox(initialWelcomeMessage, 'model-message'); // 重新加入歡迎語
        chatHistory = []; // 清空 JavaScript 中的聊天歷史紀錄

        // 如果您希望 LLM 也感知到這個初始歡迎語，可以在這裡將它加入歷史紀錄
        // 例如: chatHistory.push({ role: "model", parts: [{ text: initialWelcomeMessage }] });
        // 但通常，前端的歡迎語不需要傳給 LLM 作為歷史。
    }

    async function sendMessage() {
        const userMessageText = userInput.value.trim();
        if (userMessageText === '') return;

        addMessageToChatBox(userMessageText, 'user-message');
        // 將使用者訊息加入歷史紀錄 (API 格式)
        chatHistory.push({ role: "user", parts: [{ text: userMessageText }] });
        userInput.value = ''; // 清空輸入框

        // 顯示 "思考中..." 指示
        addMessageToChatBox("思考中...", 'model-thinking-message');
        const thinkingMessageElement = chatBox.lastChild;

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: userMessageText, // 目前的使用者訊息
                    history: chatHistory.slice(0, -1) // 傳送不包含目前使用者訊息的歷史紀錄
                }),
            });

            // 移除 "思考中..." 指示
            if (thinkingMessageElement && thinkingMessageElement.parentNode === chatBox) {
                chatBox.removeChild(thinkingMessageElement);
            }

            if (!response.ok) {
                const errorData = await response.json();
                addMessageToChatBox(`錯誤: ${errorData.detail || response.statusText}`, 'model-message');
                return;
            }

            const data = await response.json();
            const modelReply = data.reply;

            addMessageToChatBox(modelReply, 'model-message', true); // 告知此模型回覆是 Markdown
            // 將模型回覆加入歷史紀錄 (API 格式)
            chatHistory.push({ role: "model", parts: [{ text: modelReply }] });

        } catch (error) {
            if (thinkingMessageElement && thinkingMessageElement.parentNode === chatBox) { // 再次檢查以防萬一
                chatBox.removeChild(thinkingMessageElement);
            }
            console.error('傳送訊息時發生錯誤:', error);
            addMessageToChatBox('無法連接到伺服器，請稍後再試。', 'model-message');
        }
    }

    function handleReset() {
        initializeChat();
        userInput.value = ''; // 清空輸入框
        userInput.focus(); // 讓使用者可以馬上輸入
    }

    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            sendMessage();
        }
    });

    if (resetButton) { // 確保重置按鈕存在
        resetButton.addEventListener('click', handleReset);
    }
});