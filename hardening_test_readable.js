// Output-only view of hardening_test.js. Original tests and assertions still run.
const util = require("node:util");
const originalLog = console.log;
const write = originalLog.bind(console);
const lines = [];
let failure = null;
console.log = (...args) => lines.push(util.format(...args).trim());
try {
    require("./hardening_test");
}
catch (error) {
    failure = error;
    process.exitCode = 1;
}
finally {
    console.log = originalLog;
}

const titles = ["", "Quorum", "Restart / State", "Majority", "Rate Limit", "Audit"];
let section = 0;
let round = null;
let online = "";
let latestNumber = "-";
let completed = false;
let pendingBlock = null;
let auditSummary = [];

function showRound() {
    if (!round) return;
    write(`\nP1 -> Prepare(${round.number}) | Request: ${round.requested}`);
    const rows = round.promises.map(p => {
        const a = round.acceptances.find(item => item.acceptor === p.acceptor);
        const previous = p.response && p.response.accepted;
        return {
            "Node": p.acceptor,
            "Prepare": p.response ? "PROMISE" : "NO",
            "Prior": previous ? `${previous.number}: ${previous.value}` : "-",
            "Accept": a ? (a.accepted ? "ACCEPTED" : "NO") : "-",
            "Value": a && a.accepted ? a.value : "-"
        };
    });
    console.table(rows);
    console.table(round.quorums.map((q, index) => ({
        "Phase": index === 0 ? "Prepare" : "Accept",
        "Count": q.count,
        "Quorum": q.required,
        "Result": q.reached ? "Y" : "N"
    })));
    write(`Chosen: ${round.chosen === null ? "-" : round.chosen}`);
    if (round.chosen !== null && round.requested !== round.chosen)
        write(`Preserve: ${round.requested} -> ${round.chosen}`);
    if (section === 5) auditSummary = [
        {"Field": "Proposal", "Data": String(round.number)},
        {"Field": "Accepted", "Data": round.acceptances.filter(a => a.accepted).map(a => `${a.acceptor}=${a.value}`).join("; ")},
        {"Field": "Promises", "Data": round.promises.map(p => `${p.acceptor}=${p.response ? p.response.type : "null"}`).join("; ")},
        {"Field": "Quorums", "Data": round.quorums.map((q,i) => `${i === 0 ? "Prepare" : "Accept"}: ${q.count}/${q.required}`).join("; ")},
        {"Field": "Chosen", "Data": round.chosen}
    ];
    round = null;
}

write("\nPAXOS HARDENING | Node Results");
for (const line of lines) {
    const heading = line.match(/^\[Hardening #(\d)\]$/);
    if (heading) {
        showRound();
        section = Number(heading[1]);
        latestNumber = "-";
        online = "";
        write(`\n========== ${section}. ${titles[section]} ==========`);
        continue;
    }
    const audit = line.match(/^AUDIT (.*?): (\{.*\})$/);
    if (audit) {
        const d = JSON.parse(audit[2]);
        if (audit[1] === "PROPOSAL NUMBER") {
            showRound();
            latestNumber = d.number;
            round = {number: d.number, requested: d.value, promises: [], acceptances: [], quorums: [], chosen: null};
        }
        if (round && audit[1] === "PROMISE RESPONSE") round.promises.push(d);
        if (round && audit[1] === "ACCEPTED VALUE") round.acceptances.push(d);
        if (round && audit[1] === "QUORUM FORMATION") round.quorums.push(d);
        if (round && audit[1] === "CHOSEN VALUE") round.chosen = d.value;
        continue;
    }
    if (line.startsWith("L1 LEARNED")) { showRound(); continue; }
    if (line.startsWith("Available Acceptors:")) {
        online = line.split(":")[1].trim();
        write(`\nOnline: ${online}`);
    }
    if (line.startsWith("BLOCKED:")) {
        showRound();
        let reason = line.slice(8).trim();
        if (reason.includes("Unsafe quorum")) reason = "Q=1 < 2";
        else if (reason.includes("STATE LOSS")) reason = "A1 state mismatch";
        else if (reason.includes("MAJORITY LOST")) reason = "Online=1 < Q=2";
        else if (reason.includes("TOO MANY")) reason = "3/1000ms";
        pendingBlock = {"Cause": reason, "Result": "BLOCKED", "Last ID": latestNumber};
    }
    if (line.startsWith("Verified:") && pendingBlock) {
        pendingBlock["New"] = "N";
        console.table([pendingBlock]);
        pendingBlock = null;
        write("P1 -> Prepare：-；P1 -> Accept：-");
    }
    if (line.startsWith("Safe quorum restored")) write("\nQuorum: 1 -> 2 | Retry");
    if (line.startsWith("A1 restarted")) {
        const retained = line.endsWith("true");
        console.table([{
            "Event": "A1 restart",
            "State": retained ? "RESTORED" : "LOST",
            "highestPromised": retained ? latestNumber : 0,
            "acceptedProposal": retained ? "RESTORED" : "null"
        }]);
    }
    if (line.startsWith("Majority restored")) write("\nA2: OFF -> ON | A3: OFF");
    if (line.startsWith("Proposal limit:")) {
        write("Limit: 3/1000ms | t(ms): 0, 100, 200, 300, 1000");
    }
    if (line.startsWith("Monitoring window expired")) write("\nt=1000ms | Oldest expired -> Retry");
    if (line === "All five audit fields verified.") {
        write("\nAudit:");
        console.table(auditSummary);
    }
    if (line.startsWith("HARDENING TEST COMPLETE:")) completed = true;
}
showRound();
if (pendingBlock) console.table([pendingBlock]);
if (failure) write(`\nFAIL: ${failure.stack}`);
else if (!completed) {
    write("\nFAIL: Missing completion marker");
    process.exitCode = 1;
}
else write("\nPASS: 5/5 test groups");
write("Legend: Y=yes | N=no | -=none/skipped | NO=no response/acceptance");
write("Scope: local rate limit; in-memory state/logs; simulated restart.");

