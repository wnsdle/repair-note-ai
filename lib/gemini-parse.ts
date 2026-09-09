const GEMINI_CHAT_MODEL = "gemini-3.6-flash";

async function callGeminiForJson(
  inlinePart: { mimeType: string; data: string },
  prompt: string
): Promise<any | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY 환경변수가 설정되지 않았습니다.");
    return null;
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_CHAT_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inlineData: { mimeType: inlinePart.mimeType, data: inlinePart.data } },
                { text: prompt }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: "application/json",
            thinkingConfig: { thinkingLevel: "low" }
          }
        })
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      if (response.status === 404) {
        console.error(`Gemini parse API 404: 모델명(${GEMINI_CHAT_MODEL})을 확인하세요.`, errorBody);
      } else if (response.status === 401 || response.status === 403) {
        console.error("Gemini parse API 인증 오류: GEMINI_API_KEY를 확인하세요.", errorBody);
      } else if (response.status === 429) {
        console.error("Gemini parse API 요청 한도 초과(429).", errorBody);
      } else {
        console.error(`Gemini parse API error (${response.status})`, errorBody);
      }
      return null;
    }

    const json = await response.json();
    const text =
      json?.candidates?.[0]?.content?.parts
        ?.map((p: any) => p.text)
        .filter(Boolean)
        .join("") || "";

    if (!text) return null;

    try {
      return JSON.parse(text);
    } catch {
      console.error("Gemini parse 응답이 JSON 형식이 아닙니다.", text);
      return null;
    }
  } catch (error) {
    console.error("Gemini parse 요청 실패", error);
    return null;
  }
}

export type VoiceNoteResult = {
  transcript: string;
  symptom: string;
  errorCodes: string; // 여러 줄(엔터 구분) 문자열
  inspection: string;
  cause: string;
};

/**
 * 정비사가 말로 남긴 음성메모를 듣고, 정비 기록 폼에 맞는 필드로 구조화합니다.
 * 오디오에 없는 정보는 빈 문자열로 둡니다(추측해서 채우지 않음).
 */
export async function parseVoiceNote(audioBase64: string, mimeType: string): Promise<VoiceNoteResult | null> {
  const prompt = `당신은 상용차(대형 화물차) 정비사의 음성메모를 듣고 정비 기록으로 정리하는 보조입니다.
아래 오디오는 정비사가 작업 중/작업 후 말로 남긴 메모입니다. 내용을 듣고 아래 JSON 형식으로만 답하세요.
설명, 인사말, 마크다운 코드블록 없이 순수 JSON 객체만 출력하세요.

{
  "transcript": "들은 내용을 그대로 옮겨적은 텍스트",
  "symptom": "증상 설명 (오디오에서 언급된 경우만, 없으면 빈 문자열)",
  "errorCodes": "경고등/진단코드가 언급되었다면 줄바꿈으로 구분해서, 없으면 빈 문자열",
  "inspection": "점검한 내용 (언급된 경우만, 없으면 빈 문자열)",
  "cause": "확인한 원인 (언급된 경우만, 없으면 빈 문자열)"
}

오디오에 없는 내용을 추측해서 채우지 마세요. 애매하면 빈 문자열로 두세요.`;

  const result = await callGeminiForJson({ mimeType, data: audioBase64 }, prompt);
  if (!result) return null;

  return {
    transcript: typeof result.transcript === "string" ? result.transcript : "",
    symptom: typeof result.symptom === "string" ? result.symptom : "",
    errorCodes: typeof result.errorCodes === "string" ? result.errorCodes : "",
    inspection: typeof result.inspection === "string" ? result.inspection : "",
    cause: typeof result.cause === "string" ? result.cause : ""
  };
}

export type WorkOrderParseResult = {
  orderId: string;
  plateNumber: string;
  vehicleType: string;
  modelYear: string;
  mileage: string;
  symptom: string;
};

/**
 * 작업지시서(정비 의뢰서) 사진을 읽어서 정비 기록 폼에 맞는 필드로 추출합니다.
 * 사진에 없는 정보는 빈 문자열로 둡니다(추측해서 채우지 않음).
 */
export async function parseWorkOrderImage(imageBase64: string, mimeType: string): Promise<WorkOrderParseResult | null> {
  const prompt = `당신은 상용차(대형 화물차) 정비소의 작업지시서(정비 의뢰서) 사진을 읽고 정보를 추출하는 보조입니다.
아래 이미지는 작업지시서입니다. 내용을 읽고 아래 JSON 형식으로만 답하세요.
설명, 인사말, 마크다운 코드블록 없이 순수 JSON 객체만 출력하세요.

{
  "orderId": "오더번호/접수번호 (문서에 있는 경우만, 없으면 빈 문자열)",
  "plateNumber": "차량번호 (있는 경우만, 없으면 빈 문자열)",
  "vehicleType": "차량형식/차종 (있는 경우만, 없으면 빈 문자열)",
  "modelYear": "연식 (있는 경우만, 없으면 빈 문자열)",
  "mileage": "주행거리 (있는 경우만, 없으면 빈 문자열)",
  "symptom": "고객 요청사항/증상 설명 (문서에 적혀 있는 경우만, 없으면 빈 문자열)"
}

문서에 없는 내용을 추측해서 채우지 마세요. 글씨가 흐리거나 애매하면 빈 문자열로 두세요.`;

  const result = await callGeminiForJson({ mimeType, data: imageBase64 }, prompt);
  if (!result) return null;

  return {
    orderId: typeof result.orderId === "string" ? result.orderId : "",
    plateNumber: typeof result.plateNumber === "string" ? result.plateNumber : "",
    vehicleType: typeof result.vehicleType === "string" ? result.vehicleType : "",
    modelYear: typeof result.modelYear === "string" ? result.modelYear : "",
    mileage: typeof result.mileage === "string" ? result.mileage : "",
    symptom: typeof result.symptom === "string" ? result.symptom : ""
  };
}
