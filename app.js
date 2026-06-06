const state = {
  today: "",
  cycleNumber: 1,
  cycleDay: 1,
  cycleTotalDays: 10,
  todayQuota: 0,
  todayRemaining: 0,
  hasDrawToday: false,
  completedCount: 0,
  remainingCount: 0,
  todayProblems: [],
  visibleLimit: 2,
  loading: false
};

const elements = {
  bottle: document.getElementById("bottle"),
  confettiLayer: document.getElementById("confettiLayer"),
  tickets: [document.getElementById("ticket0"), document.getElementById("ticket1")],
  ticketTemplate: document.getElementById("ticketTemplate"),
  shakeButton: document.getElementById("shakeButton"),
  hintText: document.getElementById("hintText"),
  todayText: document.getElementById("todayText"),
  todayQuota: document.getElementById("todayQuota"),
  todayRemaining: document.getElementById("todayRemaining"),
  remainingCount: document.getElementById("remainingCount"),
  completedCount: document.getElementById("completedCount")
};

init();

async function init() {
  seedConfetti();
  elements.shakeButton.addEventListener("click", handleShake);
  await refreshState();
}

function seedConfetti() {
  const pieces = 16;

  for (let i = 0; i < pieces; i += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.left = `${8 + (i % 4) * 22 + Math.random() * 14}%`;
    piece.style.top = `${18 + Math.floor(i / 4) * 16 + Math.random() * 8}%`;
    piece.style.setProperty("--r", `${Math.round(Math.random() * 44 - 22)}deg`);
    elements.confettiLayer.appendChild(piece);
  }
}

async function handleShake() {
  if (state.loading) {
    return;
  }

  playShakeAnimation();
  await mutateState("/api/draw");
}

function playShakeAnimation() {
  elements.bottle.classList.remove("shaking");
  void elements.bottle.offsetWidth;
  elements.bottle.classList.add("shaking");
}

async function markCompleted(problemId) {
  if (state.loading) {
    return;
  }

  await mutateState("/api/complete", { problemId });
}

async function refreshState() {
  setLoading(true);

  try {
    const response = await fetch("/api/state");

    if (!response.ok) {
      throw new Error("Failed to load state");
    }

    updateState(await response.json());
  } catch (error) {
    handleRequestError(error);
  } finally {
    setLoading(false);
    render();
  }
}

async function mutateState(url, payload = undefined) {
  setLoading(true);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload ? JSON.stringify(payload) : undefined
    });

    if (!response.ok) {
      throw new Error("Request failed");
    }

    updateState(await response.json());
  } catch (error) {
    handleRequestError(error);
  } finally {
    setLoading(false);
    render();
  }
}

function updateState(nextState) {
  state.today = nextState.today;
  state.cycleNumber = nextState.cycleNumber;
  state.cycleDay = nextState.cycleDay;
  state.cycleTotalDays = nextState.cycleTotalDays;
  state.todayQuota = nextState.todayQuota;
  state.todayRemaining = nextState.todayRemaining;
  state.hasDrawToday = nextState.hasDrawToday;
  state.completedCount = nextState.completedCount;
  state.remainingCount = nextState.remainingCount;
  state.todayProblems = nextState.todayProblems;
}

function handleRequestError(error) {
  console.error(error);
  elements.hintText.textContent = "没有连上本地服务，请先运行 `npm start` 再打开页面。";
}

function setLoading(loading) {
  state.loading = loading;
}

function render() {
  elements.todayText.textContent = state.today || "-";
  elements.remainingCount.textContent = `${state.remainingCount} 题`;
  elements.completedCount.textContent = `${state.completedCount} 题`;
  elements.todayQuota.textContent = state.todayQuota ? `${state.todayQuota} 题` : "-";
  elements.todayRemaining.textContent = `${state.todayRemaining} 题`;

  elements.shakeButton.disabled = state.loading;
  elements.shakeButton.textContent = state.loading ? "加载中..." : "摇一摇";

  if (state.remainingCount === 0 && state.today) {
    elements.hintText.textContent = "这一轮 Hot100 已完成，下一次摇题会自动开启新一轮。";
  } else if (state.todayProblems.length > 0) {
    elements.hintText.textContent = `今天分到了 ${state.todayQuota} 道题，先露出 2 道，后面的会排队补上。`;
  } else if (state.hasDrawToday) {
    elements.hintText.textContent = "今天的题签都完成了，明天再来继续摇新题。";
  } else {
    elements.hintText.textContent = "今天还没摇题，按下按钮让纸条飞出来吧。";
  }

  renderTickets(state.todayProblems);
}

function renderTickets(problems) {
  const visibleProblems = problems.slice(0, state.visibleLimit);

  elements.tickets.forEach((ticket, index) => {
    const problem = visibleProblems[index];
    ticket.innerHTML = "";
    ticket.classList.remove("visible", "fly-left", "fly-right");

    if (!problem) {
      ticket.classList.add("hidden");
      return;
    }

    ticket.classList.remove("hidden");
    const node = elements.ticketTemplate.content.firstElementChild.cloneNode(true);

    node.querySelector(".ticket-title").textContent = `LC${problem.id}｜${problem.title}`;
    node.querySelector(".ticket-meta").textContent = `${problem.difficulty}｜${problem.category}`;

    const button = node.querySelector(".complete-button");
    button.disabled = state.loading;
    button.addEventListener("click", () => markCompleted(problem.id));

    ticket.appendChild(node);
    ticket.classList.add("visible", index === 0 ? "fly-left" : "fly-right");
  });
}
