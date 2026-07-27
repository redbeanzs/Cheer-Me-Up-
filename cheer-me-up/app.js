"use strict";

const STORAGE_KEYS = {
  moods: "cheer-me-up:moods",
  favorites: "cheer-me-up:favorites"
};

const FALLBACKS = {
  quote: [
    { text: "You do not have to solve everything today.", author: "Cheer Me Up" },
    { text: "Small progress still counts as progress.", author: "Cheer Me Up" },
    { text: "Rest is part of moving forward.", author: "Cheer Me Up" },
    { text: "A hard day is not a failed life.", author: "Cheer Me Up" }
  ],
  advice: [
    "Drink some water and give yourself ten quiet minutes.",
    "Do the smallest version of the task in front of you.",
    "Text someone who makes you feel safe and understood.",
    "Change your environment for five minutes, even if it is just another room."
  ],
  cat: [
    "Cats can rotate their ears independently to locate sounds.",
    "A group of cats is sometimes called a clowder.",
    "Cats use their whiskers to help judge whether they can fit through a space.",
    "Most cats sleep for a large part of the day to conserve energy."
  ]
};

const state = {
  selectedMood: null,
  currentContent: {
    quote: { text: "", author: "" },
    advice: { text: "" },
    cat: { text: "" },
    dog: { text: "" }
  },
  moods: [],
  favorites: [],
  chart: null,
  supabase: null,
  useSupabase: false,
  userId: null
};

const elements = {};

window.addEventListener("DOMContentLoaded", init);

async function init() {
  cacheElements();
  bindEvents();
  await configureDataStore();
  await Promise.all([loadMoodData(), loadFavorites(), refreshAllContent()]);
  renderMoodHistory();
  renderFavorites();
  renderChart();
}

function cacheElements() {
  elements.moodOptions = [...document.querySelectorAll(".mood-option")];
  elements.moodNote = document.querySelector("#mood-note");
  elements.noteCount = document.querySelector("#note-count");
  elements.saveMood = document.querySelector("#save-mood");
  elements.moodStatus = document.querySelector("#mood-status");
  elements.contentStatus = document.querySelector("#content-status");
  elements.refreshAll = document.querySelector("#refresh-all");
  elements.refreshButtons = [...document.querySelectorAll(".refresh-card")];
  elements.favoriteButtons = [...document.querySelectorAll(".favorite-card")];
  elements.favoritesGrid = document.querySelector("#favorites-grid");
  elements.favoritesEmpty = document.querySelector("#favorites-empty");
  elements.favoriteTemplate = document.querySelector("#favorite-template");
  elements.clearFavorites = document.querySelector("#clear-favorites");
  elements.clearMoods = document.querySelector("#clear-moods");
  elements.moodHistory = document.querySelector("#mood-history");
  elements.moodsEmpty = document.querySelector("#moods-empty");
  elements.moodChart = document.querySelector("#mood-chart");
}

function bindEvents() {
  elements.moodOptions.forEach((button) => {
    button.addEventListener("click", () => selectMood(Number(button.dataset.mood)));
  });

  elements.moodNote.addEventListener("input", () => {
    elements.noteCount.textContent = `${elements.moodNote.value.length}/180`;
  });

  elements.saveMood.addEventListener("click", saveMood);
  elements.refreshAll.addEventListener("click", refreshAllContent);
  elements.refreshButtons.forEach((button) => {
    button.addEventListener("click", () => refreshContent(button.dataset.type));
  });
  elements.favoriteButtons.forEach((button) => {
    button.addEventListener("click", () => saveFavorite(button.dataset.type));
  });
  elements.clearFavorites.addEventListener("click", clearFavorites);
  elements.clearMoods.addEventListener("click", clearMoods);
}

async function configureDataStore() {
  const config = window.APP_CONFIG || {};
  const hasConfig = Boolean(config.SUPABASE_URL && config.SUPABASE_ANON_KEY);
  const hasLibrary = Boolean(window.supabase?.createClient);

  if (!hasConfig || !hasLibrary) return;

  try {
    state.supabase = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
    const { data: sessionData } = await state.supabase.auth.getSession();
    let session = sessionData.session;

    if (!session) {
      const { data, error } = await state.supabase.auth.signInAnonymously();
      if (error) throw error;
      session = data.session;
    }

    state.userId = session?.user?.id || null;
    state.useSupabase = Boolean(state.userId);
  } catch (error) {
    console.warn("Supabase setup failed; using localStorage instead.", error);
    state.useSupabase = false;
    state.supabase = null;
  }
}

function selectMood(value) {
  state.selectedMood = value;
  elements.saveMood.disabled = false;
  elements.moodOptions.forEach((button) => {
    const selected = Number(button.dataset.mood) === value;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  showStatus(elements.moodStatus, `Mood ${value} selected.`);
}

async function saveMood() {
  if (!state.selectedMood) return;

  const entry = {
    id: crypto.randomUUID(),
    mood: state.selectedMood,
    note: elements.moodNote.value.trim(),
    created_at: new Date().toISOString()
  };

  try {
    if (state.useSupabase) {
      const { data, error } = await state.supabase
        .from("moods")
        .insert({ mood: entry.mood, note: entry.note, user_id: state.userId })
        .select()
        .single();
      if (error) throw error;
      state.moods.unshift(data);
    } else {
      state.moods.unshift(entry);
      saveLocal(STORAGE_KEYS.moods, state.moods);
    }

    state.moods = state.moods.slice(0, 30);
    resetMoodForm();
    renderMoodHistory();
    renderChart();
    showStatus(elements.moodStatus, "Mood saved. Thank you for checking in with yourself.");
  } catch (error) {
    console.error(error);
    showStatus(elements.moodStatus, "Your mood could not be saved. Please try again.", true);
  }
}

function resetMoodForm() {
  state.selectedMood = null;
  elements.moodNote.value = "";
  elements.noteCount.textContent = "0/180";
  elements.saveMood.disabled = true;
  elements.moodOptions.forEach((button) => {
    button.classList.remove("is-selected");
    button.setAttribute("aria-pressed", "false");
  });
}

async function loadMoodData() {
  try {
    if (state.useSupabase) {
      const { data, error } = await state.supabase
        .from("moods")
        .select("id,mood,note,created_at")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      state.moods = data || [];
    } else {
      state.moods = loadLocal(STORAGE_KEYS.moods);
    }
  } catch (error) {
    console.error(error);
    state.moods = loadLocal(STORAGE_KEYS.moods);
  }
}

async function loadFavorites() {
  try {
    if (state.useSupabase) {
      const { data, error } = await state.supabase
        .from("favorites")
        .select("id,type,content,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      state.favorites = data || [];
    } else {
      state.favorites = loadLocal(STORAGE_KEYS.favorites);
    }
  } catch (error) {
    console.error(error);
    state.favorites = loadLocal(STORAGE_KEYS.favorites);
  }
}

async function refreshAllContent() {
  elements.refreshAll.disabled = true;
  showStatus(elements.contentStatus, "Finding a few things for you...");
  await Promise.all(["quote", "advice", "cat", "dog"].map(refreshContent));
  elements.refreshAll.disabled = false;
  showStatus(elements.contentStatus, "Fresh mood boosts are ready.");
}

async function refreshContent(type) {
  setCardLoading(type, true);
  try {
    const content = await fetchContent(type);
    state.currentContent[type] = content;
    updateCard(type, content);
  } catch (error) {
    console.warn(`${type} request failed`, error);
    const fallback = fallbackContent(type);
    state.currentContent[type] = fallback;
    updateCard(type, fallback);
  } finally {
    setCardLoading(type, false);
  }
}

async function fetchContent(type) {
  const requestOptions = { headers: { Accept: "application/json" }, cache: "no-store" };

  if (type === "quote") {
    const response = await fetch("https://dummyjson.com/quotes/random", requestOptions);
    if (!response.ok) throw new Error("Quote request failed");
    const data = await response.json();
    return { text: data.quote, author: data.author || "Unknown" };
  }

  if (type === "advice") {
    const response = await fetch(`https://api.adviceslip.com/advice?cache=${Date.now()}`, requestOptions);
    if (!response.ok) throw new Error("Advice request failed");
    const data = await response.json();
    return { text: data.slip.advice };
  }

  if (type === "cat") {
    const response = await fetch("https://catfact.ninja/fact", requestOptions);
    if (!response.ok) throw new Error("Cat fact request failed");
    const data = await response.json();
    return { text: data.fact };
  }

  if (type === "dog") {
    const response = await fetch("https://dog.ceo/api/breeds/image/random", requestOptions);
    if (!response.ok) throw new Error("Dog image request failed");
    const data = await response.json();
    return { text: data.message };
  }

  throw new Error("Unknown content type");
}

function fallbackContent(type) {
  if (type === "dog") {
    return { text: "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=1000&q=80" };
  }
  const options = FALLBACKS[type];
  const item = options[Math.floor(Math.random() * options.length)];
  return typeof item === "string" ? { text: item } : item;
}

function updateCard(type, content) {
  if (type === "quote") {
    document.querySelector("#quote-text").textContent = `“${content.text}”`;
    document.querySelector("#quote-author").textContent = content.author ? `— ${content.author}` : "";
  } else if (type === "advice") {
    document.querySelector("#advice-text").textContent = content.text;
  } else if (type === "cat") {
    document.querySelector("#cat-text").textContent = content.text;
  } else if (type === "dog") {
    const image = document.querySelector("#dog-image");
    image.src = content.text;
  }
}

function setCardLoading(type, isLoading) {
  const card = document.querySelector(`[data-card-type="${type}"]`);
  card?.setAttribute("aria-busy", String(isLoading));
}

async function saveFavorite(type) {
  const current = state.currentContent[type];
  if (!current?.text) return;

  const content = type === "quote" && current.author
    ? `${current.text} — ${current.author}`
    : current.text;

  const duplicate = state.favorites.some((favorite) => favorite.type === type && favorite.content === content);
  if (duplicate) {
    showStatus(elements.contentStatus, "That item is already in your favorites.");
    return;
  }

  const favorite = {
    id: crypto.randomUUID(),
    type,
    content,
    created_at: new Date().toISOString()
  };

  try {
    if (state.useSupabase) {
      const { data, error } = await state.supabase
        .from("favorites")
        .insert({ type, content, user_id: state.userId })
        .select()
        .single();
      if (error) throw error;
      state.favorites.unshift(data);
    } else {
      state.favorites.unshift(favorite);
      saveLocal(STORAGE_KEYS.favorites, state.favorites);
    }

    renderFavorites();
    showStatus(elements.contentStatus, "Saved to favorites.");
  } catch (error) {
    console.error(error);
    showStatus(elements.contentStatus, "That favorite could not be saved.", true);
  }
}

function renderFavorites() {
  elements.favoritesGrid.innerHTML = "";
  elements.favoritesEmpty.hidden = state.favorites.length > 0;
  elements.clearFavorites.disabled = state.favorites.length === 0;

  state.favorites.forEach((favorite) => {
    const fragment = elements.favoriteTemplate.content.cloneNode(true);
    fragment.querySelector(".favorite-type").textContent = favorite.type;
    const contentElement = fragment.querySelector(".favorite-content");

    if (favorite.type === "dog") {
      const image = document.createElement("img");
      image.src = favorite.content;
      image.alt = "Saved dog";
      image.loading = "lazy";
      image.style.borderRadius = "14px";
      image.style.maxHeight = "220px";
      image.style.width = "100%";
      image.style.objectFit = "cover";
      contentElement.replaceWith(image);
    } else {
      contentElement.textContent = favorite.content;
    }

    fragment.querySelector(".remove-favorite").addEventListener("click", () => removeFavorite(favorite.id));
    elements.favoritesGrid.appendChild(fragment);
  });
}

async function removeFavorite(id) {
  try {
    if (state.useSupabase) {
      const { error } = await state.supabase.from("favorites").delete().eq("id", id);
      if (error) throw error;
    }
    state.favorites = state.favorites.filter((favorite) => favorite.id !== id);
    if (!state.useSupabase) saveLocal(STORAGE_KEYS.favorites, state.favorites);
    renderFavorites();
  } catch (error) {
    console.error(error);
    showStatus(elements.contentStatus, "That favorite could not be removed.", true);
  }
}

async function clearFavorites() {
  if (!state.favorites.length || !window.confirm("Clear all saved favorites?")) return;
  try {
    if (state.useSupabase) {
      const { error } = await state.supabase.from("favorites").delete().eq("user_id", state.userId);
      if (error) throw error;
    }
    state.favorites = [];
    saveLocal(STORAGE_KEYS.favorites, []);
    renderFavorites();
  } catch (error) {
    console.error(error);
  }
}

async function clearMoods() {
  if (!state.moods.length || !window.confirm("Clear your entire mood history?")) return;
  try {
    if (state.useSupabase) {
      const { error } = await state.supabase.from("moods").delete().eq("user_id", state.userId);
      if (error) throw error;
    }
    state.moods = [];
    saveLocal(STORAGE_KEYS.moods, []);
    renderMoodHistory();
    renderChart();
  } catch (error) {
    console.error(error);
  }
}

function renderMoodHistory() {
  elements.moodHistory.innerHTML = "";
  elements.moodsEmpty.hidden = state.moods.length > 0;
  elements.clearMoods.disabled = state.moods.length === 0;

  state.moods.slice(0, 7).forEach((entry) => {
    const item = document.createElement("div");
    item.className = "history-item";

    const emoji = document.createElement("span");
    emoji.className = "history-emoji";
    emoji.textContent = moodEmoji(entry.mood);

    const details = document.createElement("div");
    const note = document.createElement("p");
    note.textContent = entry.note || moodLabel(entry.mood);
    const date = document.createElement("small");
    date.textContent = formatDate(entry.created_at);

    details.append(note, date);
    item.append(emoji, details);
    elements.moodHistory.appendChild(item);
  });
}

function renderChart() {
  if (!window.Chart || !elements.moodChart) return;
  const ordered = [...state.moods].slice(0, 14).reverse();

  if (state.chart) state.chart.destroy();

  state.chart = new Chart(elements.moodChart, {
    type: "line",
    data: {
      labels: ordered.map((entry) => new Date(entry.created_at).toLocaleDateString([], { month: "short", day: "numeric" })),
      datasets: [{
        label: "Mood",
        data: ordered.map((entry) => entry.mood),
        borderColor: "#d85b87",
        backgroundColor: "rgba(216, 91, 135, 0.16)",
        pointBackgroundColor: "#ffd76a",
        pointBorderColor: "#342b36",
        pointRadius: 5,
        pointHoverRadius: 7,
        borderWidth: 3,
        tension: 0.32,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          min: 1,
          max: 5,
          ticks: { stepSize: 1, callback: (value) => moodLabel(value) },
          grid: { color: "rgba(52, 43, 54, 0.08)" }
        },
        x: { grid: { display: false } }
      }
    }
  });
}

function loadLocal(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocal(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function moodEmoji(value) {
  return ({ 1: "😞", 2: "🙁", 3: "😐", 4: "🙂", 5: "😁" })[Number(value)] || "😐";
}

function moodLabel(value) {
  return ({ 1: "Very low", 2: "Low", 3: "Okay", 4: "Good", 5: "Great" })[Number(value)] || "Okay";
}

function formatDate(value) {
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function showStatus(element, message, isError = false) {
  element.textContent = message;
  element.style.color = isError ? "#a73f3f" : "";
}
