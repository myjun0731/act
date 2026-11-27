# 출처 (Attribution)

이 플러그인의 스킬은 ECC(https://github.com/affaan-m/ECC, MIT License, © 2026 Affaan Mustafa)
커밋 `4adeee6732a12d1540f49a4d50a38ce8c97f9a53`에서 선별 내재화한다.

- 각 스킬의 SKILL.md frontmatter `metadata.origin`을 보존한다. `origin`이 `ECC`가 아닌 스킬(community 등)은
  ECC 저장소에 기여된 원 저작자를 아래 목록에 함께 적는다.
- ECC 하네스 전용 참조(커맨드·에이전트·훅·메모리·런타임)를 걷어내거나 "있으면 적용"으로 바꾼 내용은 스킬별로 적는다.
- 재배포 시 본 표기를 유지할 것.

## 가져온 스킬 (W3, 0.1.0)

- kubernetes-patterns, terraform-patterns, flox-environments, uncloud
- homelab-network-setup, homelab-network-readiness, homelab-pihole-dns, homelab-vlan-segmentation, homelab-wireguard-vpn
- netmiko-ssh-automation, network-bgp-diagnostics, cisco-ios-patterns, network-config-validation, network-interface-health
  (뒤의 셋은 Tier B였지만 앞의 스킬들이 서로 참조해 W3로 당겨 함께 넣었다)
- 원 기여자: homelab-*·netmiko-ssh-automation·network-*·cisco-ios-patterns — origin `community`. flox-environments — origin `Flox`.

### 변경한 내용
- cisco-ios-patterns, network-config-validation, network-interface-health: "See Also"의 ECC 에이전트(`network-config-reviewer`·`network-troubleshooter`) 줄 삭제.
