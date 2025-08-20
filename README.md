# 擔心癌症復發問卷-網頁版

## 修改紀錄

### 20250819 原始為 游仁杰 學長DEMO [(Google Drive)](https://drive.google.com/file/d/1Vf-h6VXhsC2G-Ob-N52I24AiJyYoxLzG/view?usp=drivesdk)

### 20250820 增加VAD功能(語音活動偵測)

1.設定每題須回答的時間為原本題庫中的wait時間

```html
  # index.html
  <script id="manifest-inline" type="application/json">
  {
    "intro": {
      "video": "quiz/intro/video.mp4",
      "text": "擔心癌症復發，在癌症病友上是非常常見的現象，他不只影響癌友本人，也會影響家庭，或影響每天的生活。"
    },
    "questions": [
      { "id": 1, "video": "quiz/1/video.mp4", "text": "請你用兩分鐘簡單描述一下你最近的生活，最近都在做些什麼？", "wait": 5 },
      { "id": 2, "video": "quiz/2/video.mp4", "text": "請問你會擔心癌症復發嗎？一分不會、十分非常嚴重，你覺得你有幾分？", "wait": 5 },
      { "id": 3, "video": "quiz/3/video.mp4", "text": "你多常想到復發這件事？", "wait": 5 },
      { "id": 4, "video": "quiz/4/video.mp4", "text": "你想到的時候感覺如何？想到時會影響日常生活嗎？生活中有哪些狀況會讓你擔心？", "wait": 5 },
      { "id": 5, "video": "quiz/5/video.mp4", "text": "有其他家人可以幫助你嗎？有其他人可以幫助你嗎？醫療團隊可以如何幫助你呢？你希望醫療團隊可以提供哪些幫忙？", "wait": 5 },
      { "id": 6, "video": "quiz/6/video.mp4", "text": "你擔心的時候通常會如何處理？通常怎麼做對你有幫助，或哪些是沒有幫助？", "wait": 5 }
    ]
  }
  </script>
```

2.原始"下一題"按鈕上的秒數改成記錄 該題回答秒數/須回答的秒數

3.當開始回答時，若還沒達到設定的時間會在畫面下方提示"請再多回答一點"

![image](https://github.com/HankLiu5110/audio_form-web_version/blob/master/image/%E8%AB%8B%E5%86%8D%E5%9B%9E%E7%AD%94%E4%B8%80%E9%BB%9E.png)

4.當開始回答時，若偵測到使用者正在回答中會在畫面下方提示"回答中..."，該題回答秒數也會同步增加

![image](https://github.com/HankLiu5110/audio_form-web_version/blob/master/image/%E5%9B%9E%E7%AD%94%E4%B8%AD.png)

5.當開始回答時，若達到設定的回答時間後會在畫面下方提示"若回答完畢可以進行下一題"，下一題的按鈕也會同時點亮

![image](https://github.com/HankLiu5110/audio_form-web_version/blob/master/image/%E8%8B%A5%E5%9B%9E%E7%AD%94%E5%AE%8C%E7%95%A2%E5%8F%AF%E4%BB%A5%E9%80%B2%E8%A1%8C%E4%B8%8B%E4%B8%80%E9%A1%8C.png)

### 20250820 設定黑色介面

![image]()
![image]()
