## Appendix D. The 15 attacks (order in the Attack Lab and the donut)

| # | name | title | category |
|---|---|---|---|
| 1 | deny_then_bypass | Denied, then bypassed | policy bypass |
| 2 | rm_rf_root | rm -rf / | destructive |
| 3 | fork_bomb | Fork bomb | resource exhaustion |
| 4 | cpu_burn | Infinite loop | resource exhaustion |
| 5 | memory_bomb | Memory bomb | resource exhaustion |
| 6 | disk_fill | Disk fill | resource exhaustion |
| 7 | read_secrets | Secret hunt | secrets |
| 8 | exfil_unknown_domain | Exfiltration to an unknown host | exfiltration |
| 9 | host_escape_probes | Escape probes | escape |
| 10 | malicious_repo_hook | Hostile repo hook | supply chain |
| 11 | credential_theft_exfil | Credential theft and exfiltration | secrets |
| 12 | rewind_after_rm_rf | Wipe the workspace, then rewind | recovery |
| 13 | hostile_page_injection | Prompt injection from a web page | prompt injection |
| 14 | hostile_page_active_content | Hostile page runs code | browser containment |
| 15 | browser_local_file_access | Page reads local files | browser containment |

The five "core" attacks the film uses as full data: rewind_after_rm_rf (S4), hostile_page_injection (S5), credential_theft_exfil, malicious_repo_hook, exfil_unknown_domain (S3 fallbacks and verdict tiles).
