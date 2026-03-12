console.log("app.js loaded");

window.onerror = (m, s, l, c, e) => {
  console.error(e || m);
  const el = document.getElementById("labelPreview");
  if (el) {
    el.innerHTML = `<div style="padding:12px;color:red;white-space:pre-wrap">${e?.stack || m}</div>`;
  }
};

const $ = (id) => document.getElementById(id);

const fields = [
  "제품명",
  "식품유형",
  "중량",
  "제조원",
  "원재료명",
  "알레르기",
  "보관방법",
  "총내용량",
  "기준량",
  "열량"
];

// 고정 영양성분 순서
const fixedNutritionNames = [
  "나트륨",
  "탄수화물",
  "당류",
  "지방",
  "트랜스지방",
  "포화지방",
  "콜레스테롤",
  "단백질"
];

const defaultState = () => ({
  제품명: "",
  식품유형: "",
  중량: "",
  제조원: "",
  원재료명: "",
  알레르기: "",
  보관방법: "",
  총내용량: "",
  기준량: "",
  열량: "",
  영양성분: fixedNutritionNames.map((name) => ({
    name,
    amount: "",
    percent: ""
  })),
});

function normalizeState(s) {
  const base = defaultState();
  const next = { ...base, ...(s || {}) };

  const current = Array.isArray(next.영양성분) ? next.영양성분 : [];

  const fixedRows = fixedNutritionNames.map((name) => {
    const found = current.find((x) => String(x.name || "").trim() === name);
    return found || { name, amount: "", percent: "" };
  });

  const extraRows = current.filter((x) => {
    const n = String(x.name || "").trim();
    return n && !fixedNutritionNames.includes(n);
  });

  next.영양성분 = [...fixedRows, ...extraRows];
  return next;
}

let state = normalizeState(loadState() ?? defaultState());

function saveState() {
  localStorage.setItem("label_state_v1", JSON.stringify(state));
}

function loadState() {
  try {
    const s = localStorage.getItem("label_state_v1");
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function chunk3(items) {
  const rows = [];
  for (let i = 0; i < items.length; i += 3) {
    const row = items.slice(i, i + 3);
    while (row.length < 3) row.push(null);
    rows.push(row);
  }
  while (rows.length < 3) rows.push([null, null, null]);
  return rows;
}

function isNumberText(v) {
  return /^\d+(\.\d+)?$/.test(String(v ?? "").trim());
}

function getNutriUnit(name) {
  const n = String(name ?? "").replace(/\s/g, "");

  if (/열량/.test(n)) return "kcal";
  if (/나트륨|콜레스테롤/.test(n)) return "mg";

  return "g";
}

function fmtNutriAmount(name, amount) {
  const raw = String(amount ?? "").trim();
  if (!raw) return "";

  const compact = raw.replace(/\s+/g, "");
  if (/(mg|g|kcal)$/i.test(compact)) return compact;

  if (isNumberText(raw)) return raw + getNutriUnit(name);

  return raw;
}

function fmtNutriPercent(percent) {
  const raw = String(percent ?? "").trim();
  if (!raw) return "";

  if (/%$/.test(raw)) return raw;
  if (isNumberText(raw)) return raw + "%";

  return raw;
}

function renderPreview() {
  const rows = chunk3(
    state.영양성분.filter((x) => (x.name || x.amount || x.percent))
  );

  const mainRows = [
    ["제품명", state.제품명],
    ["식품유형", state.식품유형],
    ["중량", state.중량],
    ["제조원", state.제조원],
    ["원재료명", state.원재료명],
    ["알레르기", state.알레르기, "allergen"],
    ["보관방법", state.보관방법],
  ];

  const mainHtml = mainRows.map(([k, v, cls]) => `
    <tr>
      <td class="cellLabel">${esc(k)}</td>
      <td class="cellValue ${cls || ""}">${esc(v).replaceAll("\n", "<br>")}</td>
    </tr>
  `).join("");

  const nutriHtml = rows.map((r) => `
    <tr>
      ${r.map((item) => item ? `
        <td class="nLabel">${esc(item.name)}</td>
        <td class="nVal">${esc(fmtNutriAmount(item.name, item.amount))}</td>
        <td class="nPct">${esc(fmtNutriPercent(item.percent))}</td>
      ` : `
        <td class="nLabel">&nbsp;</td>
        <td class="nVal">&nbsp;</td>
        <td class="nPct">&nbsp;</td>
      `).join("")}
    </tr>
  `).join("");

  document.getElementById("labelPreview").innerHTML = `
    <div class="label" id="labelRoot">
      <div class="watermark">마당몰</div>

      <div class="labelTitle">한글표시사항</div>

      <div class="box">
        <table class="main">${mainHtml}</table>

        <table>
          <tr class="nutriHeadRow">
            <td class="cellLabel" style="width:180px;">영양정보</td>
            <td class="cellValue">총 내용량 ${esc(state.총내용량)} | ${esc(state.기준량)} ${esc(state.열량)}</td>
          </tr>
        </table>

        <table class="nutriTable">${nutriHtml}</table>
      </div>

      <div style="height:14px;"></div>

      <div class="note" style="position:static; bottom:auto; left:auto; right:auto; transform:none; display:block; clear:both; margin:16px 0 0 0; padding:0; line-height:1.4; text-align:center;">
        1일 영양성분 기준치에 대한 비율(%)은 개인의 필요 열량에 따라 다를 수 있습니다.
      </div>
    </div>
  `;

  const root = document.getElementById("labelRoot");
  const wm = root ? root.querySelector(".watermark") : null;

  if (root) {
    root.style.position = "relative";
    root.style.overflow = "hidden";
  }

  if (wm) {
    wm.removeAttribute("style");
    Object.assign(wm.style, {
      position: "absolute",
      top: "500px",
      left: "50px",
      transform: "rotate(-32deg)",
      transformOrigin: "left top",
      fontSize: "300px",
      fontWeight: "900",
      lineHeight: "1",
      letterSpacing: "0px",
      whiteSpace: "nowrap",
      color: "#c9c9c9",
      opacity: "0.2",
      zIndex: "2",
      pointerEvents: "none",
      userSelect: "none",
    });
  }
}

function renderNutriInputs() {
  const tbody = $("nutriRows");
  tbody.innerHTML = "";

  state.영양성분.forEach((item, idx) => {
    const isFixed = fixedNutritionNames.includes(String(item.name || "").trim());

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <input
          data-k="name"
          data-idx="${idx}"
          value="${esc(item.name)}"
          ${isFixed ? "readonly" : ""}
        />
      </td>
      <td>
        <input
          data-k="amount"
          data-idx="${idx}"
          value="${esc(item.amount)}"
        />
      </td>
      <td>
        <input
          data-k="percent"
          data-idx="${idx}"
          value="${esc(item.percent)}"
        />
      </td>
      <td>
        ${isFixed ? "" : `<button class="btn small ghost" data-del="${idx}">삭제</button>`}
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("input").forEach((inp) => {
    inp.addEventListener("input", (e) => {
      const idx = Number(e.target.dataset.idx);
      const k = e.target.dataset.k;
      state.영양성분[idx][k] = e.target.value;
      saveState();
      renderPreview();
    });
  });

  tbody.querySelectorAll("button[data-del]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.del);
      state.영양성분.splice(idx, 1);
      saveState();
      renderNutriInputs();
      renderPreview();
    });
  });
}

function bindFieldInputs() {
  fields.forEach((f) => {
    const el = $(f);
    if (!el) return;

    el.value = state[f] ?? "";
    el.addEventListener("input", () => {
      state[f] = el.value;
      saveState();
      renderPreview();
    });
  });
}

$("btnAddNutri").addEventListener("click", () => {
  state.영양성분.push({ name: "", amount: "", percent: "" });
  saveState();
  renderNutriInputs();
  renderPreview();
});

$("btnExportPng").addEventListener("click", downloadPng860);

$("btnNew").addEventListener("click", () => {
  state = defaultState();
  saveState();
  bindFieldInputs();
  renderNutriInputs();
  renderPreview();
});

bindFieldInputs();
renderNutriInputs();
renderPreview();

async function downloadPng860() {
  const node = document.getElementById("labelRoot");
  if (!node) {
    alert("#labelRoot를 찾을 수 없음");
    return;
  }

  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  const canvas2x = await htmlToImage.toCanvas(node, {
    pixelRatio: 2,
    backgroundColor: "#ffffff",
    cacheBust: true,
  });

  const outW = 860;
  const outH = Math.round(canvas2x.height * (outW / canvas2x.width));

  const out = document.createElement("canvas");
  out.width = outW;
  out.height = outH;

  const ctx = out.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(canvas2x, 0, 0, outW, outH);

  const a = document.createElement("a");
  a.href = out.toDataURL("image/png");
  a.download = "표시사항.png";
  a.click();
}