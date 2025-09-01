/**
 * Capture seller_trends via Chrome DevTools Protocol (CDP)
 * -------------------------------------------------------
 * Wymaga uruchomionej przeglądarki z --remote-debugging-port=9222 oraz otwartej strony merchdominator.
 *
 * Użycie:
 * 1) Uruchom Chrome:
 *    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=9222 --user-data-dir="%LOCALAPPDATA%\\chrome-mdp"
 * 2) Wejdź na stronę listingu (zaloguj się)
 * 3) Uruchom:
 *    npx ts-node examples/capture-cdp.ts --out "../api-captured.jsonl" --auto
 */
export {};
