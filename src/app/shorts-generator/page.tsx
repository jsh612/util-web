"use client";

import { generateContentFromModel } from "@/app/utils/actions/gemini-actions";
import { API_ROUTES } from "@/constants/routes";
import { CrawlResponse } from "@/types/api.types";
import { ShortsScript } from "@/types/shorts-generator.types";
import { ContentListUnion } from "@google/genai";
import { useState } from "react";

const SYSTEM_INSTRUCTION = `당신은 유튜브 쇼츠 비디오 스크립트를 작성하는 전문 작가입니다.
주어진 주제에 대해 시청자의 흥미를 끌 수 있는 {{scene_count}}개의 장면으로 구성된 스크립트를 작성해야 합니다.
각 장면은 다음 6가지 요소를 반드시 포함해야 합니다:

1.  **자막 (subtitle)**: 매우 코믹하고, 현실적인 내용으로 화면에 표시될 짧고 간결한 텍스트 (1~2문장)
2.  **이미지 프롬프트 (image_prompt)**: 장면에 어울리는 이미지를 생성하기 위한 상세한 영어로 작성된 프롬프트로서, 최대한 상세하게 묘사 (Gemini, Dall-E 또는 Midjourney와 같은 이미지 생성 AI가 이해할 수 있는 형식)
3.  **나레이션 (narration)**:  매우 코믹하고, 현실적인 내용으로, 쇼츠의 주인공이 말하는 대사야 (한 문장)
4.  **장면 (scene)**: 장면은 {{scene_count}}개로 구성해줘
5.  **쇼츠 제목 (shorts_title)**: 생성된 스크립트 내용을 바탕으로, 사람들의 호기심을 자극하고 클릭을 유도할 만한 '후킹'이 강력한 유튜브 쇼츠 제목을 1개 작성해줘.
6.  **쇼츠 설명 (shorts_description)**: 생성된 스크립트 내용을 바탕으로, 사람들의 흥미를 유발하고 클릭을 유도할 만한 유튜브 쇼츠 설명글을 1~2문장으로 작성해줘. (적절한 이모티콘과 줄바꿈 포함)

결과는 반드시 다음 JSON 형식으로 반환해야 합니다. 추가적인 설명 없이 JSON 객체만 반환해주세요.

# 결과 반환시 주의사항
- 반드시 json 형식에 맞도록 반환해줘

\`\`\`json
{
  "scenes": [
    {
      "scene": 1,
      "subtitle": "...",
      "image_prompt": "...",
      "narration": "..."
    }
    // ... 여기에 {{scene_count}}개의 장면을 생성해주세요.
  ],
  "shorts_title": "...",
  "shorts_description": "..."
}
\`\`\`
`;

const SYSTEM_INSTRUCTION_FOR_NEWS = `당신은 뉴스 기사를 유튜브 쇼츠 비디오 스크립트로 재구성하는 전문 작가입니다.
주어진 뉴스 기사 내용을 바탕으로, 시청자의 흥미를 끌 수 있는 {{scene_count}}개의 장면으로 구성된 스크립트를 작성해야 합니다.
각 장면은 다음 6가지 요소를 반드시 포함해야 합니다:

1.  **자막 (subtitle)**: 뉴스 기사의 핵심 내용을 전달하는 짧고 간결한 텍스트 (1~2문장)
2.  **이미지 프롬프트 (image_prompt)**: 뉴스 장면에 어울리는 이미지를 생성하기 위한 상세한 영어로 작성된 프롬프트 (Gemini, Dall-E 또는 Midjourney와 같은 이미지 생성 AI가 이해할 수 있는 형식)
3.  **나레이션 (narration)**: 뉴스 앵커나 전문 기자가 설명하는 듯한 톤의 대본 (1~3문장)
4.  **장면 (scene)**: 장면은 {{scene_count}}개로 구성해줘
5.  **쇼츠 제목 (shorts_title)**: 뉴스 기사 내용을 바탕으로, 사람들의 호기심을 자극하고 클릭을 유도할 만한 '후킹'이 강력한 유튜브 쇼츠 제목을 1개 작성해줘.
6.  **쇼츠 설명 (shorts_description)**: 생성된 스크립트 내용을 바탕으로, 사람들의 흥미를 유발하고 클릭을 유도할 만한 유튜브 쇼츠 설명글을 1~2문장으로 작성해줘. (적절한 이모티콘과 줄바꿈 포함, 관련 뉴스 해시태그 포함)

결과는 반드시 다음 JSON 형식으로 반환해야 합니다. 추가적인 설명 없이 JSON 객체만 반환해주세요.

# 결과 반환시 주의사항
- 반드시 json 형식에 맞도록 반환해줘
- 첫 번째 장면은 사람들의 시선을 사로잡을 가장 핵심적이고 흥미로운 내용으로 구성해줘.

\`\`\`json
{
  "scenes": [
    {
      "scene": 1,
      "subtitle": "...",
      "image_prompt": "...",
      "narration": "..."
    }
    // ... 여기에 {{scene_count}}개의 장면을 생성해주세요.
  ],
  "shorts_title": "...",
  "shorts_description": "..."
}
\`\`\`
`;

const SYSTEM_INSTRUCTION_FOR_COMMUNITY = `당신은 커뮤니티 게시글의 작성자가 되어, 자신의 글을 바탕으로 유튜브 쇼츠를 만드는 시나리오의 스크립트 작가입니다.
주어진 '커뮤니티 게시글'과 '주요 댓글' 내용을 바탕으로, 원본 글의 톤과 분위기를 완벽하게 유지하며, 시청자의 흥미를 끌 수 있는 {{scene_count}}개의 장면으로 구성된 스크립트를 작성해야 합니다.

# 구성 가이드
1.  **도입부 (첫 장면 고정)**: 첫 번째 장면은 반드시 '요즘 커뮤니티에 화제인 글'이라는 자막을 가진 타이틀 카드 형식으로 생성해주세요. 이 장면의 나레이션은 비워두고(\`"narration": ""\`), 이미지 프롬프트는 시선을 끄는 추상적이거나 상징적인 이미지로 만들어주세요.
2.  **본문 소개 (2번째 장면부터)**: '커뮤니티 게시글'의 내용을 중심으로, 작성자가 자신의 이야기를 소개하는 것처럼 스크립트를 작성해주세요.
3.  **댓글 반응 (이후 장면들)**: 주요 댓글을 하나씩 보여주세요.
4.  **마무리 (마지막 장면)**: 시청자들의 좋아요와 댓글을 유도하도록 해주세요.

각 장면은 다음 6가지 요소를 반드시 포함해야 합니다:

1.  **자막 (subtitle)**: 원본 게시글의 핵심 내용이나 재미있는 댓글을 재치있게 표현하는 짧고 간결한 텍스트 (1~2문장)
2.  **이미지 프롬프트 (image_prompt)**: 장면에 어울리는 이미지를 생성하기 위한 상세한 영어로 작성된 프롬프트 (Gemini, Dall-E 또는 Midjourney와 같은 이미지 생성 AI가 이해할 수 있는 형식)
3.  **나레이션 (narration)**: 게시글 작성자가 직접 말하는 듯한, 원본 글의 말투와 감정이 살아있는 대본 (1~3문장). (단, 도입부 장면은 예외적으로 나레이션을 비워주세요.)
4.  **장면 (scene)**: 장면은 {{scene_count}}개로 구성해줘
5.  **쇼츠 제목 (shorts_title)**: 게시글 내용을 바탕으로, 사람들의 호기심을 자극하고 클릭을 유도할 만한 '후킹'이 강력한 유튜브 쇼츠 제목을 1개 작성해줘. 원본 글의 느낌을 살려주세요.
6.  **쇼츠 설명 (shorts_description)**: 생성된 스크립트 내용을 바탕으로, 원본 게시글의 요약과 함께 사람들의 흥미를 유발할 만한 쇼츠 설명글을 1~2문장으로 작성해줘. (적절한 이모티콘과 줄바꿈 포함)

결과는 반드시 다음 JSON 형식으로 반환해야 합니다. 추가적인 설명 없이 JSON 객체만 반환해주세요.

# 결과 반환시 주의사항
- 반드시 json 형식에 맞도록 반환해줘
- 첫 번째 장면은 사람들의 시선을 사로잡을 가장 핵심적이고 흥미로운 내용으로 구성해줘.

\`\`\`json
{
  "scenes": [
    {
      "scene": 1,
      "subtitle": "...",
      "image_prompt": "...",
      "narration": "..."
    }
    // ... 여기에 {{scene_count}}개의 장면을 생성해주세요.
  ],
  "shorts_title": "...",
  "shorts_description": "..."
}
\`\`\`
`;

const RECOMMENDATION_SYSTEM_INSTRUCTION = `당신은 유튜브 쇼츠 콘텐츠 기획 전문가입니다.
사용자가 입력한 키워드나 문장을 바탕으로, 시청자들의 호기심을 자극하고 클릭을 유도할 수 있는 '후킹'이 강력한 유튜브 쇼츠 영상 주제 5개를 추천해주세요.
요즘 인스타그램, 유튜브에서 인기있는 주제로 선택해주세요.
결과는 반드시 다음 JSON 형식으로 반환해야 합니다. 추가적인 설명 없이 JSON 객체만 반환해주세요.

\`\`\`json
{
  "topics": [
    "주제 1",
    "주제 2",
    "주제 3",
    "주제 4",
    "주제 5"
  ]
}
\`\`\`
`;

export default function ShortsGeneratorPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [script, setScript] = useState<ShortsScript | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // JSON으로 직접 입력
  const [jsonScriptInput, setJsonScriptInput] = useState("");
  const [jsonScriptError, setJsonScriptError] = useState<string | null>(null);

  // 생성 모드 상태 (일반, 뉴스, 커뮤니티)
  const [generationMode, setGenerationMode] = useState<
    "general" | "news" | "community"
  >("general");
  // 뉴스 기사 URL 상태
  const [articleUrl, setArticleUrl] = useState("");
  const [communityPostContent, setCommunityPostContent] = useState("");
  const [communityComments, setCommunityComments] = useState("");
  const [sceneCount, setSceneCount] = useState(5);

  const DEFAULT_COMMON_PROMPTS = [
    "따뜻하고 매력적인 디즈니 애니메이션 스타일, 귀엽고 표정이 풍부한 의인화된 강아지 캐릭터, 생동감 있는 색상, 부드러운 조명",
    `1. 한국인 인물이 등장하는 극사실적인 실사 스타일, 시네마틱한 구도, 8K 고해상도, 자연광을 활용한 부드러운 조명, 피부 질감과 머리카락 한 올까지 살아있는 섬세한 묘사 
2. Generate a photo of a real person, not an illustration or cartoon.
    `,
    "세련되고 현대적인 애니메이션 스타일, 현실적인 비율의 캐릭터 디자인, 명확하고 세련된 라인, 차분하고 깊이 있는 색상 팔레트, 미묘하고 성숙한 감정 표현, 시네마틱한 연출, 30-40대 시청자들에게 공감을 줄 수 있는 성숙하고 깊이 있는 분위기",
  ];

  // 공통 이미지 프롬프트 상태
  const [commonImagePrompt, setCommonImagePrompt] = useState(
    DEFAULT_COMMON_PROMPTS[0]
  );

  // 주제 추천 기능 상태
  const [recommendationInput, setRecommendationInput] = useState("");
  const [recommendedTopics, setRecommendedTopics] = useState<string[]>([]);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [recommendationError, setRecommendationError] = useState<string | null>(
    null
  );

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedText(type);
      setTimeout(() => setCopiedText(null), 2000);
    });
  };

  const handleScriptChange = (
    sceneIndex: number,
    field: "subtitle" | "image_prompt" | "narration",
    value: string
  ) => {
    if (!script) return;
    const updatedScenes = script.scenes.map((s, i) => {
      if (i === sceneIndex) {
        return { ...s, [field]: value };
      }
      return s;
    });
    setScript({ ...script, scenes: updatedScenes });
  };

  const handleScriptMetaChange = (
    field: "shorts_title" | "shorts_description",
    value: string
  ) => {
    if (!script) return;
    setScript({ ...script, [field]: value });
  };

  const handleDeleteScene = (sceneIndex: number) => {
    if (!script) return;
    const updatedScenes = script.scenes
      .filter((_, i) => i !== sceneIndex)
      .map((s, i) => ({
        ...s,
        scene: i + 1,
      }));
    setScript({ ...script, scenes: updatedScenes });
  };

  const handleJsonScriptLoad = () => {
    if (!jsonScriptInput.trim()) {
      setJsonScriptError("JSON을 입력해주세요.");
      return;
    }

    try {
      const parsed = JSON.parse(jsonScriptInput);
      if (
        parsed &&
        Array.isArray(parsed.scenes) &&
        typeof parsed.shorts_title === "string" &&
        typeof parsed.shorts_description === "string"
      ) {
        setScript(parsed);
        setJsonScriptError(null);
        setJsonScriptInput(""); // 성공 시 입력창 초기화
      } else {
        throw new Error(
          "JSON 형식이 올바르지 않습니다. 'scenes', 'shorts_title', 'shorts_description' 필드를 확인해주세요."
        );
      }
    } catch (e) {
      setJsonScriptError(
        e instanceof Error ? e.message : "유효하지 않은 JSON 형식입니다."
      );
    }
  };

  const handleRecommend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recommendationInput.trim()) {
      setRecommendationError("키워드를 입력해주세요.");
      return;
    }

    setRecommendationLoading(true);
    setRecommendationError(null);
    setRecommendedTopics([]);

    try {
      const contents: ContentListUnion = [
        {
          role: "user",
          parts: [
            {
              text: `${RECOMMENDATION_SYSTEM_INSTRUCTION}\n\n키워드: ${recommendationInput}`,
            },
          ],
        },
      ];

      const resultText = await generateContentFromModel(contents);

      if (!resultText) {
        throw new Error("Gemini로부터 응답을 받지 못했습니다.");
      }

      const jsonMatch = resultText.match(/```json\s*([\s\S]*?)\s*```/);
      let parsedResult: { topics: string[] };

      if (!jsonMatch || !jsonMatch[1]) {
        try {
          parsedResult = JSON.parse(resultText);
        } catch {
          throw new Error("응답에서 유효한 JSON 형식을 찾을 수 없습니다.");
        }
      } else {
        const jsonString = jsonMatch[1];
        parsedResult = JSON.parse(jsonString);
      }

      if (parsedResult.topics && Array.isArray(parsedResult.topics)) {
        setRecommendedTopics(parsedResult.topics);
      } else {
        throw new Error("응답의 'topics' 필드가 유효하지 않습니다.");
      }
    } catch (err) {
      setRecommendationError(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다."
      );
    } finally {
      setRecommendationLoading(false);
    }
  };

  const handleTopicSelect = (selectedTopic: string) => {
    setTopic(selectedTopic);
    document.getElementById("main-topic-input")?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (generationMode === "general") {
      if (!topic.trim()) {
        setError("주제를 입력해주세요.");
        return;
      }
    } else if (generationMode === "news") {
      if (!articleUrl.trim()) {
        setError("기사 URL을 입력해주세요.");
        return;
      }
    } else if (generationMode === "community") {
      if (!communityPostContent.trim() || !communityComments.trim()) {
        setError("커뮤니티 본문과 댓글을 모두 입력해주세요.");
        return;
      }
    }

    setLoading(true);
    setError(null);
    setScript(null);

    try {
      const systemInstruction = (
        generationMode === "general"
          ? SYSTEM_INSTRUCTION
          : generationMode === "news"
          ? SYSTEM_INSTRUCTION_FOR_NEWS
          : SYSTEM_INSTRUCTION_FOR_COMMUNITY
      ).replace(/\{\{scene_count\}\}/g, String(sceneCount));

      let prompt = "";
      if (generationMode === "general") {
        prompt = `${systemInstruction}\n\nA.주제: ${topic}${
          commonImagePrompt
            ? `\n\nB.공통 이미지 프롬프트
          1. 이미지에 텍스트는 포함시키지말아줘. 해당 규칙은 개별 프롬프트에 모두 추가해줘.
          2. 모든 이미지 프롬프트는 개별적으로 이미지 생성 ai에 쓰일거야. 따라서, 개별적으로 사용되더라도 통일성있는 이미지 생성을 위하여 최대 배경, 사물, 캐릭터, 인물 등 이미지 생성에 필요한 모든 요소를 상세하고, 구체적인 묘사해줘.
          3. ${commonImagePrompt}`
            : ""
        }`;
      } else if (generationMode === "news") {
        // 뉴스 모드
        const res = await fetch(
          `${API_ROUTES.CRAWLER}?url=${encodeURIComponent(
            encodeURIComponent(articleUrl)
          )}`
        );
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "기사 크롤링에 실패했습니다.");
        }
        const articleData: CrawlResponse = await res.json();
        prompt = `${systemInstruction}

# 뉴스 기사 원문
- 제목: ${articleData.title}
- 내용: ${articleData.content}
- 언론사: ${articleData.publisher}
- 작성자: ${articleData.author}
- 날짜: ${articleData.date}
        
${
  commonImagePrompt
    ? `\n\n# 공통 이미지 프롬프트
          1. 이미지에 텍스트는 포함시키지말아줘. 해당 규칙은 개별 프롬프트에 모두 추가해줘.
          2. 모든 이미지 프롬프트는 개별적으로 이미지 생성 ai에 쓰일거야. 따라서, 개별적으로 사용되더라도 통일성있는 이미지 생성을 위하여 최대 배경, 사물, 캐릭터, 인물 등 이미지 생성에 필요한 모든 요소를 상세하고, 구체적인 묘사해줘.
          3. ${commonImagePrompt}`
    : ""
}`;
      } else if (generationMode === "community") {
        // 커뮤니티 모드
        prompt = `${systemInstruction}

# 커뮤니티 게시글
${communityPostContent}

# 주요 댓글
${communityComments}

${
  commonImagePrompt
    ? `\n\n# 공통 이미지 프롬프트
          1. 이미지에 텍스트는 포함시키지말아줘. 해당 규칙은 개별 프롬프트에 모두 추가해줘.
          2. 모든 이미지 프롬프트는 개별적으로 이미지 생성 ai에 쓰일거야. 따라서, 개별적으로 사용되더라도 통일성있는 이미지 생성을 위하여 최대 배경, 사물, 캐릭터, 인물 등 이미지 생성에 필요한 모든 요소를 상세하고, 구체적인 묘사해줘.
          3. ${commonImagePrompt}`
    : ""
}`;
      }

      const contents: ContentListUnion = [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ];

      const resultText = await generateContentFromModel(contents);

      if (!resultText) {
        throw new Error("Gemini로부터 응답을 받지 못했습니다.");
      }

      // Gemini가 생성한 텍스트에서 JSON 부분만 추출
      const jsonMatch = resultText.match(/```json\s*([\s\S]*?)\s*```/);
      if (!jsonMatch || !jsonMatch[1]) {
        // 때로는 마크다운 블록 없이 순수 JSON만 반환할 수 있으므로, 전체 텍스트를 파싱 시도
        try {
          const parsedResult: ShortsScript = JSON.parse(resultText);
          setScript(parsedResult);
        } catch {
          throw new Error("응답에서 유효한 JSON 스크립트를 찾을 수 없습니다.");
        }
      } else {
        const jsonString = jsonMatch[1];
        const parsedResult: ShortsScript = JSON.parse(jsonString);
        setScript(parsedResult);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-teal-400 mb-8">
        유튜브 쇼츠 스크립트 생성기
      </h1>

      {generationMode === "general" && (
        <form onSubmit={handleRecommend} className="space-y-4 mb-12">
          <div className="p-6 bg-slate-700/50 backdrop-blur-sm rounded-xl border border-slate-600/50 shadow-lg space-y-4">
            <h2 className="text-xl font-bold text-slate-200">
              ✨ AI 주제 추천
            </h2>
            <p className="text-slate-400">
              어떤 주제로 쇼츠를 만들지 막막하신가요? 키워드를 입력하면 AI가
              매력적인 주제를 추천해 드립니다.
            </p>
            <textarea
              value={recommendationInput}
              onChange={(e) => setRecommendationInput(e.target.value)}
              placeholder="예: 강아지, 우주, 코딩 꿀팁"
              className="w-full p-3 bg-slate-800 border border-slate-600 rounded-md focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition"
              rows={2}
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={recommendationLoading || !recommendationInput.trim()}
                className="px-6 py-2 bg-indigo-500 text-white font-bold rounded-lg hover:bg-indigo-600 disabled:bg-slate-500 disabled:cursor-not-allowed transition-colors"
              >
                {recommendationLoading ? "추천받는 중..." : "추천받기"}
              </button>
            </div>
          </div>
          {recommendationError && (
            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-sm">
              {recommendationError}
            </div>
          )}
          {recommendedTopics.length > 0 && (
            <div className="p-4 bg-slate-800/30 rounded-xl space-y-3">
              <h3 className="text-lg font-semibold text-slate-300">
                추천 주제:
              </h3>
              <div className="flex flex-wrap gap-2">
                {recommendedTopics.map((item, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleTopicSelect(item)}
                    className="px-4 py-2 bg-teal-500/20 text-teal-300 rounded-full hover:bg-teal-500/40 hover:text-white transition-colors"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}
        </form>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="p-6 bg-slate-700/50 backdrop-blur-sm rounded-xl border border-slate-600/50 shadow-lg space-y-6">
          <h2 className="text-xl font-bold text-slate-200 mb-4">
            생성 모드 선택
          </h2>
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => setGenerationMode("general")}
              className={`px-6 py-2 rounded-lg border text-base font-semibold transition-all ${
                generationMode === "general"
                  ? "bg-teal-500 border-teal-400 text-white shadow-lg shadow-teal-500/20"
                  : "bg-slate-800/50 border-slate-600/50 text-slate-300 hover:bg-slate-700/50"
              }`}
            >
              일반 쇼츠
            </button>
            <button
              type="button"
              onClick={() => setGenerationMode("news")}
              className={`px-6 py-2 rounded-lg border text-base font-semibold transition-all ${
                generationMode === "news"
                  ? "bg-teal-500 border-teal-400 text-white shadow-lg shadow-teal-500/20"
                  : "bg-slate-800/50 border-slate-600/50 text-slate-300 hover:bg-slate-700/50"
              }`}
            >
              뉴스 쇼츠
            </button>
            <button
              type="button"
              onClick={() => setGenerationMode("community")}
              className={`px-6 py-2 rounded-lg border text-base font-semibold transition-all ${
                generationMode === "community"
                  ? "bg-teal-500 border-teal-400 text-white shadow-lg shadow-teal-500/20"
                  : "bg-slate-800/50 border-slate-600/50 text-slate-300 hover:bg-slate-700/50"
              }`}
            >
              커뮤니티 게시물
            </button>
          </div>

          <div className="mt-6 space-y-4">
            {generationMode === "general" ? (
              <div>
                <h2 className="text-xl font-bold text-slate-200">주제 입력</h2>
                <textarea
                  id="main-topic-input"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="예: 우주에 대한 10가지 놀라운 사실"
                  className="w-full p-3 bg-slate-800 border border-slate-600 rounded-md focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition mt-2"
                  rows={5}
                />
              </div>
            ) : generationMode === "news" ? (
              <div>
                <h2 className="text-xl font-bold text-slate-200">
                  뉴스 기사 URL 입력
                </h2>
                <input
                  id="main-topic-input"
                  value={articleUrl}
                  onChange={(e) => setArticleUrl(e.target.value)}
                  placeholder="예: https://www.bloter.net/news/articleView.html?idxno=..."
                  className="w-full p-3 bg-slate-800 border border-slate-600 rounded-md focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition mt-2"
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-200">
                    커뮤니티 본문 입력
                  </h2>
                  <textarea
                    id="community-post-input"
                    value={communityPostContent}
                    onChange={(e) => setCommunityPostContent(e.target.value)}
                    placeholder="커뮤니티 게시글 본문 내용을 여기에 붙여넣어주세요."
                    className="w-full p-3 bg-slate-800 border border-slate-600 rounded-md focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition mt-2"
                    rows={8}
                  />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-200">
                    주요 댓글 입력
                  </h2>
                  <textarea
                    id="community-comments-input"
                    value={communityComments}
                    onChange={(e) => setCommunityComments(e.target.value)}
                    placeholder="반응이 재미있는 주요 댓글들을 여기에 붙여넣어주세요."
                    className="w-full p-3 bg-slate-800 border border-slate-600 rounded-md focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition mt-2"
                    rows={5}
                  />
                </div>
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-slate-200">장면 수</h2>
              <input
                id="scene-count-input"
                type="number"
                value={sceneCount}
                onChange={(e) => {
                  setSceneCount(Number(e.target.value));
                }}
                className="w-full p-3 bg-slate-800 border border-slate-600 rounded-md focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition mt-2"
              />
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200">
              {error}
            </div>
          )}

          <h3 className="text-lg font-bold text-slate-300 pt-2">
            공통 이미지 프롬프트 (선택)
          </h3>
          <p className="text-sm text-slate-400 -mt-2">
            모든 장면에 공통적으로 적용될 이미지 스타일이나 요소를 입력해주세요.
            (예: &quot;cinematic, hyper-realistic, 8k&quot;)
          </p>
          <div className="flex flex-wrap gap-2 my-3">
            {DEFAULT_COMMON_PROMPTS.map((prompt, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setCommonImagePrompt(prompt)}
                className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                  commonImagePrompt === prompt
                    ? "bg-teal-500 text-white font-semibold"
                    : "bg-slate-600 text-slate-300 hover:bg-slate-500"
                }`}
              >
                기본 프롬프트 #{index + 1}
              </button>
            ))}
          </div>
          <textarea
            id="common-prompt-input"
            value={commonImagePrompt}
            onChange={(e) => setCommonImagePrompt(e.target.value)}
            className="w-full p-3 bg-slate-800 border border-slate-600 rounded-md focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition"
            rows={5}
          />
        </div>

        <div className="flex justify-center mt-6">
          <button
            type="submit"
            disabled={
              loading ||
              (generationMode === "general"
                ? !topic.trim()
                : generationMode === "news"
                ? !articleUrl.trim()
                : !communityPostContent.trim() || !communityComments.trim())
            }
            className="px-8 py-3 bg-teal-500 text-white font-bold rounded-lg hover:bg-teal-600 disabled:bg-slate-500 disabled:cursor-not-allowed transition-colors"
          >
            {loading
              ? "생성 중..."
              : `${
                  generationMode === "general"
                    ? "일반"
                    : generationMode === "news"
                    ? "뉴스"
                    : "커뮤니티"
                } 스크립트 생성`}
          </button>
        </div>
      </form>

      <div className="my-8">
        <div className="p-6 bg-slate-700/50 backdrop-blur-sm rounded-xl border border-slate-600/50 shadow-lg space-y-4">
          <h2 className="text-xl font-bold text-slate-200">
            JSON으로 스크립트 직접 입력
          </h2>
          <p className="text-slate-400">
            기존에 생성했거나 직접 작성한 스크립트 JSON을 붙여넣기하여 수정할 수
            있습니다.
          </p>
          <textarea
            value={jsonScriptInput}
            onChange={(e) => setJsonScriptInput(e.target.value)}
            placeholder={`{\n  "scenes": [...],\n  "shorts_title": "...",\n  "shorts_description": "..."\n}`}
            className="w-full p-3 bg-slate-800 border border-slate-600 rounded-md focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition font-mono text-sm"
            rows={6}
          />
          {jsonScriptError && (
            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-sm">
              {jsonScriptError}
            </div>
          )}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleJsonScriptLoad}
              className="px-6 py-2 bg-indigo-500 text-white font-bold rounded-lg hover:bg-indigo-600 transition-colors"
            >
              스크립트 불러오기
            </button>
          </div>
        </div>
      </div>

      {script && (
        <div className="mt-8 p-6 bg-slate-700/50 backdrop-blur-sm rounded-xl border border-slate-600/50 shadow-lg space-y-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-slate-200">
              생성된 스크립트 (수정 가능)
            </h2>
            <button
              type="button"
              onClick={() =>
                handleCopy(JSON.stringify(script, null, 2), "full-script")
              }
              className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-slate-500 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {copiedText === "full-script"
                ? "✅ 복사 완료!"
                : "📜 전체 스크립트 복사 (JSON)"}
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                쇼츠 제목
              </label>
              <div className="flex items-start space-x-2">
                <textarea
                  value={script.shorts_title}
                  onChange={(e) =>
                    handleScriptMetaChange("shorts_title", e.target.value)
                  }
                  className="w-full flex-grow p-3 bg-slate-900 rounded-md focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition"
                  rows={2}
                />
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(script.shorts_title, `shorts-title`)
                  }
                  className="p-2 bg-slate-600 hover:bg-slate-500 rounded-md w-12 h-10 flex items-center justify-center shrink-0"
                >
                  {copiedText === `shorts-title` ? "✅" : "📋"}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                쇼츠 설명
              </label>
              <div className="flex items-start space-x-2">
                <textarea
                  value={script.shorts_description}
                  onChange={(e) =>
                    handleScriptMetaChange("shorts_description", e.target.value)
                  }
                  className="w-full flex-grow p-3 bg-slate-900 rounded-md focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition"
                  rows={3}
                />
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(script.shorts_description, `shorts-description`)
                  }
                  className="p-2 bg-slate-600 hover:bg-slate-500 rounded-md w-12 h-10 flex items-center justify-center shrink-0"
                >
                  {copiedText === `shorts-description` ? "✅" : "📋"}
                </button>
              </div>
            </div>
          </div>

          {script.scenes.map((scene, index) => (
            <div
              key={scene.scene}
              className="p-4 bg-slate-800/50 rounded-lg border border-slate-700"
            >
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xl font-semibold text-teal-400">
                  장면 #{scene.scene}
                </h3>
                <button
                  type="button"
                  onClick={() => handleDeleteScene(index)}
                  className="px-3 py-1 text-sm bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition-colors"
                >
                  삭제
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">
                    자막
                  </label>
                  <div className="flex items-start space-x-2">
                    <textarea
                      value={scene.subtitle}
                      onChange={(e) =>
                        handleScriptChange(index, "subtitle", e.target.value)
                      }
                      className="w-full flex-grow p-3 bg-slate-900 rounded-md focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition"
                      rows={3}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(scene.subtitle, `subtitle-${scene.scene}`)
                      }
                      className="p-2 bg-slate-600 hover:bg-slate-500 rounded-md w-12 h-10 flex items-center justify-center shrink-0"
                    >
                      {copiedText === `subtitle-${scene.scene}` ? "✅" : "📋"}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">
                    이미지 프롬프트
                  </label>
                  <div className="flex items-start space-x-2">
                    <textarea
                      value={scene.image_prompt}
                      onChange={(e) =>
                        handleScriptChange(
                          index,
                          "image_prompt",
                          e.target.value
                        )
                      }
                      className="w-full flex-grow p-3 bg-slate-900 rounded-md font-mono text-sm focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition"
                      rows={4}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(scene.image_prompt, `prompt-${scene.scene}`)
                      }
                      className="p-2 bg-slate-600 hover:bg-slate-500 rounded-md w-12 h-10 flex items-center justify-center shrink-0"
                    >
                      {copiedText === `prompt-${scene.scene}` ? "✅" : "📋"}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">
                    나레이션
                  </label>
                  <div className="flex items-start space-x-2">
                    <textarea
                      value={scene.narration}
                      onChange={(e) =>
                        handleScriptChange(index, "narration", e.target.value)
                      }
                      className="w-full flex-grow p-3 bg-slate-900 rounded-md focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition"
                      rows={4}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(scene.narration, `narration-${scene.scene}`)
                      }
                      className="p-2 bg-slate-600 hover:bg-slate-500 rounded-md w-12 h-10 flex items-center justify-center shrink-0"
                    >
                      {copiedText === `narration-${scene.scene}` ? "✅" : "📋"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
