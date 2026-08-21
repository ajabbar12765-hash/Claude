const params = new URLSearchParams(location.search)
const url = params.get('url') || ''
const verdict = params.get('verdict') || 'suspicious'

document.getElementById('title').textContent =
  verdict === 'malicious' ? 'ClickWarden blocked this link — it looks malicious' : 'ClickWarden flagged this link as suspicious'
document.getElementById('url').textContent = url
document.getElementById('detail').textContent =
  verdict === 'malicious'
    ? 'A threat-intelligence source (VirusTotal, Google Safe Browsing, or URLhaus) marked this link as malicious.'
    : 'A threat-intelligence source flagged this link as suspicious, but it was not confirmed malicious.'

document.getElementById('back').addEventListener('click', () => history.back())
document.getElementById('proceed').addEventListener('click', (e) => {
  e.preventDefault()
  location.href = url
})
