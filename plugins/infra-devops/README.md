# infra-devops

인프라·네트워크 스킬: Kubernetes·Terraform·Flox·Uncloud, 홈랩 네트워크(VLAN·DNS·WireGuard), 네트워크 진단·설정 검증. ECC(MIT) 내재화.


```
claude plugin install infra-devops@act
```

- **opt-in**: allinone에 포함되지 않는다. 필요할 때만 `claude plugin install infra-devops@act`로 설치한다.
- **독립 동작**: ECC 하네스(커맨드·에이전트·훅·메모리) 없이 동작하도록 고쳐서 넣는다. `python scripts/check_skills.py --plugin infra-devops`이 ERROR 0이어야 한다.
- 출처와 변경 내용은 [ATTRIBUTION.md](ATTRIBUTION.md), 원본 라이선스는 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)에 있다.

## 구성

<!-- inventory:begin -->
### 스킬 (15)

| 스킬 | 설명 |
|---|---|
| `cisco-ios-patterns` | Cisco IOS and IOS-XE review patterns for show commands, config hierarchy, wildcard masks, ACL placement, interface hygiene, and safe change-window ve… |
| `flox-environments` | Create reproducible, cross-platform (macOS/Linux) development environments with Flox, a declarative Nix-based environment manager. |
| `homelab-network-readiness` | Readiness checklist for homelab VLAN segmentation, local DNS filtering (Pi-hole, AdGuard Home), and WireGuard-style remote access. |
| `homelab-network-setup` | Practical home and homelab network planning for gateways, switches, access points, IP ranges, DHCP reservations, DNS, cabling, and common beginner mi… |
| `homelab-pihole-dns` | Pi-hole installation, blocklist management, DNS-over-HTTPS setup, DHCP integration, local DNS records, and troubleshooting broken DNS resolution on a… |
| `homelab-vlan-segmentation` | Segmenting home networks into VLANs for IoT, guest, trusted, and server traffic using UniFi, pfSense/OPNsense, and MikroTik — including switch trunk … |
| `homelab-wireguard-vpn` | WireGuard VPN server setup, peer configuration, key generation, split tunneling vs full tunnel routing, and remote access to a home network from mobi… |
| `kubernetes-patterns` | Kubernetes workload patterns, resource management, RBAC, probes, autoscaling, ConfigMap/Secret handling, and kubectl debugging for production-grade d… |
| `netmiko-ssh-automation` | Safe Python Netmiko patterns for read-only collection, bounded batch SSH, TextFSM parsing, guarded config changes, timeouts, and network automation e… |
| `network-bgp-diagnostics` | Diagnostics-only BGP troubleshooting patterns for neighbor state, route exchange, prefix policy, AS path inspection, and safe evidence collection. |
| `network-config-validation` | Pre-deployment checks for router and switch configuration, including dangerous commands, duplicate addresses, subnet overlaps, stale references, mana… |
| `network-interface-health` | Diagnose interface errors, drops, CRCs, duplex mismatches, flapping, speed negotiation issues, and counter trends on routers, switches, and Linux hos… |
| `platform-factory` | Build deterministic OCI images, SBOM/provenance evidence and hardened container or microVM runs from a compiled executable with the Platform Factory … |
| `terraform-patterns` | Terraform and OpenTofu infrastructure-as-code patterns for project layout, remote state, modules, variables, secrets, safe plan/apply workflows, and … |
| `uncloud` | Use when managing an Uncloud cluster — deploying services, configuring Caddy ingress, adding static proxy routes for non-cluster devices, publishing … |
<!-- inventory:end -->
