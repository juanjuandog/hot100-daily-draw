const SPECIAL_TOPIC = "困难题单";
const HOME_TITLE = "卷卷不coding";
const ALGORITHM_COLLECTIONS = {
  hot100: { key: "hot100", title: "Hot100" },
  classic150: { key: "classic150", title: "面试经典150" },
};
const HOME_SECTIONS = [
  { key: "Java基础", title: "Java基础", icon: "code" },
  { key: "JVM", title: "JVM", icon: "chip" },
  { key: "JUC", title: "JUC", icon: "layers" },
  { key: "mysql", title: "MySQL", icon: "database" },
  { key: "redis", title: "Redis", icon: "stack" },
  { key: "OS", title: "OS", icon: "settings" },
  { key: "计网", title: "计算机网络", icon: "globe" },
  { key: "linux", title: "Linux", icon: "terminal" },
  { key: "ai", title: "AI", icon: "spark" },
  { key: "hot100", title: "算法", icon: "algorithm" },
];
let SECTION_PAGE_DATA = {};
let algorithmData = {
  hot100: {
    topics: [SPECIAL_TOPIC],
    topicData: {},
  },
  classic150: {
    topics: [SPECIAL_TOPIC],
    topicData: {},
  },
};

const state = {
  currentView: "home",
  currentAlgorithmCollection: "hot100",
  currentSection: null,
  currentSectionQuestionIndex: 0,
  currentTopic: null,
  currentTab: "core",
  currentQuestionId: null,
};

const LAST_VIEW_STORAGE_KEY = "hot100-last-view";

const appState = {
  favorites: [],
  analyses: {},
  coreCodes: {},
  acmCodes: {},
};

function getActiveAlgorithmStore() {
  return algorithmData[state.currentAlgorithmCollection] || algorithmData.hot100;
}

function getActiveTopics() {
  return getActiveAlgorithmStore().topics;
}

function getActiveTopicData() {
  return getActiveAlgorithmStore().topicData;
}

const homeView = document.getElementById("homeView");
const algorithmHomeView = document.getElementById("algorithmHomeView");
const algorithmHomeBackBtn = document.getElementById("algorithmHomeBackBtn");
const homeGrid = document.getElementById("homeGrid");
const openHot100Btn = document.getElementById("openHot100Btn");
const openClassic150Btn = document.getElementById("openClassic150Btn");
const hot100View = document.getElementById("hot100View");
const sectionView = document.getElementById("sectionView");
const backHomeBtn = document.getElementById("backHomeBtn");
const sectionBackBtn = document.getElementById("sectionBackBtn");
const algorithmPageTitle = document.getElementById("algorithmPageTitle");
const openAddQuestionBtn = document.getElementById("openAddQuestionBtn");
const addQuestionModal = document.getElementById("addQuestionModal");
const closeAddQuestionBtn = document.getElementById("closeAddQuestionBtn");
const cancelAddQuestionBtn = document.getElementById("cancelAddQuestionBtn");
const saveAddQuestionBtn = document.getElementById("saveAddQuestionBtn");
const addQuestionTopicSelect = document.getElementById("addQuestionTopicSelect");
const addQuestionIdInput = document.getElementById("addQuestionIdInput");
const addQuestionTitleInput = document.getElementById("addQuestionTitleInput");
const addQuestionIntroInput = document.getElementById("addQuestionIntroInput");
const sectionTitle = document.getElementById("sectionTitle");
const sectionQuestionNav = document.getElementById("sectionQuestionNav");
const sectionQuestionTitle = document.getElementById("sectionQuestionTitle");
const sectionAnswerBody = document.getElementById("sectionAnswerBody");
const sectionTopicTag = document.getElementById("sectionTopicTag");
const sectionPrevQuestionBtn = document.getElementById("sectionPrevQuestionBtn");
const sectionNextQuestionBtn = document.getElementById("sectionNextQuestionBtn");
const sectionFavoriteBtn = document.getElementById("sectionFavoriteBtn");
const editSectionBtn = document.getElementById("editSectionBtn");
const saveSectionBtn = document.getElementById("saveSectionBtn");
const openAddSectionItemBtn = document.getElementById("openAddSectionItemBtn");
const addSectionItemModal = document.getElementById("addSectionItemModal");
const sectionItemModalTitle = document.getElementById("sectionItemModalTitle");
const closeAddSectionItemBtn = document.getElementById("closeAddSectionItemBtn");
const cancelAddSectionItemBtn = document.getElementById("cancelAddSectionItemBtn");
const saveAddSectionItemBtn = document.getElementById("saveAddSectionItemBtn");
const addSectionItemContentInput = document.getElementById("addSectionItemContentInput");
const sectionQuestionContextMenu = document.getElementById("sectionQuestionContextMenu");
const editSectionQuestionMenuItem = document.getElementById("editSectionQuestionMenuItem");
const deleteSectionQuestionMenuItem = document.getElementById("deleteSectionQuestionMenuItem");
const topicNav = document.getElementById("topicNav");
const problemTitle = document.getElementById("problemTitle");
const topicTag = document.getElementById("topicTag");
const introBlock = document.getElementById("introBlock");
const problemIntro = document.getElementById("problemIntro");
const prevQuestionBtn = document.getElementById("prevQuestionBtn");
const nextQuestionBtn = document.getElementById("nextQuestionBtn");
const favoriteQuestionBtn = document.getElementById("favoriteQuestionBtn");
const coreCode = document.getElementById("coreCode");
const acmCode = document.getElementById("acmCode");
const coreCodePreview = document.getElementById("coreCodePreview");
const acmCodePreview = document.getElementById("acmCodePreview");
const coreCodeEditor = document.getElementById("coreCodeEditor");
const acmCodeEditor = document.getElementById("acmCodeEditor");
const analysisText = document.getElementById("analysisText");
const analysisActions = document.getElementById("analysisActions");
const editAnalysisBtn = document.getElementById("editAnalysisBtn");
const saveAnalysisBtn = document.getElementById("saveAnalysisBtn");
const tabButtons = document.querySelectorAll(".tab-button");
const tabContents = document.querySelectorAll(".tab-content");
let sectionItemModalMode = "create";
let sectionEditingOrder = null;
let sectionContextTargetOrder = null;

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function looksLikeHtml(content) {
  return /<[^>]+>/.test(content || "");
}

function plainTextToHtml(text) {
  return escapeHtml(text || "").replaceAll("\n", "<br>");
}

function getRichContentHtml(content) {
  return looksLikeHtml(content) ? content : plainTextToHtml(content);
}

function enableRichTextEditing(element) {
  element.contentEditable = "true";
  element.classList.add("is-editing");
  element.focus();
}

function disableRichTextEditing(element) {
  element.contentEditable = "false";
  element.classList.remove("is-editing");
}

function handleRichTextShortcut(event) {
  const target = event.currentTarget;
  if (target.contentEditable !== "true") return;

  if (event.metaKey && event.altKey && (event.key === "h" || event.key === "H")) {
    event.preventDefault();
    wrapSelectionWithNode(target, createInlineWrapper("span", "rt-highlight"));
    return;
  }

  if (event.metaKey && event.altKey && (event.key === "c" || event.key === "C")) {
    event.preventDefault();
    wrapSelectionWithNode(target, createInlineWrapper("span", "rt-red"));
    return;
  }

  if (event.metaKey && !event.altKey && (event.key === "b" || event.key === "B")) {
    event.preventDefault();
    wrapSelectionWithNode(target, createInlineWrapper("strong"));
  }
}

function createInlineWrapper(tagName, className = "") {
  const node = document.createElement(tagName);
  if (className) {
    node.className = className;
  }
  return node;
}

function wrapSelectionWithNode(container, wrapper) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  const range = selection.getRangeAt(0);
  if (range.collapsed || !container.contains(range.commonAncestorContainer)) return;

  const fragment = range.extractContents();
  if (!fragment.textContent?.trim()) return;

  wrapper.appendChild(fragment);
  range.insertNode(wrapper);

  const newRange = document.createRange();
  newRange.selectNodeContents(wrapper);
  selection.removeAllRanges();
  selection.addRange(newRange);
}

function cleanTitle(text) {
  return text.replaceAll("☹️", "").replaceAll("☹", "").trim();
}

function highlightJava(code) {
  const KEYWORDS = new Set([
    "class",
    "public",
    "private",
    "protected",
    "static",
    "void",
    "return",
    "if",
    "else",
    "for",
    "while",
    "new",
    "import",
    "package",
    "true",
    "false",
    "null",
    "int",
    "long",
    "double",
    "float",
    "boolean",
    "char",
    "extends",
    "implements",
    "this",
  ]);
  const TYPES = new Set([
    "String",
    "List",
    "ArrayList",
    "Map",
    "HashMap",
    "Queue",
    "LinkedList",
    "Scanner",
    "TreeNode",
    "Integer",
    "System",
    "Math",
  ]);
  const TOKEN_RE =
    /\/\/[^\n]*|"(?:[^"\\]|\\.)*"|@[A-Za-z_]\w*|\b\d+\b|\b[A-Za-z_]\w*\b|\s+|./g;

  return code.replace(TOKEN_RE, (token) => {
    const safe = escapeHtml(token);
    if (/^\/\/[^\n]*/.test(token)) {
      return `<span class="token-comment">${safe}</span>`;
    }
    if (/^"(?:[^"\\]|\\.)*"$/.test(token)) {
      return `<span class="token-string">${safe}</span>`;
    }
    if (/^@[A-Za-z_]\w*$/.test(token)) {
      return `<span class="token-annotation">${safe}</span>`;
    }
    if (/^\d+$/.test(token)) {
      return `<span class="token-number">${safe}</span>`;
    }
    if (KEYWORDS.has(token)) {
      return `<span class="token-keyword">${safe}</span>`;
    }
    if (TYPES.has(token)) {
      return `<span class="token-type">${safe}</span>`;
    }
    return safe;
  });
}

function renderCodeBlock(element, code) {
  element.innerHTML = highlightJava(code || "// 暂未识别到对应代码");
}

async function loadAppState() {
  try {
    const response = await fetch("./api/state", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to load state: ${response.status}`);
    }
    const data = await response.json();
    appState.favorites = Array.isArray(data.favorites) ? data.favorites : [];
    appState.analyses = data.analyses && typeof data.analyses === "object" ? data.analyses : {};
    appState.coreCodes = data.coreCodes && typeof data.coreCodes === "object" ? data.coreCodes : {};
    appState.acmCodes = data.acmCodes && typeof data.acmCodes === "object" ? data.acmCodes : {};
  } catch {
    appState.favorites = [];
    appState.analyses = {};
    appState.coreCodes = {};
    appState.acmCodes = {};
  }
}

async function persistAppState() {
  await fetch("./api/state", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(appState),
  });
}

function getQuestionKey(question) {
  return `${question.collectionKey || state.currentAlgorithmCollection}-${question.sourceTopic || state.currentTopic}-${question.id}`;
}

function getFavoriteQuestionKeys() {
  return appState.favorites;
}

function setFavoriteQuestionKeys(keys) {
  appState.favorites = keys;
}

function isFavoriteQuestion(question) {
  return getFavoriteQuestionKeys().includes(getQuestionKey(question));
}

function getAllQuestions() {
  return Object.entries(getActiveTopicData())
    .filter(([topic]) => topic !== SPECIAL_TOPIC)
    .flatMap(([topic, data]) =>
      (data.questions || []).map((question) => ({
        ...question,
        collectionKey: question.collectionKey || state.currentAlgorithmCollection,
        sourceTopic: question.sourceTopic || topic,
      }))
    );
}

function getQuestionsForTopic(topic) {
  if (topic === SPECIAL_TOPIC) {
    const favoriteKeys = new Set(getFavoriteQuestionKeys());
    return getAllQuestions().filter((question) => favoriteKeys.has(getQuestionKey(question)));
  }
  return (getActiveTopicData()[topic]?.questions || []).map((question) => ({
    ...question,
    collectionKey: question.collectionKey || state.currentAlgorithmCollection,
    sourceTopic: question.sourceTopic || topic,
  }));
}

function normalizeQuestionId(id) {
  return id == null ? null : String(id);
}

function getCurrentQuestion() {
  const questions = getQuestionsForTopic(state.currentTopic);
  const currentQuestion = questions.find(
    (question) => normalizeQuestionId(question.id) === normalizeQuestionId(state.currentQuestionId)
  );
  return currentQuestion || questions[0] || null;
}

function getAnalysisStorageKey() {
  const question = getCurrentQuestion();
  if (question) {
    return `hot100-analysis-${getQuestionKey(question)}`;
  }
  return `hot100-analysis-${state.currentTopic}-default`;
}

function getSavedAnalysis(defaultValue) {
  const saved = appState.analyses[getAnalysisStorageKey()];
  return saved ?? defaultValue;
}

function getContentStorageKey(contentType) {
  const question = getCurrentQuestion();
  if (question) {
    return `hot100-${contentType}-${getQuestionKey(question)}`;
  }
  return `hot100-${contentType}-${state.currentTopic}-default`;
}

function getSavedCoreCode(defaultValue) {
  const saved = appState.coreCodes[getContentStorageKey("core")];
  return saved ?? defaultValue;
}

function getSavedAcmCode(defaultValue) {
  const saved = appState.acmCodes[getContentStorageKey("acm")];
  return saved ?? defaultValue;
}

function getSectionQuestionStorageKey() {
  return `section-question-${state.currentSection}-${state.currentSectionQuestionIndex}`;
}

function getSectionAnswerStorageKey() {
  return `section-answer-${state.currentSection}-${state.currentSectionQuestionIndex}`;
}

function getSavedSectionQuestion(defaultValue) {
  const saved = appState.coreCodes[getSectionQuestionStorageKey()];
  return saved ?? defaultValue;
}

function getSavedSectionAnswer(defaultValue) {
  const saved = appState.analyses[getSectionAnswerStorageKey()];
  return saved ?? defaultValue;
}

function getSectionFavoriteKey(sectionKey, index) {
  return `section-${sectionKey}-${index}`;
}

function isFavoriteSectionQuestion(sectionKey, index) {
  return getFavoriteQuestionKeys().includes(getSectionFavoriteKey(sectionKey, index));
}

function syncCodeEditorHeight(preview, editor, baseHeight = 0) {
  const previewHeight = Math.max(preview.scrollHeight, preview.getBoundingClientRect().height);
  editor.style.height = "auto";
  const editorHeight = editor.scrollHeight;
  const targetHeight = Math.max(baseHeight, previewHeight, editorHeight, 520);
  editor.style.minHeight = `${targetHeight}px`;
  editor.style.height = `${targetHeight}px`;
}

function toggleCodeEditor(preview, editor, editable) {
  const block = preview.closest(".editable-code-block");
  const previewVisibleHeight = Math.max(
    preview.getBoundingClientRect().height,
    preview.scrollHeight
  );
  if (block) {
    block.classList.toggle("is-editing", editable);
  }
  preview.hidden = editable;
  editor.hidden = !editable;
  preview.style.display = editable ? "none" : "block";
  editor.style.display = editable ? "block" : "none";
  if (editable) {
    requestAnimationFrame(() => {
      syncCodeEditorHeight(preview, editor, previewVisibleHeight);
    });
  } else {
    editor.style.minHeight = "520px";
    editor.style.height = "auto";
  }
}

function setTabEditable(tab, editable) {
  if (tab === "analysis") {
    if (editable) {
      enableRichTextEditing(analysisText);
    } else {
      disableRichTextEditing(analysisText);
    }
    if (editable) {
      analysisText.focus();
    }
    return;
  }

  const isCore = tab === "core";
  const preview = isCore ? coreCodePreview : acmCodePreview;
  const editor = isCore ? coreCodeEditor : acmCodeEditor;
  toggleCodeEditor(preview, editor, editable);
  if (editable) {
    editor.focus();
  }
}

function buildIntroHtml(intro) {
  const lines = intro
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const summaryText = lines[0] || "";
  const fullHtml = escapeHtml(intro).replaceAll("\n", "<br>");
  return {
    html:
      `<div class="intro-preview">` +
      `<div class="intro-summary" data-summary="${escapeHtml(summaryText)}" data-full="${fullHtml}"><p>${escapeHtml(summaryText)}</p></div>` +
      `<button class="intro-toggle" type="button">展开全部</button>` +
      `</div>`,
    hasToggle: true,
  };
}

function normalizeQuestionContent(question) {
  const intro = (question.intro || "").trim();
  const analysis = (question.analysis || "").trim();
  if (!analysis) {
    return {
      intro,
      analysis,
    };
  }

  const lines = analysis.split("\n");
  let firstContentIndex = lines.findIndex((line) => line.trim());
  if (firstContentIndex === -1) {
    return {
      intro,
      analysis,
    };
  }

  const firstLine = lines[firstContentIndex].trim();
  if (!/^(输入：|输出：)/.test(firstLine)) {
    return {
      intro,
      analysis,
    };
  }

  let splitIndex = firstContentIndex;
  while (splitIndex < lines.length) {
    const trimmed = lines[splitIndex].trim();
    if (!trimmed || /^(输入：|输出：)/.test(trimmed)) {
      splitIndex += 1;
      continue;
    }
    break;
  }

  const leadingExample = lines.slice(0, splitIndex).join("\n").trim();
  const remainingAnalysis = lines.slice(splitIndex).join("\n").trim();

  return {
    intro: [intro, leadingExample].filter(Boolean).join("\n").trim(),
    analysis: remainingAnalysis,
  };
}

function bindIntroToggle() {
  const toggle = problemIntro.querySelector(".intro-toggle");
  const preview = problemIntro.querySelector(".intro-preview");
  const summary = problemIntro.querySelector(".intro-summary");
  if (!toggle || !preview) return;

  toggle.addEventListener("click", () => {
    const isExpanded = preview.classList.contains("is-expanded");
    if (!isExpanded) {
      preview.classList.add("is-expanded");
      if (summary) {
        summary.innerHTML = `<p>${summary.dataset.full}</p>`;
      }
      toggle.textContent = "收起";
    } else {
      preview.classList.remove("is-expanded");
      if (summary) {
        summary.innerHTML = `<p>${summary.dataset.summary}</p>`;
      }
      toggle.textContent = "展开全部";
    }
  });
}

function renderHome() {
  const iconMap = {
    algorithm: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h10M7 12h10M7 17h6"></path><path d="M4 7h.01M4 12h.01M4 17h.01"></path></svg>',
    code: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 8 4 12l4 4"></path><path d="M16 8l4 4-4 4"></path><path d="M14 4 10 20"></path></svg>',
    chip: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="2"></rect><path d="M9 1v4M15 1v4M9 19v4M15 19v4M1 9h4M1 15h4M19 9h4M19 15h4"></path></svg>',
    layers: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 4 8 4-8 4-8-4 8-4Z"></path><path d="m4 12 8 4 8-4"></path><path d="m4 16 8 4 8-4"></path></svg>',
    database: '<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="5" rx="7" ry="3"></ellipse><path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5"></path><path d="M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"></path></svg>',
    stack: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 8 4-8 4-8-4 8-4Z"></path><path d="m4 11 8 4 8-4"></path><path d="m4 15 8 4 8-4"></path></svg>',
    settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5h.1a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.5 1Z"></path></svg>',
    globe: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"></path></svg>',
    terminal: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="m7 9 3 3-3 3"></path><path d="M12 15h5"></path></svg>',
    spark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z"></path><path d="M19 16l.9 2.1L22 19l-2.1.9L19 22l-.9-2.1L16 19l2.1-.9L19 16Z"></path></svg>',
  };

  homeGrid.innerHTML = HOME_SECTIONS.map(
    (section) => `
      <button
        class="home-card ${section.primary ? "is-primary" : ""}"
        type="button"
        data-home-section="${escapeHtml(section.key)}"
      >
        <span class="home-card-icon">${iconMap[section.icon] || iconMap.code}</span>
        <h3>${escapeHtml(section.title)}</h3>
      </button>
    `
  ).join("");

  homeGrid.querySelectorAll("[data-home-section]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.homeSection;
      if (key === "hot100") {
        state.currentView = "algorithmHome";
      } else {
        state.currentView = "section";
        state.currentSection = key;
        state.currentSectionQuestionIndex = 0;
      }
      persistLastView();
      renderCurrentView();
    });
  });
}

function renderSectionView() {
  const section =
    HOME_SECTIONS.find((item) => item.key === state.currentSection) ||
    HOME_SECTIONS[0];
  if (!section) return;

  const questionList = SECTION_PAGE_DATA[section.key] || [];
  if (
    state.currentSectionQuestionIndex < 0 ||
    state.currentSectionQuestionIndex >= questionList.length
  ) {
    state.currentSectionQuestionIndex = 0;
  }
  const currentQuestion = questionList[state.currentSectionQuestionIndex] || null;

  sectionTitle.textContent = section.title;
  if (sectionQuestionNav) {
    sectionQuestionNav.innerHTML = questionList
      .map(
        (item, index) => `
          <button
            class="topic-item section-question-item ${index === state.currentSectionQuestionIndex ? "active" : ""}"
            type="button"
            data-section-question-index="${index}"
            data-section-item-order="${item.order || index + 1}"
          >
            <strong>${index + 1}.</strong>
            <span class="section-question-label">${escapeHtml(item.title)}</span>
          </button>
        `
      )
      .join("");

    if (questionList.length === 0) {
      sectionQuestionNav.innerHTML = `
        <div class="topic-empty-state">
          还没有题目，点上方“新增题目”开始录入。
        </div>
      `;
    }

    sectionQuestionNav.querySelectorAll("[data-section-question-index]").forEach((button) => {
      button.addEventListener("click", () => {
        state.currentSectionQuestionIndex = Number(button.dataset.sectionQuestionIndex || 0);
        persistLastView();
        renderSectionView();
      });
      button.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        sectionContextTargetOrder = Number(button.dataset.sectionItemOrder || 0);
        openSectionQuestionContextMenu(event.clientX, event.clientY);
      });
    });
  }

  if (currentQuestion) {
    sectionQuestionTitle.textContent = `${state.currentSectionQuestionIndex + 1}. ${currentQuestion.title}`;
    sectionTopicTag.textContent = `${section.title} / ${state.currentSectionQuestionIndex + 1}`;
    sectionAnswerBody.innerHTML = getRichContentHtml(getSavedSectionAnswer(currentQuestion.answer));
    sectionFavoriteBtn.classList.toggle("is-active", isFavoriteSectionQuestion(section.key, state.currentSectionQuestionIndex));
    sectionFavoriteBtn.title = isFavoriteSectionQuestion(section.key, state.currentSectionQuestionIndex) ? "取消收藏" : "加入困难题单";
    sectionFavoriteBtn.setAttribute("aria-label", isFavoriteSectionQuestion(section.key, state.currentSectionQuestionIndex) ? "取消收藏" : "加入困难题单");
    sectionPrevQuestionBtn.disabled = state.currentSectionQuestionIndex <= 0;
    sectionNextQuestionBtn.disabled = state.currentSectionQuestionIndex >= questionList.length - 1;
  } else {
    sectionQuestionTitle.textContent = "1. 还没有题目";
    sectionTopicTag.textContent = `${section.title} / 0`;
    sectionAnswerBody.innerHTML = getRichContentHtml(
      "点击左侧上方“新增题目”，第一行输入问题，下面换行输入答案。"
    );
    sectionPrevQuestionBtn.disabled = true;
    sectionNextQuestionBtn.disabled = true;
    sectionFavoriteBtn.classList.remove("is-active");
    sectionFavoriteBtn.disabled = true;
  }
  if (currentQuestion) {
    sectionFavoriteBtn.disabled = false;
  }
  disableRichTextEditing(sectionAnswerBody);
  hideSectionQuestionContextMenu();
}

function renderCurrentView() {
  const showHome = state.currentView === "home";
  const showAlgorithmHome = state.currentView === "algorithmHome";
  const showHot100 = state.currentView === "hot100";
  const showSection = state.currentView === "section";

  homeView.hidden = !showHome;
  algorithmHomeView.hidden = !showAlgorithmHome;
  hot100View.hidden = !showHot100;
  sectionView.hidden = !showSection;

  if (showHot100) {
    algorithmPageTitle.textContent =
      ALGORITHM_COLLECTIONS[state.currentAlgorithmCollection]?.title || "Hot100";
  }

  if (showSection) {
    renderSectionView();
  }
}

function renderTopics() {
  const currentTopics = getActiveTopics();
  const currentTopicDataMap = getActiveTopicData();
  topicNav.innerHTML = currentTopics
    .map((topic) => {
      const data = currentTopicDataMap[topic] || { filled: true };
      const questions = getQuestionsForTopic(topic);
      const questionCount = questions.length;
      let statusText = "等待填充题目内容";
      if (topic === SPECIAL_TOPIC || questionCount > 0 || data.filled) {
        if (questionCount > 0) {
          const currentIndex =
            topic === state.currentTopic
              ? Math.max(
                  1,
                  questions.findIndex(
                    (question) =>
                      normalizeQuestionId(question.id) === normalizeQuestionId(state.currentQuestionId)
                  ) + 1
                )
              : 1;
          statusText = `${currentIndex}/${questionCount}`;
        } else {
          statusText = "0/0";
        }
      }
      return `
        <button
          class="topic-item ${topic === state.currentTopic ? "active" : ""}"
          type="button"
          data-topic="${topic}"
        >
          <strong>${topic}</strong>
          <span>${statusText}</span>
        </button>
      `;
    })
    .join("");

  topicNav.querySelectorAll("[data-topic]").forEach((button) => {
    button.addEventListener("click", () => {
      state.currentTopic = button.dataset.topic;
      const questions = getQuestionsForTopic(state.currentTopic);
      state.currentQuestionId = questions.length > 0 ? questions[0].id : null;
      persistLastView();
      renderTopics();
      renderContent();
    });
  });

  scrollActiveTopicIntoCenter();
}

function scrollActiveTopicIntoCenter() {
  const activeItem = topicNav.querySelector(".topic-item.active");
  if (!activeItem) return;

  const navRect = topicNav.getBoundingClientRect();
  const itemRect = activeItem.getBoundingClientRect();
  const offset = itemRect.top - navRect.top - navRect.height / 2 + itemRect.height / 2;

  topicNav.scrollTo({
    top: topicNav.scrollTop + offset,
    behavior: "smooth",
  });
}

function renderQuestionContent(question) {
  const normalized = normalizeQuestionContent(question);
  const questions = getQuestionsForTopic(state.currentTopic);
  const currentIndex = questions.findIndex(
    (item) => normalizeQuestionId(item.id) === normalizeQuestionId(question.id)
  );
  const rawTitle = cleanTitle(question.title);
  const displayTitle =
    /^\d+[\.\s、]/.test(rawTitle) || currentIndex < 0
      ? rawTitle
      : `${currentIndex + 1}. ${rawTitle}`;
  problemTitle.innerHTML = question.link
    ? `<a class="problem-title-link" href="${question.link}" target="_blank" rel="noreferrer">${escapeHtml(displayTitle)}</a>`
    : escapeHtml(displayTitle);
  topicTag.textContent = `${state.currentTopic} / ${question.id}`;
  favoriteQuestionBtn.classList.toggle("is-active", isFavoriteQuestion(question));
  favoriteQuestionBtn.title = isFavoriteQuestion(question) ? "取消收藏" : "加入困难题单";
  favoriteQuestionBtn.setAttribute("aria-label", isFavoriteQuestion(question) ? "取消收藏" : "加入困难题单");

  const introParts = [];
  if (normalized.intro) {
    introParts.push(normalized.intro);
  }

  if (introParts.length > 0) {
    introBlock.style.display = "block";
    problemIntro.innerHTML = introParts.map((part) => buildIntroHtml(part).html).join("");
    bindIntroToggle();
  } else {
    introBlock.style.display = "none";
    problemIntro.innerHTML = "";
  }

  renderCodeBlock(coreCode, getSavedCoreCode(question.coreCode || "// 暂未识别到核心代码模式"));
  renderCodeBlock(acmCode, getSavedAcmCode(question.acmCode || "// 暂未识别到 ACM 模式"));
  analysisText.innerHTML = getRichContentHtml(
    getSavedAnalysis(normalized.analysis || "暂未识别到具体解析。")
  );
  coreCodeEditor.value = getSavedCoreCode(question.coreCode || "// 暂未识别到核心代码模式");
  acmCodeEditor.value = getSavedAcmCode(question.acmCode || "// 暂未识别到 ACM 模式");
  setTabEditable("core", false);
  setTabEditable("acm", false);
  setTabEditable("analysis", false);
}

function renderQuestionNavigation(questions) {
  if (questions.length === 0) {
    prevQuestionBtn.disabled = true;
    nextQuestionBtn.disabled = true;
    return;
  }

  const currentIndex = questions.findIndex(
    (question) => normalizeQuestionId(question.id) === normalizeQuestionId(state.currentQuestionId)
  );
  prevQuestionBtn.disabled = currentIndex <= 0;
  nextQuestionBtn.disabled = currentIndex === -1 || currentIndex >= questions.length - 1;
}

function renderTopicFallback(data) {
  problemTitle.textContent = data.title;
  topicTag.textContent = state.currentTopic;
  favoriteQuestionBtn.classList.remove("is-active");
  favoriteQuestionBtn.disabled = true;
  if (data.intro) {
    introBlock.style.display = "block";
    problemIntro.innerHTML = buildIntroHtml(data.intro).html;
    bindIntroToggle();
  } else {
    introBlock.style.display = "none";
    problemIntro.innerHTML = "";
  }
  renderCodeBlock(coreCode, getSavedCoreCode(data.coreCode));
  renderCodeBlock(acmCode, getSavedAcmCode(data.acmCode));
  analysisText.innerHTML = getRichContentHtml(getSavedAnalysis(data.analysis));
  coreCodeEditor.value = getSavedCoreCode(data.coreCode);
  acmCodeEditor.value = getSavedAcmCode(data.acmCode);
  setTabEditable("core", false);
  setTabEditable("acm", false);
  setTabEditable("analysis", false);
}

function renderContent() {
  const currentTopicDataMap = getActiveTopicData();
  const fallbackTopic = getActiveTopics().find((topic) => topic !== SPECIAL_TOPIC) || SPECIAL_TOPIC;
  const currentTopicData = currentTopicDataMap[state.currentTopic] || currentTopicDataMap[fallbackTopic];
  const questions = getQuestionsForTopic(state.currentTopic);

  if (questions.length > 0) {
    const currentQuestion =
      questions.find(
        (question) =>
          normalizeQuestionId(question.id) === normalizeQuestionId(state.currentQuestionId)
      ) || questions[0];
    state.currentQuestionId = currentQuestion.id;
    persistLastView();
    favoriteQuestionBtn.disabled = false;
    renderQuestionNavigation(questions);
    renderQuestionContent(currentQuestion);
    return;
  }

  renderQuestionNavigation([]);
  renderTopicFallback(currentTopicData);
}

function bindTabs() {
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const selectedTab = button.dataset.tab;
      state.currentTab = selectedTab;
      setTabEditable("core", false);
      setTabEditable("acm", false);
      setTabEditable("analysis", false);

      tabButtons.forEach((item) => {
        item.classList.toggle("active", item.dataset.tab === selectedTab);
      });

      tabContents.forEach((content) => {
        content.classList.toggle("active", content.id === `tab-${selectedTab}`);
      });

      analysisActions.hidden = false;
      persistLastView();
    });
  });
}

function bindQuestionArrows() {
  prevQuestionBtn.addEventListener("click", () => {
    const questions = getQuestionsForTopic(state.currentTopic);
    const currentIndex = questions.findIndex(
      (question) => normalizeQuestionId(question.id) === normalizeQuestionId(state.currentQuestionId)
    );
    if (currentIndex > 0) {
      state.currentQuestionId = questions[currentIndex - 1].id;
      persistLastView();
      renderTopics();
      renderContent();
    }
  });

  nextQuestionBtn.addEventListener("click", () => {
    const questions = getQuestionsForTopic(state.currentTopic);
    const currentIndex = questions.findIndex(
      (question) => normalizeQuestionId(question.id) === normalizeQuestionId(state.currentQuestionId)
    );
    if (currentIndex >= 0 && currentIndex < questions.length - 1) {
      state.currentQuestionId = questions[currentIndex + 1].id;
      persistLastView();
      renderTopics();
      renderContent();
    }
  });
}

function bindAnalysisActions() {
  editAnalysisBtn.addEventListener("click", () => {
    setTabEditable(state.currentTab, true);
  });

  saveAnalysisBtn.addEventListener("click", async () => {
    if (state.currentTab === "core") {
      const value = coreCodeEditor.value;
      appState.coreCodes[getContentStorageKey("core")] = value;
      renderCodeBlock(coreCode, value);
      setTabEditable("core", false);
    } else if (state.currentTab === "acm") {
      const value = acmCodeEditor.value;
      appState.acmCodes[getContentStorageKey("acm")] = value;
      renderCodeBlock(acmCode, value);
      setTabEditable("acm", false);
    } else {
      appState.analyses[getAnalysisStorageKey()] = analysisText.innerHTML;
      setTabEditable("analysis", false);
    }
    await persistAppState();
  });
}

function bindCodeEditorAutoResize() {
  [coreCodeEditor, acmCodeEditor].forEach((editor) => {
    editor.addEventListener("input", () => {
      const preview = editor === coreCodeEditor ? coreCodePreview : acmCodePreview;
      syncCodeEditorHeight(preview, editor);
    });
  });
}

function bindRichTextShortcuts() {
  [analysisText, sectionAnswerBody].forEach((element) => {
    element.addEventListener("keydown", handleRichTextShortcut);
  });
}

function openSectionItemModal(mode, item = null) {
  sectionItemModalMode = mode;
  sectionEditingOrder = item?.order ?? null;
  sectionItemModalTitle.textContent = mode === "edit" ? "修改题目" : "新增题目";
  addSectionItemContentInput.value = item
    ? [item.title, item.answer].filter(Boolean).join("\n")
    : "";
  addSectionItemModal.hidden = false;
  addSectionItemContentInput.focus();
}

function closeSectionItemModal() {
  addSectionItemModal.hidden = true;
  sectionItemModalMode = "create";
  sectionEditingOrder = null;
}

function openSectionQuestionContextMenu(x, y) {
  sectionQuestionContextMenu.hidden = false;
  sectionQuestionContextMenu.style.left = `${x}px`;
  sectionQuestionContextMenu.style.top = `${y}px`;
}

function hideSectionQuestionContextMenu() {
  sectionQuestionContextMenu.hidden = true;
  sectionContextTargetOrder = null;
}

function getCurrentSectionItems() {
  return SECTION_PAGE_DATA[state.currentSection] || [];
}

async function saveSectionItemFromModal() {
  const content = addSectionItemContentInput.value.trim();
  if (!content) return;

  const endpoint =
    sectionItemModalMode === "edit" ? "./api/section-item/update" : "./api/section-item";
  const payload =
    sectionItemModalMode === "edit"
      ? {
          sectionKey: state.currentSection,
          itemOrder: sectionEditingOrder,
          content,
        }
      : {
          sectionKey: state.currentSection,
          content,
        };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) return;

  await loadSectionsData();
  const questionList = getCurrentSectionItems();
  if (sectionItemModalMode === "edit") {
    const editedIndex = questionList.findIndex((item) => item.order === sectionEditingOrder);
    state.currentSectionQuestionIndex = editedIndex >= 0 ? editedIndex : 0;
  } else {
    state.currentSectionQuestionIndex = Math.max(0, questionList.length - 1);
  }
  closeSectionItemModal();
  persistLastView();
  renderSectionView();
}

async function deleteSectionItemByOrder(itemOrder) {
  const response = await fetch("./api/section-item/delete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sectionKey: state.currentSection,
      itemOrder,
    }),
  });
  if (!response.ok) return;

  await loadSectionsData();
  const questionList = getCurrentSectionItems();
  state.currentSectionQuestionIndex = Math.min(
    state.currentSectionQuestionIndex,
    Math.max(0, questionList.length - 1)
  );
  persistLastView();
  renderSectionView();
}

function bindViewNavigation() {
  algorithmHomeBackBtn.addEventListener("click", () => {
    state.currentView = "home";
    persistLastView();
    renderCurrentView();
  });

  backHomeBtn.addEventListener("click", () => {
    state.currentView = "algorithmHome";
    persistLastView();
    renderCurrentView();
  });

  sectionBackBtn.addEventListener("click", () => {
    state.currentView = "home";
    persistLastView();
    renderCurrentView();
  });

  openHot100Btn.addEventListener("click", () => {
    state.currentAlgorithmCollection = "hot100";
    state.currentView = "hot100";
    state.currentTopic = getActiveTopics().find((topic) => topic !== SPECIAL_TOPIC) || SPECIAL_TOPIC;
    state.currentQuestionId = getQuestionsForTopic(state.currentTopic)[0]?.id ?? null;
    persistLastView();
    renderTopics();
    renderContent();
    renderCurrentView();
  });

  openClassic150Btn.addEventListener("click", () => {
    state.currentAlgorithmCollection = "classic150";
    state.currentView = "hot100";
    state.currentTopic = getActiveTopics().find((topic) => topic !== SPECIAL_TOPIC) || SPECIAL_TOPIC;
    state.currentQuestionId = getQuestionsForTopic(state.currentTopic)[0]?.id ?? null;
    persistLastView();
    renderTopics();
    renderContent();
    renderCurrentView();
  });
}

function bindSectionActions() {
  sectionPrevQuestionBtn.addEventListener("click", () => {
    if (state.currentSectionQuestionIndex <= 0) return;
    state.currentSectionQuestionIndex -= 1;
    persistLastView();
    renderSectionView();
  });

  sectionNextQuestionBtn.addEventListener("click", () => {
    const questionList = SECTION_PAGE_DATA[state.currentSection] || [];
    if (state.currentSectionQuestionIndex >= questionList.length - 1) return;
    state.currentSectionQuestionIndex += 1;
    persistLastView();
    renderSectionView();
  });

  sectionFavoriteBtn.addEventListener("click", async () => {
    const key = getSectionFavoriteKey(state.currentSection, state.currentSectionQuestionIndex);
    const favorites = new Set(getFavoriteQuestionKeys());
    if (favorites.has(key)) {
      favorites.delete(key);
    } else {
      favorites.add(key);
    }
    setFavoriteQuestionKeys([...favorites]);
    await persistAppState();
    renderSectionView();
  });

  editSectionBtn.addEventListener("click", () => {
    enableRichTextEditing(sectionAnswerBody);
  });

  saveSectionBtn.addEventListener("click", async () => {
    appState.analyses[getSectionAnswerStorageKey()] = sectionAnswerBody.innerHTML;
    disableRichTextEditing(sectionAnswerBody);
    await persistAppState();
    renderSectionView();
  });

  openAddSectionItemBtn.addEventListener("click", () => {
    openSectionItemModal("create");
  });

  closeAddSectionItemBtn.addEventListener("click", () => {
    closeSectionItemModal();
  });

  cancelAddSectionItemBtn.addEventListener("click", () => {
    closeSectionItemModal();
  });

  addSectionItemModal.addEventListener("click", (event) => {
    if (event.target === addSectionItemModal) {
      closeSectionItemModal();
    }
  });

  saveAddSectionItemBtn.addEventListener("click", saveSectionItemFromModal);

  editSectionQuestionMenuItem.addEventListener("click", () => {
    const item = getCurrentSectionItems().find((entry) => entry.order === sectionContextTargetOrder);
    hideSectionQuestionContextMenu();
    if (!item) return;
    openSectionItemModal("edit", item);
  });

  deleteSectionQuestionMenuItem.addEventListener("click", async () => {
    const itemOrder = sectionContextTargetOrder;
    hideSectionQuestionContextMenu();
    if (!itemOrder) return;
    await deleteSectionItemByOrder(itemOrder);
  });

  document.addEventListener("click", (event) => {
    if (
      !sectionQuestionContextMenu.hidden &&
      !sectionQuestionContextMenu.contains(event.target)
    ) {
      hideSectionQuestionContextMenu();
    }
  });

  window.addEventListener("blur", hideSectionQuestionContextMenu);
}

function bindFavoriteAction() {
  favoriteQuestionBtn.addEventListener("click", async () => {
    const question = getCurrentQuestion();
    if (!question) return;

    const key = getQuestionKey(question);
    const favorites = new Set(getFavoriteQuestionKeys());
    if (favorites.has(key)) {
      favorites.delete(key);
    } else {
      favorites.add(key);
    }
    setFavoriteQuestionKeys([...favorites]);
    await persistAppState();

    if (state.currentTopic === SPECIAL_TOPIC) {
      const hardQuestions = getQuestionsForTopic(SPECIAL_TOPIC);
      if (hardQuestions.length === 0) {
        state.currentTopic =
          question.sourceTopic ||
          getActiveTopics().find((topic) => topic !== SPECIAL_TOPIC) ||
          SPECIAL_TOPIC;
        state.currentQuestionId = question.id;
      } else if (
        !hardQuestions.some(
          (item) =>
            normalizeQuestionId(item.id) === normalizeQuestionId(state.currentQuestionId)
        )
      ) {
        state.currentQuestionId = hardQuestions[0].id;
      }
    }

    renderTopics();
    renderContent();
  });
}

function openAddQuestionModal() {
  const availableTopics = getActiveTopics().filter((topic) => topic !== SPECIAL_TOPIC);
  addQuestionTopicSelect.innerHTML = availableTopics
    .map(
      (topic) =>
        `<option value="${escapeHtml(topic)}" ${topic === state.currentTopic ? "selected" : ""}>${escapeHtml(topic)}</option>`
    )
    .join("");
  addQuestionIdInput.value = "";
  addQuestionTitleInput.value = "";
  addQuestionIntroInput.value = "";
  addQuestionModal.hidden = false;
  addQuestionTitleInput.focus();
}

function closeAddQuestionModal() {
  addQuestionModal.hidden = true;
}

async function saveNewQuestion() {
  const topicName = addQuestionTopicSelect.value.trim();
  const questionId = addQuestionIdInput.value.trim();
  const title = addQuestionTitleInput.value.trim();
  const intro = addQuestionIntroInput.value.trim();

  if (!topicName || !title) {
    return;
  }

  const response = await fetch("./api/algorithm-question", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      collectionKey: state.currentAlgorithmCollection,
      topicName,
      questionId,
      title,
      intro,
    }),
  });
  if (!response.ok) {
    return;
  }

  await loadContentData();
  state.currentTopic = topicName;
  const currentQuestions = getQuestionsForTopic(topicName);
  state.currentQuestionId = currentQuestions[currentQuestions.length - 1]?.id ?? null;
  closeAddQuestionModal();
  persistLastView();
  renderTopics();
  renderContent();
}

function bindAddQuestionModal() {
  openAddQuestionBtn.addEventListener("click", openAddQuestionModal);
  closeAddQuestionBtn.addEventListener("click", closeAddQuestionModal);
  cancelAddQuestionBtn.addEventListener("click", closeAddQuestionModal);
  addQuestionModal.addEventListener("click", (event) => {
    if (event.target === addQuestionModal) {
      closeAddQuestionModal();
    }
  });
  saveAddQuestionBtn.addEventListener("click", saveNewQuestion);
}

function persistLastView() {
  const payload = {
    currentView: state.currentView,
    currentAlgorithmCollection: state.currentAlgorithmCollection,
    currentSection: state.currentSection,
    currentSectionQuestionIndex: state.currentSectionQuestionIndex,
    currentTopic: state.currentTopic,
    currentTab: state.currentTab,
    currentQuestionId: state.currentQuestionId,
  };
  localStorage.setItem(LAST_VIEW_STORAGE_KEY, JSON.stringify(payload));
}

function restoreLastView() {
  try {
    const raw = localStorage.getItem(LAST_VIEW_STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved.currentView && ["home", "algorithmHome", "hot100", "section"].includes(saved.currentView)) {
      state.currentView = saved.currentView;
    }
    if (saved.currentAlgorithmCollection && ALGORITHM_COLLECTIONS[saved.currentAlgorithmCollection]) {
      state.currentAlgorithmCollection = saved.currentAlgorithmCollection;
    }
    if (typeof saved.currentSection === "string") {
      state.currentSection = saved.currentSection;
    }
    if (typeof saved.currentSectionQuestionIndex === "number") {
      state.currentSectionQuestionIndex = saved.currentSectionQuestionIndex;
    }
    if (saved.currentTopic && getActiveTopics().includes(saved.currentTopic)) {
      state.currentTopic = saved.currentTopic;
    }
    if (saved.currentTab && ["core", "acm", "analysis"].includes(saved.currentTab)) {
      state.currentTab = saved.currentTab;
    }
    if (typeof saved.currentQuestionId === "string" || typeof saved.currentQuestionId === "number") {
      state.currentQuestionId = String(saved.currentQuestionId);
    }
  } catch {
    // ignore invalid cached state
  }
}

async function loadBinaryTreeQuestions() {
  const response = await fetch("./binary-tree-questions.json", { cache: "no-store" });
  const questions = await response.json();
  topicData[SPECIAL_TOPIC] = {
    filled: true,
    title: "困难题单",
    intro: "这里会自动汇总你收藏的题目。",
    coreCode: "",
    acmCode: "",
    analysis: "",
    questions: [],
  };
  topicData["二叉树"] = {
    filled: true,
    title: "二叉树专题题单",
    intro: "当前专题已经按题号拆分，点击题号即可切换查看对应内容。",
    coreCode: "",
    acmCode: "",
    analysis: "",
    questions: questions.map((question) => ({
      ...question,
      sourceTopic: "二叉树",
    })),
  };
}

async function loadContentData() {
  const response = await fetch("./api/content", { cache: "no-store" });
  const data = await response.json();
  const payloadCollections = Array.isArray(data.collections) ? data.collections : [];
  algorithmData = {
    hot100: {
      topics: [SPECIAL_TOPIC],
      topicData: {
        [SPECIAL_TOPIC]: {
          filled: true,
          title: "困难题单",
          intro: "这里会自动汇总你收藏的题目。",
          coreCode: "",
          acmCode: "",
          analysis: "",
          questions: [],
        },
      },
    },
    classic150: {
      topics: [SPECIAL_TOPIC],
      topicData: {
        [SPECIAL_TOPIC]: {
          filled: true,
          title: "困难题单",
          intro: "这里会自动汇总你收藏的题目。",
          coreCode: "",
          acmCode: "",
          analysis: "",
          questions: [],
        },
      },
    },
  };

  payloadCollections.forEach((collection) => {
    const collectionKey = collection.key;
    if (!algorithmData[collectionKey]) return;
    const payloadTopics = Array.isArray(collection.topics) ? collection.topics : [];
    algorithmData[collectionKey].topics = [SPECIAL_TOPIC, ...payloadTopics.map((topic) => topic.name)];
    payloadTopics.forEach((topic) => {
      algorithmData[collectionKey].topicData[topic.name] = {
        filled: Boolean(topic.filled),
        title: topic.title || `${topic.name}专题题单`,
        intro: topic.intro || "当前专题已经按题号拆分，点击题目即可切换查看对应内容。",
        coreCode: topic.coreCode || "",
        acmCode: topic.acmCode || "",
        analysis: topic.analysis || "",
        questions: (topic.questions || []).map((question) => ({
          ...question,
          id: String(question.id),
          collectionKey,
          sourceTopic: question.sourceTopic || topic.name,
        })),
      };
    });
  });

  if (!state.currentTopic || !getActiveTopics().includes(state.currentTopic)) {
    state.currentTopic = getActiveTopics().find((topic) => topic !== SPECIAL_TOPIC) || SPECIAL_TOPIC;
  }
}

async function loadSectionsData() {
  const response = await fetch("./api/sections", { cache: "no-store" });
  const data = await response.json();
  SECTION_PAGE_DATA = data.sections && typeof data.sections === "object" ? data.sections : {};
}

async function loadGraphQuestions() {
  const response = await fetch("./graph-questions.json", { cache: "no-store" });
  const questions = await response.json();
  topicData["图论"] = {
    filled: true,
    title: "图论专题题单",
    intro: "当前专题已经按题号拆分，点击题目即可切换查看对应内容。",
    coreCode: "",
    acmCode: "",
    analysis: "",
    questions: questions.map((question) => ({
      ...question,
      sourceTopic: "图论",
    })),
  };
}

async function loadBacktrackingQuestions() {
  const response = await fetch("./backtracking-questions.json", { cache: "no-store" });
  const questions = await response.json();
  topicData["回溯"] = {
    filled: true,
    title: "回溯专题题单",
    intro: "当前专题已经按题号拆分，点击题目即可切换查看对应内容。",
    coreCode: "",
    acmCode: "",
    analysis: "",
    questions: questions.map((question) => ({
      ...question,
      sourceTopic: "回溯",
    })),
  };
}

async function loadBinarySearchQuestions() {
  const response = await fetch("./binary-search-questions.json", { cache: "no-store" });
  const questions = await response.json();
  topicData["二分查找"] = {
    filled: true,
    title: "二分查找专题题单",
    intro: "当前专题已经按题号拆分，点击题目即可切换查看对应内容。",
    coreCode: "",
    acmCode: "",
    analysis: "",
    questions: questions.map((question) => ({
      ...question,
      sourceTopic: "二分查找",
    })),
  };
}

async function loadStackQuestions() {
  const response = await fetch("./stack-questions.json", { cache: "no-store" });
  const questions = await response.json();
  topicData["栈"] = {
    filled: true,
    title: "栈专题题单",
    intro: "当前专题已经按题号拆分，点击题目即可切换查看对应内容。",
    coreCode: "",
    acmCode: "",
    analysis: "",
    questions: questions.map((question) => ({
      ...question,
      sourceTopic: "栈",
    })),
  };
}

async function loadHeapQuestions() {
  const response = await fetch("./heap-questions.json", { cache: "no-store" });
  const questions = await response.json();
  topicData["堆"] = {
    filled: true,
    title: "堆专题题单",
    intro: "当前专题已经按题号拆分，点击题目即可切换查看对应内容。",
    coreCode: "",
    acmCode: "",
    analysis: "",
    questions: questions.map((question) => ({
      ...question,
      sourceTopic: "堆",
    })),
  };
}

async function loadGreedyQuestions() {
  const response = await fetch("./greedy-questions.json", { cache: "no-store" });
  const questions = await response.json();
  topicData["贪心算法"] = {
    filled: true,
    title: "贪心算法专题题单",
    intro: "当前专题已经按题号拆分，点击题目即可切换查看对应内容。",
    coreCode: "",
    acmCode: "",
    analysis: "",
    questions: questions.map((question) => ({
      ...question,
      sourceTopic: "贪心算法",
    })),
  };
}

async function loadDpQuestions() {
  const response = await fetch("./dp-questions.json", { cache: "no-store" });
  const questions = await response.json();
  topicData["动态规划"] = {
    filled: true,
    title: "动态规划专题题单",
    intro: "当前专题已经按题号拆分，点击题目即可切换查看对应内容。",
    coreCode: "",
    acmCode: "",
    analysis: "",
    questions: questions.map((question) => ({
      ...question,
      sourceTopic: "动态规划",
    })),
  };
}

async function loadMultiDpQuestions() {
  const response = await fetch("./multi-dp-questions.json", { cache: "no-store" });
  const questions = await response.json();
  topicData["多维动态规划"] = {
    filled: true,
    title: "多维动态规划专题题单",
    intro: "当前专题已经按题号拆分，点击题目即可切换查看对应内容。",
    coreCode: "",
    acmCode: "",
    analysis: "",
    questions: questions.map((question) => ({
      ...question,
      sourceTopic: "多维动态规划",
    })),
  };
}

async function loadTechniquesQuestions() {
  const response = await fetch("./techniques-questions.json", { cache: "no-store" });
  const questions = await response.json();
  topicData["技巧"] = {
    filled: true,
    title: "技巧专题题单",
    intro: "当前专题已经按题号拆分，点击题目即可切换查看对应内容。",
    coreCode: "",
    acmCode: "",
    analysis: "",
    questions: questions.map((question) => ({
      ...question,
      sourceTopic: "技巧",
    })),
  };
}

async function loadHashQuestions() {
  const response = await fetch("./hash-questions.json", { cache: "no-store" });
  const questions = await response.json();
  topicData["哈希"] = {
    filled: true,
    title: "哈希专题题单",
    intro: "当前专题已经按题号拆分，点击题目即可切换查看对应内容。",
    coreCode: "",
    acmCode: "",
    analysis: "",
    questions: questions.map((question) => ({
      ...question,
      sourceTopic: "哈希",
    })),
  };
}

async function loadSlidingWindowQuestions() {
  const response = await fetch("./sliding-window-questions.json", { cache: "no-store" });
  const questions = await response.json();
  topicData["滑动窗口"] = {
    filled: true,
    title: "滑动窗口专题题单",
    intro: "当前专题已经按题号拆分，点击题目即可切换查看对应内容。",
    coreCode: "",
    acmCode: "",
    analysis: "",
    questions: questions.map((question) => ({
      ...question,
      sourceTopic: "滑动窗口",
    })),
  };
}

async function loadSubstringQuestions() {
  const response = await fetch("./substring-questions.json", { cache: "no-store" });
  const questions = await response.json();
  topicData["子串"] = {
    filled: true,
    title: "子串专题题单",
    intro: "当前专题已经按题号拆分，点击题目即可切换查看对应内容。",
    coreCode: "",
    acmCode: "",
    analysis: "",
    questions: questions.map((question) => ({
      ...question,
      sourceTopic: "子串",
    })),
  };
}

async function loadMatrixQuestions() {
  const response = await fetch("./matrix-questions.json", { cache: "no-store" });
  const questions = await response.json();
  topicData["矩阵"] = {
    filled: true,
    title: "矩阵专题题单",
    intro: "当前专题已经按题号拆分，点击题目即可切换查看对应内容。",
    coreCode: "",
    acmCode: "",
    analysis: "",
    questions: questions.map((question) => ({
      ...question,
      sourceTopic: "矩阵",
    })),
  };
}

async function loadLinkedListQuestions() {
  const response = await fetch("./linked-list-questions.json", { cache: "no-store" });
  const questions = await response.json();
  topicData["链表"] = {
    filled: true,
    title: "链表专题题单",
    intro: "当前专题已经按题号拆分，点击题目即可切换查看对应内容。",
    coreCode: "",
    acmCode: "",
    analysis: "",
    questions: questions.map((question) => ({
      ...question,
      sourceTopic: "链表",
    })),
  };
}

async function loadArrayQuestions() {
  const response = await fetch("./array-questions.json", { cache: "no-store" });
  const questions = await response.json();
  topicData["普通数组"] = {
    filled: true,
    title: "普通数组专题题单",
    intro: "当前专题已经按题号拆分，点击题目即可切换查看对应内容。",
    coreCode: "",
    acmCode: "",
    analysis: "",
    questions: questions.map((question) => ({
      ...question,
      sourceTopic: "普通数组",
    })),
  };
}

async function loadTwoPointersQuestions() {
  const response = await fetch("./two-pointers-questions.json", { cache: "no-store" });
  const questions = await response.json();
  topicData["双指针"] = {
    filled: true,
    title: "双指针专题题单",
    intro: "当前专题已经按题号拆分，点击题目即可切换查看对应内容。",
    coreCode: "",
    acmCode: "",
    analysis: "",
    questions: questions.map((question) => ({
      ...question,
      sourceTopic: "双指针",
    })),
  };
}

async function init() {
  await loadAppState();
  await loadContentData();
  await loadSectionsData();
  restoreLastView();

  if (!state.currentTopic || !getActiveTopics().includes(state.currentTopic)) {
    state.currentTopic = getActiveTopics().find((topic) => topic !== SPECIAL_TOPIC) || SPECIAL_TOPIC;
  }

  const questions = getQuestionsForTopic(state.currentTopic);
  if (
    !questions.some(
      (question) =>
        normalizeQuestionId(question.id) === normalizeQuestionId(state.currentQuestionId)
    )
  ) {
    state.currentQuestionId = questions[0]?.id ?? null;
  }
  renderTopics();
  renderContent();
  renderHome();
  renderCurrentView();
  bindViewNavigation();
  bindSectionActions();
  bindTabs();
  bindQuestionArrows();
  bindAnalysisActions();
  bindCodeEditorAutoResize();
  bindRichTextShortcuts();
  bindFavoriteAction();
  bindAddQuestionModal();
  analysisActions.hidden = false;
  tabButtons.forEach((item) => {
    item.classList.toggle("active", item.dataset.tab === state.currentTab);
  });
  tabContents.forEach((content) => {
    content.classList.toggle("active", content.id === `tab-${state.currentTab}`);
  });
  persistLastView();
}

init();
