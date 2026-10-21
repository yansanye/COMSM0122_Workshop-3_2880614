# Paxos Workshop

A JavaScript simulator for exploring Paxos consensus, failures, and deployment hardening.

## Setup

Requires Node.js 18 or newer. Run commands from the project directory:

```sh
npm install
```

## Workshop Scenarios

| Part | Command | Purpose |
|---|---|---|
| 1 | `npm run happy` | Normal consensus |
| 2 | `npm run failure` | Acceptor failure |
| 3 | `npm run proposers` | Competing proposers |
| 4 | `npm run partial` | Partial acceptance |
| 5 | `npm run preserve` | Preserve chosen values |
| 6 | `npm run multi` | Stable proposer |
| 7.1 | `npm run partition` | Network partition |
| 7.2 | `npm run majority-loss` | Loss of majority |
| 7.3 | `npm run state-loss` | Acceptor state loss |
| 7.4 | `npm run quorum-error` | Unsafe quorum configuration |
| 8 | `npm run hardening` | Original hardening demonstration |

## Additional Hardening Tests

```sh
node hardening_test.js
node hardening_test_readable.js
```

Keep both files in the project root. The readable version runs the same tests with compact English tables.

The tests check quorum validation, state retention after simulated restarts, majority availability, proposal rate limiting, and audit records. All five test groups passed. Original simulator modules remain unchanged.

## Findings

Paxos requires majority agreement rather than unanimous participation. Proposal numbers order competing requests, while quorum overlap and retained acceptor state protect chosen values. Network failures can prevent progress; state loss and incorrect quorum configuration can undermine safety.

## Limitations

State and logs are stored in memory, restarts are simulated, and availability uses online flags. Rate limiting does not detect competition between multiple proposers. The Multi-Paxos scenario illustrates a stable proposer without implementing the full optimization.

## Submission

Submit the project ZIP on Blackboard. Push the project with this README to GitHub, include the workshop name and date, and invite `systemsecuritybcsg`. Part 9 extensions are optional.
