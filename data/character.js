export const characterData = {
  // 공통 정보
  common: {
    birthday: "11월 29일",
    birthFlower: "바카리스",
    birthTree: "사시나무",
    birthStone: "알렉산드라이트 토르마린",
    birthColor: { name: "블록 레드", hex: "#8B0000" },
    wand: {
      wood: "아카시아",
      core: "유니콘의 털",
      length: "7.75inch",
      flexibility: "딱딱한"
    },
    bloodStatus: "머글 혈통"
  },

  // 나이별 프로필
  profiles: {
    "11": {
      themeColor: "#FFD800",
      name: { kr: "모리슨 벨 라이어", en: "MORRISON BELL LIAR" },
      affiliation: { type: "house", name: "HUFFLEPUFF" },
      
      proposition: {
        number: "제 1 명제",
        kanji: "定",
        description: "모든 <em>미래</em>는 불변한다."
      },
      
      quote: {
        main: "<em>데자뷔</em>....",
        sub: null,
        description: [
          "처음 접하는 상황, 또는 장소인데도",
          "<em>왠지 익숙하게 느껴지는 현상</em>",
          "을 뜻한다.",
          "",
          "1900년 프랑스의 의사 플로랑스 아르노가",
          "처음으로 데자뷔 현상에 대하여 정의했다."
        ]
      },
      
      personality: {
        tags: ["#무신경", "#무반응", "#무감각"],
        description: [
          "무신경, 무반응, 무감각.",
          "모리슨을 이루는 세가지 단어들이다.",
          "그는 언제나 한발 뒤로 물러나 있었다."
        ]
      },
      
      basic: {
        height: "130cm",
        weight: "25kg",
        house: "후플푸프",
        nationality: "아일랜드"
      },
      
      magic: {
        moodSong: { title: "없어, 없어", artist: "니노마에 이나이스" }
      },
      
      relationships: []
    },

    "17": {
      themeColor: "#FBEFEF",
      themeColorAccent: "#c9a090",
      name: { kr: "모리슨 벨 라이어", en: "MORRISON BELL LIAR" },
      affiliation: { type: "house", name: "HUFFLEPUFF" },
      
      proposition: {
        number: "제 2 반론",
        kanji: "反",
        description: "인간은 <em>운명조차</em> 변화시킬수 있다."
      },
      
      quote: {
        main: "<em>친애</em>하는 <em>나</em>의....",
        sub: "자메뷔( jamais Vu )",
        description: [
          "기억착오 중 하나로, 기시감의 반대 개념으로,",
          "기시감이 미지를 보고서 기지를 느낀다면,",
          "미시감은 그 반대로",
          "<em>과거에 봤던 것을 처음 보는 것으로 느끼거나</em>",
          "<em>잘 알고 있는 곳인데도 처음 와보는 곳처럼</em>",
          "<em>느끼는 현상이다.</em>"
        ]
      },
      
      personality: {
        tags: ["#낭만적인", "#다정한", "#상냥한"],
        description: [
          "이상하게 기워진 헝겊인형처럼,",
          "고장난 오토마톤처럼 어색히 굴던 그는",
          "제대로 수선받은 것마냥",
          "이상적인 학생으로 살기 시작했다."
        ]
      },
      
      basic: {
        height: "147cm",
        weight: "45kg",
        house: "후플푸프",
        nationality: "아일랜드"
      },
      
      magic: {
        moodSong: { title: "All Alone With You", artist: "Yoei" }
      },
      
      relationships: [
        { name: "엘로웬 모턴", initial: "E", description: "친구 (구)" },
        { name: "아멜리아 레이젠", initial: "A", description: "티타임 메이트" },
        { name: "시에라 벤더미어", initial: "S", description: "퀴디치 메이트" }
      ]
    },

    "29": {
      themeColor: "#B2B0E8",
      name: { kr: "아난케 에이와스 리드맨", en: "ANANKE AIWASS LEADMAN" },
      affiliation: { type: "order", name: "PHOENIX ORDER" },
      
      proposition: {
        number: "제 3 진리",
        kanji: "合",
        description: "전도자가 이르되 헛되고 헛되며 헛되고 헛되니 <em>모든 것이</em> 헛되도다."
      },
      
      quote: {
        main: "나중에 못 볼지도 모르니까 미리 <em>인사</em>하자.",
        sub: "좋은 아침, 좋은 저녁, 그리고 좋은 점심.",
        description: [
          "어느 얇은 저주가 된다.",
          "지식을 갈구한 바벨이 지리멸렬한 종말을 맞이했듯이.",
          "그래 그는 허무를 아는 자, 공허를 전도하는 이.",
          "아, 의미를 잃은 미치광이가 당도했다."
        ]
      },
      
      personality: {
        tags: ["#허무", "#무기력", "#상실"],
        description: [
          "29년간 똑같은 엔드롤을 바라보았으니",
          "이제 그만 지루한 클리셰를 끊어낼",
          "결단을 할 날이 오지 않았는가.",
          "지독하다. 평생 해소되지않을 갈증을",
          "안고서 걸어야하는 것."
        ]
      },
      
      basic: {
        height: "149cm",
        weight: "45kg",
        faction: "불사조 기사단",
        nationality: "영국"
      },
      
      magic: {
        moodSong: { title: "가짜 얼굴", artist: "dongdang" }
      },
      
      relationships: [
        { name: "아이라 하이델베르크", initial: "A", description: "관계 서술을 여기에 작성합니다." },
        { name: "에이미 패터슨", initial: "E", description: "관계 서술을 여기에 작성합니다." },
        { name: "타테우스 룩소스 페스틸란스", initial: "T", description: "관계 서술을 여기에 작성합니다." },
        { name: "니콜라스 볼트", initial: "N", description: "관계 서술을 여기에 작성합니다." },
        { name: "루카스 폰 아웃포스트", initial: "L", description: "관계 서술을 여기에 작성합니다." }
      ]
    }
  }
};
