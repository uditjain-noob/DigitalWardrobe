# Runbook 01 — Provision the host (Oracle Cloud Always Free)

**Written:** 2026-11-04 · **Verified against:** the sources at the foot
**Decided in:** [infrastructure §7.4](../superpowers/specs/2026-11-04-wardrobe-infrastructure.md)
**Ends at:** plan 1 Task 18, which deploys onto what this produces

**Signup link: https://www.oracle.com/cloud/free/**

You do this, not me — it needs your card and I don't create accounts or enter payment
details. Below is everything to do once you're in.

---

## What you end up with

An ARM box running Ubuntu with Docker installed, a reserved public IP, ports 80 and 443 open
at both firewall layers, and a swap file. **No app yet** — plan 1 hasn't been built. This is
the empty machine it will deploy onto.

Budget 30–45 minutes, most of it waiting for account provisioning.

---

## The four things that actually bite

Read these before you start. Each one wastes an hour if you meet it unprepared.

1. **A VPN or a virtual/prepaid card during signup gets the account permanently banned**,
   often within minutes, with no appeal. Use your real connection and a normal credit card.
2. **"Out of host capacity"** is the usual experience when creating an ARM instance, not the
   exception. §5 has four ways through it.
3. **There are two firewalls**, and only one of them is obvious. Opening the port in Oracle's
   console and not in Ubuntu's own iptables is the single most common "why can't I reach my
   server" — §6.
4. **Idle Always Free instances get reclaimed.** Under 20% CPU, network *and* memory over 7
   days and Oracle stops it. A wardrobe app on a 12 GB box is comfortably under that. §9 is
   the fix, and it's counter-intuitive: ask for a *smaller* instance.

---

## 1. Signup

1. https://www.oracle.com/cloud/free/ → **Start for free**.
2. Country, name, email. Verify the email.
3. Password. "Company name" can be anything — "Personal" is fine.
4. **Home region — choose carefully.** See §2 below before picking. It is effectively
   permanent for Always Free resources.
5. Card details. Oracle places a **~$1 temporary hold** to verify it and releases it. Always
   Free resources are not charged.
6. Submit, then wait. Provisioning takes anywhere from a few minutes to about an hour; you get
   an email when the tenancy is ready.

**Do not** use a VPN, proxy, prepaid card, or virtual card number, and keep the billing
address consistent with your card. Oracle's fraud detection bans aggressively and
irreversibly.

## 2. Which home region

Two competing considerations, and the first one is weaker than it looks.

**Latency barely matters here.** Infrastructure §7.1: NFR-3.6 redirects the browser straight
to a signed R2 URL, so photographs come off Cloudflare's edge and the box serves JSON only. A
distant region costs you one round trip per screen, not one per photograph.

**Capacity matters a lot.** Mumbai and Hyderabad are single-availability-domain regions, which
means the main "try another availability domain" workaround in §5 is unavailable to you there.
Ashburn, Phoenix and Frankfurt have three.

So:

| If | Pick |
|---|---|
| You want the lowest latency and will fight for capacity | **Mumbai** (`ap-mumbai-1`) or **Hyderabad** (`ap-hyderabad-1`) — ~3 ms |
| You'd rather the instance just launch | **Frankfurt** or **Ashburn** — 3 ADs, far better odds, and §7.1 means the latency costs you little |

Hyderabad is usually less contended than Mumbai. If you want India and one fails, try the
other — but you only get one home region, so decide before you submit the signup form.

## 3. Create the network

Easiest path, one minute:

**Networking → Virtual Cloud Networks → Start VCN Wizard → "VCN with Internet
Connectivity"** → accept the defaults → Create.

That gives you a VCN, a public and a private subnet, an internet gateway and route tables,
correctly wired. Don't hand-build this.

## 4. Create the instance

**Compute → Instances → Create instance.**

| Field | Value |
|---|---|
| Name | `wardrobe` |
| Image | **Change image** → Canonical **Ubuntu 24.04** (or 26.04 LTS if offered) |
| Shape | **Change shape** → **Ampere** → `VM.Standard.A1.Flex` |
| OCPUs / memory | **1 OCPU, 4 GB** — see §10, this is deliberate and the arithmetic matters |
| Subnet | the **public** subnet from the wizard |
| Public IPv4 | **Assign** |
| SSH keys | **Generate a key pair**, then **download both the private and the public key** |
| Boot volume | **50 GB** (free tier allows 200 GB of block storage in total) |

Two of those need explaining.

**The private key is downloadable once.** Lose it and you cannot SSH in and will rebuild the
instance. Put it somewhere you keep things.

**1 OCPU / 4 GB rather than the full 2 / 12.** Still roughly three times what this app needs,
and sized so your real memory use clears Oracle's 20% idle threshold — §10 shows the
arithmetic, and 6 GB does *not* clear it. It also leaves most of your free allowance spare for
a second instance if you ever want a staging box.

A1.Flex memory can be changed later on a stopped instance, so this is adjustable rather than
a commitment.

Click **Create**.

## 5. If you get "Out of host capacity"

Expected. Four ways through, cheapest first:

1. **Just retry**, several times, a few minutes apart. Capacity frees as other people delete
   instances.
2. **Retry at off-peak** for that region — early morning local time is noticeably better.
3. **Try another availability domain**, if your region has more than one. Mumbai and Hyderabad
   do not; Frankfurt, Ashburn and Phoenix do.
4. **Run a retry script.** [`hitrov/oci-arm-host-capacity`](https://github.com/hitrov/oci-arm-host-capacity)
   polls and grabs capacity the moment it appears. Standard practice, not a hack — read it
   before you run it, since it holds your API credentials.

If it stays stubborn, §10 (pay-as-you-go) gives launch priority and fixes this properly.

## 6. Open the ports — both layers

**This is the step people miss.** Oracle blocks at the cloud edge *and* Ubuntu's OCI image
ships iptables rules that block everything except SSH. You must do both.

**Layer 1 — Oracle.** Networking → your VCN → the **public subnet** → its **Security List** →
**Add Ingress Rules**:

| Source | Protocol | Dest. port |
|---|---|---|
| `0.0.0.0/0` | TCP | `80` |
| `0.0.0.0/0` | TCP | `443` |

Port 22 is already open from the wizard.

**Layer 2 — Ubuntu.** SSH in first (§7), then:

```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

**Never open 5432.** Postgres stays on the Docker network, reachable only by the web and
worker containers. Nothing outside the box ever talks to it.

## 7. Connect

```bash
chmod 400 ~/Downloads/ssh-key-*.key
ssh -i ~/Downloads/ssh-key-*.key ubuntu@<your-public-ip>
```

## 8. Prepare the box

```bash
# system
sudo apt update && sudo apt upgrade -y

# docker, official repo
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
# log out and back in for the group to apply

# 2 GB swap — insurance for sharp spiking while it decodes a large photograph
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# unattended security updates
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades

# confirm
docker --version && free -h && uname -m   # expect aarch64
```

`aarch64` confirms ARM, which is why plan 1 Task 1 builds the image for `linux/arm64`.

## 9. Reserve the public IP, or DNS will break

An **ephemeral** public IP changes whenever the instance stops and starts — including after an
idle reclamation. Convert it:

**Instance → Attached VNICs → the VNIC → IPv4 Addresses → Edit the public IP → change
Ephemeral to Reserved.** Free tier includes reserved IPs.

Then point an `A` record at it.

## 10. Idle reclamation — the real risk, and the fix

Oracle considers an Always Free instance idle when, **over 7 days**, 95th-percentile CPU is
under 20%, network is under 20%, and (on A1) memory is under 20%. It emails you, then **stops**
the instance.

**It stops it. It does not delete it.** Your boot volume and data survive, and you restart it
from the console. Combined with the backups in infrastructure §6, the worst case is an
interruption, not a loss.

But a personal wardrobe app will sit under those thresholds easily. Three things help, in
order of how much I'd recommend them:

1. **Ask for a smaller instance.** Counter-intuitive, free, and still far more machine than
   this app needs. The arithmetic, against an estimated ~1 GB of real use for Postgres plus
   two Node processes plus Caddy:

   | Shape | Memory used | Clears 20%? |
   |---|---|---|
   | 2 OCPU / 12 GB | ~8% | no |
   | 1 OCPU / 6 GB | ~17% | **no** |
   | **1 OCPU / 4 GB** | **~25%** | **yes** |

   Which is why §4 says 4 GB and not 6. Only one of the three metrics has to clear 20% for the
   instance to be safe, and memory is the one you can actually control.

   Two honest caveats. The ~1 GB is an estimate — **measure after deploying** with
   `free -h` and `docker stats`, and resize if you are nearer the line than this table
   suggests. And resizing is cheap: A1.Flex memory changes on a stopped instance, no rebuild.
2. **Watch for the email.** Oracle warns before acting.
3. **Upgrade to pay-as-you-go** — §11. Reclamation does not apply, and you still pay nothing
   while inside the Always Free limits.

What I would *not* do is run a busy-loop to fake utilisation. It burns someone's electricity
to defeat a policy that only stops your instance, and it is the kind of thing that attracts
exactly the account review you don't want.

## 11. Pay-as-you-go — when it's worth it

Upgrading keeps every Always Free resource free, and adds two things: **priority when
launching instances** (which fixes §5 properly) and **exemption from idle reclamation**. Some
reports also suggest PAYG tenancies kept the older 4 OCPU / 24 GB ARM allowance after the
June 2026 halving — treat that as rumour, not a reason.

The cost is that your card becomes chargeable if you ever exceed Always Free. So if you do
upgrade:

**Billing → Budgets → Create Budget**, set it to **$1** with an alert at 100%. You then hear
about any accidental spend immediately rather than at the end of the month.

My suggestion: start on Always Free. Upgrade only if capacity or reclamation actually annoys
you, and set the budget in the same sitting.

## 12. What you do *not* do yet

Nothing is deployed. Plan 1 Task 1 hasn't been built, so there is no image to run.

Specifically, **don't** install Postgres, Node or Caddy on the host directly. They all arrive
as containers from the compose file plan 1 Task 1 builds — that's the whole point of
infrastructure §3, that production runs the same compose file as dev. A hand-installed
Postgres on the host is a second, divergent copy you'll have to undo.

Next: Cloudflare R2 bucket, Resend domain, and the domain itself — runbook 02, when plan 1 is
close to deployable.

---

## Checklist

- [ ] Account created without a VPN, on a real credit card, $1 hold seen
- [ ] Home region chosen deliberately (§2)
- [ ] VCN created via the wizard
- [ ] Ubuntu ARM instance running, `uname -m` says `aarch64`
- [ ] **Private SSH key saved somewhere permanent**
- [ ] Ports 80 and 443 open in the Oracle security list
- [ ] Ports 80 and 443 open in Ubuntu iptables, saved with `netfilter-persistent`
- [ ] 5432 open nowhere
- [ ] Public IP converted from ephemeral to **reserved**
- [ ] Docker installed, `ubuntu` in the `docker` group
- [ ] 2 GB swap active and in `/etc/fstab`
- [ ] Unattended upgrades enabled
- [ ] Nothing else installed on the host

## Sources

- [Oracle Cloud Free Tier guide — signup fraud flags, shape, two firewall layers](https://codeeasy.in/articles/oracle-cloud-free-tier-ultimate-guide/)
- [Oracle quietly cuts free-tier Ampere A1 in half](https://linuxiac.com/oracle-quietly-cuts-free-tier-ampere-a1-resources-in-half/)
- [Always Free 2026 limits, and the idle-reclamation thresholds](https://site2us.com/en/servers/oracle-cloud-free-tier)
- [Out-of-capacity workarounds and the PAYG launch-priority effect](https://terminalbytes.com/oracle-cloud-free-tier-changes-2026/)
- [`hitrov/oci-arm-host-capacity` retry script](https://github.com/hitrov/oci-arm-host-capacity)
