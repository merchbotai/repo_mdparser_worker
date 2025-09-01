"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
// eslint-disable-next-line @typescript-eslint/no-var-requires
const CDP = require('chrome-remote-interface');
const fs_1 = require("fs");
const url_1 = require("url");
const args = process.argv.slice(2);
const outPath = args.find((_, i) => args[i - 1] === '--out') || '../api-captured.jsonl';
const auto = args.includes('--auto'); // aktywna paginacja
function upsertQuery(urlStr, key, value) {
    const u = new url_1.URL(urlStr);
    u.searchParams.set(key, value);
    return u.toString();
}
function getParam(urlStr, key) {
    try {
        return new url_1.URL(urlStr).searchParams.get(key);
    }
    catch {
        return null;
    }
}
async function main() {
    console.log('CDP: connecting to Chrome on :9222...');
    const targets = await CDP.List();
    const target = targets.find((t) => (t.url || '').includes('merch') || (t.title || '').toLowerCase().includes('merch')) || targets[0];
    if (!target)
        throw new Error('Brak dostępnych targetów');
    const client = await CDP({ target });
    const { Network, Page, Runtime } = client;
    await Network.enable();
    await Page.enable();
    console.log(`CDP: attached to ${target.url}`);
    try {
        (0, fs_1.writeFileSync)(outPath, '');
    }
    catch { }
    let templateUrl = null;
    let totalItems = 0;
    Network.responseReceived(async (params) => {
        const url = params.response.url;
        if (!/seller_trends|best_sellers|best-sellers|search|winners|api/i.test(url))
            return;
        if (!/(json|application\/json|text\/json)/i.test(params.response.mimeType || ''))
            return;
        try {
            const body = await Network.getResponseBody({ requestId: params.requestId });
            const raw = body.base64Encoded ? Buffer.from(body.body, 'base64').toString('utf-8') : body.body;
            const data = JSON.parse(raw);
            const list = Array.isArray(data) ? data : (Array.isArray(data?.result) ? data.result : []);
            if (Array.isArray(list) && list.length) {
                for (const item of list)
                    (0, fs_1.appendFileSync)(outPath, JSON.stringify(item) + '\n');
                totalItems += list.length;
                console.log(`Captured ${list.length} items (total ${totalItems}) from ${url}`);
                // zapamiętaj pierwszy poprawny URL jako szablon
                if (!templateUrl)
                    templateUrl = url;
            }
        }
        catch { }
    });
    if (auto) {
        console.log('AUTO mode: spróbuję paginować po offset...');
        // czekaj, aż pierwszy request nadejdzie i da templateUrl
        const start = Date.now();
        while (!templateUrl && Date.now() - start < 15000) {
            await new Promise(r => setTimeout(r, 250));
        }
        if (!templateUrl) {
            console.log('Brak wzorcowego URL. Przewiń stronę/kliknij paginację w przeglądarce. Nasłuch trwa.');
            return;
        }
        const limit = Number(getParam(templateUrl, 'customLimit') || '48') || 48;
        let offset = Number(getParam(templateUrl, 'offset') || '0') || 0;
        console.log(`AUTO: start offset=${offset}, limit=${limit}`);
        for (let page = 0; page < 5000; page++) {
            const nextUrl = upsertQuery(templateUrl, 'offset', String(offset));
            console.log(`FETCH ${page}: ${nextUrl}`);
            const evalRes = await Runtime.evaluate({
                expression: `fetch(${JSON.stringify(nextUrl)}, { credentials: 'include' }).then(r=>r.json()).then(x=>({n:Array.isArray(x?.result)?x.result.length: (Array.isArray(x)?x.length:0), data:x})).catch(e=>({n:0,error:String(e)}))`,
                returnByValue: true
            });
            const val = evalRes.result.value;
            const n = Number(val?.n || 0);
            if (n <= 0) {
                console.log('Koniec danych.');
                break;
            }
            const list = Array.isArray(val?.data) ? val.data : (Array.isArray(val?.data?.result) ? val.data.result : []);
            for (const item of list)
                (0, fs_1.appendFileSync)(outPath, JSON.stringify(item) + '\n');
            totalItems += list.length;
            console.log(`AUTO captured ${list.length} (total ${totalItems})`);
            offset += limit;
            await new Promise(r => setTimeout(r, 200));
        }
        console.log(`AUTO done. Total items: ${totalItems}. Output: ${outPath}`);
    }
    else {
        console.log('PASSIVE mode: przewiń/klikaj w otwartej karcie, dane będą zapisywane...');
    }
}
main().catch(e => { console.error(e); process.exit(1); });
//# sourceMappingURL=capture-cdp.js.map