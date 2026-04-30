import type {
  CardStatus,
  LanguageCode,
  LearningMode,
  PracticeDirection,
  VocabularyCard,
} from "@/types/card";

export type CardSide = "learning" | "support";

export interface SideContent {
  language: LanguageCode;
  reading?: string;
  text: string;
}

interface ModeCopy {
  auth: {
    accountCreated: string;
    createAccount: string;
    email: string;
    enter: string;
    login: string;
    loginDescription: string;
    loginTitle: string;
    logout: string;
    password: string;
    signInCta: string;
    signUpCta: string;
    sessionStarted: string;
    switchToLogin: string;
    switchToSignup: string;
    checkConfirmationEmail: string;
    confirmationHelp: string;
    confirmationResent: string;
    resendConfirmation: string;
    resendingConfirmation: string;
  };
  bottomNav: {
    home: string;
    oral: string;
    visual: string;
    vocabulary: string;
  };
  common: {
    add: string;
    category: string;
    close: string;
    fail: string;
    free: string;
    login: string;
    phrase: string;
    starter: string;
    success: string;
    userOwned: string;
    word: string;
  };
  directions: Record<PracticeDirection, string>;
  home: {
    cards: string;
    description: string;
    modeLabel: string;
    oral: string;
    pendingToday: string;
    progressed: string;
    readyReviews: string;
    resetProgress: string;
    stats: string;
    titleKicker: string;
    visual: string;
    vocabulary: string;
  };
  practice: {
    answer: string;
    completeDescription: string;
    completeFreeDescription: string;
    completeTitle: string;
    direction: string;
    freeFail: string;
    freeSuccess: string;
    keepPracticing: string;
    oralFail: string;
    oralTitle: string;
    oralSuccess: string;
    pending: string;
    revealHint: string;
    revealLabel: string;
    seeVocabulary: string;
    visualFail: string;
    visualTitle: string;
    visualSuccess: string;
  };
  speech: {
    answerRevealed: string;
    attempts: string;
    autoValidation: string;
    clearAttempt: string;
    confidence: string;
    correct: string;
    idle: string;
    listen: string;
    listeningError: string;
    micUnavailable: string;
    receivedAudio: string;
    retry: string;
    speak: string;
    stop: string;
    unsupported: string;
    voiceUnavailable: string;
  };
  status: Record<CardStatus, string>;
  sync: {
    localFallback: string;
    loginForPersistence: string;
    saveFailed: string;
    supabaseEmpty: string;
    supabaseFailed: string;
  };
  vocabulary: {
    categoryPlaceholder: string;
    createCard: string;
    createError: string;
    createMessage: string;
    formPrimaryLabel: string;
    formPrimaryPlaceholder: string;
    formReadingLabel: string;
    formReadingPlaceholder: string;
    formSupportLabel: string;
    formSupportPlaceholder: string;
    library: string;
    loginDescription: string;
    privateDescription: string;
    search: string;
    searchPlaceholder: string;
    title: string;
    type: string;
    userCards: string;
  };
}

interface ModeConfig {
  appLanguage: "es" | "ko";
  defaultOralDirection: PracticeDirection;
  defaultVisualDirection: PracticeDirection;
  learningLanguage: LanguageCode;
  label: string;
  shortLabel: string;
  supportLanguage: LanguageCode;
  copy: ModeCopy;
}

export const modeConfigs: Record<LearningMode, ModeConfig> = {
  ja_es: {
    appLanguage: "es",
    defaultOralDirection: "support_to_learning",
    defaultVisualDirection: "learning_to_support",
    label: "Aprender japonés desde español",
    shortLabel: "JA / ES",
    learningLanguage: "ja",
    supportLanguage: "es",
    copy: {
      auth: {
        accountCreated: "Cuenta creada. Ya puedes practicar.",
        createAccount: "Crear cuenta",
        email: "Email",
        enter: "Entrar",
        login: "Login",
        loginDescription:
          "Usa email y contraseña. Tu progreso y tus palabras quedan ligados a tu cuenta.",
        loginTitle: "Entra con tu cuenta",
        logout: "Cerrar sesion",
        password: "Contraseña",
        signInCta: "Entrar",
        signUpCta: "Crear cuenta",
        sessionStarted: "Sesion iniciada.",
        switchToLogin: "Ya tengo cuenta",
        switchToSignup: "Crear cuenta nueva",
        checkConfirmationEmail:
          "Cuenta creada. Revisa tu correo y confirma tu email para poder entrar.",
        confirmationHelp:
          "Si no llega, revisa spam/promociones o reenvia el correo de confirmacion.",
        confirmationResent: "Correo de confirmacion reenviado.",
        resendConfirmation: "Reenviar correo",
        resendingConfirmation: "Reenviando...",
      },
      bottomNav: {
        home: "Home",
        oral: "Oral",
        visual: "Visual",
        vocabulary: "Vocabulario",
      },
      common: {
        add: "Agregar",
        category: "Categoria",
        close: "Cerrar",
        fail: "Fallo",
        free: "libre",
        login: "Login",
        phrase: "frase",
        starter: "starter",
        success: "Acierto",
        userOwned: "propia",
        word: "palabra",
      },
      directions: {
        learning_to_support: "JA -> ES",
        support_to_learning: "ES -> JA",
      },
      home: {
        cards: "tarjetas",
        description:
          "Practica palabras y frases utiles con sesiones cortas para movil.",
        modeLabel: "Romaji SRS",
        oral: "oral",
        pendingToday: "Pendientes hoy",
        progressed: "con avance",
        readyReviews: "repasos listos",
        resetProgress: "Reiniciar progreso local",
        stats: "Estadisticas",
        titleKicker: "Romaji SRS",
        visual: "visual",
        vocabulary: "Vocabulario",
      },
      practice: {
        answer: "Respuesta",
        completeDescription:
          "No hay tarjetas pendientes ahora. Puedes hacer practica libre sin cambiar tus niveles.",
        completeFreeDescription:
          "Terminaste una vuelta libre. Puedes repetir sin cambiar tus niveles.",
        completeTitle: "Practica completa",
        direction: "Direccion",
        freeFail: "Fallo libre",
        freeSuccess: "Acierto libre",
        keepPracticing: "Seguir practicando",
        oralFail: "Fallo oral",
        oralTitle: "practica oral",
        oralSuccess: "Acierto oral",
        pending: "pendientes",
        revealHint: "Desliza arriba para ver traduccion",
        revealLabel: "Revelar",
        seeVocabulary: "Ver vocabulario",
        visualFail: "Fallo visual",
        visualTitle: "practica visual",
        visualSuccess: "Acierto visual",
      },
      speech: {
        answerRevealed: "Respuesta revelada. Avanzando.",
        attempts: "Intentos",
        autoValidation: "Validacion automatica",
        clearAttempt: "Limpiar intento",
        confidence: "Confianza",
        correct: "Correcto. Avanzando.",
        idle: "Di la respuesta. La app validara automaticamente.",
        listen: "Escuchar respuesta",
        listeningError: "No se pudo escuchar",
        micUnavailable: "Microfono no disponible en este navegador.",
        receivedAudio: "Audio recibido",
        retry: "No coincidio. Intenta una vez mas.",
        speak: "Grabar",
        stop: "Detener",
        unsupported: "El navegador no soporta reconocimiento de voz.",
        voiceUnavailable: "Voz no disponible.",
      },
      status: {
        difficult: "dificil",
        in_progress: "en progreso",
        learning: "aprendiendo",
        mastered: "dominada",
        new: "nueva",
        strong: "fuerte",
      },
      sync: {
        localFallback: "Progreso guardado localmente.",
        loginForPersistence: "Inicia sesion para guardar progreso y crear palabras propias.",
        saveFailed: "No se pudo guardar en Supabase. Progreso guardado localmente.",
        supabaseEmpty: "Supabase no tiene tarjetas. Usando datos mock temporales.",
        supabaseFailed: "Supabase no respondio. Usando datos mock temporales.",
      },
      vocabulary: {
        categoryPlaceholder: "preguntas comunes",
        createCard: "Crear tarjeta",
        createError: "No se pudo crear la tarjeta.",
        createMessage: "Tarjeta creada.",
        formPrimaryLabel: "Kana opcional",
        formPrimaryPlaceholder: "かな",
        formReadingLabel: "Romaji",
        formReadingPlaceholder: "toire wa doko desu ka",
        formSupportLabel: "Espanol",
        formSupportPlaceholder: "donde esta el bano?",
        library: "biblioteca",
        loginDescription: "Inicia sesion para crear tarjetas privadas.",
        privateDescription: "Crea tarjetas privadas ligadas a tu cuenta.",
        search: "Buscar vocabulario",
        searchPlaceholder: "Buscar palabra, frase o categoria",
        title: "Vocabulario",
        type: "Tipo",
        userCards: "Mis palabras",
      },
    },
  },
  ko_es: {
    appLanguage: "ko",
    defaultOralDirection: "support_to_learning",
    defaultVisualDirection: "learning_to_support",
    label: "한국어로 스페인어 배우기",
    shortLabel: "KO / ES",
    learningLanguage: "es",
    supportLanguage: "ko",
    copy: {
      auth: {
        accountCreated: "계정이 만들어졌습니다. 바로 연습할 수 있습니다.",
        createAccount: "계정 만들기",
        email: "이메일",
        enter: "로그인",
        login: "로그인",
        loginDescription:
          "이메일과 비밀번호로 로그인하세요. 학습 기록과 내 단어가 계정에 저장됩니다.",
        loginTitle: "계정으로 로그인",
        logout: "로그아웃",
        password: "비밀번호",
        signInCta: "로그인",
        signUpCta: "계정 만들기",
        sessionStarted: "로그인되었습니다.",
        switchToLogin: "이미 계정이 있어요",
        switchToSignup: "새 계정 만들기",
        checkConfirmationEmail:
          "계정이 만들어졌습니다. 이메일을 확인하고 인증한 뒤 로그인하세요.",
        confirmationHelp:
          "메일이 오지 않으면 스팸함을 확인하거나 인증 메일을 다시 보내세요.",
        confirmationResent: "인증 메일을 다시 보냈습니다.",
        resendConfirmation: "인증 메일 다시 보내기",
        resendingConfirmation: "다시 보내는 중...",
      },
      bottomNav: {
        home: "홈",
        oral: "말하기",
        visual: "시각",
        vocabulary: "단어장",
      },
      common: {
        add: "추가",
        category: "카테고리",
        close: "닫기",
        fail: "오답",
        free: "자유",
        login: "로그인",
        phrase: "문장",
        starter: "기본",
        success: "정답",
        userOwned: "내 카드",
        word: "단어",
      },
      directions: {
        learning_to_support: "ES -> KO",
        support_to_learning: "KO -> ES",
      },
      home: {
        cards: "카드",
        description:
          "스페인어 단어와 문장을 짧은 모바일 연습으로 익히세요.",
        modeLabel: "한국어 사용자용",
        oral: "말하기",
        pendingToday: "오늘 복습",
        progressed: "진행 있음",
        readyReviews: "복습 대기",
        resetProgress: "로컬 진행 초기화",
        stats: "통계",
        titleKicker: "스페인어 SRS",
        visual: "시각",
        vocabulary: "단어장",
      },
      practice: {
        answer: "답",
        completeDescription:
          "지금 복습할 카드가 없습니다. 레벨을 바꾸지 않고 자유 연습을 할 수 있습니다.",
        completeFreeDescription:
          "자유 연습 한 바퀴를 끝냈습니다. 레벨 변경 없이 다시 연습할 수 있습니다.",
        completeTitle: "연습 완료",
        direction: "방향",
        freeFail: "자유 오답",
        freeSuccess: "자유 정답",
        keepPracticing: "계속 연습",
        oralFail: "말하기 오답",
        oralTitle: "말하기 연습",
        oralSuccess: "말하기 정답",
        pending: "대기",
        revealHint: "위로 밀어 답 보기",
        revealLabel: "답 보기",
        seeVocabulary: "단어장 보기",
        visualFail: "시각 오답",
        visualTitle: "시각 연습",
        visualSuccess: "시각 정답",
      },
      speech: {
        answerRevealed: "답을 공개합니다. 다음 카드로 이동합니다.",
        attempts: "시도",
        autoValidation: "자동 판정",
        clearAttempt: "시도 지우기",
        confidence: "신뢰도",
        correct: "정답입니다. 다음 카드로 이동합니다.",
        idle: "답을 말하세요. 앱이 자동으로 판정합니다.",
        listen: "답 듣기",
        listeningError: "음성을 들을 수 없습니다",
        micUnavailable: "이 브라우저에서는 마이크를 사용할 수 없습니다.",
        receivedAudio: "음성 수신됨",
        retry: "일치하지 않습니다. 한 번 더 시도하세요.",
        speak: "녹음",
        stop: "중지",
        unsupported: "이 브라우저는 음성 인식을 지원하지 않습니다.",
        voiceUnavailable: "음성을 사용할 수 없습니다.",
      },
      status: {
        difficult: "어려움",
        in_progress: "진행 중",
        learning: "학습 중",
        mastered: "완료",
        new: "새 카드",
        strong: "강함",
      },
      sync: {
        localFallback: "진행 기록을 로컬에 저장했습니다.",
        loginForPersistence: "진행 기록과 내 단어를 저장하려면 로그인하세요.",
        saveFailed: "Supabase에 저장하지 못했습니다. 진행 기록은 로컬에 저장됩니다.",
        supabaseEmpty: "Supabase에 카드가 없습니다. 임시 mock 데이터를 사용합니다.",
        supabaseFailed: "Supabase가 응답하지 않습니다. 임시 mock 데이터를 사용합니다.",
      },
      vocabulary: {
        categoryPlaceholder: "생활 표현",
        createCard: "카드 만들기",
        createError: "카드를 만들 수 없습니다.",
        createMessage: "카드를 만들었습니다.",
        formPrimaryLabel: "스페인어",
        formPrimaryPlaceholder: "donde esta el bano?",
        formReadingLabel: "한국어 로마자 표기",
        formReadingPlaceholder: "hwajangsiri eodie isseoyo?",
        formSupportLabel: "한국어",
        formSupportPlaceholder: "화장실이 어디에 있어요?",
        library: "단어장",
        loginDescription: "개인 카드를 만들려면 로그인하세요.",
        privateDescription: "계정에 저장되는 개인 카드를 만드세요.",
        search: "단어장 검색",
        searchPlaceholder: "단어, 문장 또는 카테고리 검색",
        title: "단어장",
        type: "종류",
        userCards: "내 단어",
      },
    },
  },
};

export function getModeConfig(mode: LearningMode): ModeConfig {
  return modeConfigs[mode];
}

export function getSideContent(card: VocabularyCard, side: CardSide): SideContent {
  if (side === "learning") {
    return {
      language: card.learningLanguage,
      reading: card.learningReading,
      text: card.learningText,
    };
  }

  return {
    language: card.supportLanguage,
    reading: card.supportReading,
    text: card.supportText,
  };
}

export function getFirstSide(direction: PracticeDirection): CardSide {
  return direction === "learning_to_support" ? "learning" : "support";
}

export function getAnswerSide(direction: PracticeDirection): CardSide {
  return direction === "learning_to_support" ? "support" : "learning";
}

export function getSpeechLanguage(language: LanguageCode): string {
  if (language === "ja") {
    return "ja-JP";
  }

  if (language === "ko") {
    return "ko-KR";
  }

  return "es-ES";
}
