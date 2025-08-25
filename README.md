# 擔心癌症復發問卷-網頁版

## 目錄

- [擔心癌症復發問卷-網頁版](#擔心癌症復發問卷-網頁版)
  - [目錄](#目錄)
  - [修改紀錄](#修改紀錄)
    - [20250825 增加語音提示功能](#20250825-增加語音提示功能)
    - [20250820 設定黑色介面](#20250820-設定黑色介面)
    - [20250820 增加VAD功能(語音活動偵測)](#20250820-增加vad功能語音活動偵測)
    - [20250819 原始為 游仁杰 學長DEMO](#20250819-原始為-游仁杰-學長demo)

-----

## 修改紀錄

### 20250825 增加語音提示功能

1. **語音提示與護士圖片顯示**

      - 當受試者在指定「思考時間」內未回答時，會播放語音提示並顯示護理師圖片以提醒。
![image](https://github.com/HankLiu5110/audio_form-web_version/blob/master/image/add_voice_prompt_function.png)

2. **更改題庫變數名稱**

      - `應回答時間` (原 `wait` -\> 新 `answer_time`)：定義該題需要回答的總秒數。
      - `思考時間` (`think_time`)：若受試者在此時間內未說話，則觸發語音提示（單位為秒）。

    <!-- end list -->

    ```html
    <script id="manifest-inline" type="application/json">
    {
      "intro": {
        "video": "quiz/intro/video.mp4",
        "text": "擔心癌症復發，在癌症病友上是非常常見的現象，他不只影響癌友本人，也會影響家庭，或影響每天的生活。"
      },
      "questions": [
        { "id": 1, "video": "quiz/1/video.mp4", "text": "請你用兩分鐘簡單描述一下你最近的生活，最近都在做些什麼？", "answer_time": 5 ,"think_time": 10},
        { "id": 2, "video": "quiz/2/video.mp4", "text": "請問你會擔心癌症復發嗎？一分不會、十分非常嚴重，你覺得你有幾分？", "answer_time": 5 ,"think_time": 10},
        { "id": 3, "video": "quiz/3/video.mp4", "text": "你多常想到復發這件事？", "answer_time": 5 ,"think_time": 10},
        { "id": 4, "video": "quiz/4/video.mp4", "text": "你想到的時候感覺如何？想到時會影響日常生活嗎？生活中有哪些狀況會讓你擔心？", "answer_time": 5 ,"think_time": 10},
        { "id": 5, "video": "quiz/5/video.mp4", "text": "有其他家人可以幫助你嗎？有其他人可以幫助你嗎？醫療團隊可以如何幫助你呢？你希望醫療團隊可以提供哪些幫忙？", "answer_time": 5 ,"think_time": 10},
        { "id": 6, "video": "quiz/6/video.mp4", "text": "你擔心的時候通常會如何處理？通常怎麼做對你有幫助，或哪些是沒有幫助？", "answer_time": 5 ,"think_time": 10}
      ]
    }
    </script>
    ```

### 20250820 設定黑色介面

調整整體網頁配色為深色模式。
![image](https://github.com/HankLiu5110/audio_form-web_version/blob/master/image/change-to-dark-mode_setting_page.png)

![image](https://github.com/HankLiu5110/audio_form-web_version/blob/master/image/change-to-dark-mode_question_page.png)

### 20250820 增加VAD功能(語音活動偵測)

1. **設定每題須回答的時間**

      - 使用題庫 JSON 中的 `wait` 欄位（後續版本已改為 `answer_time`）來設定每題必須回答的秒數。

2. **回答進度顯示**

      - 「下一題」按鈕上的文字會顯示 `已回答秒數 / 須回答秒數`。

3. **狀態提示**

      - **未達標**：回答時間未達標時，提示「請再多回答一點」。
![image](https://github.com/HankLiu5110/audio_form-web_version/blob/master/image/%E8%AB%8B%E5%86%8D%E5%9B%9E%E7%AD%94%E4%B8%80%E9%BB%9E.png)
      - **回答中**：偵測到使用者正在說話時，提示「回答中...」。
![image](https://github.com/HankLiu5110/audio_form-web_version/blob/master/image/%E5%9B%9E%E7%AD%94%E4%B8%AD.png)
      - **已達標**：回答時間達到標準後，提示「若回答完畢可以進行下一題」，並啟用「下一題」按鈕。
![image](https://github.com/HankLiu5110/audio_form-web_version/blob/master/image/%E8%8B%A5%E5%9B%9E%E7%AD%94%E5%AE%8C%E7%95%A2%E5%8F%AF%E4%BB%A5%E9%80%B2%E8%A1%8C%E4%B8%8B%E4%B8%80%E9%A1%8C.png)


### 20250819 原始為 游仁杰 學長DEMO

- 專案初始版本，由游仁杰學長提供。
- 原始碼連結：[(Google Drive)](https://drive.google.com/file/d/1Vf-h6VXhsC2G-Ob-N52I24AiJyYoxLzG/view?usp=drivesdk)