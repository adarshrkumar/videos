let REPL_NAME = 'videos'

if (location.href.split('://')[1].split('.')[0] === REPL_NAME && location.hostname.endsWith('.repl.co/') === true) {
  location.href = location.href.split('repl.co')[0] + 'com'
}