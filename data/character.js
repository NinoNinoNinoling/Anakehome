// ============================================================
// 캐릭터 데이터
// ============================================================

export const characterData = {
  // 공통 정보 (모든 나이대에 공유)
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
    bloodStatus: "머글 혈통",
    moehua: "나비"
  },

  // 나이별 프로필
  profiles: {
    "11": {
      // ★ 탭 표시용 라벨
      tabLabel: "1학년 (11세)",
      
      // 테마
      themeColor: "#FFD800",

      // 기본 정보
      name: { kr: "모리슨 벨 라이어", en: "MORRISON BELL LIAR" },
      image: "https://lh3.googleusercontent.com/d/1ocIyQ7A0SlJd4HaymUHhHIx6oOdbxQtk",
      imageCredit: { text: "@지인", url: "" },

      // 소속
      affiliation: { type: "house", name: "HUFFLEPUFF" },

      // 명제
      proposition: {
        number: "제 1 명제",
        kanji: "定",
        description: "모든 <em>미래</em>는 불변한다."
      },

      // 한마디
      quote: {
        main: "<em>데자뷔</em>....",
        sub: null,
        description: [
          "처음 접하는 상황, 또는 장소인데도",
          "<em>왠지 익숙하게 느껴지는 현상</em>",
          "을 뜻한다."
        ]
      },

      // 성격
      personality: {
        tags: ["#무신경", "#무반응", "#무감각"],
        description: [
          "모리슨을 이루는 세가지 단어들이다.",
          "그는 언제나 한발 뒤로 물러나 있었다.",
          "혼자만의 세계를 바라보듯, 샛붉은 눈동자는 허공을 향한다.",
          "이에 어른들이 또래가 있는 곳으로 이끈다면 마지 못해 따라가기는 하지만",
          "그래도 어딘가 겉도는 느낌을 피하기 어렵다."
        ]
      },

      // 기본 스탯
      basic: {
        age: "11세 (1학년)",
        height: "130cm",
        weight: "25kg",
        house: "후플푸프",
        nationality: "아일랜드"
      },

      // 마법 정보
      magic: {
        moodSong: { title: "없어, 없어", artist: "니노마에 이나이스", url: "https://www.youtube.com/watch?v=injd7gHrIGU" }
      },
      
      // 관계
      relationships: [],

      // 배경 음악
      bgMusic: {
        youtubeId: "injd7gHrIGU",
        title: "없어, 없어 (니노마에 이나이스 커버)"
      }
    },

    "17": {
      // ★ 탭 표시용 라벨
      tabLabel: "7학년 (17세)",
      
      // 테마
      themeColor: "#FBEFEF",
      themeColorAccent: "#c9a090",

      // 기본 정보
      name: { kr: "모리슨 벨 라이어", en: "MORRISON BELL LIAR" },
      image: "https://lh3.googleusercontent.com/d/1nowOrjgIuAobCsT-AF56G0-OuqBhtg0b",
      imageCredit: { text: "neka", url: "https://www.neka.cc/composer/14237" },

      // 소속
      affiliation: { type: "house", name: "HUFFLEPUFF" },

      // 명제
      proposition: {
        number: "제 2 반론",
        kanji: "反",
        description: "인간은 <em>운명조차</em> 변화시킬수 있다."
      },

      // 한마디
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

      // 성격
      personality: {
        tags: ["#낭만적인", "#다정한", "#상냥한"],
        description: [
          "불쾌한 낯짝, 시체처럼 비틀거리던 아이는 더는 없다.",
          "이상하게 기워진 헝겊인형처럼, 고장난 오토마톤처럼 어색히 굴던 그는",
          "제대로 수선받은 것마냥 이상적인 학생으로 살기 시작했다.",
          "동기에게는 친절히, 후배에게는 상냥히, 선배와 교수에게는……",
          "그 모든 변화의 전반에 그놈의 연인과 그놈의 사랑이 있다고 주장하지만 글쎄…."
        ]
      },

      // 기본 스탯
      basic: {
        age: "17세 (7학년)",
        height: "147cm",
        weight: "45kg",
        house: "후플푸프",
        nationality: "아일랜드"
      },

      // 마법 정보
      magic: {
        moodSong: { title: "All Alone With You", artist: "Yoel", url: "https://youtu.be/uGxab-AbiBc" }
      },

      // 관계
      relationships: [
        {
          name: "엘로웬 모턴",
          initial: "E",
          description: "친구 (구)",
          detail: "친한 사이로 붙어다니는걸 자주 볼수있었으나, 최근 몇 년 새 관계가 소원해졌다. 졸업전까지 다시 친해질수 있을까?",
          quote: "글쎄."
        },
        {
          name: "아멜리아 레이젠",
          initial: "A",
          description: "티타임메이트",
          detail: "그에게 차를 가르쳐달라고 청했다. 이 관계가 이어져 아직까지도 즐겁게 티타임을 가지는 관계로 남아있다.",
          quote: "좋은 얼그레이를 받았거든, 괜찮다면 같이 마시자."
        },
        {
          name: "시에라 벤더미어",
          initial: "S",
          description: "관람메이트",
          detail: "퀴디치 훌리건인 그를 따라 몇번 관람을 간 적이 있었다. 모리슨은 곁에서 이래저래 규칙을 숙지하고 스포츠에 대해 공부를 할수있는 유익한 시간이었다고 평했다.",
          quote: "이번에는 누가 이길거라고 생각해?"
        }
      ],

      // 배경 음악
      bgMusic: {
        youtubeId: "uGxab-AbiBc",
        title: "All Alone With You (Yoel Cover)"
      }
    },

    "29": {
      // ★ 탭 표시용 라벨
      tabLabel: "성인 (29세)",
      
      // 테마
      themeColor: "#B2B0E8",

      // 기본 정보
      name: { kr: "아난케 에이와스 리드맨", en: "ANANKE AIWASS LEADMAN" },
      image: "https://lh3.googleusercontent.com/d/1wgx1oQV3rsfzln_f3SkASSALibOghXid",
      imageCredit: { text: "neka", url: "https://www.neka.cc/composer/14237" },

      // 소속
      affiliation: { type: "order", name: "ORDER OF THE PHOENIX" },

      // 명제
      proposition: {
        number: "제 3 진리",
        kanji: "合",
        description: ["Vanity of vanities, saith the <em>Preacher</em>, vanity of vanities",
                     "<em>all is vanity.</em>"]
      },

      // 한마디
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

      // 성격
      personality: {
        tags: ["#허무", "#무기력", "#상실"],
        description: [
          "앎은 사람과 사람간의 경계를 메운다.",
          "이해는 곧 배려이며 사랑이 되고 사회를 만든다.",
          "그렇기에 앎의 부족은 관계를 끊어내는 철퇴가 된다."
        ]
      },

      // 기본 스탯
      basic: {
        age: "29세 (성인)",
        height: "149cm",
        weight: "45kg",
        faction: "불사조 기사단",
        nationality: "영국"
      },

      // 마법 정보
      magic: {
        moodSong: { title: "가짜 얼굴", artist: "dongdang", url: "https://www.youtube.com/watch?v=qRKlNp_rowc" }
      },

      // 관계
      relationships: [
        {
          name: "아이라 하이델베르크",
          initial: "A",
          detail: "아이의 대부모를 맡기고 결정적일때마다 여러 번 그 손에 맡기기까지 했다. 아직까지 교류를 이어나가고 있으나 이 관계가 이전과 같은 형태인지는 그들만이 알것이다."
        },
        {
          name: "에이미 패터슨",
          initial: "E",
          detail: "입학부터 그는 언제나 조각가로서의 에이미를 응원했고 졸업 이후에도 마찬가지였다. 그는 언제나 에이미의 큰손이 되고자 하였으며 그건 그 집이 불길에 휩싸일때까지 지속되었다."
        },
        {
          name: "니콜라스 볼트",
          initial: "N",
          detail: "아이를 위한 장난감 의뢰를 넣는등 교류를 이어갔다. 그가 만드는 해괴한 것들이 현재 그들 모자의 소소한 즐거움중 하나였다."
        },
        {
          name: "루카스 폰 아웃포스트",
          initial: "L",
          detail: "상황과 상관없이 그들은 언제나 체스판 위에서 합을 나누었고 그 시간은 잠시간의 자유가 되는 기분이었다. 전쟁으로 인해 드물어진것이 아쉬울정도로 말이다."
        }
      ],

      // 배경 음악
      bgMusic: {
        youtubeId: "qRKlNp_rowc",
        title: "가짜 얼굴 (dongdang cover)"
      }
    }
  }
};

// 하위 호환성을 위한 export
export const characterProfiles = characterData.profiles;
