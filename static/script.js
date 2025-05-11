document.addEventListener('DOMContentLoaded', () => {
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');

    let chatHistory = []; // 用來儲存 API 格式的聊天歷史紀錄

    function addMessageToChatBox(messageText, senderClass) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', senderClass);
        
        const paragraph = document.createElement('p');
        paragraph.textContent = messageText;
        messageElement.appendChild(paragraph);
        
        chatBox.appendChild(messageElement);
        chatBox.scrollTop = chatBox.scrollHeight; // 自動捲動到底部
    }

    // 可以在此將初始的機器人問候語加入歷史紀錄 (如果需要讓 LLM 感知到它)
    // chatHistory.push({ role: "model", parts: [{ text: "您好！今天我能為您做些什麼？" }] });

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

            addMessageToChatBox(modelReply, 'model-message');
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

    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            sendMessage();
        }
    });
});