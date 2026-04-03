import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
}

const USERNAME_SELECTORS = [
  'input[type="email"]',
  'input[type="text"][name*="email"]',
  'input[type="text"][name*="user"]',
  'input[type="text"][name*="login"]',
  'input[autocomplete="username"]',
  'input[autocomplete="email"]',
].join(",")

function findUsernameField(passwordInput: HTMLInputElement): HTMLInputElement | null {
  const form = passwordInput.closest("form")
  if (form) {
    const field = form.querySelector<HTMLInputElement>(USERNAME_SELECTORS)
    if (field) return field
    const allInputs = Array.from(form.querySelectorAll<HTMLInputElement>("input"))
    const pwIndex = allInputs.indexOf(passwordInput)
    for (let i = pwIndex - 1; i >= 0; i--) {
      if (allInputs[i].type === "text" || allInputs[i].type === "email") return allInputs[i]
    }
  }
  let node: Element | null = passwordInput.parentElement
  for (let depth = 0; depth < 5 && node; depth++, node = node.parentElement) {
    const field = node.querySelector<HTMLInputElement>(USERNAME_SELECTORS)
    if (field && field !== passwordInput) return field
  }
  return null
}

function findPasswordField(usernameInput: HTMLInputElement): HTMLInputElement | null {
  const form = usernameInput.closest("form")
  if (form) {
    const field = form.querySelector<HTMLInputElement>("input[type=password]")
    if (field) return field
  }
  let node: Element | null = usernameInput.parentElement
  for (let depth = 0; depth < 5 && node; depth++, node = node.parentElement) {
    const field = node.querySelector<HTMLInputElement>("input[type=password]")
    if (field) return field
  }
  return null
}

function fill(input: HTMLInputElement, value: string) {
  input.value = value
  input.dispatchEvent(new Event("input", { bubbles: true }))
  input.dispatchEvent(new Event("change", { bubbles: true }))
}

function applyCredentials(
  anchor: HTMLInputElement,
  username: string,
  password: string
) {
  const isPassword = anchor.type === "password"
  const passwordField = isPassword ? anchor : findPasswordField(anchor)
  const usernameField = isPassword ? findUsernameField(anchor) : anchor
  if (passwordField) fill(passwordField, password)
  if (usernameField) fill(usernameField, username)
}

// ── Inline dropdown ──────────────────────────────────────────────

let dropdown: HTMLDivElement | null = null

function showDropdown(anchor: HTMLInputElement, username: string, password: string) {
  if (hideTimeout) clearTimeout(hideTimeout)
  removeDropdown()

  const rect = anchor.getBoundingClientRect()
  const div = document.createElement("div")
  div.id = "__oryn_dropdown"
  div.style.cssText = `
    position: fixed;
    top: ${rect.bottom + 4}px;
    left: ${rect.left}px;
    width: ${rect.width}px;
    z-index: 2147483647;
    background: #ffffff;
    border: 1.5px solid #e4e2ff;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(97,82,232,0.15);
    font-family: -apple-system, system-ui, sans-serif;
    overflow: hidden;
    animation: oryn-in 0.15s ease;
  `

  div.innerHTML = `
    <style>@keyframes oryn-in { from { opacity:0; transform:translateY(-4px) } to { opacity:1; transform:translateY(0) } }</style>
    <div id="__oryn_item" style="display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;">
      <div style="width:28px;height:28px;border-radius:8px;background:#6152e8;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;">🔐</div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:10px;color:#8b84b0;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Oryn</div>
        <div style="font-size:13px;font-weight:600;color:#1a1535;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${username}</div>
      </div>
      <div style="font-size:11px;color:#6152e8;font-weight:700;flex-shrink:0;">Fill ↵</div>
    </div>
  `

  document.body.appendChild(div)
  dropdown = div

  div.querySelector("#__oryn_item")?.addEventListener("mousedown", (e) => {
    e.preventDefault()
    applyCredentials(anchor, username, password)
    removeDropdown()
  })
}

function removeDropdown() {
  dropdown?.remove()
  dropdown = null
}

let hideTimeout: ReturnType<typeof setTimeout> | null = null

// ── Focus logic ──────────────────────────────────────────────────

async function onFocus(anchor: HTMLInputElement) {
  const response = await chrome.runtime.sendMessage({
    type: "AUTOFILL_REQUEST",
    domain: window.location.hostname,
  })
  if (response?.password) {
    showDropdown(anchor, response.username ?? window.location.hostname, response.password)
  }
}

function onBlur() {
  if (hideTimeout) clearTimeout(hideTimeout)
  hideTimeout = setTimeout(removeDropdown, 150)
}

// ── Watch inputs ─────────────────────────────────────────────────

function watch(input: HTMLInputElement) {
  if (input.dataset.oryn) return
  input.dataset.oryn = "true"
  input.addEventListener("focus", () => onFocus(input))
  input.addEventListener("blur", onBlur)
}

function watchInputs() {
  document.querySelectorAll<HTMLInputElement>("input[type=password]").forEach(watch)
  document.querySelectorAll<HTMLInputElement>(USERNAME_SELECTORS).forEach(watch)
}

new MutationObserver(watchInputs).observe(document.body, { childList: true, subtree: true })
watchInputs()
