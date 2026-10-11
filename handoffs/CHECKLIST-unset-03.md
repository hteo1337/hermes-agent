# Egress probe 2 checklist

`PASEO_AGENT_ID` was unset; `CHECKLIST-.md` belongs to another agent, so this uniquely named checklist preserves it.

- [x] Locked desktop dependencies and typecheck, brand audit, and egress audit pass with recorded counts. (`npm ci --ignore-scripts` exit 0 after root prepare lacked lefthook; typecheck exit 0; brand 2120/710; egress 10/5.)
- [x] `npm run dist:bundled` completes and the new packaged artifacts are inspected. (Exit 0; DMG 1,794,057,339 bytes; ZIP 1,826,023,319 bytes; payload manifest 536 bytes; Developer ID signature metadata inspected.)
- [x] D5 proxy, mock, socket, DNS, and control apparatus is verified for the new app. (HTTP/HTTPS proxy controls produced two records and HTTP 502; loopback mock returned 200 without changing proxy count; `sudo -n` allowed tcpdump on en0 and lo0; bundled backend reached ready in isolated home.)
- [x] Boot, Settings, About, Capabilities/Providers, picker, chat, HUD goal, and five-minute idle are probed; any attempted non-loopback host is reported and probing stops. (306 seconds idle; proxy 0 app requests; 3,945 app socket rows 0 non-loopback; en0 DNS capture 22 machine-wide packets to 1.1.1.1:53 and 1.0.0.1:853, process unknown; no fix.)
- [x] `EGRESS-PROBE-2.md` and `STATUS.md` contain actual counts and limits; app and proxy are stopped; handoff is committed locally. (`git commit` exited 0; `ps` found no app/helper/backend/capture PIDs and `lsof` found no listener on proxy port 54115.)
