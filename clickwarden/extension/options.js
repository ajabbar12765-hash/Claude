async function load() {
  const { backendUrl, apiToken } = await chrome.storage.sync.get({ backendUrl: '', apiToken: '' })
  document.getElementById('backendUrl').value = backendUrl
  document.getElementById('apiToken').value = apiToken
}

document.getElementById('save').addEventListener('click', async () => {
  const backendUrl = document.getElementById('backendUrl').value.trim().replace(/\/$/, '')
  const apiToken = document.getElementById('apiToken').value.trim()
  await chrome.storage.sync.set({ backendUrl, apiToken })
  const saved = document.getElementById('saved')
  saved.style.display = 'block'
  setTimeout(() => (saved.style.display = 'none'), 1500)
})

load()
