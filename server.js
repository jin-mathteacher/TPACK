const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Google Gemini API 클라이언트는 요청마다 동적으로 생성 (API 키를 클라이언트에서 받음)

// TPACK 수업 설계안 생성 API
app.post('/api/generate-lesson-plan', async (req, res) => {
  try {
    const { subject, teachingMethods, techTools, apiKey } = req.body;

    // API 키 확인
    if (!apiKey) {
      return res.status(400).json({ 
        error: 'API 키가 제공되지 않았습니다.' 
      });
    }

    if (!subject || !teachingMethods || !techTools) {
      return res.status(400).json({ 
        error: '모든 필수 항목을 입력해주세요.' 
      });
    }

    // 클라이언트에서 제공한 API 키로 Google Gemini API 클라이언트 생성
    const genAI = new GoogleGenerativeAI(apiKey);

    // 교수법(P) 매핑
    const methodMap = {
      '1': '강의 및 개념 설명',
      '2': '탐구 및 프로젝트',
      '3': '토의 및 토론',
      '4': '협력 및 동료 학습',
      '5': '게임 및 퀴즈',
      '6': '직접 입력'
    };

    // 기술 도구(T) 매핑
    const toolMap = {
      'A': '학생 1인 1기기',
      'B': '모둠별 기기 사용',
      'C': '교사만 기기 사용',
      'D': '아날로그 혼합',
      'E': '특정 도구 희망'
    };

    const selectedMethods = teachingMethods.map(m => 
      methodMap[m] || m
    ).join(', ');
    
    const selectedTools = techTools.map(t => 
      toolMap[t] || t
    ).join(', ');

    // 프롬프트 구성
    const systemPrompt = `당신은 대한민국 교사를 위한 'TPACK 수업 설계 전문 컨설턴트'입니다. 
사용자가 제공한 수업 주제, 교수법(P), 기술 도구(T)를 바탕으로 구체적이고 실용적인 수업 설계안을 작성해주세요.

반드시 아래 형식의 표로 응답해야 합니다. 마크다운 표 형식을 정확히 지켜주세요.`;

    const userPrompt = `다음 정보를 바탕으로 TPACK 수업 설계안을 작성해주세요:

**1. 수업 주제 및 대상:** ${subject}
**2. 선호하는 수업 방식 (P):** ${selectedMethods}
**3. 기술 및 도구 환경 (T):** ${selectedTools}

다음 형식으로 답변해주세요:

## 🏫 [학년/과목] TPACK 수업 설계안: [주제]
> **설계 요약:** **[선택한 P]** 방식과 **[선택한 T]** 환경을 융합한 수업 흐름입니다.

| 수업 단계 | 📘 내용 지식 (CK)<br>(필수 설명 & 핵심 발문) | 🗣️ 교수 전략 (PK)<br>(활동 운영 & 상호작용) | 💻 기술 활용 (TK)<br>(구체적 조작 & 도구 팁) |
| :--- | :--- | :--- | :--- |
| **도입**<br>(5~10분) | **[발문]** (흥미 유발 질문)<br>**[전시학습]** (필수 확인 개념) | **[전략]** (선택한 P 방식 반영)<br>(예: 분위기 조성, 퀴즈 등) | **[도구: OO]**<br>• (구체적 실행 방법 서술)<br>• (화면 공유, QR 제시 등 Action) |
| **전개 1**<br>(탐구/활동) | **[핵심 개념]** (교과서 정의)<br>⚠️**오개념 지도:** (학생들이 자주 틀리는 점) | **[활동]** (구체적 지시사항)<br>**[비계]** (순회 지도 시 팁) | **[도구: OO]**<br>• (앱 실행 및 메뉴 조작법)<br>• (결과물 공유 기능 활용) |
| **전개 2**<br>(심화/적용) | **[심화 원리]** (실생활/타교과 연계)<br>**[정리]** (개념 구조화) | **[상호작용]** (피드백, 동료평가)<br>**[역할]** (모둠원 역할 부여) | **[도구: OO]**<br>• (댓글 달기, 좋아요 기능)<br>• (데이터 시각화 등) |
| **정리**<br>(5~10분) | **[배움 정리]** (한 문장 요약)<br>**[차시 예고]** | **[성찰]** (느낀 점 나누기) | **[도구: OO]**<br>• (형성평가 링크 배포)<br>• (결과 데이터 확인) |

**💡 선생님을 위한 T-P-C 꿀팁:**
(선택한 도구와 교수법을 섞었을 때 발생할 수 있는 문제점 해결책이나, 수업을 더 매끄럽게 할 노하우 1가지)

중요: 반드시 마크다운 표 형식으로 작성하고, 각 단계별로 구체적이고 실용적인 내용을 제공해주세요.`;

    // Google Gemini API 호출
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-pro',
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2000,
      },
    });
    
    const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;
    
    const result = await model.generateContent(combinedPrompt);

    const lessonPlan = result.response.text();

    res.json({ 
      success: true,
      lessonPlan: lessonPlan 
    });

  } catch (error) {
    console.error('Error generating lesson plan:', error);
    res.status(500).json({ 
      error: '수업 설계안 생성 중 오류가 발생했습니다.',
      details: error.message 
    });
  }
});

// 진보적 탐구활동 - 확인 및 모른하기 단계 API
app.post('/api/inquiry-check', async (req, res) => {
  try {
    const { topic, question, explanation, apiKey } = req.body;

    // API 키 확인
    if (!apiKey) {
      return res.status(400).json({ 
        error: 'API 키가 제공되지 않았습니다.' 
      });
    }

    if (!topic || !question || !explanation) {
      return res.status(400).json({ 
        error: '모든 필수 항목을 입력해주세요.' 
      });
    }

    // 클라이언트에서 제공한 API 키로 Google Gemini API 클라이언트 생성
    const genAI = new GoogleGenerativeAI(apiKey);

    // 프롬프트 구성
    const systemPrompt = `당신은 교사들이 '진보적 탐구 모델(Progressive Inquiry Model)'을 쉽게 실습해 볼 수 있도록 돕는 '탐구 학습 코치'입니다.
당신의 역할은 사용자가 입력한 설명에서 '아직 확실하지 않은 부분'이나 '검증이 필요한 부분'을 지적하며 대화를 이끄는 것입니다.
비판적 동료가 되어 친절하게 피드백을 제공하세요.`;

    const userPrompt = `다음은 진보적 탐구 모델 실습 중입니다:

**탐구 주제:** ${topic}
**초기 질문:** ${question}
**잠정적 설명:** ${explanation}

위 설명에서 다음을 분석해주세요:
1. 이 설명에서 아직 확실하지 않은 부분이나 검증이 필요한 부분은 무엇인가요?
2. 이 설명을 증명하거나 반박하기 위해 필요한 것은 무엇인가요?
3. 우리가 아직 모르는 것은 무엇인가요?

친절하고 구체적으로 피드백을 제공해주세요. 사용자가 다음 단계(질문 확장)로 나아갈 수 있도록 도와주세요.

응답 형식:
- 먼저 설명의 긍정적인 부분을 언급하세요
- 그 다음 아직 확실하지 않은 부분이나 검증이 필요한 부분을 구체적으로 지적하세요
- 마지막으로 "그렇다면 이 부분은 어떻게 증명할 수 있을까요?" 또는 "이 설명에서 우리가 아직 모르는 것은 무엇일까요?"와 같은 질문으로 마무리하세요

응답은 200자 이내로 간결하게 작성해주세요.`;

    // Google Gemini API 호출
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-pro',
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 300,
      },
    });
    
    const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;
    
    const result = await model.generateContent(combinedPrompt);

    const feedback = result.response.text();
    
    // 모르는 점 추출 (간단한 추출 로직)
    const unknowns = feedback;

    res.json({ 
      success: true,
      feedback: feedback,
      unknowns: unknowns
    });

  } catch (error) {
    console.error('Error in inquiry check:', error);
    res.status(500).json({ 
      error: '탐구 확인 중 오류가 발생했습니다.',
      details: error.message 
    });
  }
});

// 루트 경로
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Vercel 배포를 위한 export (서버리스 함수)
module.exports = app;

// 로컬 개발 환경에서만 서버 시작
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 TPACK 수업 설계 도우미 서버가 포트 ${PORT}에서 실행 중입니다.`);
    console.log(`📖 브라우저에서 http://localhost:${PORT} 로 접속하세요.`);
  });
}



