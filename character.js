export const characterData = {
    // 프로필 헤더
    profile: {
        image: "https://ui-avatars.com/api/?name=Character&background=3b82f6&color=fff&size=400",
        name: "캐릭터 이름",
        nameEn: "Character Name",
        quote: "캐릭터의 대표 대사나 모토를 여기에 작성합니다.",
        tags: ["#태그1", "#태그2", "#태그3"]
    },

    // 기본 정보
    basicInfo: [
        { label: "이름", value: "캐릭터 이름" },
        { label: "나이", value: "??세" },
        { label: "성별", value: "?" },
        { label: "종족", value: "인간" }
    ],

    // 성격 & 특징
    personality: {
        description: "캐릭터의 성격과 특징에 대한 설명을 작성합니다.",
        traits: [
            "특징 1",
            "특징 2",
            "특징 3"
        ]
    },

    // 배경 스토리
    backstory: [
        "캐릭터의 배경 스토리를 자유롭게 작성합니다.",
        "여러 문단으로 나누어 작성할 수 있습니다."
    ],

    // 갤러리
    gallery: [
        {
            image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400",
            alt: "이미지 1"
        },
        {
            image: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400",
            alt: "이미지 2"
        },
        {
            image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400",
            alt: "이미지 3"
        }
    ],

    // 모티프
    motifs: [
        {
            image: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400",
            title: "모티프 제목",
            description: "간단한 설명이나 어떤 부분에서 영감을 받았는지 작성"
        },
        {
            image: "https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=400",
            title: "참고 작품",
            description: "영향을 받은 작품이나 컨셉"
        },
        {
            image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400",
            title: "디자인 레퍼런스",
            description: "색상이나 의상 등 디자인 참고 자료"
        }
    ],

    // 관련 링크
    links: [
        {
            icon: "external-link",
            text: "설정집",
            url: "#"
        },
        {
            icon: "external-link",
            text: "관련 작품",
            url: "#"
        }
    ]
};
