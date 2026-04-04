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
  input.focus()
  // Native input value setter to trigger React/Vue synthetic events
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set
  nativeInputValueSetter?.call(input, value)
  input.dispatchEvent(new Event("input", { bubbles: true }))
  input.dispatchEvent(new Event("change", { bubbles: true }))
  input.blur()
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

function showDropdown(anchor: HTMLInputElement, domain: string) {
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
      <img src="${chrome.runtime.getURL("assets/logo.png")}" style="width:28px;height:28px;border-radius:8px;object-fit:cover;flex-shrink:0;" />
      <div style="flex:1;min-width:0;">
        <div style="font-size:10px;color:#8b84b0;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Oryn</div>
        <div style="font-size:13px;font-weight:600;color:#1a1535;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${domain}</div>
      </div>
      <div style="font-size:11px;color:#6152e8;font-weight:700;flex-shrink:0;">Fill ↵</div>
    </div>
  `

  document.body.appendChild(div)
  dropdown = div

  div.querySelector("#__oryn_item")?.addEventListener("mousedown", async (e) => {
    e.preventDefault()
    removeDropdown()
    showLedgerPrompt(anchor)
  })
}

async function showLedgerPrompt(anchor: HTMLInputElement) {
  const prompt = document.createElement("div")
  prompt.id = "__oryn_ledger_prompt"
  prompt.style.cssText = `
    position: fixed;
    top: 16px; right: 16px;
    z-index: 2147483647;
    background: #ffffff;
    border: 1.5px solid #e4e2ff;
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(97,82,232,0.18);
    font-family: -apple-system, system-ui, sans-serif;
    padding: 16px 18px;
    width: 260px;
    animation: oryn-in 0.2s ease;
  `
  prompt.innerHTML = `
    <style>@keyframes oryn-in { from { opacity:0; transform:translateY(-8px) } to { opacity:1; transform:translateY(0) } }</style>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
      <img src="${chrome.runtime.getURL("assets/logo.png")}" style="width:30px;height:30px;border-radius:8px;object-fit:cover;flex-shrink:0;" />
      <span style="font-size:13px;font-weight:800;color:#1a1535;">Confirm on Ledger</span>
    </div>
    <div style="font-size:12px;color:#8b84b0;line-height:1.6;margin-bottom:12px;">
      Check your Ledger screen and <strong style="color:#6152e8;">approve</strong> the signature request to decrypt your password.
    </div>
    <div id="__oryn_ledger_spinner" style="display:flex;align-items:center;gap:8px;">
      <div style="width:14px;height:14px;border:2px solid #e4e2ff;border-top-color:#6152e8;border-radius:50%;animation:oryn-spin 0.7s linear infinite;flex-shrink:0;"></div>
      <span style="font-size:11px;color:#8b84b0;font-weight:600;">Waiting for approval…</span>
    </div>
    <style>@keyframes oryn-spin { to { transform: rotate(360deg) } }</style>
  `
  document.body.appendChild(prompt)

  try {
    const response = await chrome.runtime.sendMessage({
      type: "AUTOFILL_REQUEST",
      domain: window.location.hostname,
    })
    prompt.remove()
    if (response?.password) {
      applyCredentials(anchor, response.username ?? "", response.password)
    }
  } catch {
    prompt.remove()
  }
}

function removeDropdown() {
  dropdown?.remove()
  dropdown = null
}

let hideTimeout: ReturnType<typeof setTimeout> | null = null

// ── Focus logic ──────────────────────────────────────────────────

async function onFocus(anchor: HTMLInputElement) {
  const response = await chrome.runtime.sendMessage({
    type: "AUTOFILL_CHECK",
    domain: window.location.hostname,
  })
  if (response?.domain) {
    showDropdown(anchor, response.domain)
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


// ── New password detection ───────────────────────────────────────

const SIGNUP_KEYWORDS = /sign.?up|register|create|join|s'inscrire|inscription|nouveau|new.?account/i

function isNewPasswordForm(form: HTMLFormElement): boolean {
  // Two password fields = confirm password pattern
  if (form.querySelectorAll("input[type=password]").length >= 2) return true
  // autocomplete="new-password"
  if (form.querySelector('input[autocomplete="new-password"]')) return true
  // Submit button text
  const submit = form.querySelector<HTMLElement>('[type=submit], button[type=button]')
  if (submit && SIGNUP_KEYWORDS.test(submit.textContent ?? "")) return true
  // Page title / heading
  return SIGNUP_KEYWORDS.test(document.title + (document.querySelector("h1")?.textContent ?? ""))
}

let saveBanner: HTMLDivElement | null = null

function showSaveBanner(username: string, password: string) {
  saveBanner?.remove()

  const banner = document.createElement("div")
  banner.style.cssText = `
    position: fixed;
    top: 16px; right: 16px;
    z-index: 2147483647;
    background: #ffffff;
    border: 1.5px solid #e4e2ff;
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(97,82,232,0.18);
    font-family: -apple-system, system-ui, sans-serif;
    padding: 14px 16px;
    width: 280px;
    animation: oryn-in 0.2s ease;
  `
  banner.innerHTML = `
    <style>@keyframes oryn-in { from { opacity:0; transform:translateY(-8px) } to { opacity:1; transform:translateY(0) } }</style>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
      <img src="${chrome.runtime.getURL("assets/logo.png")}" style="width:32px;height:32px;border-radius:10px;object-fit:cover;flex-shrink:0;" />
      <div>
        <div style="font-size:12px;font-weight:800;color:#1a1535;">Save to Oryn?</div>
        <div style="font-size:11px;color:#8b84b0;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px;">${username || window.location.hostname}</div>
      </div>
      <button id="__oryn_close" style="margin-left:auto;background:none;border:none;cursor:pointer;font-size:16px;color:#8b84b0;padding:0;line-height:1;">×</button>
    </div>
    <div style="display:flex;gap:8px;">
      <button id="__oryn_ignore" style="flex:1;padding:8px 0;border-radius:10px;border:1.5px solid #e4e2ff;background:#f5f4ff;color:#8b84b0;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">Ignore</button>
      <button id="__oryn_save" style="flex:2;padding:8px 0;border-radius:10px;border:none;background:#6152e8;color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">Save password</button>
    </div>
  `

  document.body.appendChild(banner)
  saveBanner = banner

  const close = () => { banner.remove(); saveBanner = null }

  banner.querySelector("#__oryn_close")?.addEventListener("click", close)
  banner.querySelector("#__oryn_ignore")?.addEventListener("click", close)
  banner.querySelector("#__oryn_save")?.addEventListener("click", () => {
    chrome.runtime.sendMessage({
      type: "SAVE_PASSWORD_REQUEST",
      domain: window.location.hostname,
      username,
      password,
    })
    close()
  })

  // Auto-dismiss after 12s
  setTimeout(close, 12_000)
}

function watchForms() {
  document.querySelectorAll<HTMLFormElement>("form").forEach((form) => {
    if (form.dataset.orynForm) return
    form.dataset.orynForm = "true"

    form.addEventListener("submit", () => {
      if (!isNewPasswordForm(form)) return
      const passwordInput = form.querySelector<HTMLInputElement>("input[type=password]")
      const usernameInput = form.querySelector<HTMLInputElement>(USERNAME_SELECTORS)
      const password = passwordInput?.value
      const username = usernameInput?.value ?? ""
      if (password) showSaveBanner(username, password)
    })
  })
}

new MutationObserver(() => { watchInputs(); watchForms() }).observe(document.body, { childList: true, subtree: true })
watchInputs()
watchForms()

